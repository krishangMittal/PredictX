import { prisma } from "@/lib/db";
import { AIBrainClient } from "./AIBrainClient";

export const dynamic = "force-dynamic";

export default async function AIBrainPage() {
  const strategies = await prisma.aIStrategy.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const aiTrades = await prisma.aITrade.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get market titles for trade display
  const marketIds = Array.from(new Set(aiTrades.map(t => t.marketId)));
  const markets = await prisma.market.findMany({
    where: { id: { in: marketIds } },
    select: { id: true, title: true, yesPrice: true, noPrice: true },
  });
  const marketMap = Object.fromEntries(markets.map(m => [m.id, m]));

  const aiUser = await prisma.user.findUnique({
    where: { username: "ai-trader" },
    include: {
      positions: { include: { market: true } },
    },
  });

  const positions = (aiUser?.positions ?? []).map((p) => {
    const currentPrice = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
    const costBasis = p.shares * p.avgPrice;
    const currentValue = p.shares * currentPrice;
    const pnl = currentValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    return {
      id: p.id,
      marketTitle: p.market.title,
      category: p.market.category,
      side: p.side,
      shares: p.shares,
      avgPrice: p.avgPrice,
      currentPrice,
      costBasis,
      currentValue,
      pnl,
      pnlPct,
    };
  });

  const positionValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <AIBrainClient
      strategies={strategies.map((s) => ({
        id: s.id,
        name: s.name,
        rule: s.rule,
        confidence: s.confidence,
        winRate: s.winRate,
        trades: s.trades,
        profit: s.profit,
        active: s.active,
        updatedAt: s.updatedAt.toISOString(),
      }))}
      recentTrades={aiTrades.map((t) => ({
        id: t.id,
        marketId: t.marketId,
        marketTitle: marketMap[t.marketId]?.title ?? "Unknown Market",
        currentYesPrice: marketMap[t.marketId]?.yesPrice ?? 0.5,
        side: t.side,
        action: t.action,
        shares: t.shares,
        price: t.price,
        reasoning: t.reasoning,
        strategy: t.strategy,
        outcome: t.outcome,
        pnl: t.pnl,
        createdAt: t.createdAt.toISOString(),
      }))}
      aiBalance={aiUser?.balance ?? 10000}
      aiPortfolioValue={(aiUser?.balance ?? 10000) + positionValue}
      positions={positions}
      totalPnl={totalPnl}
    />
  );
}
