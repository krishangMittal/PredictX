import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HUMAN_USERNAME = "trader";
const AI_USERNAME = "ai-trader";

async function getUserStats(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;

  const positions = await prisma.position.findMany({
    where: { userId: user.id },
    include: { market: true },
  });

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { market: { select: { title: true, category: true } } },
  });

  const positionValue = positions.reduce((sum, pos) => {
    const price = pos.side === "yes" ? pos.market.yesPrice : pos.market.noPrice;
    return sum + pos.shares * price;
  }, 0);

  const portfolioValue = user.balance + positionValue;
  const pnl = portfolioValue - 10000;
  const roi = (pnl / 10000) * 100;
  const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);

  return {
    id: user.id,
    username: user.username,
    balance: user.balance,
    portfolioValue,
    positionValue,
    pnl,
    roi,
    totalTrades: trades.length,
    totalBuys: trades.filter((t) => t.action === "buy").length,
    totalSells: trades.filter((t) => t.action === "sell").length,
    totalVolume,
    positionCount: positions.length,
    recentTrades: trades.slice(0, 10).map((t) => ({
      id: t.id,
      marketTitle: t.market.title,
      category: t.market.category,
      side: t.side,
      action: t.action,
      shares: t.shares,
      price: t.price,
      total: t.total,
      createdAt: t.createdAt.toISOString(),
    })),
    positions: positions.map((p) => ({
      marketId: p.marketId,
      side: p.side,
      shares: p.shares,
      avgPrice: p.avgPrice,
    })),
  };
}

export async function GET() {
  try {
    const [human, ai] = await Promise.all([
      getUserStats(HUMAN_USERNAME),
      getUserStats(AI_USERNAME),
    ]);

    // AI-specific strategy data
    const aiStrategies = await prisma.aIStrategy.findMany({
      orderBy: { trades: "desc" },
    });

    // Recent trades from both users combined (for unified feed)
    const humanUser = await prisma.user.findUnique({ where: { username: HUMAN_USERNAME } });
    const aiUser = await prisma.user.findUnique({ where: { username: AI_USERNAME } });

    const [humanTrades, aiTrades] = await Promise.all([
      humanUser
        ? prisma.trade.findMany({
            where: { userId: humanUser.id },
            orderBy: { createdAt: "desc" },
            take: 15,
            include: { market: { select: { title: true, category: true } } },
          })
        : Promise.resolve([]),
      aiUser
        ? prisma.trade.findMany({
            where: { userId: aiUser.id },
            orderBy: { createdAt: "desc" },
            take: 15,
            include: { market: { select: { title: true, category: true } } },
          })
        : Promise.resolve([]),
    ]);

    const combinedTrades = [
      ...humanTrades.map((t) => ({
        id: t.id,
        trader: "human" as const,
        marketTitle: t.market.title,
        category: t.market.category,
        side: t.side,
        action: t.action,
        shares: t.shares,
        price: t.price,
        total: t.total,
        createdAt: t.createdAt.toISOString(),
      })),
      ...aiTrades.map((t) => ({
        id: t.id,
        trader: "ai" as const,
        marketTitle: t.market.title,
        category: t.market.category,
        side: t.side,
        action: t.action,
        shares: t.shares,
        price: t.price,
        total: t.total,
        createdAt: t.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Position overlap — markets where both have positions
    const positionOverlap: {
      marketTitle: string;
      humanSide: string;
      aiSide: string;
      humanShares: number;
      aiShares: number;
      opposing: boolean;
    }[] = [];

    if (human && ai) {
      for (const hp of human.positions) {
        const ap = ai.positions.find((p) => p.marketId === hp.marketId);
        if (ap) {
          // Find market title from human recent trades or fetch separately
          const marketData = await prisma.market.findUnique({
            where: { id: hp.marketId },
            select: { title: true },
          });
          positionOverlap.push({
            marketTitle: marketData?.title ?? hp.marketId,
            humanSide: hp.side,
            aiSide: ap.side,
            humanShares: hp.shares,
            aiShares: ap.shares,
            opposing: hp.side !== ap.side,
          });
        }
      }
    }

    return NextResponse.json({
      human: human
        ? {
            username: human.username,
            balance: human.balance,
            portfolioValue: human.portfolioValue,
            positionValue: human.positionValue,
            pnl: human.pnl,
            roi: human.roi,
            totalTrades: human.totalTrades,
            totalBuys: human.totalBuys,
            totalSells: human.totalSells,
            totalVolume: human.totalVolume,
            positionCount: human.positionCount,
          }
        : null,
      ai: ai
        ? {
            username: ai.username,
            balance: ai.balance,
            portfolioValue: ai.portfolioValue,
            positionValue: ai.positionValue,
            pnl: ai.pnl,
            roi: ai.roi,
            totalTrades: ai.totalTrades,
            totalBuys: ai.totalBuys,
            totalSells: ai.totalSells,
            totalVolume: ai.totalVolume,
            positionCount: ai.positionCount,
          }
        : null,
      strategies: aiStrategies.map((s) => ({
        id: s.id,
        name: s.name,
        rule: s.rule,
        winRate: s.winRate,
        trades: s.trades,
        profit: s.profit,
        confidence: s.confidence,
        active: s.active,
      })),
      combinedTrades: combinedTrades.slice(0, 20),
      positionOverlap,
    });
  } catch (error) {
    console.error("Comparison API error:", error);
    return NextResponse.json({ error: "Failed to load comparison data" }, { status: 500 });
  }
}
