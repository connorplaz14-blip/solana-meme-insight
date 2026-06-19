import { useSolMarket } from "@/lib/data";
import { fmtUsd, fmtPct, fmtTime } from "@/lib/format";
import { RefreshButton } from "@/components/terminal/RefreshButton";
import { cn } from "@/lib/utils";

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col px-3 border-r border-border h-full justify-center min-w-[110px]">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-xs", tone)}>{value}</span>
    </div>
  );
}

export function MarketBar() {
  const { data, status, lastUpdated, refresh } = useSolMarket();
  return (
    <div className="flex items-stretch h-10 border-b border-border bg-panel">
      <div className="flex items-center px-3 border-r border-border min-w-[140px]">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pos">◆ MemeDesk</span>
      </div>
      <Cell label="SOL/USD" value={data ? fmtUsd(data.priceUsd, { compact: false, digits: 2 }) : "…"} />
      <Cell label="24h Δ" value={data ? fmtPct(data.change24hPct) : "…"}
        tone={data ? (data.change24hPct >= 0 ? "text-pos" : "text-neg") : ""} />
      <Cell label="24h Vol" value={data ? fmtUsd(data.volume24hUsd) : "…"} />
      <Cell label="SOL Mcap" value={data ? fmtUsd(data.marketCapUsd) : "…"} />
      <div className="flex-1" />
      <div className="flex items-center gap-3 px-3 border-l border-border">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Updated <span className="text-foreground">{fmtTime(lastUpdated)}</span>
        </span>
        <RefreshButton onClick={refresh} loading={status === "loading"} />
      </div>
    </div>
  );
}
