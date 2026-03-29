"use client";

import { usePriceStore } from "@/lib/store";
import { Newspaper, TrendingUp, TrendingDown } from "lucide-react";

export function NewsTicker() {
  const newsEvents = usePriceStore((s) => s.newsEvents);

  if (newsEvents.length === 0) {
    return (
      <div className="bg-surface border-b border-border-dim px-4 py-2 flex items-center gap-3 overflow-hidden">
        <Newspaper className="w-4 h-4 text-accent-blue shrink-0" />
        <p className="text-xs text-text-muted animate-pulse">
          Waiting for market news...
        </p>
      </div>
    );
  }

  const latest = newsEvents[0];

  return (
    <div className="bg-surface border-b border-border-dim px-4 py-2 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Newspaper className="w-4 h-4 text-accent-blue" />
        <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">Live</span>
      </div>
      <div className="flex items-center gap-2 overflow-hidden">
        {latest.impact > 0 ? (
          <TrendingUp className="w-3 h-3 text-accent-green shrink-0" />
        ) : (
          <TrendingDown className="w-3 h-3 text-accent-red shrink-0" />
        )}
        <p className="text-xs text-foreground truncate">{latest.headline}</p>
        <div className="flex gap-1 shrink-0">
          {latest.categories.map((cat) => (
            <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-light text-text-muted capitalize">
              {cat}
            </span>
          ))}
        </div>
      </div>
      {newsEvents.length > 1 && (
        <span className="text-[10px] text-text-muted shrink-0 ml-auto">
          +{newsEvents.length - 1} more
        </span>
      )}
    </div>
  );
}
