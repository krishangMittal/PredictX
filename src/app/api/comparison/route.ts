import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

type UserWithRelations = {
  balance: number;
  positions: {
    side: string;
    shares: number;
    market: { yesPrice: number; noPrice: number };
  }[];
  trades: { id: string }[];
} | null;

function calcStats(user: UserWithRelations) {
  if (!user) return { balance: 10000, portfolioValue: 10000, pnl: 0, roi: 0, trades: 0, positions: 0 };

  const posValue = user.positions.reduce((sum, p) => {
    const price = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
    return sum + price * p.shares;
  }, 0);

  const portfolioValue = user.balance + posValue;
  const pnl = portfolioValue - 10000;
  const roi = (pnl / 10000) * 100;

  return {
    balance: user.balance,
    portfolioValue,
    pnl,
    roi,
    trades: user.trades.length,
    positions: user.positions.length,
  };
}

export async function GET() {
  try {
    const [trader, aiTrader] = await Promise.all([
      prisma.user.findUnique({
        where: { username: "trader" },
        include: {
          positions: { include: { market: true } },
          trades: { orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.user.findUnique({
        where: { username: "ai-trader" },
        include: {
          positions: { include: { market: true } },
          trades: { orderBy: { createdAt: "desc" } },
        },
      }),
    ]);

    return NextResponse.json({
      human: calcStats(trader),
      ai: calcStats(aiTrader),
    });
  } catch {
    const empty = { balance: 10000, portfolioValue: 10000, pnl: 0, roi: 0, trades: 0, positions: 0 };
    return NextResponse.json({ human: empty, ai: empty });
  }
}
