"use client";

import { useEffect, useState } from "react";

type TickerTrade = {
  side: string;
  action: string;
  shares: number;
  price: number;
  strategy: string;
  marketTitle: string;
  ago: string;
};

export function TradeTicker() {
  const [trades, setTrades] = useState<TickerTrade[]>([]);

  useEffect(() => {
    async function fetchTrades() {
      try {
        const res = await fetch("/api/ai/recent-trades");
        if (res.ok) {
          const data = await res.json();
          setTrades(data.trades ?? []);
        }
      } catch {
        // silently fail
      }
    }
    fetchTrades();
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, []);

  if (trades.length === 0) return null;

  return (
    <div className="bg-surface border-b border-border-dim overflow-hidden">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-purple-500/10 border-r border-purple-500/20 px-3 py-1.5">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            AI Trades
          </span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex animate-scroll-x whitespace-nowrap gap-6 py-1.5 px-4">
            {[...trades, ...trades].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-xs">
                <span className={`font-bold ${t.action === "buy" ? "text-accent-green" : "text-accent-red"}`}>
                  {t.action.toUpperCase()}
                </span>
                <span className={`font-bold ${t.side === "yes" ? "text-accent-green" : "text-accent-red"}`}>
                  {t.side.toUpperCase()}
                </span>
                <span className="font-mono text-white/60">{t.shares}@{(t.price * 100).toFixed(0)}c</span>
                <span className="text-white/40 truncate max-w-[200px]">{t.marketTitle}</span>
                <span className="text-white/20">{t.ago}</span>
                <span className="text-white/10">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
