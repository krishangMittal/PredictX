import { prisma } from "@/lib/db";
import { HistoryClient } from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await prisma.user.findUnique({ where: { username: "trader" } });
  if (!user) return <div className="p-6 text-text-muted">User not found</div>;

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { market: { select: { title: true, category: true, yesPrice: true, noPrice: true } } },
  });

  const serialized = trades.map((t) => ({
    id: t.id,
    marketTitle: t.market.title,
    category: t.market.category,
    side: t.side,
    action: t.action,
    type: t.type,
    shares: t.shares,
    price: t.price,
    total: t.total,
    currentPrice: t.side === "yes" ? t.market.yesPrice : t.market.noPrice,
    createdAt: t.createdAt.toISOString(),
  }));

  return <HistoryClient trades={serialized} />;
}
