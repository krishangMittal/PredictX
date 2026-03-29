"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Markets", icon: "📊" },
  { href: "/portfolio", label: "Portfolio", icon: "💼" },
  { href: "/history", label: "History", icon: "📜" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/ai-brain", label: "AI Brain", icon: "🤖" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-screen fixed left-0 top-0 bg-surface border-r border-border-dim">
        <div className="p-4 border-b border-border-dim">
          <h1 className="text-xl font-bold">
            <span className="text-accent-blue">Predict</span>
            <span className="text-foreground">X</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">Paper Trading Platform</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                pathname === item.href
                  ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                  : "text-text-muted hover:text-foreground hover:bg-surface-light"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border-dim">
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-text-muted">Balance</p>
            <p className="text-lg font-mono font-bold text-accent-green">$10,000.00</p>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border-dim flex justify-around py-2 z-50">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
              pathname === item.href ? "text-accent-blue" : "text-text-muted"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
