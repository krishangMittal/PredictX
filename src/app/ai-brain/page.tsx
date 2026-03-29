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

  const positionValue = aiUser?.positions.reduce((sum, p) => {
    const price = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
    return sum + price * p.shares;
  }, 0) ?? 0;

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
    />
  );
}
