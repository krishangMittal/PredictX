import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const where = category && category !== "all" ? { category, status: "active" } : { status: "active" };

  const markets = await prisma.market.findMany({
    where,
    orderBy: { volume: "desc" },
    include: {
      priceHistory: {
        orderBy: { timestamp: "desc" },
        take: 24,
      },
    },
  });

  return NextResponse.json(markets);
}
