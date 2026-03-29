"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatCompactNumber, daysUntil, timeAgo, formatCurrency } from "@/lib/utils";
import { PriceChart } from "@/components/PriceChart";
import { usePriceStore } from "@/lib/store";
import { useToastStore } from "@/components/Toast";
import { ArrowLeft, Clock, BarChart3, TrendingUp, TrendingDown, Droplets, Minus, Plus } from "lucide-react";

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
  volume24hr?: number;
  liquidity: number;
  spread?: number;
  bestBid?: number | null;
  bestAsk?: number | null;
  lastTradePrice?: number | null;
  oneDayChange?: number | null;
  oneWeekChange?: number | null;
  polymarketId?: string | null;
  polymarketSlug?: string | null;
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

const categoryColors: Record<string, string> = {
  tech: "bg-purple-500/20 text-purple-400",
  crypto: "bg-orange-500/20 text-orange-400",
  politics: "bg-blue-500/20 text-blue-400",
  geopolitics: "bg-red-500/20 text-red-400",
  sports: "bg-green-500/20 text-green-400",
  science: "bg-cyan-500/20 text-cyan-400",
  finance: "bg-yellow-500/20 text-yellow-400",
  other: "bg-gray-500/20 text-gray-400",
};

export function MarketDetailClient({
  market,
  userBalance,
  userId,
  position,
  aiPosition,
}: {
  market: Market;
  userBalance: number;
  userId: string;
  position: Position;
  aiPosition?: Position;
}) {
  const router = useRouter();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [timeRange, setTimeRange] = useState<"1D" | "1W" | "ALL">("ALL");
  const addToast = useToastStore((s) => s.addToast);

  // Live prices from store
  const livePrice = usePriceStore((s) => s.prices[market.id]);
  const yesPrice = livePrice?.yesPrice ?? market.yesPrice;
  const noPrice = livePrice?.noPrice ?? market.noPrice;

  const price = side === "yes" ? yesPrice : noPrice;
  const cost = shares * price;
  const potentialProfit = shares * 1 - cost;

  const canAfford = action === "buy" ? cost <= userBalance : true;
  const canSell = action === "sell" && position && position.side === side && position.shares >= shares;

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    const cutoff =
      timeRange === "1D" ? now - 24 * 60 * 60 * 1000 :
      timeRange === "1W" ? now - 7 * 24 * 60 * 60 * 1000 :
      0;
    return market.priceHistory.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
  }, [market.priceHistory, timeRange]);

  async function handleTrade() {
    if (action === "buy" && cost > userBalance) {
      setMessage("Insufficient balance!");
      return;
    }
    if (action === "sell" && !canSell) {
      setMessage("Not enough shares to sell");
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
          action,
          shares,
          price,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const verb = action === "buy" ? "Bought" : "Sold";
        const msg = `${verb} ${shares} ${side.toUpperCase()} shares at ${formatPrice(price)}!`;
        setMessage(msg);
        addToast(msg, "trade");
        router.refresh();
      } else {
        setMessage(data.error || "Trade failed");
      }
    } catch {
      setMessage("Trade failed - network error");
    }
    setIsSubmitting(false);
  }

  // Price flash animation
  const prevPriceRef = useRef(yesPrice);
  const [flashClass, setFlashClass] = useState("");
  useEffect(() => {
    if (yesPrice !== prevPriceRef.current) {
      setFlashClass(yesPrice > prevPriceRef.current ? "price-up" : "price-down");
      prevPriceRef.current = yesPrice;
      const t = setTimeout(() => setFlashClass(""), 600);
      return () => clearTimeout(t);
    }
  }, [yesPrice]);

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
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[market.category] || "bg-gray-500/20 text-gray-400"}`}>
                {market.category}
              </span>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysUntil(new Date(market.expiresAt))} left
              </span>
            </div>
            <h1 className="text-xl font-bold mb-2">{market.title}</h1>
            <p className="text-sm text-text-muted">{market.description}</p>
            {market.resolution && (
              <p className="text-xs text-text-muted mt-3 p-3 bg-surface-light rounded-lg">
                <strong>Resolution:</strong> {market.resolution}
              </p>
            )}

            {/* Price Display */}
            <div className="flex items-center gap-6 mt-4">
              <div>
                <p className="text-xs text-text-muted">Yes</p>
                <p className={`text-2xl font-bold font-mono text-accent-green ${flashClass}`}>{formatPrice(yesPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">No</p>
                <p className="text-2xl font-bold font-mono text-accent-red">{formatPrice(noPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Volume</p>
                <p className="text-lg font-mono">${formatCompactNumber(market.volume)}</p>
                {market.volume24hr != null && market.volume24hr > 0 && (
                  <p className="text-[10px] text-text-muted font-mono">24h: ${formatCompactNumber(market.volume24hr)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-text-muted flex items-center gap-1"><Droplets className="w-3 h-3" /> Liquidity</p>
                <p className="text-lg font-mono">${formatCompactNumber(market.liquidity)}</p>
              </div>
            </div>

            {/* Polymarket real-time data */}
            {market.polymarketId && (
              <div className="mt-4 pt-3 border-t border-border-dim">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse"></div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">Polymarket Live Data</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {market.bestBid != null && (
                    <div>
                      <p className="text-[10px] text-text-muted">Best Bid</p>
                      <p className="text-sm font-mono text-accent-green">{(market.bestBid * 100).toFixed(1)}¢</p>
                    </div>
                  )}
                  {market.bestAsk != null && (
                    <div>
                      <p className="text-[10px] text-text-muted">Best Ask</p>
                      <p className="text-sm font-mono text-accent-red">{(market.bestAsk * 100).toFixed(1)}¢</p>
                    </div>
                  )}
                  {market.spread != null && market.spread > 0 && (
                    <div>
                      <p className="text-[10px] text-text-muted">Spread</p>
                      <p className="text-sm font-mono">{(market.spread * 100).toFixed(1)}¢</p>
                    </div>
                  )}
                  {market.oneDayChange != null && (
                    <div>
                      <p className="text-[10px] text-text-muted">1D Change</p>
                      <p className={`text-sm font-mono ${market.oneDayChange >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        {market.oneDayChange >= 0 ? "+" : ""}{(market.oneDayChange * 100).toFixed(1)}¢
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-accent-blue" />
                Price History
              </h2>
              <div className="flex gap-1">
                {(["1D", "1W", "ALL"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      timeRange === range ? "bg-accent-blue/15 text-accent-blue" : "text-text-muted hover:text-foreground"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <PriceChart data={filteredHistory} />
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

            {/* Buy/Sell Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAction("buy")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  action === "buy"
                    ? "bg-accent-green/20 text-accent-green border border-accent-green/30"
                    : "bg-surface-light text-text-muted border border-border-dim"
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setAction("sell")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  action === "sell"
                    ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                    : "bg-surface-light text-text-muted border border-border-dim"
                }`}
              >
                Sell
              </button>
            </div>

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
                Yes {formatPrice(yesPrice)}
              </button>
              <button
                onClick={() => setSide("no")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  side === "no"
                    ? "bg-accent-red/20 text-accent-red border border-accent-red/30"
                    : "bg-surface text-text-muted border border-border-dim hover:border-accent-red/20"
                }`}
              >
                No {formatPrice(noPrice)}
              </button>
            </div>

            {/* Shares Input */}
            <div className="mb-4">
              <label className="text-xs text-text-muted mb-1 block">Shares</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShares(Math.max(1, shares - 10))}
                  className="w-9 h-9 rounded-lg bg-surface-light border border-border-dim flex items-center justify-center text-text-muted hover:text-foreground transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={shares}
                  onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-surface-light border border-border-dim rounded-lg px-4 py-2 text-center text-sm font-mono focus:outline-none focus:border-accent-blue/50"
                />
                <button
                  onClick={() => setShares(shares + 10)}
                  className="w-9 h-9 rounded-lg bg-surface-light border border-border-dim flex items-center justify-center text-text-muted hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                {[10, 50, 100, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setShares(amt)}
                    className="flex-1 py-1 rounded text-xs font-mono bg-surface-light border border-border-dim text-text-muted hover:text-foreground transition-colors"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Price per share</span>
                <span className="font-mono">{formatPrice(price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total {action === "buy" ? "cost" : "return"}</span>
                <span className="font-mono">{formatCurrency(cost)}</span>
              </div>
              {action === "buy" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Potential profit</span>
                    <span className="font-mono text-accent-green">{formatCurrency(potentialProfit)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border-dim pt-2">
                    <span className="text-text-muted">Return</span>
                    <span className="font-mono text-accent-green">{cost > 0 ? ((potentialProfit / cost) * 100).toFixed(0) : 0}%</span>
                  </div>
                </>
              )}
            </div>

            {/* Balance */}
            <div className="text-xs text-text-muted mb-3">
              Balance: <span className="font-mono text-foreground">{formatCurrency(userBalance)}</span>
            </div>

            {/* Trade Button */}
            <button
              onClick={handleTrade}
              disabled={isSubmitting || (action === "buy" && !canAfford) || (action === "sell" && !canSell)}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                action === "buy"
                  ? "bg-accent-green/20 text-accent-green hover:bg-accent-green/30 border border-accent-green/30"
                  : "bg-accent-red/20 text-accent-red hover:bg-accent-red/30 border border-accent-red/30"
              }`}
            >
              {isSubmitting ? "Placing..." : `${action === "buy" ? "Buy" : "Sell"} ${shares} ${side.toUpperCase()} shares`}
            </button>

            {message && (
              <p className={`text-xs mt-2 text-center ${message.includes("!") && !message.includes("Insufficient") && !message.includes("Not enough") ? "text-accent-green" : "text-accent-red"}`}>
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
                  <span className="text-text-muted">Current Value</span>
                  <span className="font-mono">
                    {formatCurrency((position.side === "yes" ? yesPrice : noPrice) * position.shares)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border-dim pt-2">
                  <span className="text-text-muted">Unrealized P&L</span>
                  {(() => {
                    const currentPrice = position.side === "yes" ? yesPrice : noPrice;
                    const pnl = (currentPrice - position.avgPrice) * position.shares;
                    return (
                      <span className={`font-mono font-semibold ${pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* AI Position */}
          {aiPosition && (
            <div className="glass rounded-xl p-5 border-l-2 border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-[10px]">🤖</span>
                </div>
                <h2 className="text-sm font-semibold">AI Position</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Side</span>
                  <span className={aiPosition.side === "yes" ? "text-accent-green" : "text-accent-red"}>
                    {aiPosition.side.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Shares</span>
                  <span className="font-mono">{aiPosition.shares}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Entry</span>
                  <span className="font-mono">{formatPrice(aiPosition.avgPrice)}</span>
                </div>
                <div className="flex justify-between border-t border-border-dim pt-2">
                  <span className="text-text-muted">AI P&L</span>
                  {(() => {
                    const cp = aiPosition.side === "yes" ? yesPrice : noPrice;
                    const pnl = (cp - aiPosition.avgPrice) * aiPosition.shares;
                    return (
                      <span className={`font-mono font-semibold ${pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
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
