import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Flame, TrendingUp, Newspaper, Star, Wallet, Settings, Trophy, Coins, MessageSquare, X, Radio, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "./MobileNavContext";
import { useEffect } from "react";
import { ScotlandFlag } from "@/components/ui/ScotlandFlag";

const items = [
  { to: "/pulse", label: "Pulse", icon: Radio },
  { to: "/launches", label: "Launches", icon: Rocket },
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/coins", label: "Coins", icon: Coins },
  { to: "/ai", label: "AI Desk", icon: MessageSquare },
  { to: "/meme-of-the-day", label: "Meme of the Day", icon: Trophy },
  { to: "/trending", label: "Trending", icon: TrendingUp },
  { to: "/narratives", label: "Narratives", icon: Newspaper },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/wallet-pnl", label: "Wallet P&L", icon: Wallet },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-1.5">
          <ScotlandFlag className="h-3.5 w-3.5 rounded-sm" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            SCBOL
          </span>
        </div>
        <div className="font-mono text-[10px] text-pos mt-0.5 flex items-center gap-1">
          <Flame className="h-3 w-3" /> Limited access version
        </div>
      </div>
      <ul className="flex-1 py-2 overflow-y-auto">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-[12px] border-l-2 border-transparent md:py-1.5",
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
    </>
  );
}

export function SideNav() {
  const { open, setOpen } = useMobileNav();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex w-52 shrink-0 border-r border-border bg-sidebar flex-col">
        <NavBody />
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
      <nav
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 h-full w-64 border-r border-border bg-sidebar flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-3 h-10 border-b border-border">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pos flex items-center gap-1.5">
            <ScotlandFlag className="h-3.5 w-3.5 rounded-sm" /> SCBOL
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavBody onNavigate={() => setOpen(false)} />
      </nav>
    </>
  );
}
