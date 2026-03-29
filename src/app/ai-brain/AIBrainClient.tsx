"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { Brain, Zap, Target, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Play, BookOpen, Loader2, Copy } from "lucide-react";

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
  marketTitle: string;
  currentYesPrice: number;
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

type Position = {
  id: string;
  marketTitle: string;
  category: string;
  side: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
};

export function AIBrainClient({
  strategies,
  recentTrades,
  aiPortfolioValue,
  positions = [],
  totalPnl = 0,
}: {
  strategies: Strategy[];
  recentTrades: AITrade[];
  aiBalance?: number;
  aiPortfolioValue: number;
  positions?: Position[];
  totalPnl?: number;
}) {
  const router = useRouter();
  const [tradingLoading, setTradingLoading] = useState(false);
  const [learningLoading, setLearningLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const aiPnl = aiPortfolioValue - 10000;
  const activeStrategies = strategies.filter((s) => s.active);
  const winningTrades = recentTrades.filter((t) => t.outcome === "win").length;
  const totalDecided = recentTrades.filter((t) => t.outcome).length;

  async function runAITrading() {
    setTradingLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/ai/trade", { method: "POST" });
      const data = await res.json();
      setStatusMsg(`AI executed ${data.trades?.length ?? 0} trades`);
      router.refresh();
    } catch {
      setStatusMsg("AI trading cycle failed");
    }
    setTradingLoading(false);
  }

  async function copyTrade(trade: AITrade) {
    setCopyingId(trade.id);
    setStatusMsg("");
    try {
      const price = trade.side === "yes" ? trade.currentYesPrice : (1 - trade.currentYesPrice);
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "cmnc8j4200000tuchypmdmorp",
          marketId: trade.marketId,
          side: trade.side,
          action: "buy",
          shares: Math.min(trade.shares, 20),
          price: +price.toFixed(4),
        }),
      });
      if (res.ok) {
        setStatusMsg(`Copied: ${trade.side.toUpperCase()} on ${trade.marketTitle.slice(0, 30)}...`);
      } else {
        const data = await res.json();
        setStatusMsg(`Copy failed: ${data.error}`);
      }
      router.refresh();
    } catch {
      setStatusMsg("Copy trade failed");
    }
    setCopyingId(null);
  }

  async function runAILearning() {
    setLearningLoading(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/ai/learn", { method: "POST" });
      const data = await res.json();
      setStatusMsg(`Evaluated ${data.evaluated ?? 0} trades, ${data.positions ?? 0} positions`);
      router.refresh();
    } catch {
      setStatusMsg("AI learning cycle failed");
    }
    setLearningLoading(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold">
            AI Trading <span className="text-purple-400">Brain</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAITrading}
            disabled={tradingLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-all disabled:opacity-50"
          >
            {tradingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Run Trading
          </button>
          <button
            onClick={runAILearning}
            disabled={learningLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 transition-all disabled:opacity-50"
          >
            {learningLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BookOpen className="w-3 h-3" />}
            Run Learning
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-8">
        <p className="text-text-muted text-sm">
          Watch the AI learn, adapt, and evolve its trading strategies over time
        </p>
        {statusMsg && (
          <p className="text-xs text-accent-blue">{statusMsg}</p>
        )}
      </div>

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

      {/* Category Exposure */}
      {positions.length > 0 && (() => {
        const catExposure: Record<string, { value: number; count: number }> = {};
        positions.forEach((p) => {
          const cat = p.category || "other";
          if (!catExposure[cat]) catExposure[cat] = { value: 0, count: 0 };
          catExposure[cat].value += p.currentValue;
          catExposure[cat].count++;
        });
        const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
        const cats = Object.entries(catExposure).sort((a, b) => b[1].value - a[1].value);
        const catBarColors: Record<string, string> = {
          geopolitics: "bg-red-400", politics: "bg-blue-400", crypto: "bg-orange-400",
          sports: "bg-green-400", science: "bg-cyan-400", finance: "bg-yellow-400",
          tech: "bg-purple-400", other: "bg-gray-400",
        };

        return (
          <div className="glass rounded-xl p-5 mb-6">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Category Exposure
            </h2>
            <div className="flex h-3 rounded-full overflow-hidden mb-3">
              {cats.map(([cat, data]) => (
                <div
                  key={cat}
                  className={`${catBarColors[cat] || "bg-gray-400"} transition-all`}
                  style={{ width: `${totalValue > 0 ? (data.value / totalValue) * 100 : 0}%` }}
                  title={`${cat}: ${formatCurrency(data.value)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {cats.map(([cat, data]) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-2 h-2 rounded-full ${catBarColors[cat] || "bg-gray-400"}`} />
                  <span className="text-text-muted capitalize">{cat}</span>
                  <span className="font-mono font-semibold">{formatCurrency(data.value)}</span>
                  <span className="text-text-muted">({data.count})</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* P&L Waterfall */}
      {positions.length > 0 && (() => {
        const sorted = [...positions].sort((a, b) => b.pnl - a.pnl);
        const winners = sorted.filter(p => p.pnl > 0.01);
        const losers = sorted.filter(p => p.pnl < -0.01);
        const maxAbs = Math.max(...sorted.map(p => Math.abs(p.pnl)), 1);
        const topMovers = [...winners.slice(0, 5), ...losers.slice(-5)].sort((a, b) => b.pnl - a.pnl);

        if (topMovers.length === 0) return null;
        return (
          <div className="glass rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-accent-green" />
                P&L Waterfall - Top Movers
              </h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-accent-green font-mono font-bold">
                  {winners.length} winning
                </span>
                <span className="text-accent-red font-mono font-bold">
                  {losers.length} losing
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {topMovers.map((pos) => (
                <div key={pos.id} className="flex items-center gap-3">
                  <div className="w-[180px] sm:w-[250px] truncate text-xs text-text-muted flex-shrink-0">
                    {pos.marketTitle}
                  </div>
                  <div className="flex-1 flex items-center h-5">
                    <div className="w-1/2 flex justify-end">
                      {pos.pnl < 0 && (
                        <div
                          className="h-4 rounded-l bg-accent-red/60 transition-all"
                          style={{ width: `${Math.min((Math.abs(pos.pnl) / maxAbs) * 100, 100)}%` }}
                        />
                      )}
                    </div>
                    <div className="w-px h-5 bg-white/20 flex-shrink-0" />
                    <div className="w-1/2">
                      {pos.pnl > 0 && (
                        <div
                          className="h-4 rounded-r bg-accent-green/60 transition-all"
                          style={{ width: `${Math.min((Math.abs(pos.pnl) / maxAbs) * 100, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <div className={`w-16 text-right text-xs font-mono font-bold flex-shrink-0 ${
                    pos.pnl >= 0 ? "text-accent-green" : "text-accent-red"
                  }`}>
                    {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Open Positions P&L */}
      {positions.length > 0 && (
        <div className="glass rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-blue" />
              Open Positions ({positions.length})
            </h2>
            <div className={`text-sm font-bold font-mono ${totalPnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
              Total P&L: {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-white/5">
                  <th className="text-left pb-2 pr-3">Market</th>
                  <th className="text-center pb-2 px-2">Side</th>
                  <th className="text-right pb-2 px-2">Shares</th>
                  <th className="text-right pb-2 px-2">Entry</th>
                  <th className="text-right pb-2 px-2">Current</th>
                  <th className="text-right pb-2 px-2">Value</th>
                  <th className="text-right pb-2 pl-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.sort((a, b) => b.pnl - a.pnl).map((pos) => (
                  <tr key={pos.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          pos.category === "geopolitics" ? "bg-orange-400" :
                          pos.category === "sports" ? "bg-green-400" :
                          pos.category === "crypto" ? "bg-yellow-400" :
                          pos.category === "politics" ? "bg-blue-400" : "bg-purple-400"
                        }`} />
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{pos.marketTitle}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        pos.side === "yes" ? "bg-accent-green/15 text-accent-green" : "bg-accent-red/15 text-accent-red"
                      }`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">{pos.shares}</td>
                    <td className="py-2 px-2 text-right font-mono">{(pos.avgPrice * 100).toFixed(1)}¢</td>
                    <td className="py-2 px-2 text-right font-mono">{(pos.currentPrice * 100).toFixed(1)}¢</td>
                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(pos.currentValue)}</td>
                    <td className={`py-2 pl-2 text-right font-mono font-bold ${pos.pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                      {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                      <span className="text-text-muted font-normal ml-1">
                        ({pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-foreground truncate max-w-[70%]">{trade.marketTitle}</p>
                    <div className="flex items-center gap-2">
                      {trade.outcome === "win" && <CheckCircle className="w-3 h-3 text-accent-green" />}
                      {trade.outcome === "loss" && <AlertCircle className="w-3 h-3 text-accent-red" />}
                      {!trade.outcome && <Clock className="w-3 h-3 text-text-muted" />}
                      <span className="text-xs text-text-muted">{timeAgo(new Date(trade.createdAt))}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold uppercase ${
                      trade.action === "buy" ? "text-accent-green" : "text-accent-red"
                    }`}>
                      {trade.action}
                    </span>
                    <span className={`text-xs ${trade.side === "yes" ? "text-accent-green" : "text-accent-red"}`}>
                      {trade.side.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono">{trade.shares} shares @ {(trade.price * 100).toFixed(0)}¢</span>
                  </div>
                  <p className="text-xs text-text-muted italic mb-2">&quot;{trade.reasoning}&quot;</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-purple-400">Strategy: {trade.strategy}</p>
                    <button
                      onClick={() => copyTrade(trade)}
                      disabled={copyingId === trade.id}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 transition-all disabled:opacity-50"
                    >
                      {copyingId === trade.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                      Copy Trade
                    </button>
                  </div>
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
