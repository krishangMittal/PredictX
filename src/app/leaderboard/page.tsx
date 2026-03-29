import { prisma } from "@/lib/db";
import { LeaderboardClient } from "./LeaderboardClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    include: {
      positions: {
        include: { market: true },
      },
      trades: true,
    },
  });

  const leaderboard = users.map((user) => {
    const positionValue = user.positions.reduce((sum, p) => {
      const price = p.side === "yes" ? p.market.yesPrice : p.market.noPrice;
      return sum + price * p.shares;
    }, 0);

    const portfolioValue = user.balance + positionValue;
    const pnl = portfolioValue - 10000;
    const roi = (pnl / 10000) * 100;

    const buys = user.trades.filter((t) => t.action === "buy").length;
    const sells = user.trades.filter((t) => t.action === "sell").length;

    return {
      username: user.username,
      portfolioValue,
      pnl,
      roi,
      trades: user.trades.length,
      positions: user.positions.length,
      buys,
      sells,
    };
  });

  leaderboard.sort((a, b) => b.portfolioValue - a.portfolioValue);

  return <LeaderboardClient leaderboard={leaderboard} />;
}
