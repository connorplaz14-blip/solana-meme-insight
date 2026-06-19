import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandPalette } from "./CommandPaletteContext";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import {
  LayoutGrid,
  Coins,
  MessageSquare,
  Trophy,
  TrendingUp,
  Newspaper,
  Star,
  Wallet,
  Settings,
  Clock,
  Search,
} from "lucide-react";
import { searchTokensFn } from "@/lib/data/live.functions";
import type { TokenSearchResult } from "@/types";
import { fmtUsd, fmtPct } from "@/lib/format";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { cn } from "@/lib/utils";

const ROUTES = [
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

const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RECENT_KEY = "memedesk.cmdk.recents.v1";
const MAX_RECENT = 6;

type Recent =
  | { kind: "token"; address: string; symbol: string; name?: string; logoUrl?: string }
  | { kind: "wallet"; address: string };

function readRecents(): Recent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as Recent[]) : [];
  } catch {
    return [];
  }
}
function writeRecents(next: Recent[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}
function pushRecent(item: Recent) {
  const cur = readRecents().filter(
    (r) => !(r.kind === item.kind && r.address === item.address),
  );
  writeRecents([item, ...cur]);
}

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const navigate = useNavigate();
  const { open: openToken } = useTokenDetail();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<TokenSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<Recent[]>([]);

  // Refresh recents whenever the palette opens.
  useEffect(() => {
    if (isOpen) {
      setRecents(readRecents());
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounce query.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  // Run search.
  useEffect(() => {
    let cancelled = false;
    if (!isOpen || debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchTokensFn({ data: { q: debounced } })
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, isOpen]);

  const looksLikeAddress = useMemo(
    () => SOL_ADDR_RE.test(query.trim()),
    [query],
  );

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter((r) => r.label.toLowerCase().includes(q));
  }, [query]);

  function handleOpenToken(t: { address: string; symbol: string; name?: string; logoUrl?: string }) {
    pushRecent({ kind: "token", address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl });
    close();
    openToken({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl });
  }

  function handleOpenWallet(addr: string) {
    pushRecent({ kind: "wallet", address: addr });
    close();
    navigate({ to: "/wallet-pnl", search: { address: addr } as never });
  }

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={(o) => (o ? null : close())}
    >
      <CommandInput
        placeholder="Search token, wallet, CA, narrative…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          {loading
            ? "Searching…"
            : debounced.length >= 2
              ? "No matches."
              : "Type to search — or paste a Solana address."}
        </CommandEmpty>

        {/* Address shortcuts */}
        {looksLikeAddress && (
          <>
            <CommandGroup heading="Open address">
              <CommandItem
                value={`token-${query}`}
                onSelect={() =>
                  handleOpenToken({ address: query.trim(), symbol: query.trim().slice(0, 4) })
                }
              >
                <Coins className="mr-2 h-4 w-4 text-pos" />
                <span className="font-mono text-xs truncate">Open token · {query.trim()}</span>
              </CommandItem>
              <CommandItem value={`wallet-${query}`} onSelect={() => handleOpenWallet(query.trim())}>
                <Wallet className="mr-2 h-4 w-4 text-info" />
                <span className="font-mono text-xs truncate">Open as wallet · {query.trim()}</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Token search results */}
        {results.length > 0 && (
          <>
            <CommandGroup heading="Tokens">
              {results.map((r) => (
                <CommandItem
                  key={r.address}
                  value={`token-${r.address}-${r.symbol}`}
                  onSelect={() => handleOpenToken(r)}
                  className="gap-2"
                >
                  <TokenAvatar symbol={r.symbol} size={22} logoUrl={r.logoUrl} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">${r.symbol}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{r.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground truncate">
                      {r.address}
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px]">
                    <div>{fmtUsd(r.priceUsd, { compact: false, digits: r.priceUsd < 0.01 ? 6 : 4 })}</div>
                    <div className={cn(r.change24hPct >= 0 ? "text-pos" : "text-neg")}>
                      {fmtPct(r.change24hPct)}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recents */}
        {recents.length > 0 && query.trim().length === 0 && (
          <>
            <CommandGroup heading="Recent">
              {recents.map((r) => (
                <CommandItem
                  key={`${r.kind}-${r.address}`}
                  value={`recent-${r.kind}-${r.address}`}
                  onSelect={() =>
                    r.kind === "token"
                      ? handleOpenToken({ address: r.address, symbol: r.symbol, name: r.name, logoUrl: r.logoUrl })
                      : handleOpenWallet(r.address)
                  }
                  className="gap-2"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {r.kind === "token" ? (
                    <>
                      <TokenAvatar symbol={r.symbol} size={18} logoUrl={r.logoUrl} />
                      <span className="font-medium text-sm">${r.symbol}</span>
                      <span className="font-mono text-[10px] text-muted-foreground truncate">
                        {r.address}
                      </span>
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 text-info" />
                      <span className="font-mono text-xs truncate">{r.address}</span>
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Routes */}
        <CommandGroup heading="Go to">
          {filteredRoutes.map((r) => {
            const Icon = r.icon;
            return (
              <CommandItem
                key={r.to}
                value={`route-${r.to}`}
                onSelect={() => {
                  close();
                  navigate({ to: r.to });
                }}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{r.label}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{r.to}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {loading && (
          <div className="px-3 py-2 flex items-center gap-2 text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
            <Search className="h-3 w-3 animate-pulse" /> Searching DexScreener…
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}