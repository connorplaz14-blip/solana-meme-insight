import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Rocket, Copy, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePumpfunStream, type StreamStatus } from "@/hooks/usePumpfunStream";
import type { Launch } from "@/routes/api/pumpfun/latest";
import { useSolMarket } from "@/lib/data";

const seedQueryOptions = queryOptions({
  queryKey: ["pumpfun", "latest"],
  queryFn: async (): Promise<Launch[]> => {
    // On the server (SSR / loader), call the helper directly — relative-URL
    // fetch isn't supported in the Worker runtime. On the client, hit the
    // API route so we benefit from edge caching.
    if (typeof window === "undefined") {
      const { fetchPumpfunSeed } = await import("@/lib/pumpfun/seed.server");
      return fetchPumpfunSeed();
    }
    const r = await fetch("/api/pumpfun/latest");
    if (!r.ok) return [];
    return (await r.json()) as Launch[];
  },
  staleTime: 10_000,
  refetchInterval: 10_000,
});

export const Route = createFileRoute("/launches")({
  head: () => ({
    meta: [
      { title: "Launches · Live pump.fun Stream · SCBOL" },
      {
        name: "description",
        content:
          "Real-time Solana pump.fun launch terminal: every new memecoin the moment it mints, with dev address, initial buy, and live market cap.",
      },
      { property: "og:title", content: "Launches · Live pump.fun Stream" },
      {
        property: "og:description",
        content:
          "Stream brand-new Solana memecoin launches live, with dev address and live market cap.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(seedQueryOptions),
  component: LaunchesPage,
});

function LaunchesPage() {
  const { data: seed } = useSuspenseQuery(seedQueryOptions);
  const sol = useSolMarket();
  const solPrice = sol.data?.priceUsd;
  const { launches, status, perMin } = usePumpfunStream({
    seed,
    solPriceUsd: solPrice,
  });

  const [query, setQuery] = useState("");
  const [minMcap, setMinMcap] = useState(0);
  const [minDevBuy, setMinDevBuy] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return launches.filter((l) => {
      if (q) {
        const hay = `${l.symbol} ${l.name} ${l.mint}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (minMcap > 0 && (l.marketCapUsd ?? 0) < minMcap) return false;
      if (minDevBuy > 0 && (l.devBuySol ?? 0) < minDevBuy) return false;
      return true;
    });
  }, [launches, query, minMcap, minDevBuy]);

  const stats = useMemo(() => {
    const total = launches.length;
    const withMcap = launches.filter((l) => (l.marketCapUsd ?? 0) > 0);
    const avg =
      withMcap.reduce((s, l) => s + (l.marketCapUsd ?? 0), 0) /
      Math.max(withMcap.length, 1);
    const max = withMcap.reduce(
      (m, l) => ((l.marketCapUsd ?? 0) > (m.marketCapUsd ?? 0) ? l : m),
      withMcap[0],
    );
    return { total, avg, max };
  }, [launches]);

  return (
    <div className="p-3">
      <header className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-mono text-[14px] uppercase tracking-[0.18em] text-foreground flex items-center gap-2">
            <Rocket className="h-4 w-4 text-pos" />
            Launches
          </h1>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
            Live pump.fun stream · {filtered.length} of {launches.length}
          </p>
        </div>
        <StatusPill status={status} perMin={perMin} />
      </header>

      <Filters
        query={query}
        onQuery={setQuery}
        minMcap={minMcap}
        onMinMcap={setMinMcap}
        minDevBuy={minDevBuy}
        onMinDevBuy={setMinDevBuy}
      />

      <StatsStrip
        total={stats.total}
        avgMcap={stats.avg}
        top={stats.max}
        perMin={perMin}
      />

      <div className="border border-border bg-card/40">
        <div className="grid grid-cols-[1fr_90px_110px_90px_60px] gap-2 px-3 py-1.5 border-b border-border bg-muted/20 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Token</span>
          <span className="text-right">Age</span>
          <span className="text-right">Mcap</span>
          <span className="text-right">Dev buy</span>
          <span className="text-right">Links</span>
        </div>
        <ul className="divide-y divide-border">
          {filtered.length === 0 && (
            <li className="p-6 text-center font-mono text-[11px] text-muted-foreground">
              {status === "open"
                ? "Waiting for next launch…"
                : "Connecting to pump.fun stream…"}
            </li>
          )}
          {filtered.map((l) => (
            <LaunchRow key={l.mint} launch={l} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatusPill({ status, perMin }: { status: StreamStatus; perMin: number }) {
  const map: Record<StreamStatus, { dot: string; label: string }> = {
    connecting: { dot: "bg-warn", label: "connecting" },
    open: { dot: "bg-pos animate-pulse", label: "live" },
    closed: { dot: "bg-muted-foreground", label: "closed" },
    offline: { dot: "bg-neg", label: "stream offline · polling" },
  };
  const v = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-border bg-panel-2 font-mono text-[10px] text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
      {v.label}
      {status === "open" && (
        <span className="text-foreground ml-1">· {perMin}/min</span>
      )}
    </span>
  );
}

function Filters({
  query,
  onQuery,
  minMcap,
  onMinMcap,
  minDevBuy,
  onMinDevBuy,
}: {
  query: string;
  onQuery: (v: string) => void;
  minMcap: number;
  onMinMcap: (v: number) => void;
  minDevBuy: number;
  onMinDevBuy: (v: number) => void;
}) {
  const mcaps = [0, 5000, 10000, 50000];
  const devs = [0, 1, 5, 10];
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border border-border bg-card/40 px-2 py-1.5">
      <div className="flex items-center gap-1 flex-1 min-w-[180px]">
        <Search className="h-3 w-3 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search name, symbol, or mint…"
          className="flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          min mcap
        </span>
        {mcaps.map((m) => (
          <button
            key={m}
            onClick={() => onMinMcap(m)}
            className={cn(
              "font-mono text-[10px] px-1.5 py-0.5 rounded-sm",
              minMcap === m
                ? "bg-pos/20 text-pos"
                : "bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {m === 0 ? "any" : `$${m / 1000}k`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          min dev buy
        </span>
        {devs.map((d) => (
          <button
            key={d}
            onClick={() => onMinDevBuy(d)}
            className={cn(
              "font-mono text-[10px] px-1.5 py-0.5 rounded-sm",
              minDevBuy === d
                ? "bg-pos/20 text-pos"
                : "bg-muted/20 text-muted-foreground hover:text-foreground",
            )}
          >
            {d === 0 ? "any" : `${d}◎`}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsStrip({
  total,
  avgMcap,
  top,
  perMin,
}: {
  total: number;
  avgMcap: number;
  top?: Launch;
  perMin: number;
}) {
  return (
    <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Stat label="Tracked" value={String(total)} />
      <Stat label="Per min" value={String(perMin)} />
      <Stat label="Avg mcap" value={fmtUsd(avgMcap)} />
      <Stat
        label="Top mcap"
        value={top ? `${top.symbol || "—"} · ${fmtUsd(top.marketCapUsd ?? 0)}` : "—"}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card/40 px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-[12px] text-foreground truncate">{value}</div>
    </div>
  );
}

function LaunchRow({ launch }: { launch: Launch }) {
  const age = useAge(launch.createdAt);
  const [flash, setFlash] = useState(launch.source === "ws");
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_90px_110px_90px_60px] gap-2 px-3 py-2 items-center transition-colors",
        flash ? "bg-pos/15" : "hover:bg-accent/20",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {launch.imageUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <img
            src={launch.imageUrl}
            className="h-8 w-8 rounded-sm border border-border bg-muted/20 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-8 w-8 rounded-sm bg-warn/20 grid place-items-center">
            <Rocket className="h-3.5 w-3.5 text-warn" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold text-foreground truncate">
              {launch.symbol || "—"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground truncate">
              {launch.name}
            </span>
            {launch.source === "ws" && (
              <span className="font-mono text-[8px] uppercase tracking-wider bg-pos/20 text-pos px-1 rounded-sm">
                new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground/70">
            <span className="font-mono text-[9px] truncate">
              {launch.mint.slice(0, 4)}…{launch.mint.slice(-4)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard?.writeText(launch.mint);
              }}
              className="opacity-50 hover:opacity-100"
              aria-label="Copy mint"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>
            {launch.dev && (
              <span className="font-mono text-[9px] ml-1">
                · dev {launch.dev.slice(0, 4)}…{launch.dev.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </div>
      <span className="font-mono text-[11px] text-right text-muted-foreground">
        {age}
      </span>
      <span className="font-mono text-[11px] text-right text-foreground">
        {launch.marketCapUsd ? fmtUsd(launch.marketCapUsd) : "—"}
      </span>
      <span className="font-mono text-[11px] text-right text-muted-foreground">
        {launch.devBuySol ? `${launch.devBuySol.toFixed(2)}◎` : "—"}
      </span>
      <span className="flex items-center justify-end gap-1">
        <a
          href={`https://pump.fun/coin/${launch.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-info hover:text-foreground"
          aria-label="Open on pump.fun"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={`https://dexscreener.com/solana/${launch.mint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          dex
        </a>
      </span>
    </li>
  );
}

function useAge(createdAt: number): string {
  // First render must match SSR (empty) to avoid Date.now() hydration drift.
  // After mount, tick every second.
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!mounted) return "";
  const diff = Math.max(0, Date.now() - createdAt);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function fmtUsd(n: number): string {
  if (!n || !isFinite(n)) return "—";
  return (
    "$" +
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n)
  );
}