import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { marketId, resolution } = await request.json();

    if (!marketId || !["yes", "no"].includes(resolution)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || market.status !== "active") {
      return NextResponse.json({ error: "Market not active" }, { status: 400 });
    }

    // Resolve the market
    const status = resolution === "yes" ? "resolved_yes" : "resolved_no";
    await prisma.market.update({
      where: { id: marketId },
      data: {
        status,
        yesPrice: resolution === "yes" ? 1 : 0,
        noPrice: resolution === "yes" ? 0 : 1,
        resolvedAt: new Date(),
      },
    });

    // Settle all positions
    const positions = await prisma.position.findMany({
      where: { marketId },
      include: { user: true },
    });

    let settled = 0;
    for (const position of positions) {
      const won =
        (resolution === "yes" && position.side === "yes") ||
        (resolution === "no" && position.side === "no");

      if (won) {
        // Pay out $1 per share
        await prisma.user.update({
          where: { id: position.userId },
          data: { balance: { increment: position.shares } },
        });
      }
      // else: shares are worthless, user already paid the cost when buying

      // Delete the position
      await prisma.position.delete({ where: { id: position.id } });
      settled++;
    }

    return NextResponse.json({
      success: true,
      resolution: status,
      positionsSettled: settled,
    });
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json({ error: "Resolution failed" }, { status: 500 });
  }
}
