import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, marketId, side, shares, price } = await request.json();

    if (!userId || !marketId || !side || !shares || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const total = shares * price;

    // Check user balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.balance < total) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Deduct balance
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: total } },
    });

    // Create trade
    const trade = await prisma.trade.create({
      data: {
        userId,
        marketId,
        side,
        action: "buy",
        shares,
        price,
        total,
      },
    });

    // Update or create position
    const existingPosition = await prisma.position.findFirst({
      where: { userId, marketId, side },
    });

    if (existingPosition) {
      const totalShares = existingPosition.shares + shares;
      const newAvgPrice =
        (existingPosition.avgPrice * existingPosition.shares + price * shares) / totalShares;
      await prisma.position.update({
        where: { id: existingPosition.id },
        data: { shares: totalShares, avgPrice: newAvgPrice },
      });
    } else {
      await prisma.position.create({
        data: { userId, marketId, side, shares, avgPrice: price },
      });
    }

    // Update market volume
    await prisma.market.update({
      where: { id: marketId },
      data: { volume: { increment: total } },
    });

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json({ error: "Trade failed" }, { status: 500 });
  }
}
