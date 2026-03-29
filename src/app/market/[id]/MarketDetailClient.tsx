"use client";

import { useState } from "react";
import Link from "next/link";
import { SparklineChart } from "@/components/SparklineChart";
import { formatPrice, formatCompactNumber, daysUntil, timeAgo, formatCurrency } from "@/lib/utils";
import { ArrowLeft, Clock, BarChart3, TrendingUp, TrendingDown } from "lucide-react";

type Trade = {
  id: string;
  side: string;
  action: string;
  shares: number;
  price: number;
  total: number;
  createdAt: string;
  user: { username: string };
};

type Market = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  expiresAt: string;
  resolution: string | null;
  priceHistory: { yesPrice: number; noPrice: number; volume: number; timestamp: string }[];
  trades: Trade[];
};

type Position = {
  id: string;
  side: string;
  shares: number;
  avgPrice: number;
} | null;

export function MarketDetailClient({
  market,
  userBalance,
  userId,
  position,
}: {
  market: Market;
  userBalance: number;
  userId: string;
  position: Position;
}) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [shares, setShares] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const price = side === "yes" ? market.yesPrice : market.noPrice;
  const cost = shares * price;
  const potentialProfit = shares * 1 - cost;

  const priceData = market.priceHistory.map((p) => p.yesPrice);
  const isUp = priceData.length >= 2 ? priceData[priceData.length - 1] >= priceData[0] : true;

  async function handleTrade() {
    if (cost > userBalance) {
      setMessage("Insufficient balance!");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          marketId: market.id,
          side,
          shares,
          price,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Bought ${shares} ${side.toUpperCase()} shares at ${formatPrice(price)}!`);
      } else {
        setMessage(data.error || "Trade failed");
      }
    } catch {
      setMessage("Trade failed - network error");
    }
    setIsSubmitting(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-text-muted hover:text-foreground text-sm mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Market Header */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent-blue/20 text-accent-blue capitalize">
                {market.category}
              </span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysUntil(new Date(market.expiresAt))} left
              </span>
            </div>
            <h1 className="text-xl font-bold mb-2">{market.title}</h1>
            <p className="text-sm text-text-muted">{market.description}</p>

            {/* Price Display */}
            <div className="flex items-center gap-6 mt-4">
              <div>
                <p className="text-xs text-text-muted">Yes</p>
                <p className="text-2xl font-bold font-mono text-accent-green">{formatPrice(market.yesPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">No</p>
                <p className="text-2xl font-bold font-mono text-accent-red">{formatPrice(market.noPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Volume</p>
                <p className="text-lg font-mono">${formatCompactNumber(market.volume)}</p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent-blue" />
              Price History
            </h2>
            <div className="h-48">
              <SparklineChart data={priceData} isUp={isUp} />
            </div>
          </div>

          {/* Recent Trades */}
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Recent Trades</h2>
            {market.trades.length === 0 ? (
              <p className="text-sm text-text-muted">No trades yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {market.trades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between text-sm py-2 border-b border-border-dim last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={trade.action === "buy" ? "text-accent-green" : "text-accent-red"}>
                        {trade.action === "buy" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      </span>
                      <span className="text-text-muted">@{trade.user.username}</span>
                      <span>{trade.action === "buy" ? "bought" : "sold"} {trade.shares} {trade.side.toUpperCase()}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">{formatPrice(trade.price)}</span>
                      <span className="text-text-muted text-xs ml-2">{timeAgo(new Date(trade.createdAt))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trading Panel */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-5 sticky top-6">
            <h2 className="text-sm font-semibold mb-4">Trade</h2>

            {/* Side Selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSide("yes")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  side === "yes"
                    ? "bg-accent-green/20 text-accent-green border border-accent-green/30"
                    : "bg-surface text-text-muted border border-border-dim hover:border-accent-green/20"
                }`}
              >
                Yes {formatPrice(market.yesPrice)}
              </button>
              <button
                onClick={() => setSide("no")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  side === "no"
                    ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                    : "bg-surface text-text-muted border border-border-dim hover:border-accent-red/20"
                }`}
              >
                No {formatPrice(market.noPrice)}
              </button>
            </div>

            {/* Shares Input */}
            <div className="mb-4">
              <label className="text-xs text-text-muted mb-1 block">Shares</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={shares}
                onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-surface border border-border-dim rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-accent-blue/50"
              />
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Price per share</span>
                <span className="font-mono">{formatPrice(price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total cost</span>
                <span className="font-mono">{formatCurrency(cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Potential profit</span>
                <span className="font-mono text-accent-green">{formatCurrency(potentialProfit)}</span>
              </div>
              <div className="flex justify-between border-t border-border-dim pt-2">
                <span className="text-text-muted">Return</span>
                <span className="font-mono text-accent-green">{((potentialProfit / cost) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Balance */}
            <div className="text-xs text-text-muted mb-3">
              Balance: <span className="font-mono text-foreground">{formatCurrency(userBalance)}</span>
            </div>

            {/* Buy Button */}
            <button
              onClick={handleTrade}
              disabled={isSubmitting || cost > userBalance}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all ${
                side === "yes"
                  ? "bg-accent-green/20 text-accent-green hover:bg-accent-green/30 border border-accent-green/30"
                  : "bg-accent-red/20 text-accent-red hover:bg-accent-red/30 border border-accent-red/30"
              } disabled:opacity-50`}
            >
              {isSubmitting ? "Placing..." : `Buy ${shares} ${side.toUpperCase()} shares`}
            </button>

            {message && (
              <p className={`text-xs mt-2 text-center ${message.includes("!") && !message.includes("Insufficient") ? "text-accent-green" : "text-accent-red"}`}>
                {message}
              </p>
            )}
          </div>

          {/* Current Position */}
          {position && (
            <div className="glass rounded-xl p-5">
              <h2 className="text-sm font-semibold mb-3">Your Position</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Side</span>
                  <span className={position.side === "yes" ? "text-accent-green" : "text-accent-red"}>
                    {position.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Shares</span>
                  <span className="font-mono">{position.shares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Avg Price</span>
                  <span className="font-mono">{formatPrice(position.avgPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Unrealized P&L</span>
                  {(() => {
                    const currentPrice = position.side === "yes" ? market.yesPrice : market.noPrice;
                    const pnl = (currentPrice - position.avgPrice) * position.shares;
                    return (
                      <span className={`font-mono ${pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
