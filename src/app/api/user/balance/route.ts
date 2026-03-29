import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: "trader" },
      include: {
        positions: {
          include: { market: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ balance: 10000, portfolioValue: 10000 });
    }

    const positionValue = user.positions.reduce((sum, p) => {
      const price = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
      return sum + price * p.shares;
    }, 0);

    return NextResponse.json({
      balance: user.balance,
      portfolioValue: user.balance + positionValue,
    });
  } catch {
    return NextResponse.json({ balance: 10000, portfolioValue: 10000 });
  }
}
