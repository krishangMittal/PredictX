import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { userId, marketId, side, action, shares, limitPrice } = await request.json();

    if (!userId || !marketId || !side || !shares || !limitPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== "active") {
      return NextResponse.json({ error: "Market not active" }, { status: 400 });
    }

    // For buy limit orders, validate user has enough balance at limit price
    if (action === "buy") {
      const maxCost = shares * limitPrice;
      if (user.balance < maxCost) {
        return NextResponse.json({ error: "Insufficient balance for limit order" }, { status: 400 });
      }
    }

    // For sell limit orders, validate user has enough shares
    if (action === "sell") {
      const position = await prisma.position.findFirst({
        where: { userId, marketId, side },
      });
      if (!position || position.shares < shares) {
        return NextResponse.json({ error: "Not enough shares for limit sell" }, { status: 400 });
      }
    }

    const order = await prisma.limitOrder.create({
      data: { userId, marketId, side, action, shares, limitPrice },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Limit order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const orders = await prisma.limitOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { market: { select: { title: true, category: true, yesPrice: true, noPrice: true } } },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        marketTitle: o.market.title,
        category: o.market.category,
        side: o.side,
        action: o.action,
        shares: o.shares,
        limitPrice: o.limitPrice,
        currentPrice: o.side === "yes" ? o.market.yesPrice : o.market.noPrice,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        filledAt: o.filledAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    await prisma.limitOrder.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
