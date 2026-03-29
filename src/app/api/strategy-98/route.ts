import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface PolymarketRaw {
  id: string;
  question?: string;
  title?: string;
  groupSlug?: string;
  category?: string;
  slug?: string;
  outcomePrices?: string;
  volume?: string;
  endDate?: string;
  events?: { slug: string }[];
}

interface Opportunity {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  bestSide: string;
  bestPrice: number;
  volume: number;
  endDate: string | null;
  polymarketUrl: string | null;
}

async function fetchPolymarketHighConf(threshold: number): Promise<Opportunity[]> {
  // Scan ALL Polymarket markets via Gamma API for high-confidence opportunities
  const results: PolymarketRaw[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < 50; page++) {
    try {
      const res = await fetch(
        `https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=${limit}&offset=${offset}&order=volume&ascending=false`,
        { next: { revalidate: 60 } }
      );
      if (!res.ok) break;
      const markets: PolymarketRaw[] = await res.json();
      if (!markets.length) break;
      results.push(...markets);
      offset += limit;
    } catch {
      break;
    }
  }

  const opportunities = results
    .filter((m) => {
      const prices = m.outcomePrices ? JSON.parse(m.outcomePrices) : [];
      const yesPrice = parseFloat(prices[0] ?? "0");
      const noPrice = parseFloat(prices[1] ?? "0");
      return (yesPrice >= threshold && yesPrice <= 0.99) || (noPrice >= threshold && noPrice <= 0.99);
    })
    .map((m) => {
      const prices = m.outcomePrices ? JSON.parse(m.outcomePrices) : [];
      const yesPrice = parseFloat(prices[0] ?? "0");
      const noPrice = parseFloat(prices[1] ?? "0");
      const bestSide = yesPrice >= threshold ? "yes" : "no";
      const bestPrice = bestSide === "yes" ? yesPrice : noPrice;
      return {
        id: m.id,
        title: m.question ?? m.title ?? "Unknown",
        category: m.groupSlug ?? m.category ?? "other",
        yesPrice,
        noPrice,
        bestSide,
        bestPrice,
        volume: parseFloat(m.volume ?? "0"),
        endDate: m.endDate ?? null,
        polymarketUrl: m.events?.[0]?.slug
          ? `https://polymarket.com/event/${m.events[0].slug}`
          : m.slug ? `https://polymarket.com/event/${m.slug}` : null,
      };
    })
    .sort((a, b) => b.bestPrice - a.bestPrice);

  return opportunities;
}

interface ActiveBet {
  marketId: string;
  marketTitle: string;
  entryPrice: number;
  currentPrice: number;
  shares: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  side: string;
  status: string;
  shouldStopLoss: boolean;
}

export async function GET(req: NextRequest) {
  const thresholdPct = parseInt(req.nextUrl.searchParams.get("threshold") ?? "98");
  const threshold = thresholdPct / 100;

  try {
    const polymarketOpps = await fetchPolymarketHighConf(threshold);

    const localMarkets = await prisma.market.findMany({
      where: {
        status: "active",
        OR: [
          { yesPrice: { gte: threshold } },
          { noPrice: { gte: threshold } },
        ],
      },
    });

    const polyIds = new Set(polymarketOpps.map((p) => p.id));
    const localOnly = localMarkets
      .filter((m) => !polyIds.has(m.id))
      .map((m) => {
        const bestSide = m.yesPrice >= threshold ? "yes" : "no";
        const bestPrice = bestSide === "yes" ? m.yesPrice : m.noPrice;
        return {
          id: m.id,
          title: m.title,
          category: m.category,
          yesPrice: m.yesPrice,
          noPrice: m.noPrice,
          bestSide,
          bestPrice,
          volume: m.volume,
          endDate: m.expiresAt?.toISOString() ?? null,
          polymarketUrl: null,
        };
      });

    const allOpportunities = [...polymarketOpps, ...localOnly];

    const user = await prisma.user.findUnique({ where: { username: "trader" } });
    const activeBets: ActiveBet[] = [];
    const stats = {
      totalInvested: 0,
      currentValue: 0,
      totalPnl: 0,
      totalReturn: 0,
      activeBets: 0,
      resolvedWins: 0,
      resolvedLosses: 0,
      winRate: 0,
    };

    if (user) {
      const positions = await prisma.position.findMany({
        where: {
          userId: user.id,
          avgPrice: { gte: 0.95 },
        },
        include: { market: true },
      });

      for (const pos of positions) {
        const currentPrice = pos.side === "yes" ? pos.market.yesPrice : pos.market.noPrice;
        const invested = pos.shares * pos.avgPrice;
        const currentValue = pos.shares * currentPrice;
        const pnl = currentValue - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        const belowEntry = currentPrice < pos.avgPrice;

        activeBets.push({
          marketId: pos.marketId,
          marketTitle: pos.market.title,
          entryPrice: pos.avgPrice,
          currentPrice,
          shares: pos.shares,
          invested,
          currentValue,
          pnl,
          pnlPct,
          side: pos.side,
          status: belowEntry ? "losing" : "winning",
          shouldStopLoss: currentPrice <= pos.avgPrice - 0.02,
        });

        stats.totalInvested += invested;
        stats.currentValue += currentValue;
        stats.activeBets++;
      }

      stats.totalPnl = stats.currentValue - stats.totalInvested;
      stats.totalReturn = stats.totalInvested > 0 ? (stats.totalPnl / stats.totalInvested) * 100 : 0;
    }

    return NextResponse.json({
      opportunities: allOpportunities,
      activeBets,
      stats,
      source: "polymarket-live",
      totalScanned: polymarketOpps.length + localOnly.length,
    });
  } catch (error) {
    console.error("Strategy 98 API error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
