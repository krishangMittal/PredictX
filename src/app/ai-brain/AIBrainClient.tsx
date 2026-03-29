"use client";

import { formatCurrency, timeAgo } from "@/lib/utils";
import { Brain, Zap, Target, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from "lucide-react";

type Strategy = {
  id: string;
  name: string;
  rule: string;
  confidence: number;
  winRate: number;
  trades: number;
  profit: number;
  active: boolean;
  updatedAt: string;
};

type AITrade = {
  id: string;
  marketId: string;
  side: string;
  action: string;
  shares: number;
  price: number;
  reasoning: string;
  strategy: string;
  outcome: string | null;
  pnl: number | null;
  createdAt: string;
};

export function AIBrainClient({
  strategies,
  recentTrades,
  aiPortfolioValue,
}: {
  strategies: Strategy[];
  recentTrades: AITrade[];
  aiBalance?: number;
  aiPortfolioValue: number;
}) {
  const aiPnl = aiPortfolioValue - 10000;
  const activeStrategies = strategies.filter((s) => s.active);
  const winningTrades = recentTrades.filter((t) => t.outcome === "win").length;
  const totalDecided = recentTrades.filter((t) => t.outcome).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Brain className="w-8 h-8 text-purple-400" />
        <h1 className="text-3xl font-bold">
          AI Trading <span className="text-purple-400">Brain</span>
        </h1>
      </div>
      <p className="text-text-muted text-sm mb-8">
        Watch the AI learn, adapt, and evolve its trading strategies over time
      </p>

      {/* AI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 text-text-muted">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs">AI Portfolio</span>
          </div>
          <p className="text-xl font-bold font-mono">{formatCurrency(aiPortfolioValue)}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 text-text-muted">
            {aiPnl >= 0 ? <TrendingUp className="w-4 h-4 text-accent-green" /> : <TrendingDown className="w-4 h-4 text-accent-red" />}
            <span className="text-xs">AI P&L</span>
          </div>
          <p className={`text-xl font-bold font-mono ${aiPnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
            {aiPnl >= 0 ? "+" : ""}{formatCurrency(aiPnl)}
          </p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 text-text-muted">
            <Target className="w-4 h-4 text-accent-blue" />
            <span className="text-xs">Active Strategies</span>
          </div>
          <p className="text-xl font-bold font-mono">{activeStrategies.length}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2 text-text-muted">
            <CheckCircle className="w-4 h-4 text-accent-green" />
            <span className="text-xs">Win Rate</span>
          </div>
          <p className="text-xl font-bold font-mono">
            {totalDecided > 0 ? `${((winningTrades / totalDecided) * 100).toFixed(0)}%` : "N/A"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategies */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Strategy Journal
          </h2>

          {strategies.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-50" />
              <p className="text-text-muted text-sm">The AI hasn&apos;t developed strategies yet.</p>
              <p className="text-text-muted text-xs mt-1">It will learn from market data over time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className={`bg-surface-light rounded-lg p-4 border-l-2 ${
                    strategy.active ? "border-purple-400" : "border-text-muted opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">{strategy.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      strategy.active ? "bg-purple-500/20 text-purple-400" : "bg-gray-500/20 text-gray-400"
                    }`}>
                      {strategy.active ? "Active" : "Retired"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">{strategy.rule}</p>
                  <div className="flex gap-4 text-xs">
                    <span>Confidence: <strong className="text-foreground">{(strategy.confidence * 100).toFixed(0)}%</strong></span>
                    <span>Win rate: <strong className={strategy.winRate >= 0.5 ? "text-accent-green" : "text-accent-red"}>{(strategy.winRate * 100).toFixed(0)}%</strong></span>
                    <span>Trades: <strong className="text-foreground">{strategy.trades}</strong></span>
                    <span>Profit: <strong className={strategy.profit >= 0 ? "text-accent-green" : "text-accent-red"}>{formatCurrency(strategy.profit)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Trade Log */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            AI Trade Log
          </h2>

          {recentTrades.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-50" />
              <p className="text-text-muted text-sm">The AI hasn&apos;t made any trades yet.</p>
              <p className="text-text-muted text-xs mt-1">Trades will appear here as the AI learns.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="bg-surface-light rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase ${
                        trade.action === "buy" ? "text-accent-green" : "text-accent-red"
                      }`}>
                        {trade.action}
                      </span>
                      <span className={`text-xs ${trade.side === "yes" ? "text-accent-green" : "text-accent-red"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono">{trade.shares} shares</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {trade.outcome === "win" && <CheckCircle className="w-3 h-3 text-accent-green" />}
                      {trade.outcome === "loss" && <AlertCircle className="w-3 h-3 text-accent-red" />}
                      {!trade.outcome && <Clock className="w-3 h-3 text-text-muted" />}
                      <span className="text-xs text-text-muted">{timeAgo(new Date(trade.createdAt))}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted italic">&quot;{trade.reasoning}&quot;</p>
                  <p className="text-xs text-purple-400 mt-1">Strategy: {trade.strategy}</p>
                  {trade.pnl !== null && (
                    <p className={`text-xs font-mono mt-1 ${trade.pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                      P&L: {trade.pnl >= 0 ? "+" : ""}{formatCurrency(trade.pnl)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
