import { useMemo } from "react";
import { useTrending } from "@/lib/data";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import { PulseColumn } from "./PulseColumn";
import { fmtUsd, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TrendingColumn() {
  const { data, status, refresh } = useTrending();
  const { open } = useTokenDetail();

  const top = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.changes.h24 - a.changes.h24).slice(0, 20),
    [data],
  );

  return (
    <PulseColumn
      title="Movers · 24h"
      status={status}
      onRefresh={refresh}
      badge={<span className="font-mono text-[10px] text-muted-foreground">{top.length}</span>}
    >
      <ul className="divide-y divide-border">
        {top.map((t, i) => {
          const up = t.changes.h24 >= 0;
          return (
            <li key={t.address}>
              <button
                onClick={() => open({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl })}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-muted-foreground w-4">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-foreground truncate">{t.symbol}</div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate">
                      {fmtUsd(t.priceUsd)} · vol {fmtUsd(t.volume24hUsd)}
                    </div>
                  </div>
                </div>
                <span className={cn("font-mono text-[11px]", up ? "text-pos" : "text-neg")}>
                  {fmtPct(t.changes.h24)}
                </span>
              </button>
            </li>
          );
        })}
        {top.length === 0 && status !== "loading" && (
          <li className="p-3 font-mono text-[11px] text-muted-foreground">No movers.</li>
        )}
      </ul>
    </PulseColumn>
  );
}