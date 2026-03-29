"use client";

import { useEffect, useState } from "react";
import {
  Target,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatCurrency, formatPrice } from "@/lib/utils";

type Market98 = {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  bestSide: "yes" | "no";
  bestPrice: number;
  volume: number;
  endDate: string | null;
  polymarketUrl: string | null;
};

type ActiveBet = {
  marketId: string;
  marketTitle: string;
  entryPrice: number;
  currentPrice: number;
  shares: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  status: "winning" | "losing" | "resolved";
};

type StrategyStats = {
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  totalReturn: number;
  activeBets: number;
  resolvedWins: number;
  resolvedLosses: number;
  winRate: number;
};

export default function Strategy98Page() {
  const [markets, setMarkets] = useState<Market98[]>([]);
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [stats, setStats] = useState<StrategyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState<string | null>(null);
  const [autoTrading, setAutoTrading] = useState(false);
  const [autoBuying, setAutoBuying] = useState(false);
  const [threshold, setThreshold] = useState(98);
  const [betSize, setBetSize] = useState(1000);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second for countdown timers
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [threshold]);

  // Auto-trade: scan every 60s and buy any new opportunities
  useEffect(() => {
    if (!autoTrading) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/strategy-98?threshold=${threshold}`);
      if (!res.ok) return;
      const data = await res.json();
      const opps = (data.opportunities ?? []).filter((m: Market98) => m.bestPrice <= 0.99);
      const existing = new Set((data.activeBets ?? []).map((b: ActiveBet) => b.marketId));
      const newOpps = opps.filter((m: Market98) => !existing.has(m.id));
      for (const m of newOpps) {
        await placeBet(m.id, m.bestPrice, m.bestSide);
      }
      if (newOpps.length > 0) fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoTrading, threshold, betSize]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/strategy-98?threshold=${threshold}`);
      if (res.ok) {
        const data = await res.json();
        setMarkets(data.opportunities ?? []);
        setActiveBets(data.activeBets ?? []);
        setStats(data.stats ?? null);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  async function placeBet(marketId: string, price: number, side: string = "yes") {
    setInvesting(marketId);
    try {
      const shares = Math.floor(betSize / price);
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId,
          side,
          shares,
          username: "trader",
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // silently fail
    }
    setInvesting(null);
  }

  async function buyAll() {
    setAutoBuying(true);
    const eligible = markets.filter((m) => m.bestPrice <= 0.99);
    for (const m of eligible) {
      await placeBet(m.id, m.bestPrice, m.bestSide);
    }
    setAutoBuying(false);
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00ff88]/20 border border-[#00ff88]/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-[#00ff88]">The 98-99</span>
              <span className="text-white/60"> Strategy</span>
            </h1>
            <p className="text-white/30 text-sm mt-0.5">
              Buy near-certainties at 98-99c. Collect the last 1-2 cents. Repeat.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-4 rounded-xl p-5 border bg-gradient-to-r from-[#00ff88]/5 to-[#3b82f6]/5 border-[#00ff88]/20">
          <div className="flex items-start gap-4">
            <Zap className="w-5 h-5 text-[#00ff88] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/50">
              <span className="text-white/80 font-semibold">How it works:</span> Find markets trading at 98-99c (near-certainties).
              Invest ${betSize}. When it resolves YES at $1.00, you profit ${((1 - threshold / 100) * betSize).toFixed(0)}.
              <span className="text-[#00ff88] font-mono font-bold"> {((1 - threshold / 100) * 100).toFixed(0)}% return per bet.</span>
              <span className="text-[#ff4444]/60 ml-2">Risk: if the &quot;sure thing&quot; fails, you lose ~${betSize}.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
          <span className="text-xs text-white/40 uppercase tracking-widest">Min Price</span>
          <div className="flex gap-1">
            {[95, 96, 97, 98, 99].map((t) => (
              <button
                key={t}
                onClick={() => setThreshold(t)}
                className={`px-3 py-1 rounded-lg text-sm font-mono font-bold transition-all ${
                  threshold === t
                    ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {t}c
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
          <span className="text-xs text-white/40 uppercase tracking-widest">Bet Size</span>
          <div className="flex gap-1">
            {[100, 500, 1000, 2000].map((s) => (
              <button
                key={s}
                onClick={() => setBetSize(s)}
                className={`px-3 py-1 rounded-lg text-sm font-mono font-bold transition-all ${
                  betSize === s
                    ? "bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                ${s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={buyAll}
          disabled={autoBuying || markets.filter((m) => m.bestPrice <= 0.99).length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/30 transition-all disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 ${autoBuying ? "animate-spin" : ""}`} />
          {autoBuying ? "Buying all..." : `Buy All ${markets.filter((m) => m.bestPrice <= 0.99).length} Markets`}
        </button>

        <button
          onClick={() => setAutoTrading(!autoTrading)}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold border transition-all ${
            autoTrading
              ? "bg-[#a855f7]/20 text-[#a855f7] border-[#a855f7]/30"
              : "bg-white/5 text-white/40 border-white/10 hover:text-white/60"
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${autoTrading ? "bg-[#a855f7] animate-pulse" : "bg-white/20"}`} />
          Auto-Trade {autoTrading ? "ON" : "OFF"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Invested</p>
            <p className="text-lg font-bold font-mono text-white">{formatCurrency(stats.totalInvested)}</p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Value</p>
            <p className="text-lg font-bold font-mono text-white">{formatCurrency(stats.currentValue)}</p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">P&L</p>
            <p className={`text-lg font-bold font-mono ${stats.totalPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
              {stats.totalPnl >= 0 ? "+" : ""}{formatCurrency(stats.totalPnl)}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Return</p>
            <p className={`text-lg font-bold font-mono ${stats.totalReturn >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
              {stats.totalReturn >= 0 ? "+" : ""}{stats.totalReturn.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Active</p>
            <p className="text-lg font-bold font-mono text-[#3b82f6]">{stats.activeBets}</p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Wins</p>
            <p className="text-lg font-bold font-mono text-[#00ff88]">{stats.resolvedWins}</p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Losses</p>
            <p className="text-lg font-bold font-mono text-[#ff4444]">{stats.resolvedLosses}</p>
          </div>
          <div className="rounded-xl p-3 bg-white/5 border border-white/10">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Win Rate</p>
            <p className="text-lg font-bold font-mono text-white">{stats.winRate.toFixed(0)}%</p>
          </div>
        </div>
      )}

      {/* Countdown to Resolution */}
      {(() => {
        const expiring = markets
          .filter((m) => m.endDate)
          .map((m) => ({ ...m, endTs: new Date(m.endDate!).getTime() }))
          .filter((m) => m.endTs > now)
          .sort((a, b) => a.endTs - b.endTs)
          .slice(0, 5);
        if (expiring.length === 0) return null;
        return (
          <div className="rounded-xl bg-black/60 border border-[#00ff88]/20 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-[#00ff88]/10 flex items-center gap-3">
              <Clock className="w-4 h-4 text-[#00ff88]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#00ff88]/70">
                Countdown to Resolution
              </h2>
              <span className="ml-auto text-xs text-white/20">{expiring.length} expiring soon</span>
            </div>
            <div className="divide-y divide-white/5">
              {expiring.map((m) => {
                const diff = m.endTs - now;
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                const isUrgent = diff < 24 * 3600000; // less than 24h
                const isCritical = diff < 6 * 3600000; // less than 6h
                const price = m.bestPrice;
                const shares = Math.floor(betSize / price);
                const profit = shares * (1 - price);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{m.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            m.bestSide === "yes"
                              ? "bg-[#00ff88]/15 text-[#00ff88]"
                              : "bg-[#ff4444]/15 text-[#ff4444]"
                          }`}
                        >
                          {m.bestSide.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs text-white/40">
                          {formatPrice(price)}
                        </span>
                        <span className="font-mono text-xs text-[#00ff88]">
                          +{formatCurrency(profit)} profit
                        </span>
                      </div>
                    </div>
                    <div
                      className={`font-mono text-lg font-bold tabular-nums tracking-wider px-4 py-2 rounded-lg border ${
                        isCritical
                          ? "text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/30 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                          : isUrgent
                          ? "text-[#00ff88]/80 bg-[#00ff88]/5 border-[#00ff88]/20 shadow-[0_0_8px_rgba(0,255,136,0.15)]"
                          : "text-white/60 bg-white/5 border-white/10"
                      }`}
                    >
                      {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:
                      {String(secs).padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Active Bets */}
      {activeBets.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-[#00ff88]" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Active 98-99 Bets</h2>
            <span className="ml-auto text-xs text-white/20">{activeBets.length} open</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-white/25 font-medium p-4">Market</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Entry</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Current</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Shares</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Invested</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Value</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">P&L</th>
                  <th className="text-center text-xs text-white/25 font-medium p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeBets.map((bet) => (
                  <tr key={bet.marketId} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <p className="text-sm text-white/80 truncate max-w-[300px]">{bet.marketTitle}</p>
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-white/60">{formatPrice(bet.entryPrice)}</td>
                    <td className="p-4 text-right font-mono text-sm text-white/80">{formatPrice(bet.currentPrice)}</td>
                    <td className="p-4 text-right font-mono text-sm text-white/60">{bet.shares}</td>
                    <td className="p-4 text-right font-mono text-sm text-white/60">{formatCurrency(bet.invested)}</td>
                    <td className="p-4 text-right font-mono text-sm text-white/80">{formatCurrency(bet.currentValue)}</td>
                    <td className="p-4 text-right">
                      <span className={`font-mono text-sm font-bold ${bet.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                        {bet.pnl >= 0 ? "+" : ""}{formatCurrency(bet.pnl)}
                      </span>
                      <span className={`block text-xs font-mono ${bet.pnlPct >= 0 ? "text-[#00ff88]/60" : "text-[#ff4444]/60"}`}>
                        {bet.pnlPct >= 0 ? "+" : ""}{bet.pnlPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {bet.status === "winning" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Winning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#ff4444] bg-[#ff4444]/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> At Risk
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Opportunities */}
      <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-[#00ff88]" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
            Opportunities ({threshold}c+)
          </h2>
          <span className="ml-auto text-xs text-white/20">{markets.length} found</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/30 text-sm">Scanning markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-sm">No markets at {threshold}c+ right now. Try lowering the threshold.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-white/25 font-medium p-4">Market</th>
                  <th className="text-center text-xs text-white/25 font-medium p-4">Side</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Price</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Shares for ${betSize}</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Profit</th>
                  <th className="text-right text-xs text-white/25 font-medium p-4">Return</th>
                  <th className="text-center text-xs text-white/25 font-medium p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {markets.filter((m) => m.bestPrice <= 0.99).map((m) => {
                  const price = m.bestPrice;
                  const shares = Math.floor(betSize / price);
                  const profit = shares * (1 - price);
                  const returnPct = ((1 - price) / price) * 100;
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                      <td className="p-4">
                        {m.polymarketUrl ? (
                          <a href={m.polymarketUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-[#3b82f6] transition-colors truncate max-w-[350px] block">{m.title}</a>
                        ) : (
                          <p className="text-sm text-white/80 truncate max-w-[350px]">{m.title}</p>
                        )}
                        <p className="text-xs text-white/25 capitalize">{m.category}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          m.bestSide === "yes" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
                        }`}>
                          {m.bestSide.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-sm font-bold text-[#00ff88]">{formatPrice(price)}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-sm text-white/60">{shares}</td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-sm font-bold text-[#00ff88]">+{formatCurrency(profit)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-sm font-bold text-[#00ff88]">+{returnPct.toFixed(1)}%</span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => placeBet(m.id, price, m.bestSide)}
                          disabled={investing === m.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/25 transition-all disabled:opacity-50"
                        >
                          {investing === m.id ? (
                            "Buying..."
                          ) : (
                            <>
                              Buy ${betSize} <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Risk Warning */}
      <div className="mt-6 rounded-xl p-4 bg-[#ff4444]/5 border border-[#ff4444]/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#ff4444] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-white/40">
          <span className="text-[#ff4444] font-semibold">Risk:</span> If a 98c market resolves NO, you lose ~${betSize}.
          Diversify across many markets. Never bet more than you can afford to lose on a single market.
          This is paper trading - no real money at risk.
        </div>
      </div>
    </div>
  );
}
