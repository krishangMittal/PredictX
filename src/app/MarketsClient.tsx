"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { formatPrice, formatCompactNumber, daysUntil } from "@/lib/utils";
import { SparklineChart } from "@/components/SparklineChart";
import { usePriceStore } from "@/lib/store";
import { Search, Filter, TrendingUp, TrendingDown, Clock, BarChart3, Brain } from "lucide-react";

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
  liquidity?: number;
  spread?: number;
  bestBid?: number | null;
  bestAsk?: number | null;
  lastTradePrice?: number | null;
  oneDayChange?: number | null;
  oneWeekChange?: number | null;
  polymarketId?: string | null;
  expiresAt: string;
  priceHistory: { yesPrice: number; timestamp: string }[];
};

const categories = ["all", "geopolitics", "politics", "crypto", "sports", "science", "finance", "tech"];

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

type Signal = {
  marketId: string;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  side: "yes" | "no";
  confidence: number;
  reasoning: string;
  aiHasPosition: boolean;
};

const signalColors: Record<string, string> = {
  strong_buy: "bg-green-500/20 text-green-400 border-green-500/30",
  buy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  hold: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  sell: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  strong_sell: "bg-red-500/20 text-red-400 border-red-500/30",
};

const signalLabels: Record<string, string> = {
  strong_buy: "STRONG BUY",
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  strong_sell: "STRONG SELL",
};

export function MarketsClient({ initialMarkets }: { initialMarkets: Market[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [signals, setSignals] = useState<Record<string, Signal>>({});

  useEffect(() => {
    fetch("/api/ai/signals")
      .then((r) => r.json())
      .then((data) => {
        if (data.signals) {
          const map: Record<string, Signal> = {};
          for (const s of data.signals) map[s.marketId] = s;
          setSignals(map);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return initialMarkets.filter((m) => {
      const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || m.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [initialMarkets, search, category]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Prediction <span className="text-accent-blue">Markets</span>
        </h1>
        <p className="text-text-muted">
          Trade on real-world outcomes with virtual money. Start with $10,000.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border-dim rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent-blue/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                category === cat
                  ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                  : "bg-surface text-text-muted border border-border-dim hover:text-foreground hover:border-border-dim/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<BarChart3 className="w-4 h-4" />} label="Active Markets" value={initialMarkets.length.toString()} />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Total Volume" value={`$${formatCompactNumber(initialMarkets.reduce((a, m) => a + m.volume, 0))}`} />
        <StatCard icon={<Filter className="w-4 h-4" />} label="Categories" value={categories.length - 1 + ""} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Showing" value={`${filtered.length} markets`} />
      </div>

      {/* Market Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((market) => (
          <MarketCard key={market.id} market={market} signal={signals[market.id]} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-text-muted">
          <p className="text-lg">No markets found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-3 flex items-center gap-3">
      <div className="text-accent-blue">{icon}</div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-semibold font-mono">{value}</p>
      </div>
    </div>
  );
}

function MarketCard({ market, signal }: { market: Market; signal?: Signal }) {
  const livePrice = usePriceStore((s) => s.prices[market.id]);
  const prevPriceRef = useRef(market.yesPrice);
  const [flashClass, setFlashClass] = useState("");

  const yesPrice = livePrice?.yesPrice ?? market.yesPrice;
  const noPrice = livePrice?.noPrice ?? market.noPrice;

  useEffect(() => {
    if (yesPrice !== prevPriceRef.current) {
      setFlashClass(yesPrice > prevPriceRef.current ? "price-up" : "price-down");
      prevPriceRef.current = yesPrice;
      const t = setTimeout(() => setFlashClass(""), 600);
      return () => clearTimeout(t);
    }
  }, [yesPrice]);

  const pricePoints = market.priceHistory
    .map((p) => p.yesPrice)
    .reverse();

  // Use real Polymarket 1D change if available, else compute from history
  const change24h = market.oneDayChange != null
    ? market.oneDayChange
    : pricePoints.length >= 2
      ? yesPrice - pricePoints[0]
      : 0;

  const isUp = change24h >= 0;

  return (
    <Link href={`/market/${market.id}`}>
      <div className="glass rounded-xl p-5 hover:border-accent-blue/30 transition-all duration-300 cursor-pointer group h-full">
        {/* Category + Expiry */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[market.category] || "bg-gray-500/20 text-gray-400"}`}>
            {market.category}
          </span>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysUntil(new Date(market.expiresAt))}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug mb-4 group-hover:text-accent-blue transition-colors line-clamp-2">
          {market.title}
        </h3>

        {/* Sparkline */}
        <div className="h-12 mb-4">
          <SparklineChart data={pricePoints} isUp={isUp} />
        </div>

        {/* AI Signal Badge */}
        {signal && signal.signal !== "hold" && (
          <div className={`flex items-center gap-1.5 mb-3 px-2 py-1 rounded-md border text-[10px] font-bold w-fit ${signalColors[signal.signal]}`}>
            <Brain className="w-3 h-3" />
            {signalLabels[signal.signal]} {signal.side.toUpperCase()}
            {signal.aiHasPosition && <span className="opacity-60">• AI in</span>}
          </div>
        )}

        {/* Price Row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-text-muted mb-1">YES Price</p>
            <p className={`text-xl font-bold font-mono ${flashClass}`}>
              {formatPrice(yesPrice)}
            </p>
            {market.bestBid != null && market.bestAsk != null && (
              <p className="text-[10px] text-text-muted font-mono mt-0.5">
                {(market.bestBid * 100).toFixed(1)}¢ / {(market.bestAsk * 100).toFixed(1)}¢
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-sm font-mono font-semibold flex items-center gap-1 ${isUp ? "text-accent-green" : "text-accent-red"}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isUp ? "+" : ""}{(change24h * 100).toFixed(1)}¢
            </p>
            <p className="text-xs text-text-muted mt-1">
              Vol ${formatCompactNumber(market.volume)}
            </p>
            {market.volume24hr != null && market.volume24hr > 0 && (
              <p className="text-[10px] text-text-muted font-mono">
                24h ${formatCompactNumber(market.volume24hr)}
              </p>
            )}
          </div>
        </div>

        {/* Yes/No Bar */}
        <div className="mt-3 flex gap-2">
          <div
            className="h-1.5 rounded-full bg-accent-green/40 transition-all duration-500"
            style={{ width: `${yesPrice * 100}%` }}
          />
          <div
            className="h-1.5 rounded-full bg-accent-red/40 transition-all duration-500"
            style={{ width: `${noPrice * 100}%` }}
          />
        </div>

        {/* Polymarket badge */}
        {market.polymarketId && (
          <div className="mt-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-blue"></div>
            <span className="text-[9px] text-text-muted uppercase tracking-wider">Polymarket Live</span>
          </div>
        )}
      </div>
    </Link>
  );
}
