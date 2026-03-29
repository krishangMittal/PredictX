import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, marketId, side, action, shares, price } = await request.json();

    if (!userId || !marketId || !side || !shares || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tradeAction = action || "buy";
    const total = shares * price;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== "active") {
      return NextResponse.json({ error: "Market not active" }, { status: 400 });
    }

    if (tradeAction === "buy") {
      if (user.balance < total) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }

      // Deduct balance
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: total } },
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
    } else {
      // Sell
      const existingPosition = await prisma.position.findFirst({
        where: { userId, marketId, side },
      });

      if (!existingPosition || existingPosition.shares < shares) {
        return NextResponse.json({ error: "Not enough shares to sell" }, { status: 400 });
      }

      // Add balance
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: total } },
      });

      // Update position
      const newShares = existingPosition.shares - shares;
      if (newShares <= 0.001) {
        await prisma.position.delete({ where: { id: existingPosition.id } });
      } else {
        await prisma.position.update({
          where: { id: existingPosition.id },
          data: { shares: newShares },
        });
      }
    }

    // Create trade record
    const trade = await prisma.trade.create({
      data: {
        userId,
        marketId,
        side,
        action: tradeAction,
        shares,
        price,
        total,
      },
    });

    // Update market volume
    await prisma.market.update({
      where: { id: marketId },
      data: { volume: { increment: total } },
    });

    // Price impact from the trade
    const impact = (shares / (market.liquidity || 100000)) * 0.1;
    const direction = tradeAction === "buy" ? 1 : -1;
    const sideMultiplier = side === "yes" ? 1 : -1;
    const newYesPrice = Math.max(0.02, Math.min(0.98, market.yesPrice + impact * direction * sideMultiplier));

    await prisma.market.update({
      where: { id: marketId },
      data: {
        yesPrice: +newYesPrice.toFixed(4),
        noPrice: +(1 - newYesPrice).toFixed(4),
      },
    });

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json({ error: "Trade failed" }, { status: 500 });
  }
}
