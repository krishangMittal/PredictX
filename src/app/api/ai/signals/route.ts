import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Signal = {
  marketId: string;
  marketTitle: string;
  category: string;
  currentPrice: number;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  side: "yes" | "no";
  confidence: number;
  reasoning: string;
  aiHasPosition: boolean;
  aiSide?: string;
  aiShares?: number;
};

export async function GET() {
  try {
    const markets = await prisma.market.findMany({
      where: { status: "active" },
      include: {
        priceHistory: {
          orderBy: { timestamp: "desc" },
          take: 20,
        },
      },
    });

    const aiUser = await prisma.user.findUnique({
      where: { username: "ai-trader" },
    });
    const aiPositions = aiUser
      ? await prisma.position.findMany({
          where: { userId: aiUser.id },
        })
      : [];
    const aiPosMap = new Map(aiPositions.map((p) => [p.marketId, p]));

    const signals: Signal[] = [];

    for (const market of markets) {
      const prices = market.priceHistory.map((h) => h.yesPrice);
      if (prices.length < 3) continue;

      const current = market.yesPrice;
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      const trend = prices.length >= 5 ? prices[0] - prices[4] : 0;
      const volatility =
        Math.sqrt(
          prices.slice(0, 10).reduce((s, p, i, a) => {
            if (i === 0) return 0;
            return s + (p - a[i - 1]) ** 2;
          }, 0) / Math.max(prices.length - 1, 1)
        ) || 0.01;

      let signal: Signal["signal"] = "hold";
      let side: "yes" | "no" = "yes";
      let confidence = 0;
      let reasoning = "";

      // Value play: extreme prices on near-certain/impossible events
      if (current > 0.85) {
        signal = "buy";
        side = "yes";
        confidence = 0.6 + (current - 0.85) * 2;
        reasoning = `High probability event at ${(current * 100).toFixed(0)}¢. If near-certain, ride to resolution.`;
      } else if (current < 0.15) {
        signal = "buy";
        side = "no";
        confidence = 0.6 + (0.15 - current) * 2;
        reasoning = `Low probability event at ${(current * 100).toFixed(0)}¢. NO side likely to pay out.`;
      }

      // Mean reversion: price far from moving average
      const deviation = current - avg;
      if (Math.abs(deviation) > 0.08) {
        if (deviation > 0.08) {
          signal = confidence > 0.5 ? signal : "sell";
          if (confidence <= 0.5) {
            side = "no";
            confidence = Math.min(0.9, 0.5 + Math.abs(deviation) * 2);
            reasoning = `Price ${(current * 100).toFixed(0)}¢ is ${(deviation * 100).toFixed(1)}¢ above average. Mean reversion expected.`;
          }
        } else {
          signal = confidence > 0.5 ? signal : "buy";
          if (confidence <= 0.5) {
            side = "yes";
            confidence = Math.min(0.9, 0.5 + Math.abs(deviation) * 2);
            reasoning = `Price ${(current * 100).toFixed(0)}¢ is ${(Math.abs(deviation) * 100).toFixed(1)}¢ below average. Bounce expected.`;
          }
        }
      }

      // Momentum: strong recent trend
      if (Math.abs(trend) > 0.05 && confidence < 0.5) {
        signal = trend > 0 ? "buy" : "sell";
        side = trend > 0 ? "yes" : "no";
        confidence = Math.min(0.8, 0.4 + Math.abs(trend) * 3);
        reasoning = `Strong ${trend > 0 ? "upward" : "downward"} momentum: ${(trend * 100).toFixed(1)}¢ move recently. ${volatility > 0.03 ? "High volatility adds risk." : ""}`;
      }

      // Upgrade to strong signals
      if (confidence > 0.75 && (signal === "buy" || signal === "sell")) {
        signal = signal === "buy" ? "strong_buy" : "strong_sell";
      }

      const aiPos = aiPosMap.get(market.id);

      signals.push({
        marketId: market.id,
        marketTitle: market.title,
        category: market.category,
        currentPrice: current,
        signal,
        side,
        confidence: +confidence.toFixed(2),
        reasoning,
        aiHasPosition: !!aiPos,
        aiSide: aiPos?.side,
        aiShares: aiPos?.shares,
      });
    }

    // Sort by confidence desc, strong signals first
    const order = { strong_buy: 0, strong_sell: 1, buy: 2, sell: 3, hold: 4 };
    signals.sort((a, b) => order[a.signal] - order[b.signal] || b.confidence - a.confidence);

    return NextResponse.json({ signals });
  } catch (error) {
    console.error("Signals API error:", error);
    return NextResponse.json({ error: "Failed to generate signals" }, { status: 500 });
  }
}
