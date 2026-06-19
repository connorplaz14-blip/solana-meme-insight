import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Flame, TrendingUp, Newspaper, Star, Wallet, Settings, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/meme-of-the-day", label: "Meme of the Day", icon: Trophy },
  { to: "/trending", label: "Trending", icon: TrendingUp },
  { to: "/narratives", label: "Narratives", icon: Newspaper },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/wallet-pnl", label: "Wallet P&L", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function SideNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="w-52 shrink-0 border-r border-border bg-sidebar flex flex-col">
      <div className="px-3 py-3 border-b border-border">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Solana · Memecoin Intel
        </div>
        <div className="font-mono text-[10px] text-pos mt-0.5 flex items-center gap-1">
          <Flame className="h-3 w-3" /> Phase 1 · Mock data
        </div>
      </div>
      <ul className="flex-1 py-2">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-[12px] border-l-2 border-transparent",
                  active
                    ? "bg-accent/40 border-pos text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium tracking-wide">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-2 border-t border-border font-mono text-[10px] text-muted-foreground">
        <div>v0.1.0 · build {new Date().getUTCFullYear()}</div>
        <div className="text-warn mt-0.5">Analytics only · No trading</div>
      </div>
    </nav>
  );
}
