import { usePumpfunLaunches } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { RiskBadge } from "@/components/terminal/RiskBadge";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { fmtUsd, fmtNum, fmtAge } from "@/lib/format";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";

/**
 * Native Pump.fun launches table. Replaces the previous iframe approach
 * (GMGN blocked iframing, GeckoTerminal listing fallback rendered empty).
 * Powered by `usePumpfunLaunches()` → Solana Tracker, with graceful
 * empty-state when the upstream returns no rows.
 */
export function PumpfunLaunches() {
  const { data, status } = usePumpfunLaunches();
  const { open } = useTokenDetail();
  const rows = data ?? [];

  return (
    <Panel>
      <PanelHeader
        title="New Pairs · Pump.fun"
        subtitle={`${rows.length} live · solana-tracker`}
        accent="warn"
        right={<SourceBadge source="solana-tracker" />}
      />
      <PanelBody className="p-0">
        {/* Mobile cards */}
        <ul className="md:hidden divide-y divide-border">
          {rows.map((t) => (
            <li key={t.address} className="px-3 py-2.5 hover:bg-accent/20">
              <button
                type="button"
                onClick={() => open({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl, bonded: false })}
                className="flex items-center gap-2 min-w-0 w-full text-left hover:text-warn transition-colors"
              >
                <TokenAvatar symbol={t.symbol} size={22} logoUrl={t.logoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px]">{t.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">${t.symbol} · {fmtAge(t.ageHours)}</div>
                </div>
                <RiskBadge risk={t.risk} />
              </button>
              <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Mcap</div>
                  <div>{fmtUsd(t.marketCapUsd)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Liq</div>
                  <div>{fmtUsd(t.liquidityUsd)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">24h</div>
                  <div><ChangeCell value={t.change24hPct} /></div>
                </div>
              </div>
              <div className="mt-1.5"><CopyAddress address={t.address} /></div>
            </li>
          ))}
        </ul>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-panel-2/60 border-b border-border">
              <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:font-normal [&>th]:text-[10px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                <th className="text-left">Token</th>
                <th className="text-left">Contract</th>
                <th className="text-right">Price</th>
                <th className="text-right">Mcap</th>
                <th className="text-right">Liq</th>
                <th className="text-right">24h</th>
                <th className="text-right">Buys / Sells</th>
                <th className="text-right">Age</th>
                <th className="text-left">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.address} className="border-b border-border/50 hover:bg-accent/20 [&>td]:px-2 [&>td]:py-1.5">
                  <td>
                    <button
                      type="button"
                      onClick={() => open({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl, bonded: false })}
                      className="flex items-center gap-2 min-w-0 text-left hover:text-warn transition-colors"
                    >
                      <TokenAvatar symbol={t.symbol} size={20} logoUrl={t.logoUrl} />
                      <div className="min-w-0">
                        <div className="truncate">{t.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">${t.symbol}</div>
                      </div>
                    </button>
                  </td>
                  <td><CopyAddress address={t.address} /></td>
                  <td className="text-right font-mono">{fmtUsd(t.priceUsd, { compact: false })}</td>
                  <td className="text-right font-mono">{fmtUsd(t.marketCapUsd)}</td>
                  <td className="text-right font-mono">{fmtUsd(t.liquidityUsd)}</td>
                  <td className="text-right"><ChangeCell value={t.change24hPct} /></td>
                  <td className="text-right font-mono whitespace-nowrap">
                    <span className="text-pos">{fmtNum(t.buys24h)}</span>
                    <span className="px-0.5 text-muted-foreground">/</span>
                    <span className="text-neg">{fmtNum(t.sells24h)}</span>
                  </td>
                  <td className="text-right font-mono">{fmtAge(t.ageHours)}</td>
                  <td><RiskBadge risk={t.risk} /></td>
                </tr>
              ))}
              {status === "loading" && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground font-mono text-[11px]">Scanning Pump.fun launchpad…</td></tr>
              )}
              {status === "ready" && rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground font-mono text-[11px]">No fresh launches reported by Solana Tracker right now.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile empty / loading state */}
        {status === "loading" && rows.length === 0 && (
          <div className="md:hidden px-3 py-6 text-center text-muted-foreground font-mono text-[11px]">Scanning Pump.fun launchpad…</div>
        )}
        {status === "ready" && rows.length === 0 && (
          <div className="md:hidden px-3 py-6 text-center text-muted-foreground font-mono text-[11px]">No fresh launches right now.</div>
        )}
      </PanelBody>
    </Panel>
  );
}