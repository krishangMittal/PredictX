import { prisma } from "@/lib/db";
import { MarketsClient } from "./MarketsClient";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const markets = await prisma.market.findMany({
    where: { status: "active" },
    orderBy: { volume: "desc" },
    include: {
      priceHistory: {
        orderBy: { timestamp: "desc" },
        take: 48,
      },
    },
  });

  // Serialize dates for client component
  const serialized = markets.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    category: m.category,
    status: m.status,
    yesPrice: m.yesPrice,
    noPrice: m.noPrice,
    volume: m.volume,
    expiresAt: m.expiresAt.toISOString(),
    priceHistory: m.priceHistory.map((p) => ({
      yesPrice: p.yesPrice,
      timestamp: p.timestamp.toISOString(),
    })),
  }));

  return <MarketsClient initialMarkets={serialized} />;
}
