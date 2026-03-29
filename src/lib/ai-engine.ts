import { prisma } from "./db";

// AI Strategy definitions - the AI starts with basic strategies and evolves them
const INITIAL_STRATEGIES = [
  {
    name: "Mean Reversion",
    rule: "Buy when price drops below 30¢ or above 70¢, betting it will revert toward 50¢. Stronger signal when price moves fast.",
    confidence: 0.6,
  },
  {
    name: "Momentum Chaser",
    rule: "Buy in the direction of recent price movement. If price has been rising, buy YES. If falling, buy NO.",
    confidence: 0.5,
  },
  {
    name: "Value Hunter",
    rule: "Look for markets where current price seems mispriced based on time remaining. Markets close to expiry with extreme prices are opportunities.",
    confidence: 0.55,
  },
  {
    name: "Contrarian",
    rule: "Bet against the crowd. When a market is extremely popular (high volume) and price is extreme, take the opposite side.",
    confidence: 0.45,
  },
  {
    name: "Conservative Hedger",
    rule: "Only trade markets with prices between 35-65¢ where the outcome is uncertain. Small position sizes. Take profit at 10%.",
    confidence: 0.65,
  },
];

type MarketData = {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  expiresAt: Date;
  priceHistory: { yesPrice: number; timestamp: Date }[];
};

// Evaluate which strategy should trade and what action to take
function evaluateStrategy(
  strategyName: string,
  market: MarketData,
  confidence: number
): { shouldTrade: boolean; side: "yes" | "no"; reasoning: string } | null {
  const price = market.yesPrice;
  const recentPrices = market.priceHistory.slice(-10).map((p) => p.yesPrice);
  const priceChange = recentPrices.length >= 2 ? recentPrices[recentPrices.length - 1] - recentPrices[0] : 0;
  const daysToExpiry = Math.max(0, (market.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Random factor - AI doesn't always trade
  if (Math.random() > confidence * 0.5) return null;

  switch (strategyName) {
    case "Mean Reversion": {
      if (price < 0.3) {
        return { shouldTrade: true, side: "yes", reasoning: `Price at ${(price * 100).toFixed(0)}¢ is below 30¢ - expecting mean reversion upward` };
      }
      if (price > 0.7) {
        return { shouldTrade: true, side: "no", reasoning: `Price at ${(price * 100).toFixed(0)}¢ is above 70¢ - expecting mean reversion downward` };
      }
      return null;
    }

    case "Momentum Chaser": {
      if (Math.abs(priceChange) < 0.02) return null;
      if (priceChange > 0.02) {
        return { shouldTrade: true, side: "yes", reasoning: `Positive momentum detected: +${(priceChange * 100).toFixed(1)}¢ in recent history` };
      }
      if (priceChange < -0.02) {
        return { shouldTrade: true, side: "no", reasoning: `Negative momentum detected: ${(priceChange * 100).toFixed(1)}¢ in recent history` };
      }
      return null;
    }

    case "Value Hunter": {
      if (daysToExpiry < 30 && (price < 0.2 || price > 0.8)) {
        const side = price < 0.2 ? "yes" : "no";
        return {
          shouldTrade: true,
          side,
          reasoning: `Market expires in ${daysToExpiry.toFixed(0)}d with extreme price ${(price * 100).toFixed(0)}¢ - potential value play`,
        };
      }
      return null;
    }

    case "Contrarian": {
      if (market.volume > 200000 && (price < 0.25 || price > 0.75)) {
        const side = price < 0.25 ? "yes" : "no";
        return {
          shouldTrade: true,
          side,
          reasoning: `High volume ${(market.volume / 1000).toFixed(0)}K with extreme price - betting against the crowd`,
        };
      }
      return null;
    }

    case "Conservative Hedger": {
      if (price >= 0.35 && price <= 0.65) {
        const side = price < 0.5 ? "yes" : "no";
        return {
          shouldTrade: true,
          side,
          reasoning: `Price at ${(price * 100).toFixed(0)}¢ is in the uncertain zone - small conservative bet on ${side}`,
        };
      }
      return null;
    }

    default:
      return null;
  }
}

export async function runAITradingCycle() {
  // Ensure AI strategies exist
  const existingStrategies = await prisma.aIStrategy.findMany();
  if (existingStrategies.length === 0) {
    for (const s of INITIAL_STRATEGIES) {
      await prisma.aIStrategy.create({
        data: {
          name: s.name,
          rule: s.rule,
          confidence: s.confidence,
        },
      });
    }
  }

  // Get AI user
  let aiUser = await prisma.user.findUnique({ where: { username: "ai-trader" } });
  if (!aiUser) {
    aiUser = await prisma.user.create({
      data: { username: "ai-trader", balance: 10000 },
    });
  }

  // Get active strategies
  const strategies = await prisma.aIStrategy.findMany({ where: { active: true } });

  // Get active markets with recent price history
  const markets = await prisma.market.findMany({
    where: { status: "active" },
    include: {
      priceHistory: {
        orderBy: { timestamp: "desc" },
        take: 20,
      },
    },
  });

  const tradesExecuted = [];

  // For each strategy, evaluate each market
  for (const strategy of strategies) {
    // Pick 1-3 random markets to evaluate (don't trade everything)
    const shuffled = markets.sort(() => Math.random() - 0.5).slice(0, 3);

    for (const market of shuffled) {
      const signal = evaluateStrategy(
        strategy.name,
        {
          id: market.id,
          title: market.title,
          category: market.category,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          volume: market.volume,
          expiresAt: market.expiresAt,
          priceHistory: market.priceHistory.reverse(),
        },
        strategy.confidence
      );

      if (!signal) continue;

      // Calculate position size based on confidence (5-50 shares)
      const shares = Math.floor(5 + strategy.confidence * 45);
      const price = signal.side === "yes" ? market.yesPrice : market.noPrice;
      const total = shares * price;

      // Check if AI can afford it
      if (total > aiUser.balance) continue;

      // Execute the trade
      try {
        await prisma.user.update({
          where: { id: aiUser.id },
          data: { balance: { decrement: total } },
        });

        // Update position
        const existingPosition = await prisma.position.findFirst({
          where: { userId: aiUser.id, marketId: market.id, side: signal.side },
        });

        if (existingPosition) {
          const totalShares = existingPosition.shares + shares;
          const newAvg = (existingPosition.avgPrice * existingPosition.shares + price * shares) / totalShares;
          await prisma.position.update({
            where: { id: existingPosition.id },
            data: { shares: totalShares, avgPrice: newAvg },
          });
        } else {
          await prisma.position.create({
            data: {
              userId: aiUser.id,
              marketId: market.id,
              side: signal.side,
              shares,
              avgPrice: price,
            },
          });
        }

        // Record trade
        await prisma.trade.create({
          data: {
            userId: aiUser.id,
            marketId: market.id,
            side: signal.side,
            action: "buy",
            shares,
            price,
            total,
          },
        });

        // Record AI trade with reasoning
        await prisma.aITrade.create({
          data: {
            marketId: market.id,
            side: signal.side,
            action: "buy",
            shares,
            price,
            reasoning: signal.reasoning,
            strategy: strategy.name,
          },
        });

        // Update strategy trade count
        await prisma.aIStrategy.update({
          where: { id: strategy.id },
          data: { trades: { increment: 1 } },
        });

        // Update AI user balance in memory
        aiUser = { ...aiUser, balance: aiUser.balance - total };

        tradesExecuted.push({
          market: market.title,
          strategy: strategy.name,
          side: signal.side,
          shares,
          price,
          reasoning: signal.reasoning,
        });
      } catch (error) {
        console.error("AI trade error:", error);
      }
    }
  }

  return tradesExecuted;
}

// AI self-reflection - review past trades and update strategy confidence
export async function runAILearningCycle() {
  const strategies = await prisma.aIStrategy.findMany();
  const aiUser = await prisma.user.findUnique({ where: { username: "ai-trader" } });
  if (!aiUser) return;

  // Get AI's positions and evaluate them
  const positions = await prisma.position.findMany({
    where: { userId: aiUser.id },
    include: { market: true },
  });

  // Get recent AI trades
  const recentTrades = await prisma.aITrade.findMany({
    where: { outcome: null },
    take: 50,
  });

  // Evaluate pending trades
  for (const trade of recentTrades) {
    const market = await prisma.market.findUnique({ where: { id: trade.marketId } });
    if (!market) continue;

    const currentPrice = trade.side === "yes" ? market.yesPrice : market.noPrice;
    const pnl = (currentPrice - trade.price) * trade.shares;
    const pnlPercent = ((currentPrice - trade.price) / trade.price) * 100;

    // Classify outcome if enough price movement
    if (Math.abs(pnlPercent) > 5) {
      const outcome = pnl > 0 ? "win" : "loss";
      await prisma.aITrade.update({
        where: { id: trade.id },
        data: { outcome, pnl },
      });

      // Update strategy stats
      const strategy = strategies.find((s) => s.name === trade.strategy);
      if (strategy) {
        const allTrades = await prisma.aITrade.findMany({
          where: { strategy: strategy.name, outcome: { not: null } },
        });
        const wins = allTrades.filter((t) => t.outcome === "win").length;
        const winRate = allTrades.length > 0 ? wins / allTrades.length : 0;
        const totalProfit = allTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

        // Adjust confidence based on win rate
        const newConfidence = Math.max(0.1, Math.min(0.95,
          strategy.confidence + (winRate > 0.5 ? 0.02 : -0.02)
        ));

        await prisma.aIStrategy.update({
          where: { id: strategy.id },
          data: {
            winRate,
            profit: totalProfit,
            confidence: newConfidence,
            // Retire consistently losing strategies
            active: winRate > 0.2 || allTrades.length < 5,
          },
        });
      }
    }
  }

  return { evaluated: recentTrades.length, positions: positions.length };
}
