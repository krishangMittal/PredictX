import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const aiTrades = await prisma.aITrade.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const marketIds = Array.from(new Set(aiTrades.map((t) => t.marketId)));
  const markets = await prisma.market.findMany({
    where: { id: { in: marketIds } },
    select: { id: true, title: true },
  });
  const marketMap = Object.fromEntries(markets.map((m) => [m.id, m.title]));

  const now = Date.now();
  const trades = aiTrades.map((t) => {
    const diffMs = now - new Date(t.createdAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const ago = diffMin < 60
      ? `${diffMin}m ago`
      : diffMin < 1440
      ? `${Math.floor(diffMin / 60)}h ago`
      : `${Math.floor(diffMin / 1440)}d ago`;

    return {
      side: t.side,
      action: t.action,
      shares: t.shares,
      price: t.price,
      strategy: t.strategy,
      marketTitle: marketMap[t.marketId] ?? "Unknown",
      ago,
    };
  });

  return NextResponse.json({ trades });
}
