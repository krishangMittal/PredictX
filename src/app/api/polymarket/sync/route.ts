import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { fetchDiverseMarkets, polymarketToLocal } from "@/lib/polymarket";

export async function POST() {
  try {
    const markets = await fetchDiverseMarkets(60);

    let synced = 0;
    let updated = 0;
    let created = 0;

    for (const pm of markets) {
      const data = polymarketToLocal(pm);

      const existing = await prisma.market.findFirst({
        where: { polymarketId: data.polymarketId },
      });

      if (existing) {
        await prisma.market.update({
          where: { id: existing.id },
          data: {
            yesPrice: data.yesPrice,
            noPrice: data.noPrice,
            volume: data.volume,
            liquidity: data.liquidity,
            volume24hr: data.volume24hr,
            spread: data.spread,
            bestBid: data.bestBid,
            bestAsk: data.bestAsk,
            lastTradePrice: data.lastTradePrice,
            oneDayChange: data.oneDayChange,
            oneWeekChange: data.oneWeekChange,
          },
        });
        updated++;
      } else {
        await prisma.market.create({ data });
        created++;
      }
      synced++;

      // Record price history
      const market = existing || await prisma.market.findFirst({ where: { polymarketId: data.polymarketId } });
      if (market) {
        await prisma.priceHistory.create({
          data: {
            marketId: market.id,
            yesPrice: data.yesPrice,
            noPrice: data.noPrice,
            volume: data.volume24hr,
          },
        });
      }
    }

    // Get category breakdown
    const allMarkets = await prisma.market.findMany({
      where: { polymarketId: { not: null } },
      select: { category: true },
    });
    const categories: Record<string, number> = {};
    allMarkets.forEach(m => {
      categories[m.category] = (categories[m.category] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      synced,
      created,
      updated,
      categories,
      totalPolymarkets: allMarkets.length,
    });
  } catch (error) {
    console.error("Polymarket sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
