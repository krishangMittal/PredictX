import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const range = request.nextUrl.searchParams.get("range") || "1D";

    const user = await prisma.user.findUnique({ where: { username: "trader" } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let since: Date;
    const now = new Date();
    switch (range) {
      case "1H":
        since = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "1D":
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "1W":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "ALL":
        since = new Date(0);
        break;
      default:
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: {
        userId: user.id,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "asc" },
      select: {
        portfolioValue: true,
        cashBalance: true,
        positionValue: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      snapshots: snapshots.map((s) => ({
        value: s.portfolioValue,
        cash: s.cashBalance,
        positions: s.positionValue,
        time: s.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Portfolio history error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
