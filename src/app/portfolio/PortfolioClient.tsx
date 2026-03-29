"use client";

import Link from "next/link";
import { formatCurrency, formatPrice } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
} from "lucide-react";

type Position = {
  id: string;
  marketId: string;
  marketTitle: string;
  category: string;
  side: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
};

type Trade = {
  id: string;
  marketTitle: string;
  side: string;
  action: string;
  shares: number;
  price: number;
  total: number;
  createdAt: string;
};

const categoryColors: Record<string, string> = {
  tech: "bg-purple-500/20 text-purple-400",
  crypto: "bg-orange-500/20 text-orange-400",
  politics: "bg-blue-500/20 text-blue-400",
  sports: "bg-green-500/20 text-green-400",
  science: "bg-cyan-500/20 text-cyan-400",
};

export function PortfolioClient({
  balance,
  portfolioValue,
  totalPnl,
  positions,
  recentTrades,
}: {
  balance: number;
  portfolioValue: number;
  totalPnl: number;
  positions: Position[];
  recentTrades: Trade[];
}) {
  const startingBalance = 10000;
  const allTimePnl = portfolioValue - startingBalance;
  const allTimePnlPercent = (allTimePnl / startingBalance) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">
        <span className="text-accent-blue">Portfolio</span>
      </h1>
      <p className="text-text-muted text-sm mb-8">Track your positions and performance</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Portfolio Value"
          value={formatCurrency(portfolioValue)}
          color="text-foreground"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Cash Balance"
          value={formatCurrency(balance)}
          color="text-accent-blue"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Unrealized P&L"
          value={`${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}`}
          color={totalPnl >= 0 ? "text-accent-green" : "text-accent-red"}
        />
        <StatCard
          icon={allTimePnl >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          label="All-Time Return"
          value={`${allTimePnl >= 0 ? "+" : ""}${allTimePnlPercent.toFixed(1)}%`}
          color={allTimePnl >= 0 ? "text-accent-green" : "text-accent-red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className="lg:col-span-2">
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-blue" />
              Open Positions ({positions.length})
            </h2>

            {positions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-muted mb-2">No open positions</p>
                <Link href="/" className="text-accent-blue text-sm hover:underline">
                  Browse markets to start trading
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => (
                  <Link key={pos.id} href={`/market/${pos.marketId}`}>
                    <div className="bg-surface-light rounded-lg p-4 hover:bg-surface-light/80 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${categoryColors[pos.category] || ""}`}>
                              {pos.category}
                            </span>
                            <span className={`text-xs font-bold ${pos.side === "yes" ? "text-accent-green" : "text-accent-red"}`}>
                              {pos.side.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium truncate">{pos.marketTitle}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-sm font-bold font-mono ${pos.pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                            {pos.pnl >= 0 ? "+" : ""}{formatCurrency(pos.pnl)}
                          </p>
                          <p className={`text-xs font-mono ${pos.pnlPercent >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                            {pos.pnlPercent >= 0 ? "+" : ""}{pos.pnlPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-text-muted">
                        <span>{pos.shares} shares</span>
                        <span>Avg: {formatPrice(pos.avgPrice)}</span>
                        <span>Current: {formatPrice(pos.currentPrice)}</span>
                        <span>Value: {formatCurrency(pos.value)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-blue" />
              Recent Trades
            </h2>

            {recentTrades.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">No trades yet</p>
            ) : (
              <div className="space-y-3">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="border-b border-border-dim pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${trade.action === "buy" ? "text-accent-green" : "text-accent-red"}`}>
                        {trade.action}
                      </span>
                      <span className={`text-xs ${trade.side === "yes" ? "text-accent-green" : "text-accent-red"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">{trade.marketTitle}</p>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-text-muted">{trade.shares} @ {formatPrice(trade.price)}</span>
                      <span className="font-mono">{formatCurrency(trade.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2 text-text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}
