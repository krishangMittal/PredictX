"use client";

import { formatCurrency } from "@/lib/utils";
import { Trophy, Medal, TrendingUp, TrendingDown, User } from "lucide-react";

type LeaderboardEntry = {
  username: string;
  portfolioValue: number;
  pnl: number;
  roi: number;
  trades: number;
  positions: number;
  buys: number;
  sells: number;
};

export function LeaderboardClient({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">
        <span className="text-accent-blue">Leaderboard</span>
      </h1>
      <p className="text-text-muted text-sm mb-8">Top traders ranked by portfolio performance</p>

      {leaderboard.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-text-muted">
          <Trophy className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No traders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.username === "trader";

            return (
              <div
                key={entry.username}
                className={`glass rounded-xl p-5 transition-all ${
                  isCurrentUser ? "border-accent-blue/30 bg-accent-blue/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    {rank === 1 ? (
                      <Trophy className="w-6 h-6 text-yellow-400" />
                    ) : rank === 2 ? (
                      <Medal className="w-6 h-6 text-gray-300" />
                    ) : rank === 3 ? (
                      <Medal className="w-6 h-6 text-amber-600" />
                    ) : (
                      <span className="text-lg font-bold text-text-muted font-mono">#{rank}</span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-text-muted" />
                      <span className="font-semibold text-sm">
                        @{entry.username}
                        {isCurrentUser && <span className="text-accent-blue ml-1">(you)</span>}
                      </span>
                      {entry.username === "ai-trader" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">AI</span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-text-muted">
                      <span>{entry.trades} trades</span>
                      <span>{entry.positions} positions</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-text-muted">Portfolio</p>
                      <p className="text-lg font-bold font-mono">{formatCurrency(entry.portfolioValue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">P&L</p>
                      <p className={`text-lg font-bold font-mono flex items-center gap-1 ${
                        entry.pnl >= 0 ? "text-accent-green" : "text-accent-red"
                      }`}>
                        {entry.pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {entry.pnl >= 0 ? "+" : ""}{formatCurrency(entry.pnl)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">ROI</p>
                      <p className={`text-lg font-bold font-mono ${
                        entry.roi >= 0 ? "text-accent-green" : "text-accent-red"
                      }`}>
                        {entry.roi >= 0 ? "+" : ""}{entry.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
