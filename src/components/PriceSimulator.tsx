"use client";

import { useEffect, useRef } from "react";
import { usePriceStore } from "@/lib/store";

export function PriceSimulator() {
  const setPrices = usePriceStore((s) => s.setPrices);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function tick() {
      try {
        const res = await fetch("/api/simulate", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.prices) {
            setPrices(data.prices);
          }
        }
      } catch {
        // Silently fail - simulation will retry
      }
    }

    // Run first tick immediately
    tick();

    // Then every 5 seconds
    intervalRef.current = setInterval(tick, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setPrices]);

  return null;
}
