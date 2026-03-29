import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// Simulate price movements for all active markets
export async function POST() {
  try {
    const markets = await prisma.market.findMany({
      where: { status: "active" },
    });

    const updates = [];

    for (const market of markets) {
      // Random walk with mean reversion toward 0.5
      const meanReversionStrength = 0.005;
      const volatility = 0.008;
      const trendChance = 0.02; // 2% chance of a trend shift

      let drift = (0.5 - market.yesPrice) * meanReversionStrength;

      // Occasional trend shift (simulates news events)
      if (Math.random() < trendChance) {
        drift += (Math.random() - 0.5) * 0.05;
      }

      const noise = (Math.random() - 0.5) * 2 * volatility;
      const newYesPrice = Math.max(0.02, Math.min(0.98, market.yesPrice + drift + noise));
      const newNoPrice = +(1 - newYesPrice).toFixed(4);

      // Random volume for this tick
      const tickVolume = Math.floor(Math.random() * 2000) + 100;

      updates.push({
        id: market.id,
        yesPrice: +newYesPrice.toFixed(4),
        noPrice: newNoPrice,
        volume: market.volume + tickVolume,
      });
    }

    // Batch update all markets
    for (const update of updates) {
      await prisma.market.update({
        where: { id: update.id },
        data: {
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          volume: update.volume,
        },
      });

      // Record price history (every tick)
      await prisma.priceHistory.create({
        data: {
          marketId: update.id,
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          volume: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      prices: updates.map((u) => ({
        id: u.id,
        yesPrice: u.yesPrice,
        noPrice: u.noPrice,
      })),
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
