import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Find all active markets with polymarketId that may have resolved
    const activeMarkets = await prisma.market.findMany({
      where: {
        status: "active",
        polymarketId: { not: null },
      },
      select: {
        id: true,
        title: true,
        polymarketId: true,
        expiresAt: true,
      },
    });

    // Check markets that have expired OR have open positions (early resolution)
    const now = new Date();
    const marketsWithPositions = await prisma.position.findMany({
      select: { marketId: true },
      distinct: ["marketId"],
    });
    const positionMarketIds = new Set(marketsWithPositions.map((p) => p.marketId));

    const expiredMarkets = activeMarkets.filter(
      (m) =>
        (m.expiresAt && new Date(m.expiresAt) < now) ||
        positionMarketIds.has(m.id)
    );

    if (expiredMarkets.length === 0) {
      return NextResponse.json({ resolved: 0, message: "No markets to check" });
    }

    let resolved = 0;
    const results: { title: string; resolution: string; payout: number; settled: number }[] = [];

    for (const market of expiredMarkets) {
      try {
        // Fetch from Polymarket to check if resolved
        const res = await fetch(
          `https://gamma-api.polymarket.com/markets/${market.polymarketId}`
        );
        if (!res.ok) continue;

        const pmData = await res.json();

        // Check if market is closed/resolved on Polymarket
        if (!pmData.closed) continue;

        // Determine resolution from final prices
        // A resolved YES market has outcomePrices close to [1, 0]
        // A resolved NO market has outcomePrices close to [0, 1]
        let prices: number[] = [];
        try {
          prices = JSON.parse(pmData.outcomePrices || "[]").map(Number);
        } catch {
          continue;
        }

        if (prices.length < 2) continue;

        // If YES price > 0.95, resolve YES. If NO price > 0.95, resolve NO.
        let resolution: "yes" | "no" | null = null;
        if (prices[0] > 0.95) resolution = "yes";
        else if (prices[1] > 0.95) resolution = "no";
        else continue; // Market closed but not clearly resolved

        // Resolve the market
        const status = resolution === "yes" ? "resolved_yes" : "resolved_no";
        await prisma.market.update({
          where: { id: market.id },
          data: {
            status,
            yesPrice: resolution === "yes" ? 1 : 0,
            noPrice: resolution === "yes" ? 0 : 1,
            resolvedAt: new Date(),
          },
        });

        // Settle all positions
        const positions = await prisma.position.findMany({
          where: { marketId: market.id },
          include: { user: true },
        });

        let settled = 0;
        let totalPayout = 0;

        for (const position of positions) {
          const won =
            (resolution === "yes" && position.side === "yes") ||
            (resolution === "no" && position.side === "no");

          if (won) {
            await prisma.user.update({
              where: { id: position.userId },
              data: { balance: { increment: position.shares } },
            });
            totalPayout += position.shares;
          }

          await prisma.position.delete({ where: { id: position.id } });
          settled++;
        }

        results.push({
          title: market.title,
          resolution: status,
          payout: totalPayout,
          settled,
        });
        resolved++;
      } catch {
        // Skip individual market errors
        continue;
      }
    }

    return NextResponse.json({
      resolved,
      checked: expiredMarkets.length,
      results,
    });
  } catch (error) {
    console.error("Auto-resolve error:", error);
    return NextResponse.json(
      { error: "Auto-resolve failed", details: String(error) },
      { status: 500 }
    );
  }
}
