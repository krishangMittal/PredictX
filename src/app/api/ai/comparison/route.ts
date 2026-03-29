import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
  });

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "asc" },
    take: 100,
  });

  // Calculate position value
  const positionValue = positions.reduce((sum, pos) => {
    const price = pos.side === "yes" ? pos.market.yesPrice : pos.market.noPrice;
    return sum + pos.shares * price;
  }, 0);

  const portfolioValue = user.balance + positionValue;
  const pnl = portfolioValue - 10000;
  const roi = (pnl / 10000) * 100;

  // Calculate wins (trades where current price > entry for buys)
  const buyTrades = trades.filter((t) => t.action === "buy");
  const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  for (const pos of positions) {
    const val = pos.shares * (pos.side === "yes" ? pos.market.yesPrice : pos.market.noPrice);
    categoryMap[pos.market.category] = (categoryMap[pos.market.category] || 0) + val;
  }

  return {
    username: user.username,
    balance: user.balance,
    portfolioValue,
    positionValue,
    pnl,
    roi,
    totalTrades: trades.length,
    totalBuys: buyTrades.length,
    totalSells: trades.filter((t) => t.action === "sell").length,
    totalVolume,
    positions: positions.length,
    categories: categoryMap,
    recentTrades: trades.slice(0, 5).map((t) => ({
      id: t.id,
      side: t.side,
      action: t.action,
      shares: t.shares,
      price: t.price,
      total: t.total,
      createdAt: t.createdAt.toISOString(),
    })),
    snapshots: snapshots.map((s) => ({
      value: s.portfolioValue,
      timestamp: s.timestamp.toISOString(),
    })),
  };
}

export async function GET() {
  try {
    const [human, ai] = await Promise.all([
      getUserStats("trader"),
      getUserStats("ai-trader"),
    ]);

    // Get AI-specific data
    const aiStrategies = await prisma.aIStrategy.findMany();
    const aiTrades = await prisma.aITrade.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const aiWins = aiTrades.filter((t) => t.outcome === "win").length;
    const aiLosses = aiTrades.filter((t) => t.outcome === "loss").length;
    const aiDecided = aiWins + aiLosses;

    // Head-to-head: which markets do both have positions on?
    const headToHead: { market: string; humanSide: string; aiSide: string; humanShares: number; aiShares: number }[] = [];
    if (human && ai) {
      const humanUser = await prisma.user.findUnique({ where: { username: "trader" } });
      const aiUser = await prisma.user.findUnique({ where: { username: "ai-trader" } });
      if (humanUser && aiUser) {
        const humanPositions = await prisma.position.findMany({
          where: { userId: humanUser.id },
          include: { market: true },
        });
        const aiPositions = await prisma.position.findMany({
          where: { userId: aiUser.id },
          include: { market: true },
        });
        for (const hp of humanPositions) {
          const ap = aiPositions.find((p) => p.marketId === hp.marketId);
          if (ap) {
            headToHead.push({
              market: hp.market.title,
              humanSide: hp.side,
              aiSide: ap.side,
              humanShares: hp.shares,
              aiShares: ap.shares,
            });
          }
        }
      }
    }

    return NextResponse.json({
      human,
      ai,
      aiStats: {
        strategies: aiStrategies.length,
        activeStrategies: aiStrategies.filter((s) => s.active).length,
        totalAiTrades: aiTrades.length,
        winRate: aiDecided > 0 ? aiWins / aiDecided : 0,
        totalPnl: aiTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
      },
      headToHead,
    });
  } catch (error) {
    console.error("Comparison API error:", error);
    return NextResponse.json({ error: "Failed to load comparison" }, { status: 500 });
  }
}
