"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  History,
  Trophy,
  Brain,
  Activity,
  Swords,
  RefreshCw,
  CheckCircle2,
  Target,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Markets", icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/history", label: "History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/ai-brain", label: "AI Brain", icon: Brain },
  { href: "/comparison", label: "AI Trades", icon: Swords },
  { href: "/strategy-98", label: "98-99 Strategy", icon: Target },
];

export function Sidebar() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [aiPnl, setAiPnl] = useState<number | null>(null);
  const [aiPositions, setAiPositions] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [balRes, compRes] = await Promise.all([
          fetch("/api/user/balance"),
          fetch("/api/comparison"),
        ]);
        if (balRes.ok) {
          const data = await balRes.json();
          setBalance(data.balance);
        }
        if (compRes.ok) {
          const data = await compRes.json();
          if (data.ai) {
            setAiPnl(data.ai.pnl);
            setAiPositions(data.ai.positionCount ?? 0);
          }
        }
      } catch {
        // silently fail
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  async function syncPolymarket() {
    setSyncing(true);
    try {
      const res = await fetch("/api/polymarket/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLastSync(`${data.synced} markets`);
        setTimeout(() => setLastSync(null), 3000);
      }
    } catch {
      // silently fail
    }
    setSyncing(false);
  }

  const formattedBalance = balance !== null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balance)
    : "$10,000.00";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-screen fixed left-0 top-0 bg-surface border-r border-border-dim">
        <div className="p-4 border-b border-border-dim">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-accent-blue">Predict</span>
                <span className="text-foreground">X</span>
              </h1>
              <p className="text-[10px] text-text-muted uppercase tracking-widest">
                Paper Trading
              </p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                    : "text-text-muted hover:text-foreground hover:bg-surface-light"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 space-y-2">
          <button
            onClick={syncPolymarket}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/20 hover:bg-accent-blue/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : lastSync ? `Synced ${lastSync}` : "Sync Polymarket"}
          </button>
          <button
            onClick={async () => {
              setResolving(true);
              try {
                const res = await fetch("/api/market/auto-resolve", { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  if (data.resolved > 0) {
                    setLastSync(`${data.resolved} resolved!`);
                  } else {
                    setLastSync("No markets to resolve");
                  }
                  setTimeout(() => setLastSync(null), 3000);
                }
              } catch { /* */ }
              setResolving(false);
            }}
            disabled={resolving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className={`w-3 h-3 ${resolving ? "animate-spin" : ""}`} />
            {resolving ? "Checking..." : "Resolve Expired"}
          </button>
          <div className="glass rounded-lg p-4">
            <p className="text-xs text-text-muted mb-1">Paper Balance</p>
            <p className="text-xl font-bold font-mono text-accent-green">{formattedBalance}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-xs text-text-muted">Polymarket Live</span>
            </div>
          </div>
          {aiPnl !== null && (
            <Link href="/ai-brain" className="block glass rounded-lg p-3 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">AI Trader</span>
                </div>
                <span className="text-[10px] text-text-muted">{aiPositions} pos</span>
              </div>
              <p className={`text-sm font-bold font-mono ${aiPnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                {aiPnl >= 0 ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(aiPnl)}
              </p>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border-dim flex justify-around py-2 z-50">
        {navItems.slice(0, 4).map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
                isActive ? "text-accent-blue" : "text-text-muted"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
