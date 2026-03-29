"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Wallet,
  Brain,
} from "lucide-react";
import { formatCurrency, formatPrice, timeAgo } from "@/lib/utils";

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

type AIPosition = {
  marketId: string;
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

type ComparisonData = {
  human: UserStats | null;
  ai: UserStats | null;
  strategies: Strategy[];
  combinedTrades: CombinedTrade[];
  aiPositions: AIPosition[];
  positionOverlap: { marketTitle: string; humanSide: string; aiSide: string; humanShares: number; aiShares: number; opposing: boolean }[];
};

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

function StatCard({ label, value, sub, color, glow }: { label: string; value: string; sub?: string; color: string; glow?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border transition-all duration-300 ${glow ? "bg-white/5 border-[#a855f7]/30 shadow-lg shadow-[#a855f7]/5" : "bg-white/5 border-white/10"}`}>
      <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AITradesPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "strategies">("overview");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/comparison");
        if (!res.ok) throw new Error("Failed to fetch");
        setData(await res.json());
      } catch {
        setError("Could not load AI trading data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const ai = data?.ai ?? EMPTY_STATS;
  const human = data?.human ?? EMPTY_STATS;
  const teamValue = ai.portfolioValue + human.portfolioValue;
  const teamPnl = ai.pnl + human.pnl;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#a855f7]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-[#a855f7]">AI</span>
              <span className="text-white/60"> Trading Partner</span>
            </h1>
            <p className="text-white/30 text-sm mt-0.5">Your AI is working for you. Here is what it is doing.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-xs text-white/30">Active</span>
          </div>
        </div>

        {/* Team portfolio banner */}
        {!loading && (
          <div className="mt-4 rounded-xl p-5 border bg-gradient-to-r from-[#a855f7]/10 to-[#3b82f6]/10 border-[#a855f7]/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Combined Team Portfolio</p>
                <p className="text-3xl font-bold font-mono text-white">{formatCurrency(teamValue)}</p>
                <p className={`text-sm font-mono mt-1 ${teamPnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                  {teamPnl >= 0 ? "+" : ""}{formatCurrency(teamPnl)} ({((teamPnl / 20000) * 100).toFixed(2)}%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/30 mb-2">You: {formatCurrency(human.portfolioValue)}</p>
                <p className="text-xs text-[#a855f7]">AI: {formatCurrency(ai.portfolioValue)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 border border-white/10 w-fit">
        {([
          { key: "overview" as const, label: "AI Portfolio", icon: Wallet },
          { key: "trades" as const, label: "AI Trades", icon: Activity },
          { key: "strategies" as const, label: "Strategies", icon: Brain },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? "bg-white/10 text-white border border-white/20" : "text-white/40 hover:text-white/70"
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
            <p className="text-white/30 text-sm">Loading AI data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-6 bg-red-500/10 border border-red-500/20 text-center text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="AI Portfolio" value={formatCurrency(ai.portfolioValue)} color="text-white" glow />
                <StatCard label="AI Cash" value={formatCurrency(ai.balance)} color="text-white/80" />
                <StatCard label="AI P&L" value={`${ai.pnl >= 0 ? "+" : ""}${formatCurrency(ai.pnl)}`} color={ai.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"} />
                <StatCard label="AI ROI" value={`${ai.roi >= 0 ? "+" : ""}${ai.roi.toFixed(2)}%`} color={ai.roi >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"} />
                <StatCard label="Trades Made" value={String(ai.totalTrades)} sub={`${ai.totalBuys}B / ${ai.totalSells}S`} color="text-white/80" />
                <StatCard label="Open Positions" value={String(ai.positionCount)} color="text-[#a855f7]" />
              </div>

              {/* AI's current positions with P&L */}
              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                  <Target className="w-4 h-4 text-[#a855f7]" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">AI Open Positions</h2>
                  <span className="ml-auto text-xs text-white/20">{data?.aiPositions?.length ?? 0} open</span>
                </div>
                {!data?.aiPositions?.length ? (
                  <div className="p-12 text-center text-white/20 text-sm">AI has no open positions yet. Next session it will start trading.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left text-xs text-white/25 font-medium p-4">Market</th>
                          <th className="text-left text-xs text-white/25 font-medium p-4">Side</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Shares</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Entry</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Current</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">Value</th>
                          <th className="text-right text-xs text-white/25 font-medium p-4">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.aiPositions.map((pos) => (
                          <tr key={pos.marketId} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                            <td className="p-4">
                              <p className="text-sm text-white/80 truncate max-w-[250px]">{pos.marketTitle}</p>
                              <p className="text-xs text-white/25 capitalize">{pos.category}</p>
                            </td>
                            <td className="p-4">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                pos.side === "yes" ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-[#ff4444]/15 text-[#ff4444]"
                              }`}>
                                {pos.side.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-white/60">{pos.shares}</td>
                            <td className="p-4 text-right font-mono text-sm text-white/60">{formatPrice(pos.avgPrice)}</td>
                            <td className="p-4 text-right font-mono text-sm text-white/80">{formatPrice(pos.currentPrice)}</td>
                            <td className="p-4 text-right font-mono text-sm text-white/80">{formatCurrency(pos.currentValue)}</td>
                            <td className="p-4 text-right">
                              <div>
                                <span className={`font-mono text-sm font-bold ${pos.pnl >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                                  {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                                </span>
                                <span className={`block text-xs font-mono ${pos.pnlPct >= 0 ? "text-[#00ff88]/60" : "text-[#ff4444]/60"}`}>
                                  {pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Total P&L row */}
                    <div className="px-4 py-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-white/40 uppercase tracking-widest">Total Unrealized P&L</span>
                      <span className={`font-mono text-lg font-bold ${
                        data.aiPositions.reduce((s, p) => s + p.pnl, 0) >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"
                      }`}>
                        {data.aiPositions.reduce((s, p) => s + p.pnl, 0) >= 0 ? "+" : ""}
                        {formatCurrency(data.aiPositions.reduce((s, p) => s + p.pnl, 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRADES TAB */}
          {activeTab === "trades" && (
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                <Activity className="w-4 h-4 text-[#a855f7]" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">AI Trade History</h2>
              </div>
              {data?.combinedTrades.filter(t => t.trader === "ai").length === 0 ? (
                <div className="p-12 text-center text-white/20 text-sm">No AI trades yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
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
                      {data?.combinedTrades.filter(t => t.trader === "ai").map((trade) => (
                        <tr key={trade.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                          <td className="p-4">
                            <p className="text-sm text-white/80 truncate max-w-[250px]">{trade.marketTitle}</p>
                            <p className="text-xs text-white/25 capitalize">{trade.category}</p>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                              trade.action === "buy" ? "text-[#00ff88]" : "text-[#ff4444]"
                            }`}>
                              {trade.action === "buy" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {trade.action}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold ${trade.side === "yes" ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                              {trade.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-sm text-white/60">{trade.shares}</td>
                          <td className="p-4 text-right font-mono text-sm text-white/60">{formatPrice(trade.price)}</td>
                          <td className="p-4 text-right font-mono text-sm text-white/80">{formatCurrency(trade.total)}</td>
                          <td className="p-4 text-right text-xs text-white/25">{timeAgo(new Date(trade.createdAt))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STRATEGIES TAB */}
          {activeTab === "strategies" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                  <Brain className="w-4 h-4 text-[#a855f7]" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">AI Strategies</h2>
                  <span className="ml-auto text-xs text-white/20">
                    {data?.strategies.filter(s => s.active).length ?? 0} active
                  </span>
                </div>
                {!data?.strategies.length ? (
                  <div className="p-12 text-center text-white/20 text-sm">No strategies yet. The AI will develop strategies as it trades.</div>
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
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                            <td className="p-4"><p className="text-sm font-semibold text-white/80">{s.name}</p></td>
                            <td className="p-4"><p className="text-xs text-white/30 max-w-[220px] truncate">{s.rule}</p></td>
                            <td className="p-4 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.active ? "bg-[#00ff88]/15 text-[#00ff88]" : "bg-white/5 text-white/20"}`}>
                                {s.active ? "Active" : "Off"}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{
                                    width: `${s.winRate * 100}%`,
                                    background: s.winRate >= 0.6 ? "#00ff88" : s.winRate >= 0.4 ? "#f59e0b" : "#ff4444",
                                  }} />
                                </div>
                                <span className={`font-mono text-sm font-bold ${s.winRate >= 0.6 ? "text-[#00ff88]" : s.winRate >= 0.4 ? "text-amber-400" : "text-[#ff4444]"}`}>
                                  {(s.winRate * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-sm text-white/60">{s.trades}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#a855f7] rounded-full" style={{ width: `${s.confidence * 100}%` }} />
                                </div>
                                <span className="font-mono text-xs text-[#a855f7]">{(s.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono text-sm font-bold">
                              <span className={s.profit >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}>
                                {s.profit >= 0 ? "+" : ""}{formatCurrency(s.profit)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {data?.strategies && data.strategies.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Total Strategies</p>
                    <p className="text-2xl font-bold font-mono text-[#a855f7]">{data.strategies.length}</p>
                  </div>
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Active</p>
                    <p className="text-2xl font-bold font-mono text-[#00ff88]">{data.strategies.filter(s => s.active).length}</p>
                  </div>
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Avg Win Rate</p>
                    <p className="text-2xl font-bold font-mono text-white/80">
                      {((data.strategies.reduce((s, x) => s + x.winRate, 0) / data.strategies.length) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl p-4 bg-white/5 border border-white/10">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Total Profit</p>
                    <p className={`text-2xl font-bold font-mono ${data.strategies.reduce((s, x) => s + x.profit, 0) >= 0 ? "text-[#00ff88]" : "text-[#ff4444]"}`}>
                      {formatCurrency(data.strategies.reduce((s, x) => s + x.profit, 0))}
                    </p>
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
