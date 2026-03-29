import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// AI Trading Brain - makes trades based on learned strategies
const INITIAL_STRATEGIES = [
  {
    name: "Mean Reversion",
    rule: "Buy when price drops below 0.35 or above 0.65 (bet on reversion to 0.50). Higher confidence when price is more extreme.",
    confidence: 0.6,
  },
  {
    name: "Momentum Follow",
    rule: "Buy YES when price has risen >5% in recent history, buy NO when price has fallen >5%. Follow the trend.",
    confidence: 0.4,
  },
  {
    name: "Value Hunting",
    rule: "Look for markets where price is far from 0.50 with long time to expiry. These are mispriced and tend to correct.",
    confidence: 0.5,
  },
  {
    name: "Contrarian",
    rule: "When a market has very high volume and extreme prices (>0.80 or <0.20), bet against the crowd.",
    confidence: 0.35,
  },
  {
    name: "Small Positions",
    rule: "Never risk more than 5% of portfolio on a single trade. Diversify across categories.",
    confidence: 0.7,
  },
];

export async function POST() {
  try {
    const aiUser = await prisma.user.findUnique({
      where: { username: "ai-trader" },
      include: {
        positions: { include: { market: true } },
      },
    });

    if (!aiUser) {
      return NextResponse.json({ error: "AI trader not found" }, { status: 404 });
    }

    // Ensure strategies exist
    const existingStrategies = await prisma.aIStrategy.findMany();
    if (existingStrategies.length === 0) {
      for (const s of INITIAL_STRATEGIES) {
        await prisma.aIStrategy.create({
          data: { name: s.name, rule: s.rule, confidence: s.confidence },
        });
      }
    }

    const strategies = await prisma.aIStrategy.findMany({ where: { active: true } });
    const markets = await prisma.market.findMany({
      where: { status: "active" },
      include: {
        priceHistory: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
      },
    });

    const portfolioValue =
      aiUser.balance +
      aiUser.positions.reduce((sum, p) => {
        const px = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
        return sum + px * p.shares;
      }, 0);

    const maxPositionSize = portfolioValue * 0.05; // 5% max per trade
    const trades: Array<{ marketId: string; side: string; action: string; shares: number; price: number; reasoning: string; strategy: string }> = [];

    // Evaluate each market
    for (const market of markets) {
      // Skip if AI already has a large position
      const existingPos = aiUser.positions.find((p) => p.marketId === market.id);
      if (existingPos && existingPos.shares * existingPos.avgPrice > maxPositionSize * 2) continue;

      const prices = market.priceHistory.map((p) => p.yesPrice);
      const recentAvg = prices.slice(0, 10).reduce((a, b) => a + b, 0) / Math.min(prices.length, 10);
      const olderAvg = prices.slice(10, 30).reduce((a, b) => a + b, 0) / Math.max(prices.slice(10, 30).length, 1);
      const momentum = recentAvg - olderAvg;

      // Strategy evaluation
      type Signal = { side: "yes" | "no"; confidence: number; strategy: string; reasoning: string };
      let bestSignal: Signal | null = null;

      for (const strat of strategies) {
        let signal: Signal | null = null;

        if (strat.name === "Mean Reversion") {
          if (market.yesPrice < 0.35) {
            const conf = strat.confidence * (1 + (0.35 - market.yesPrice) * 2);
            signal = { side: "yes", confidence: conf, strategy: strat.name, reasoning: `YES price at ${(market.yesPrice * 100).toFixed(0)}¢ is below 35¢ threshold - expecting reversion upward` };
          } else if (market.yesPrice > 0.65) {
            const conf = strat.confidence * (1 + (market.yesPrice - 0.65) * 2);
            signal = { side: "no", confidence: conf, strategy: strat.name, reasoning: `YES price at ${(market.yesPrice * 100).toFixed(0)}¢ is above 65¢ threshold - expecting reversion downward` };
          }
        }

        if (strat.name === "Momentum Follow") {
          if (momentum > 0.03) {
            signal = { side: "yes", confidence: strat.confidence * (1 + momentum * 5), strategy: strat.name, reasoning: `Positive momentum of ${(momentum * 100).toFixed(1)}% detected - following the uptrend` };
          } else if (momentum < -0.03) {
            signal = { side: "no", confidence: strat.confidence * (1 + Math.abs(momentum) * 5), strategy: strat.name, reasoning: `Negative momentum of ${(momentum * 100).toFixed(1)}% detected - following the downtrend` };
          }
        }

        if (strat.name === "Value Hunting") {
          const daysLeft = (new Date(market.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysLeft > 30 && Math.abs(market.yesPrice - 0.5) > 0.15) {
            const side = market.yesPrice > 0.5 ? "no" : "yes";
            signal = { side, confidence: strat.confidence * (daysLeft / 90), strategy: strat.name, reasoning: `${daysLeft.toFixed(0)} days to expiry with price at ${(market.yesPrice * 100).toFixed(0)}¢ - plenty of time for correction` };
          }
        }

        if (strat.name === "Contrarian") {
          if (market.volume > 500000 && (market.yesPrice > 0.80 || market.yesPrice < 0.20)) {
            const side = market.yesPrice > 0.5 ? "no" : "yes";
            signal = { side, confidence: strat.confidence, strategy: strat.name, reasoning: `High volume market at extreme price ${(market.yesPrice * 100).toFixed(0)}¢ - betting against the crowd` };
          }
        }

        if (signal && (!bestSignal || signal.confidence > bestSignal.confidence)) {
          bestSignal = signal;
        }
      }

      // Only trade if confidence is high enough and random factor agrees (adds variety)
      if (bestSignal && bestSignal.confidence > 0.45 && Math.random() < 0.3) {
        const price = bestSignal.side === "yes" ? market.yesPrice : market.noPrice;
        const maxShares = Math.floor(Math.min(maxPositionSize, aiUser.balance * 0.1) / price);
        const shares = Math.max(5, Math.floor(maxShares * (0.3 + Math.random() * 0.7)));

        if (shares > 0 && shares * price <= aiUser.balance) {
          trades.push({
            marketId: market.id,
            side: bestSignal.side,
            action: "buy",
            shares,
            price,
            reasoning: bestSignal.reasoning,
            strategy: bestSignal.strategy,
          });
        }
      }

      // Consider selling existing positions
      if (existingPos) {
        const currentPrice = existingPos.side === "yes" ? market.yesPrice : market.noPrice;
        const pnlPct = (currentPrice - existingPos.avgPrice) / existingPos.avgPrice;

        // Take profit at 20%+ or cut loss at -15%+
        if (pnlPct > 0.20 && Math.random() < 0.4) {
          const sellShares = Math.floor(existingPos.shares * (0.3 + Math.random() * 0.5));
          if (sellShares > 0) {
            trades.push({
              marketId: market.id,
              side: existingPos.side,
              action: "sell",
              shares: sellShares,
              price: currentPrice,
              reasoning: `Taking profit: ${(pnlPct * 100).toFixed(1)}% gain on position`,
              strategy: "Risk Management",
            });
          }
        } else if (pnlPct < -0.15 && Math.random() < 0.3) {
          const sellShares = Math.floor(existingPos.shares * 0.5);
          if (sellShares > 0) {
            trades.push({
              marketId: market.id,
              side: existingPos.side,
              action: "sell",
              shares: sellShares,
              price: currentPrice,
              reasoning: `Cutting loss: ${(pnlPct * 100).toFixed(1)}% loss on position`,
              strategy: "Risk Management",
            });
          }
        }
      }
    }

    // Execute trades (limit to 3 per cycle)
    const executedTrades = [];
    for (const trade of trades.slice(0, 3)) {
      try {
        const total = trade.shares * trade.price;

        if (trade.action === "buy") {
          if (aiUser.balance < total) continue;

          await prisma.user.update({
            where: { id: aiUser.id },
            data: { balance: { decrement: total } },
          });
          aiUser.balance -= total;

          const existingPos = await prisma.position.findFirst({
            where: { userId: aiUser.id, marketId: trade.marketId, side: trade.side },
          });

          if (existingPos) {
            const totalShares = existingPos.shares + trade.shares;
            const newAvg = (existingPos.avgPrice * existingPos.shares + trade.price * trade.shares) / totalShares;
            await prisma.position.update({
              where: { id: existingPos.id },
              data: { shares: totalShares, avgPrice: newAvg },
            });
          } else {
            await prisma.position.create({
              data: { userId: aiUser.id, marketId: trade.marketId, side: trade.side, shares: trade.shares, avgPrice: trade.price },
            });
          }
        } else {
          const existingPos = await prisma.position.findFirst({
            where: { userId: aiUser.id, marketId: trade.marketId, side: trade.side },
          });
          if (!existingPos || existingPos.shares < trade.shares) continue;

          await prisma.user.update({
            where: { id: aiUser.id },
            data: { balance: { increment: total } },
          });
          aiUser.balance += total;

          const newShares = existingPos.shares - trade.shares;
          if (newShares <= 0.001) {
            await prisma.position.delete({ where: { id: existingPos.id } });
          } else {
            await prisma.position.update({
              where: { id: existingPos.id },
              data: { shares: newShares },
            });
          }
        }

        // Record trade
        await prisma.trade.create({
          data: {
            userId: aiUser.id,
            marketId: trade.marketId,
            side: trade.side,
            action: trade.action,
            shares: trade.shares,
            price: trade.price,
            total,
          },
        });

        // Record AI trade with reasoning
        await prisma.aITrade.create({
          data: {
            marketId: trade.marketId,
            side: trade.side,
            action: trade.action,
            shares: trade.shares,
            price: trade.price,
            reasoning: trade.reasoning,
            strategy: trade.strategy,
            outcome: "pending",
          },
        });

        // Update strategy trade count
        const strat = await prisma.aIStrategy.findFirst({ where: { name: trade.strategy } });
        if (strat) {
          await prisma.aIStrategy.update({
            where: { id: strat.id },
            data: { trades: { increment: 1 } },
          });
        }

        executedTrades.push(trade);
      } catch (e) {
        console.error("AI trade execution error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      tradesExecuted: executedTrades.length,
      trades: executedTrades,
    });
  } catch (error) {
    console.error("AI trading error:", error);
    return NextResponse.json({ error: "AI trading failed" }, { status: 500 });
  }
}
