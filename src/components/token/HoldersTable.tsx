import { useTokenHolders } from "@/lib/data";
import { fmtUsd, fmtPct, shortAddr } from "@/lib/format";

export function HoldersTable({ address }: { address: string }) {
  const { data, status } = useTokenHolders(address);
  const rows = data ?? [];

  if (status === "loading" && rows.length === 0) {
    return (
      <div className="h-[65vh] flex items-center justify-center text-muted-foreground font-mono text-[11px]">
        Loading top holders…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="h-[65vh] flex items-center justify-center text-muted-foreground font-mono text-[11px]">
        No holder data available for this token.
      </div>
    );
  }

  const totalPct = rows.reduce((s, r) => s + r.percentage, 0);

  return (
    <div className="h-[65vh] overflow-auto">
      <div className="px-3 py-2 border-b border-border bg-panel-2/50 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Top {rows.length} holders</span>
        <span>Concentration: <span className="text-foreground">{totalPct.toFixed(1)}%</span></span>
      </div>
      <table className="w-full text-[12px]">
        <thead className="bg-panel-2/40 border-b border-border">
          <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:font-normal [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
            <th className="text-left w-10">#</th>
            <th className="text-left">Wallet</th>
            <th className="text-right">% Supply</th>
            <th className="text-right">Value</th>
            <th className="text-left w-16">Tag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => {
            const barPct = Math.min(100, h.percentage);
            const heat = h.percentage >= 5 ? "bg-neg/70" : h.percentage >= 1 ? "bg-warn/70" : "bg-info/60";
            return (
              <tr key={h.address} className="border-b border-border/40 hover:bg-accent/15 [&>td]:px-3 [&>td]:py-1.5">
                <td className="font-mono text-muted-foreground">{h.rank}</td>
                <td>
                  <a
                    href={`https://solscan.io/account/${h.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] hover:text-info hover:underline"
                  >
                    {shortAddr(h.address, 6, 6)} ↗
                  </a>
                </td>
                <td className="text-right font-mono">
                  <div>{fmtPct(h.percentage, 2).replace("+", "")}</div>
                  <div className="mt-0.5 h-1 w-full bg-panel-2 overflow-hidden">
                    <div className={`h-full ${heat}`} style={{ width: `${barPct}%` }} />
                  </div>
                </td>
                <td className="text-right font-mono">{fmtUsd(h.valueUsd)}</td>
                <td>
                  {h.insider ? (
                    <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-warn/40 text-warn">
                      insider
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}