"use client";

import { useMemo } from "react";

type DataPoint = {
  yesPrice: number;
  noPrice: number;
  volume: number;
  timestamp: string;
};

export function PriceChart({ data }: { data: DataPoint[] }) {
  const { svgPath, areaPath, minPrice, maxPrice, priceLabels } = useMemo(() => {
    if (data.length < 2)
      return { svgPath: "", areaPath: "", minPrice: 0, maxPrice: 1, priceLabels: [] };

    const prices = data.map((d) => d.yesPrice);
    const min = Math.min(...prices) - 0.02;
    const max = Math.max(...prices) + 0.02;
    const range = max - min || 0.01;

    const width = 600;
    const height = 250;
    const padding = 0;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - ((d.yesPrice - min) / range) * (height - 20) - 10;
      return { x, y };
    });

    const line = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
    const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

    const labels = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max].map(
      (v) => ({ value: v, y: height - ((v - min) / range) * (height - 20) - 10 })
    );

    return { svgPath: line, areaPath: area, minPrice: min, maxPrice: max, priceLabels: labels };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Not enough data for chart
      </div>
    );
  }

  const lastPrice = data[data.length - 1].yesPrice;
  const firstPrice = data[0].yesPrice;
  const isUp = lastPrice >= firstPrice;
  const color = isUp ? "#00ff88" : "#ff4444";
  const gradientId = `chart-gradient-${isUp ? "up" : "down"}`;

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 600 250" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {priceLabels.map((label, i) => (
          <line
            key={i}
            x1="0"
            y1={label.y}
            x2="600"
            y2={label.y}
            stroke="#1f1f35"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path d={svgPath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Current price dot */}
        {data.length > 0 && (
          <>
            <circle
              cx={600}
              cy={250 - ((lastPrice - minPrice) / (maxPrice - minPrice || 0.01)) * 230 - 10}
              r="4"
              fill={color}
            />
            <circle
              cx={600}
              cy={250 - ((lastPrice - minPrice) / (maxPrice - minPrice || 0.01)) * 230 - 10}
              r="8"
              fill={color}
              opacity="0.3"
            >
              <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>

      {/* Price labels on right */}
      <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-2 pointer-events-none">
        {priceLabels.reverse().map((label, i) => (
          <span key={i} className="text-[10px] font-mono text-text-muted">
            {(label.value * 100).toFixed(0)}¢
          </span>
        ))}
      </div>
    </div>
  );
}
