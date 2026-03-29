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

      let signal: Signal["signal"] = "hold";
      let side: "yes" | "no" = "yes";
      let confidence = 0;
      let reasoning = "";

      // Use real Polymarket spread data if available
      const spread = (market as Record<string, unknown>).spread as number | undefined;
      const oneDayChange = (market as Record<string, unknown>).oneDayChange as number | null | undefined;
      const oneWeekChange = (market as Record<string, unknown>).oneWeekChange as number | null | undefined;

      // STRATEGY 1: Favorite-Longshot Bias
      // Longshots (< 10¢) are systematically overpriced
      if (current < 0.10) {
        signal = "sell";
        side = "no";
        confidence = 0.7 + (0.10 - current) * 3;
        reasoning = `Longshot at ${(current * 100).toFixed(1)}¢. Favorite-longshot bias: low-prob events are systematically overpriced. SELL YES / BUY NO.`;
      }
      // Near-certainties
      else if (current > 0.90) {
        signal = "buy";
        side = "yes";
        confidence = 0.6 + (current - 0.90) * 3;
        reasoning = `Near-certainty at ${(current * 100).toFixed(0)}¢. Ride to resolution for ${((1 - current) * 100).toFixed(1)}¢ profit per share.`;
      }

      // STRATEGY 2: Mean Reversion (price far from average)
      const deviation = current - avg;
      if (Math.abs(deviation) > 0.08 && confidence < 0.6) {
        if (deviation > 0.08) {
          signal = "sell";
          side = "no";
          confidence = Math.min(0.85, 0.5 + Math.abs(deviation) * 2);
          reasoning = `Mean reversion: ${(current * 100).toFixed(0)}¢ is ${(deviation * 100).toFixed(1)}¢ above avg. Expect pullback.`;
        } else {
          signal = "buy";
          side = "yes";
          confidence = Math.min(0.85, 0.5 + Math.abs(deviation) * 2);
          reasoning = `Mean reversion: ${(current * 100).toFixed(0)}¢ is ${(Math.abs(deviation) * 100).toFixed(1)}¢ below avg. Bounce likely.`;
        }
      }

      // STRATEGY 3: Momentum / real Polymarket price changes
      if (oneWeekChange != null && Math.abs(oneWeekChange) > 0.05 && confidence < 0.5) {
        signal = oneWeekChange > 0 ? "buy" : "sell";
        side = oneWeekChange > 0 ? "yes" : "no";
        confidence = Math.min(0.8, 0.4 + Math.abs(oneWeekChange) * 2);
        reasoning = `Momentum: ${oneWeekChange > 0 ? "+" : ""}${(oneWeekChange * 100).toFixed(1)}¢ weekly move. Trend continuation likely.`;
      } else if (oneDayChange != null && Math.abs(oneDayChange) > 0.03 && confidence < 0.5) {
        signal = oneDayChange > 0 ? "buy" : "sell";
        side = oneDayChange > 0 ? "yes" : "no";
        confidence = Math.min(0.7, 0.4 + Math.abs(oneDayChange) * 3);
        reasoning = `Daily momentum: ${oneDayChange > 0 ? "+" : ""}${(oneDayChange * 100).toFixed(1)}¢ today. ${spread && spread > 0.02 ? "Wide spread adds risk." : "Tight spread."}`;
      }

      // STRATEGY 4: Spread exploitation
      if (spread && spread > 0.03 && confidence < 0.4) {
        signal = "hold";
        confidence = 0.3;
        reasoning = `Wide spread (${(spread * 100).toFixed(1)}¢). Limit orders recommended to avoid slippage.`;
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
