"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  User,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  BarChart3,
  ArrowLeftRight,
  Sword,
  Shield,
  Activity,
} from "lucide-react";
import { formatCurrency, formatPrice, timeAgo } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStats = {
  username: string;
  balance: number;
  portfolioValue: number;
  positionValue: number;
  pnl: number;
  roi: number;
  totalTrades: number;
  totalBuys: number;
  totalSells: number;
  totalVolume: number;
  positionCount: number;
};

type Strategy = {
  id: string;
  name: string;
  rule: string;
  winRate: number;
  trades: number;
  profit: number;
  confidence: number;
  active: boolean;
};

type CombinedTrade = {
  id: string;
  trader: "human" | "ai";
  marketTitle: string;
  category: string;
  side: string;
  action: string;
  shares: number;
  price: number;
  total: number;
  createdAt: string;
};

type PositionOverlap = {
  marketTitle: string;
  humanSide: string;
  aiSide: string;
  humanShares: number;
  aiShares: number;
  opposing: boolean;
};

type ComparisonData = {
  human: UserStats | null;
  ai: UserStats | null;
  strategies: Strategy[];
  combinedTrades: CombinedTrade[];
  positionOverlap: PositionOverlap[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_STATS: UserStats = {
  username: "—",
  balance: 10000,
  portfolioValue: 10000,
  positionValue: 0,
  pnl: 0,
  roi: 0,
  totalTrades: 0,
  totalBuys: 0,
  totalSells: 0,
  totalVolume: 0,
  positionCount: 0,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  glow,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border transition-all duration-300 ${
        glow
          ? "bg-white/5 border-white/20 shadow-lg"
          : "bg-white/5 border-white/10"
      }`}
    >
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

function CompareBar({
  label,
  humanVal,
  aiVal,
  format,
  higherIsBetter = true,
}: {
  label: string;
  humanVal: number;
  aiVal: number;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const total = Math.abs(humanVal) + Math.abs(aiVal);
  const humanPct = total > 0 ? (Math.abs(humanVal) / total) * 100 : 50;
  const aiPct = 100 - humanPct;

  const humanWins = higherIsBetter ? humanVal >= aiVal : humanVal <= aiVal;

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span
          className={`text-sm font-mono font-bold ${
            humanWins ? "text-[#3b82f6]" : "text-white/40"
          }`}
        >
          {format(humanVal)}
        </span>
        <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
        <span
          className={`text-sm font-mono font-bold ${
            !humanWins ? "text-[#a855f7]" : "text-white/40"
          }`}
        >
          {format(aiVal)}
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{
            width: `${humanPct}%`,
            background: humanWins
              ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
              : "rgba(59,130,246,0.3)",
          }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{
            width: `${aiPct}%`,
            background: !humanWins
              ? "linear-gradient(90deg, #9333ea, #a855f7)"
              : "rgba(168,85,247,0.3)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "strategies" | "overlap">(
    "overview"
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/comparison");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Could not load comparison data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const human = data?.human ?? EMPTY_STATS;
  const ai = data?.ai ?? EMPTY_STATS;

  const humanLeading = human.portfolioValue >= ai.portfolioValue;

  // Who has better roi?
  const humanRoiWin = human.roi >= ai.roi;

  return (
    <div
      className="min-h-screen p-6 max-w-7xl mx-auto"
      style={{ background: "transparent" }}
    >
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 border border-[#3b82f6]/30 flex items-center justify-center">
            <User className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div className="flex items-center gap-2 text-white/20 text-2xl font-bold">
            <span className="text-white/30">vs</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#a855f7]" />
          </div>
          <div className="ml-2">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-[#3b82f6]">Human</span>
              <span className="text-white/30 mx-3">vs</span>
              <span className="text-[#a855f7]">AI</span>
            </h1>
            <p className="text-white/30 text-sm mt-0.5">Live performance comparison</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-xs text-white/30">Live</span>
          </div>
        </div>

        {/* Leader banner */}
        {!loading && (
          <div
            className="mt-4 rounded-xl p-4 border flex items-center gap-4"
            style={{
              background: humanLeading
                ? "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.03))"
                : "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))",
              borderColor: humanLeading ? "rgba(59,130,246,0.3)" : "rgba(168,85,247,0.3)",
            }}
          >
            {humanLeading ? (
              <User className="w-6 h-6 text-[#3b82f6] flex-shrink-0" />
            ) : (
              <Bot className="w-6 h-6 text-[#a855f7] flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold" style={{ color: humanLeading ? "#3b82f6" : "#a855f7" }}>
                {humanLeading ? "Human Trader" : "AI Trader"} is leading
              </p>
              <p className="text-xs text-white/30">
                Portfolio:{" "}
                <span className="font-mono font-bold text-white/60">
                  {formatCurrency(humanLeading ? human.portfolioValue : ai.portfolioValue)}
                </span>
                {" "}· Advantage:{" "}
                <span className="font-mono font-bold" style={{ color: "#00ff88" }}>
                  {formatCurrency(
                    Math.abs(human.portfolioValue - ai.portfolioValue)
                  )}
                </span>
              </p>
            </div>
            <div className="ml-auto">
              <Activity className="w-5 h-5 text-white/10" />
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 border border-white/10 w-fit">
        {(
          [
            { key: "overview", label: "Overview", icon: BarChart3 },
            { key: "trades", label: "Trades", icon: Activity },
            { key: "strategies", label: "AI Strategies", icon: Zap },
            { key: "overlap", label: "Overlap", icon: ArrowLeftRight },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white/10 text-white border border-white/20"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Loading comparison data…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-6 bg-red-500/10 border border-red-500/20 text-center text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Side-by-side stat cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Human column */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-[#3b82f6]" />
                    <span className="text-sm font-bold text-[#3b82f6] uppercase tracking-wider">
                      Human Trader
                    </span>
                    <span className="text-xs text-white/20 font-mono">@{human.username}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Portfolio Value"
                      value={formatCurrency(human.portfolioValue)}
                      color="text-white"
                      glow={humanLeading}
                    />
                    <StatCard
                      label="Cash"
                      value={formatCurrency(human.balance)}
                      sub={`Positions: ${formatCurrency(human.positionValue)}`}
                      color="text-white/80"
                    />
                    <StatCard
                      label="P&amp;L"
                      value={`${human.pnl >= 0 ? "+" : ""}${formatCurrency(human.pnl)}`}
                      color={human.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}
                    />
                    <StatCard
                      label="ROI"
                      value={`${human.roi >= 0 ? "+" : ""}${human.roi.toFixed(2)}%`}
                      color={humanRoiWin ? "text-[#3b82f6]" : "text-white/50"}
                    />
                    <StatCard
                      label="Total Trades"
                      value={String(human.totalTrades)}
                      sub={`${human.totalBuys}B / ${human.totalSells}S`}
                      color="text-white/80"
                    />
                    <StatCard
                      label="Open Positions"
                      value={String(human.positionCount)}
                      color="text-white/80"
                    />
                  </div>
                </div>

                {/* AI column */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-4 h-4 text-[#a855f7]" />
                    <span className="text-sm font-bold text-[#a855f7] uppercase tracking-wider">
                      AI Trader
                    </span>
                    <span className="text-xs text-white/20 font-mono">@{ai.username}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Portfolio Value"
                      value={formatCurrency(ai.portfolioValue)}
                      color="text-white"
                      glow={!humanLeading}
                    />
                    <StatCard
                      label="Cash"
                      value={formatCurrency(ai.balance)}
                      sub={`Positions: ${formatCurrency(ai.positionValue)}`}
                      color="text-white/80"
                    />
                    <StatCard
                      label="P&amp;L"
                      value={`${ai.pnl >= 0 ? "+" : ""}${formatCurrency(ai.pnl)}`}
                      color={ai.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}
                    />
                    <StatCard
                      label="ROI"
                      value={`${ai.roi >= 0 ? "+" : ""}${ai.roi.toFixed(2)}%`}
                      color={!humanRoiWin ? "text-[#a855f7]" : "text-white/50"}
                    />
                    <StatCard
                      label="Total Trades"
                      value={String(ai.totalTrades)}
                      sub={`${ai.totalBuys}B / ${ai.totalSells}S`}
                      color="text-white/80"
                    />
                    <StatCard
                      label="Open Positions"
                      value={String(ai.positionCount)}
                      color="text-white/80"
                    />
                  </div>
                </div>
              </div>

              {/* Performance Comparison Bars */}
              <div className="rounded-xl p-6 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
                    Performance Comparison
                  </h2>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6] inline-block" />
                      <span className="text-white/40">Human</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#a855f7] inline-block" />
                      <span className="text-white/40">AI</span>
                    </span>
                  </div>
                </div>
                <CompareBar
                  label="Portfolio Value"
                  humanVal={human.portfolioValue}
                  aiVal={ai.portfolioValue}
                  format={formatCurrency}
                />
                <CompareBar
                  label="ROI %"
                  humanVal={human.roi}
                  aiVal={ai.roi}
                  format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`}
                />
                <CompareBar
                  label="Total Trades"
                  humanVal={human.totalTrades}
                  aiVal={ai.totalTrades}
                  format={(v) => String(v)}
                />
                <CompareBar
                  label="Open Positions"
                  humanVal={human.positionCount}
                  aiVal={ai.positionCount}
                  format={(v) => String(v)}
                />
                <CompareBar
                  label="Position Value"
                  humanVal={human.positionValue}
                  aiVal={ai.positionValue}
                  format={formatCurrency}
                />
              </div>
            </div>
          )}

          {/* ── TRADES TAB ── */}
          {activeTab === "trades" && (
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
                  Combined Trade Feed
                </h2>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-white/30">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6] inline-block" />
                    Human
                  </span>
                  <span className="flex items-center gap-1.5 text-white/30">
                    <span className="w-2 h-2 rounded-full bg-[#a855f7] inline-block" />
                    AI
                  </span>
                </div>
              </div>
              {data?.combinedTrades.length === 0 ? (
                <div className="p-12 text-center text-white/20 text-sm">No trades yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-xs text-white/25 font-medium p-4">Trader</th>
                        <th className="text-left text-xs text-white/25 font-medium p-4">Market</th>
                        <th className="text-left text-xs text-white/25 font-medium p-4">Action</th>
                        <th className="text-left text-xs text-white/25 font-medium p-4">Side</th>
                        <th className="text-right text-xs text-white/25 font-medium p-4">Shares</th>
                        <th className="text-right text-xs text-white/25 font-medium p-4">Price</th>
                        <th className="text-right text-xs text-white/25 font-medium p-4">Total</th>
                        <th className="text-right text-xs text-white/25 font-medium p-4">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.combinedTrades.map((trade) => (
                        <tr
                          key={`${trade.trader}-${trade.id}`}
                          className="border-b border-white/5 hover:bg-white/3 transition-colors"
                        >
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2 py-0.5 ${
                                trade.trader === "human"
                                  ? "bg-[#3b82f6]/15 text-[#3b82f6]"
                                  : "bg-[#a855f7]/15 text-[#a855f7]"
                              }`}
                            >
                              {trade.trader === "human" ? (
                                <User className="w-3 h-3" />
                              ) : (
                                <Bot className="w-3 h-3" />
                              )}
                              {trade.trader === "human" ? "Human" : "AI"}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-white/80 truncate max-w-[200px]">
                              {trade.marketTitle}
                            </p>
                            <p className="text-xs text-white/25 capitalize">{trade.category}</p>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                                trade.action === "buy" ? "text-[#00ff88]" : "text-[#ff4444]"
                              }`}
                            >
                              {trade.action === "buy" ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {trade.action}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-xs font-bold ${
                                trade.side === "yes" ? "text-[#00ff88]" : "text-[#ff4444]"
                              }`}
                            >
                              {trade.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-sm text-white/60">
                            {trade.shares}
                          </td>
                          <td className="p-4 text-right font-mono text-sm text-white/60">
                            {formatPrice(trade.price)}
                          </td>
                          <td className="p-4 text-right font-mono text-sm text-white/80">
                            {formatCurrency(trade.total)}
                          </td>
                          <td className="p-4 text-right text-xs text-white/25">
                            {timeAgo(new Date(trade.createdAt))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── STRATEGIES TAB ── */}
          {activeTab === "strategies" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                  <Bot className="w-4 h-4 text-[#a855f7]" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
                    AI Strategy Performance
                  </h2>
                  <span className="ml-auto text-xs text-white/20">
                    {data?.strategies.filter((s) => s.active).length ?? 0} active
                  </span>
                </div>
                {!data?.strategies.length ? (
                  <div className="p-12 text-center text-white/20 text-sm">No strategies found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left text-xs text-white/25 font-medium p-4">Strategy</th>
                          <th className="text-left text-xs text-white/25 font-medium p-4">Rule</th>
                          <th className="text-center text-xs text-white/25 font-medium p-4">Status</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Win Rate</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Trades</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Confidence</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.strategies.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-white/5 hover:bg-white/3 transition-colors"
                          >
                            <td className="p-4">
                              <p className="text-sm font-semibold text-white/80">{s.name}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-xs text-white/30 max-w-[220px] truncate">{s.rule}</p>
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  s.active
                                    ? "bg-[#00ff88]/15 text-[#00ff88]"
                                    : "bg-white/5 text-white/20"
                                }`}
                              >
                                {s.active ? "Active" : "Off"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${s.winRate * 100}%`,
                                      background:
                                        s.winRate >= 0.6
                                          ? "#00ff88"
                                          : s.winRate >= 0.4
                                          ? "#f59e0b"
                                          : "#ff4444",
                                    }}
                                  />
                                </div>
                                <span
                                  className={`font-mono text-sm font-bold ${
                                    s.winRate >= 0.6
                                      ? "text-[#00ff88]"
                                      : s.winRate >= 0.4
                                      ? "text-amber-400"
                                      : "text-[#ff4444]"
                                  }`}
                                >
                                  {(s.winRate * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-white/60">
                              {s.trades}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#a855f7] rounded-full"
                                    style={{ width: `${s.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs text-[#a855f7]">
                                  {(s.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-sm font-bold">
                              <span
                                className={s.profit >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}
                              >
                                {s.profit >= 0 ? "+" : ""}
                                {formatCurrency(s.profit)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* AI aggregate stats */}
              {data?.strategies && data.strategies.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">
                      Total Strategies
                    </p>
                    <p className="text-2xl font-bold font-mono text-[#a855f7]">
                      {data.strategies.length}
                    </p>
                  </div>
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Active</p>
                    <p className="text-2xl font-bold font-mono text-[#00ff88]">
                      {data.strategies.filter((s) => s.active).length}
                    </p>
                  </div>
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">
                      Avg Win Rate
                    </p>
                    <p className="text-2xl font-bold font-mono text-white/80">
                      {(
                        (data.strategies.reduce((s, x) => s + x.winRate, 0) /
                          data.strategies.length) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">
                      Total Profit
                    </p>
                    <p
                      className={`text-2xl font-bold font-mono ${
                        data.strategies.reduce((s, x) => s + x.profit, 0) >= 0
                          ? "text-[#00ff88]"
                          : "text-[#ff4444]"
                      }`}
                    >
                      {formatCurrency(data.strategies.reduce((s, x) => s + x.profit, 0))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── OVERLAP TAB ── */}
          {activeTab === "overlap" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                  <ArrowLeftRight className="w-4 h-4 text-white/40" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">
                    Position Overlap
                  </h2>
                  <span className="ml-auto text-xs text-white/20">
                    {data?.positionOverlap.length ?? 0} shared markets
                  </span>
                </div>

                {!data?.positionOverlap.length ? (
                  <div className="p-16 text-center">
                    <Target className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-white/20 text-sm">
                      No shared markets — human and AI are in different positions
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left text-xs text-white/25 font-medium p-4">Market</th>
                          <th className="text-center text-xs text-white/25 font-medium p-4">
                            Human Side
                          </th>
                          <th className="text-center text-xs text-white/25 font-medium p-4">
                            AI Side
                          </th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">
                            Human Shares
                          </th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">
                            AI Shares
                          </th>
                          <th className="text-center text-xs text-white/25 font-medium p-4">
                            Stance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.positionOverlap.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-white/5 hover:bg-white/3 transition-colors"
                          >
                            <td className="p-4">
                              <p className="text-sm text-white/80 max-w-[240px] truncate">
                                {row.marketTitle}
                              </p>
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                  row.humanSide === "yes"
                                    ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                <User className="w-3 h-3" />
                                {row.humanSide.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                  row.aiSide === "yes"
                                    ? "bg-[#a855f7]/20 text-[#a855f7]"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                <Bot className="w-3 h-3" />
                                {row.aiSide.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-[#3b82f6]">
                              {row.humanShares.toFixed(1)}
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-[#a855f7]">
                              {row.aiShares.toFixed(1)}
                            </td>
                            <td className="p-4 text-center">
                              {row.opposing ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                  <Sword className="w-3 h-3" />
                                  Opposing
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                                  <Shield className="w-3 h-3" />
                                  Aligned
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Opposing vs aligned summary */}
              {data?.positionOverlap && data.positionOverlap.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-5 bg-amber-400/5 border border-amber-400/20 flex items-center gap-4">
                    <Sword className="w-8 h-8 text-amber-400/60" />
                    <div>
                      <p className="text-2xl font-bold font-mono text-amber-400">
                        {data.positionOverlap.filter((r) => r.opposing).length}
                      </p>
                      <p className="text-xs text-white/30 uppercase tracking-widest mt-0.5">
                        Opposing positions
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl p-5 bg-[#00ff88]/5 border border-[#00ff88]/20 flex items-center gap-4">
                    <Shield className="w-8 h-8 text-[#00ff88]/60" />
                    <div>
                      <p className="text-2xl font-bold font-mono text-[#00ff88]">
                        {data.positionOverlap.filter((r) => !r.opposing).length}
                      </p>
                      <p className="text-xs text-white/30 uppercase tracking-widest mt-0.5">
                        Aligned positions
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
