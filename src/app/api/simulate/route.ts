import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { runAITradingCycle, runAILearningCycle } from "@/lib/ai-engine";
import { fetchPolymarkets, polymarketToLocal } from "@/lib/polymarket";

export async function POST() {
  try {
    // Try to sync real prices from Polymarket first
    const updates: { id: string; yesPrice: number; noPrice: number; volume: number }[] = [];
    let syncedFromPolymarket = false;

    try {
      const pmMarkets = await fetchPolymarkets({ limit: 100, order: "volume1wk" });
      const pmMap = new Map(pmMarkets.map(m => [m.id, m]));

      const dbMarkets = await prisma.market.findMany({
        where: { status: "active", polymarketId: { not: null } },
      });

      for (const dbMarket of dbMarkets) {
        const pm = pmMap.get(dbMarket.polymarketId!);
        if (pm) {
          const data = polymarketToLocal(pm);
          updates.push({
            id: dbMarket.id,
            yesPrice: data.yesPrice,
            noPrice: data.noPrice,
            volume: data.volume,
          });
        }
      }
      syncedFromPolymarket = updates.length > 0;
    } catch {
      // Polymarket API unavailable, fall back to local simulation
    }

    // Fallback: simulate for non-Polymarket markets or if API failed
    if (!syncedFromPolymarket) {
      const markets = await prisma.market.findMany({ where: { status: "active" } });
      for (const market of markets) {
        const volatility = 0.008;
        const drift = (0.5 - market.yesPrice) * 0.005;
        const noise = (Math.random() - 0.5) * 2 * volatility;
        const newYesPrice = Math.max(0.02, Math.min(0.98, market.yesPrice + drift + noise));
        updates.push({
          id: market.id,
          yesPrice: +newYesPrice.toFixed(4),
          noPrice: +(1 - newYesPrice).toFixed(4),
          volume: market.volume + Math.floor(Math.random() * 2000) + 100,
        });
      }
    }

    for (const update of updates) {
      await prisma.market.update({
        where: { id: update.id },
        data: {
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          volume: update.volume,
        },
      });

      await prisma.priceHistory.create({
        data: {
          marketId: update.id,
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
          volume: 0,
        },
      });
    }

    // Record portfolio snapshots for all users every tick
    try {
      const users = await prisma.user.findMany({
        include: { positions: { include: { market: true } } },
      });
      for (const user of users) {
        const positionValue = user.positions.reduce((sum, p) => {
          const currentPrice = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
          return sum + currentPrice * p.shares;
        }, 0);
        await prisma.portfolioSnapshot.create({
          data: {
            userId: user.id,
            portfolioValue: user.balance + positionValue,
            cashBalance: user.balance,
            positionValue,
          },
        });
      }
    } catch {
      // Non-critical - snapshot recording failure shouldn't break simulation
    }

    // Check and fill limit orders
    try {
      const openOrders = await prisma.limitOrder.findMany({
        where: { status: "open" },
        include: { user: true, market: true },
      });
      for (const order of openOrders) {
        const currentPrice = order.side === "yes" ? order.market.yesPrice : order.market.noPrice;
        const shouldFill =
          (order.action === "buy" && currentPrice <= order.limitPrice) ||
          (order.action === "sell" && currentPrice >= order.limitPrice);

        if (shouldFill) {
          const total = order.shares * currentPrice;

          if (order.action === "buy") {
            if (order.user.balance < total) continue;
            await prisma.user.update({
              where: { id: order.userId },
              data: { balance: { decrement: total } },
            });
            const existingPos = await prisma.position.findFirst({
              where: { userId: order.userId, marketId: order.marketId, side: order.side },
            });
            if (existingPos) {
              const totalShares = existingPos.shares + order.shares;
              const newAvgPrice =
                (existingPos.avgPrice * existingPos.shares + currentPrice * order.shares) / totalShares;
              await prisma.position.update({
                where: { id: existingPos.id },
                data: { shares: totalShares, avgPrice: newAvgPrice },
              });
            } else {
              await prisma.position.create({
                data: { userId: order.userId, marketId: order.marketId, side: order.side, shares: order.shares, avgPrice: currentPrice },
              });
            }
          } else {
            const existingPos = await prisma.position.findFirst({
              where: { userId: order.userId, marketId: order.marketId, side: order.side },
            });
            if (!existingPos || existingPos.shares < order.shares) continue;
            await prisma.user.update({
              where: { id: order.userId },
              data: { balance: { increment: total } },
            });
            const newShares = existingPos.shares - order.shares;
            if (newShares <= 0.001) {
              await prisma.position.delete({ where: { id: existingPos.id } });
            } else {
              await prisma.position.update({
                where: { id: existingPos.id },
                data: { shares: newShares },
              });
            }
          }

          await prisma.trade.create({
            data: {
              userId: order.userId,
              marketId: order.marketId,
              side: order.side,
              action: order.action,
              type: "limit",
              shares: order.shares,
              price: currentPrice,
              total,
            },
          });

          await prisma.limitOrder.update({
            where: { id: order.id },
            data: { status: "filled", filledAt: new Date() },
          });
        }
      }
    } catch {
      // Non-critical
    }

    // Trigger AI trading (every ~5th tick to avoid overtrading)
    let aiResult = null;
    if (Math.random() < 0.2) {
      try {
        const aiTrades = await runAITradingCycle();
        aiResult = { tradesExecuted: aiTrades.length, trades: aiTrades };
      } catch {
        // Non-critical
      }
    }

    // AI learning cycle (every ~10th tick)
    if (Math.random() < 0.1) {
      try {
        await runAILearningCycle();
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      prices: updates.map((u) => ({
        id: u.id,
        yesPrice: u.yesPrice,
        noPrice: u.noPrice,
      })),
      news: null,
      syncedFromPolymarket,
      ai: aiResult,
    });
  } catch (error) {
    console.error("Simulation error:", error);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
