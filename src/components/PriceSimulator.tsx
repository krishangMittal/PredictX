"use client";

import { useEffect, useRef } from "react";
import { usePriceStore } from "@/lib/store";

export function PriceSimulator() {
  const setPrices = usePriceStore((s) => s.setPrices);
  const addNews = usePriceStore((s) => s.addNews);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickCountRef = useRef(0);

  useEffect(() => {
    async function tick() {
      try {
        const res = await fetch("/api/simulate", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.prices) {
            setPrices(data.prices);
          }
          if (data.news) {
            addNews(data.news);
          }
        }
      } catch {
        // Silently fail - simulation will retry
      }

      // Every 6th tick (~30s), run AI trading cycle
      tickCountRef.current++;
      if (tickCountRef.current % 6 === 0) {
        try {
          await fetch("/api/ai/trade", { method: "POST" });
        } catch {
          // AI trading failure is non-critical
        }
      }

      // Every 12th tick (~60s), run AI learning cycle
      if (tickCountRef.current % 12 === 0) {
        try {
          await fetch("/api/ai/learn", { method: "POST" });
        } catch {
          // AI learning failure is non-critical
        }
      }
    }

    // Run first tick immediately
    tick();

    // Then every 5 seconds
    intervalRef.current = setInterval(tick, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setPrices, addNews]);

  return null;
}
