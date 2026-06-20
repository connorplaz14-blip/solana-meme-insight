import { useState } from "react";
import { useTokenWhaleTrades } from "@/lib/data";
import { fmtUsd, fmtNum, shortAddr } from "@/lib/format";

const THRESHOLDS: { label: string; value: number }[] = [
  { label: "$1K+", value: 1_000 },
  { label: "$5K+", value: 5_000 },
  { label: "$25K+", value: 25_000 },
];

function relTime(unix: number) {
  if (!unix) return "—";
  const s = Math.max(1, Math.round(Date.now() / 1000 - unix));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.round(s / 60) + "m";
  if (s < 86400) return Math.round(s / 3600) + "h";
  return Math.round(s / 86400) + "d";
}

export function WhaleFeed({ address }: { address: string }) {
  const [minUsd, setMinUsd] = useState(1_000);
  const { data, status, lastUpdated } = useTokenWhaleTrades(address, minUsd);
  const rows = data ?? [];

  return (
    <div className="h-[65vh] flex flex-col">
      <div className="px-3 py-2 border-b border-border bg-panel-2/50 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {THRESHOLDS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setMinUsd(t.value)}
              className={
                "font-mono text-[10px] uppercase tracking-wider px-2 py-1 border " +
                (minUsd === t.value
                  ? "border-foreground/40 bg-accent/40 text-foreground"
                  : "border-border bg-panel-2 text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {rows.length} trades · auto-refresh 15s
          {lastUpdated ? <span className="ml-2">· {new Date(lastUpdated).toLocaleTimeString()}</span> : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {status === "loading" && rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-[11px]">
            Scanning whale trades…
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-[11px]">
            No trades ≥ {fmtUsd(minUsd)} in the last 50 swaps.
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="bg-panel-2/40 border-b border-border sticky top-0">
              <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:font-normal [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                <th className="text-left w-14">Age</th>
                <th className="text-left w-14">Side</th>
                <th className="text-right">USD</th>
                <th className="text-right">Tokens</th>
                <th className="text-left">Wallet</th>
                <th className="text-left w-12">Tx</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.signature} className="border-b border-border/40 hover:bg-accent/15 [&>td]:px-3 [&>td]:py-1.5">
                  <td className="font-mono text-muted-foreground">{relTime(r.blockUnixTime)}</td>
                  <td>
                    <span className={
                      "font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border " +
                      (r.side === "buy"
                        ? "border-pos/40 text-pos bg-pos/5"
                        : "border-neg/40 text-neg bg-neg/5")
                    }>
                      {r.side}
                    </span>
                  </td>
                  <td className={"text-right font-mono " + (r.side === "buy" ? "text-pos" : "text-neg")}>
                    {fmtUsd(r.valueUsd)}
                  </td>
                  <td className="text-right font-mono text-muted-foreground">{fmtNum(r.tokenAmount)}</td>
                  <td>
                    {r.owner ? (
                      <a
                        href={`https://solscan.io/account/${r.owner}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] hover:text-info hover:underline"
                      >
                        {shortAddr(r.owner, 4, 4)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    <a
                      href={`https://solscan.io/tx/${r.signature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] hover:text-info hover:underline"
                    >
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}