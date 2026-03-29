import { prisma } from "@/lib/db";
import { PortfolioClient } from "./PortfolioClient";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = await prisma.user.findUnique({
    where: { username: "trader" },
    include: {
      positions: {
        include: { market: true },
      },
      trades: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { market: { select: { title: true } } },
      },
    },
  });

  if (!user) return <div className="p-6 text-text-muted">User not found</div>;

  const positions = user.positions.map((p) => {
    const currentPrice = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
    const pnl = (currentPrice - p.avgPrice) * p.shares;
    const value = currentPrice * p.shares;
    return {
      id: p.id,
      marketId: p.marketId,
      marketTitle: p.market.title,
      category: p.market.category,
      side: p.side,
      shares: p.shares,
      avgPrice: p.avgPrice,
      currentPrice,
      value,
      pnl,
      pnlPercent: p.avgPrice > 0 ? ((currentPrice - p.avgPrice) / p.avgPrice) * 100 : 0,
    };
  });

  const totalPositionValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const portfolioValue = user.balance + totalPositionValue;

  const recentTrades = user.trades.map((t) => ({
    id: t.id,
    marketTitle: t.market.title,
    side: t.side,
    action: t.action,
    shares: t.shares,
    price: t.price,
    total: t.total,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <PortfolioClient
      balance={user.balance}
      portfolioValue={portfolioValue}
      totalPnl={totalPnl}
      positions={positions}
      recentTrades={recentTrades}
    />
  );
}
