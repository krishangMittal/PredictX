import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { MarketDetailClient } from "./MarketDetailClient";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: { id: string } }) {
  const market = await prisma.market.findUnique({
    where: { id: params.id },
    include: {
      priceHistory: {
        orderBy: { timestamp: "asc" },
      },
      trades: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { username: true } } },
      },
    },
  });

  if (!market) return notFound();

  const user = await prisma.user.findUnique({
    where: { username: "trader" },
  });

  const position = user
    ? await prisma.position.findFirst({
        where: { userId: user.id, marketId: market.id },
      })
    : null;

  return (
    <MarketDetailClient
      market={JSON.parse(JSON.stringify(market))}
      userBalance={user?.balance ?? 10000}
      userId={user?.id ?? ""}
      position={position ? JSON.parse(JSON.stringify(position)) : null}
    />
  );
}
