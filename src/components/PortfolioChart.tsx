"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

type Snapshot = {
  value: number;
  cash: number;
  positions: number;
  time: string;
};

const RANGES = ["1H", "1D", "1W", "ALL"] as const;

export function PortfolioChart() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1D");
  const [data, setData] = useState<Snapshot[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/portfolio/history?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.snapshots || []);
      }
    } catch {
      // silent
    }
  }, [range]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (data.length < 2) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Portfolio Value Over Time</h2>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  range === r
                    ? "bg-accent-blue/15 text-accent-blue"
                    : "text-text-muted hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[200px] flex items-center justify-center text-text-muted text-sm">
          Collecting data... chart will appear as prices update.
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.999;
  const max = Math.max(...values) * 1.001;
  const rangeVal = max - min || 1;
  const width = 600;
  const height = 200;
  const padding = { top: 10, bottom: 20, left: 0, right: 0 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const isUp = values[values.length - 1] >= values[0];
  const color = isUp ? "#00ff88" : "#ff4444";
  const gradientId = `portfolio-grad-${isUp ? "up" : "down"}`;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.value - min) / rangeVal) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding.bottom} L${points[0].x},${height - padding.bottom} Z`;

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  const currentValue = hovered ? hovered.value : values[values.length - 1];
  const startValue = values[0];
  const change = currentValue - startValue;
  const changePct = (change / startValue) * 100;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((mouseX - padding.left) / chartW) * (data.length - 1));
    setHoveredIndex(Math.max(0, Math.min(data.length - 1, idx)));
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold">Portfolio Value</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                range === r
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-bold font-mono">{formatCurrency(currentValue)}</span>
        <span className={`ml-2 text-sm font-mono ${change >= 0 ? "text-accent-green" : "text-accent-red"}`}>
          {change >= 0 ? "+" : ""}{formatCurrency(change)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
        </span>
        {hovered && (
          <span className="ml-2 text-xs text-text-muted">
            {new Date(hovered.time).toLocaleTimeString()}
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[200px]"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + chartH * pct}
            x2={width - padding.right}
            y2={padding.top + chartH * pct}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
        ))}

        {/* Starting value line */}
        <line
          x1={padding.left}
          y1={padding.top + chartH - ((startValue - min) / rangeVal) * chartH}
          x2={width - padding.right}
          y2={padding.top + chartH - ((startValue - min) / rangeVal) * chartH}
          stroke="rgba(255,255,255,0.1)"
          strokeDasharray="2 4"
        />

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover indicator */}
        {hovered && (
          <>
            <line x1={hovered.x} y1={padding.top} x2={hovered.x} y2={height - padding.bottom} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} stroke="#0a0a0f" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}
