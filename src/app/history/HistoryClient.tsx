"use client";

import { useState } from "react";
import { formatCurrency, formatPrice, timeAgo } from "@/lib/utils";
import { History, Filter, TrendingUp, TrendingDown, Download } from "lucide-react";

type Trade = {
  id: string;
  marketTitle: string;
  category: string;
  side: string;
  action: string;
  type: string;
  shares: number;
  price: number;
  total: number;
  currentPrice: number;
  createdAt: string;
};

export function HistoryClient({ trades }: { trades: Trade[] }) {
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  const categories = ["all", ...Array.from(new Set(trades.map((t) => t.category)))];

  const filtered = trades.filter((t) => {
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterAction !== "all" && t.action !== filterAction) return false;
    return true;
  });

  const totalVolume = trades.reduce((sum, t) => sum + t.total, 0);

  function exportCSV() {
    const header = "Market,Category,Action,Side,Type,Shares,Price,Total,Date\n";
    const rows = filtered.map((t) =>
      `"${t.marketTitle}",${t.category},${t.action},${t.side},${t.type},${t.shares},${t.price.toFixed(4)},${t.total.toFixed(2)},${new Date(t.createdAt).toISOString()}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `predictx-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">
          Trade <span className="text-accent-blue">History</span>
        </h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border-dim text-text-muted hover:text-foreground transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <p className="text-text-muted text-sm mb-8">All your trades in one place</p>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-text-muted">Total Trades</p>
          <p className="text-xl font-bold font-mono">{trades.length}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-text-muted">Total Volume</p>
          <p className="text-xl font-bold font-mono">{formatCurrency(totalVolume)}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-text-muted">Buys</p>
          <p className="text-xl font-bold font-mono text-accent-green">{trades.filter((t) => t.action === "buy").length}</p>
        </div>
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-text-muted">Sells</p>
          <p className="text-xl font-bold font-mono text-accent-red">{trades.filter((t) => t.action === "sell").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-text-muted" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filterCategory === cat
                  ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                  : "bg-surface text-text-muted border border-border-dim"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {["all", "buy", "sell"].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                filterAction === act
                  ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                  : "bg-surface text-text-muted border border-border-dim"
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Trades Table */}
      <div className="glass rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-text-muted">
            <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No trades found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-dim">
                  <th className="text-left text-xs text-text-muted font-medium p-4">Market</th>
                  <th className="text-left text-xs text-text-muted font-medium p-4">Action</th>
                  <th className="text-left text-xs text-text-muted font-medium p-4">Side</th>
                  <th className="text-right text-xs text-text-muted font-medium p-4">Shares</th>
                  <th className="text-right text-xs text-text-muted font-medium p-4">Price</th>
                  <th className="text-right text-xs text-text-muted font-medium p-4">Total</th>
                  <th className="text-right text-xs text-text-muted font-medium p-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <tr key={trade.id} className="border-b border-border-dim/50 hover:bg-surface-light/50 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-medium truncate max-w-[250px]">{trade.marketTitle}</p>
                      <p className="text-xs text-text-muted capitalize">{trade.category}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                        trade.action === "buy" ? "text-accent-green" : "text-accent-red"
                      }`}>
                        {trade.action === "buy" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trade.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold ${trade.side === "yes" ? "text-accent-green" : "text-accent-red"}`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-sm">{trade.shares}</td>
                    <td className="p-4 text-right font-mono text-sm">{formatPrice(trade.price)}</td>
                    <td className="p-4 text-right font-mono text-sm">{formatCurrency(trade.total)}</td>
                    <td className="p-4 text-right text-xs text-text-muted">{timeAgo(new Date(trade.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
