import { useEffect, useMemo, useState } from "react";
import { getWatchlist, subscribeWatchlist } from "@/lib/watchlist-store";
import { liveAdapter } from "@/lib/data/adapters/live";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import { PulseColumn } from "./PulseColumn";
import { timeAgo } from "./timeAgo";
import { fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WatchlistEntry } from "@/types";

type Ping = {
  signature: string;
  symbol: string;
  address: string;
  side: "buy" | "sell";
  valueUsd: number;
  blockUnixTime: number;
};

export function WhalePingsColumn() {
  const [list, setList] = useState<WatchlistEntry[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [tick, setTick] = useState(0);
  const { open } = useTokenDetail();

  useEffect(() => {
    setList(getWatchlist());
    return subscribeWatchlist(() => setList(getWatchlist()));
  }, []);

  useEffect(() => {
    if (list.length === 0) {
      setPings([]);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const watched = list.slice(0, 8); // cap to keep request budget reasonable
    Promise.all(
      watched.map((w) =>
        liveAdapter
          .getTokenWhaleTrades(w.address, 2500)
          .then((rows) => rows.map((r) => ({ ...r, symbol: w.symbol, address: w.address })))
          .catch(() => [] as (Ping & { owner: string; tokenAmount: number })[]),
      ),
    ).then((arrs) => {
      if (cancelled) return;
      const all: Ping[] = arrs
        .flat()
        .map((r) => ({
          signature: r.signature,
          symbol: r.symbol,
          address: r.address,
          side: r.side,
          valueUsd: r.valueUsd,
          blockUnixTime: r.blockUnixTime,
        }))
        .sort((a, b) => b.blockUnixTime - a.blockUnixTime)
        .slice(0, 40);
      setPings(all);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [list, tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 45_000);
    return () => clearInterval(id);
  }, []);

  const symbolMap = useMemo(() => new Map(list.map((w) => [w.address, w])), [list]);

  return (
    <PulseColumn
      title="Whale Pings"
      status={status}
      onRefresh={() => setTick((t) => t + 1)}
      badge={<span className="font-mono text-[10px] text-muted-foreground">{pings.length}</span>}
    >
      {list.length === 0 ? (
        <div className="p-3 font-mono text-[11px] text-muted-foreground">
          Watchlist empty. Add tokens from /watchlist to track whale flows.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pings.length === 0 && status !== "loading" && (
            <li className="p-3 font-mono text-[11px] text-muted-foreground">No whale trades yet.</li>
          )}
          {pings.map((p) => {
            const w = symbolMap.get(p.address);
            return (
              <li key={p.signature}>
                <button
                  onClick={() =>
                    open({ address: p.address, symbol: p.symbol, name: w?.name })
                  }
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent/20"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase",
                          p.side === "buy" ? "text-pos" : "text-neg",
                        )}
                      >
                        {p.side}
                      </span>
                      <span className="font-mono text-[12px] text-foreground">${p.symbol}</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {timeAgo(new Date(p.blockUnixTime * 1000).toISOString())} ago
                    </div>
                  </div>
                  <span className={cn("font-mono text-[11px]", p.side === "buy" ? "text-pos" : "text-neg")}>
                    {fmtUsd(p.valueUsd)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PulseColumn>
  );
}