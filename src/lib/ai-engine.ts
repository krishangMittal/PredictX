import { prisma } from "./db";

// AI Strategy definitions - based on proven prediction market research
const INITIAL_STRATEGIES = [
  {
    name: "Favorite-Longshot Bias",
    rule: "Longshots (<10¢) are systematically overpriced. Sell longshot YES, buy heavy favorites. Most proven edge in prediction markets.",
    confidence: 0.75,
  },
  {
    name: "Time Decay",
    rule: "Short-dated markets (<7 days) with extreme prices benefit from time decay. Buy the likely outcome as expiry approaches.",
    confidence: 0.7,
  },
  {
    name: "Availability Bias Fade",
    rule: "Scary/vivid outcomes (wars, pandemics, regime changes) get overpriced. Sell fear. Buy NO on dramatic low-probability events.",
    confidence: 0.65,
  },
  {
    name: "Value Hunter",
    rule: "Find markets where real-world probability differs significantly from market price. Buy underpriced outcomes with >5% edge.",
    confidence: 0.6,
  },
  {
    name: "Cross-Market Correlation",
    rule: "Related markets should move together. When they diverge, trade the gap. E.g., same event with different timeframes.",
    confidence: 0.55,
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
  const daysToExpiry = Math.max(0, (market.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Random factor - AI doesn't always trade
  if (Math.random() > confidence * 0.5) return null;

  switch (strategyName) {
    case "Favorite-Longshot Bias": {
      // Longshots are overpriced - sell them
      if (price < 0.08 && price > 0.005) {
        return { shouldTrade: true, side: "no", reasoning: `Longshot at ${(price * 100).toFixed(1)}¢. Systematic overpricing of low-probability events. BUY NO.` };
      }
      // Heavy favorites are underpriced near resolution
      if (price > 0.92 && daysToExpiry < 14) {
        return { shouldTrade: true, side: "yes", reasoning: `Near-certainty at ${(price * 100).toFixed(0)}¢ with ${daysToExpiry.toFixed(0)}d left. Ride to resolution.` };
      }
      return null;
    }

    case "Time Decay": {
      // Short-dated markets with extreme prices
      if (daysToExpiry < 7) {
        if (price < 0.15) {
          return { shouldTrade: true, side: "no", reasoning: `Only ${daysToExpiry.toFixed(0)}d left at ${(price * 100).toFixed(0)}¢. Time decay favors NO. Event unlikely to happen.` };
        }
        if (price > 0.85) {
          return { shouldTrade: true, side: "yes", reasoning: `Only ${daysToExpiry.toFixed(0)}d left at ${(price * 100).toFixed(0)}¢. Time decay favors YES. Near-certain event.` };
        }
      }
      return null;
    }

    case "Availability Bias Fade": {
      // Scary/dramatic outcomes in geopolitics tend to be overpriced
      const scaryCategories = ["geopolitics", "science"];
      if (scaryCategories.includes(market.category) && price > 0.03 && price < 0.20) {
        return { shouldTrade: true, side: "no", reasoning: `Fear premium in ${market.category}: ${(price * 100).toFixed(0)}¢ for dramatic outcome. Availability bias overprices vivid scenarios.` };
      }
      return null;
    }

    case "Value Hunter": {
      // Mid-range prices where we might have an edge
      if (price > 0.05 && price < 0.15 && market.volume > 1000000) {
        return { shouldTrade: true, side: "yes", reasoning: `Value play: ${(price * 100).toFixed(0)}¢ on high-volume market ($${(market.volume/1000000).toFixed(1)}M). Potential underpricing.` };
      }
      if (price > 0.60 && price < 0.80 && daysToExpiry > 30) {
        return { shouldTrade: true, side: "yes", reasoning: `Long-dated probable outcome at ${(price * 100).toFixed(0)}¢ with ${daysToExpiry.toFixed(0)}d remaining. Value in patience.` };
      }
      return null;
    }

    case "Cross-Market Correlation": {
      // This strategy needs pairs - for now, focus on extreme mispricing
      if (price > 0.20 && price < 0.40 && market.volume > 5000000) {
        return { shouldTrade: true, side: "yes", reasoning: `High-volume uncertain market at ${(price * 100).toFixed(0)}¢. Cross-market analysis suggests YES side underpriced.` };
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
