import { usePumpfunLaunches } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import { fmtUsd } from "@/lib/format";
import { Rocket } from "lucide-react";

export function PumpfunLaunches({ limit = 8 }: { limit?: number }) {
  const { data, status } = usePumpfunLaunches();
  const { open } = useTokenDetail();
  const rows = (data ?? []).slice(0, limit);

  return (
    <Panel>
      <PanelHeader
        title="Pump.fun Launches"
        subtitle="Newest mints · 48h window"
        accent="warn"
        right={<SourceBadge source="solana-tracker" />}
      />
      <PanelBody className="p-0">
        {status === "loading" && (
          <p className="text-[12px] text-muted-foreground text-center py-6 font-mono">Loading…</p>
        )}
        {status !== "loading" && rows.length === 0 && (
          <div className="px-3 py-6 text-center text-[12px] text-muted-foreground font-mono space-y-1">
            <Rocket className="h-4 w-4 mx-auto opacity-50" />
            <div>No live launches feed yet.</div>
            <div className="text-[10px]">Add SOLANA_TRACKER_API_KEY in settings to enable.</div>
          </div>
        )}
        {rows.length > 0 && (
          <table className="w-full text-[12px]">
            <thead className="bg-panel-2/60 border-b border-border">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-normal [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                <th className="text-left">Token</th>
                <th className="text-right">Age</th>
                <th className="text-right">Liq</th>
                <th className="text-right">MCap</th>
                <th className="text-right">24h</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.address} className="border-b border-border/50 hover:bg-panel-2/40 [&>td]:px-2 [&>td]:py-1.5">
                  <td>
                    <button
                      type="button"
                      onClick={() => open({ address: l.address, symbol: l.symbol, name: l.name, logoUrl: l.logoUrl })}
                      className="flex items-center gap-2 text-left hover:text-info"
                    >
                      <TokenAvatar symbol={l.symbol} logoUrl={l.logoUrl} />
                      <div>
                        <div className="font-mono text-[11px]">${l.symbol}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{l.name}</div>
                      </div>
                    </button>
                  </td>
                  <td className="text-right font-mono text-muted-foreground">{l.ageHours < 1 ? `${Math.round(l.ageHours * 60)}m` : `${l.ageHours.toFixed(1)}h`}</td>
                  <td className="text-right font-mono">{fmtUsd(l.liquidityUsd)}</td>
                  <td className="text-right font-mono">{fmtUsd(l.marketCapUsd)}</td>
                  <td className="text-right"><ChangeCell value={l.change24hPct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PanelBody>
    </Panel>
  );
}