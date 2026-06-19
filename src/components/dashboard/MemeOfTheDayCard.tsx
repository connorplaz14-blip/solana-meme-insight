import { useMemeOfTheDay } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { StatCell } from "@/components/terminal/StatCell";
import { ChangeCell } from "@/components/terminal/ChangeCell";
import { RiskBadge } from "@/components/terminal/RiskBadge";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { fmtUsd, fmtNum, fmtAge } from "@/lib/format";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";

export function MemeOfTheDayCard({ expanded = false }: { expanded?: boolean }) {
  const { data: t } = useMemeOfTheDay();
  const { open } = useTokenDetail();
  if (!t) return <Panel><PanelHeader title="Meme of the Day" /><PanelBody>Loading…</PanelBody></Panel>;
  return (
    <Panel>
      <PanelHeader title="Meme of the Day" accent="pos"
        right={<span className="font-mono">Score <span className="text-pos">{t.score}</span>/100</span>} />
      <PanelBody className="space-y-3">
        <button
          type="button"
          onClick={() => open({ address: t.address, symbol: t.symbol, name: t.name, logoUrl: t.logoUrl })}
          className="flex items-center gap-3 w-full text-left hover:bg-accent/20 -mx-1 px-1 py-1 transition-colors"
        >
          <TokenAvatar symbol={t.symbol} size={40} logoUrl={t.logoUrl} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-medium hover:text-pos transition-colors">{t.name}</span>
              <span className="font-mono text-xs text-muted-foreground">${t.symbol}</span>
              <RiskBadge risk={t.risk} />
            </div>
            <div className="mt-0.5" onClick={(e) => e.stopPropagation()}><CopyAddress address={t.address} /></div>
          </div>
        </button>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border pt-3">
          <StatCell label="Price" value={fmtUsd(t.priceUsd, { compact: false })} />
          <StatCell label="Market Cap" value={fmtUsd(t.marketCapUsd)} />
          <StatCell label="Liquidity" value={fmtUsd(t.liquidityUsd)} />
          <StatCell label="24h Vol" value={fmtUsd(t.volume24hUsd)} />
          <StatCell label="5m" value={<ChangeCell value={t.changes.m5} />} />
          <StatCell label="1h" value={<ChangeCell value={t.changes.h1} />} />
          <StatCell label="6h" value={<ChangeCell value={t.changes.h6} />} />
          <StatCell label="24h" value={<ChangeCell value={t.changes.h24} />} />
          <StatCell label="Buys 24h" value={<span className="text-pos">{fmtNum(t.txns.buys24h)}</span>} />
          <StatCell label="Sells 24h" value={<span className="text-neg">{fmtNum(t.txns.sells24h)}</span>} />
          <StatCell label="Age" value={fmtAge(t.ageHours)} />
          <StatCell label="Sources" value={<div className="flex gap-1 flex-wrap">{t.sources.map((s) => <SourceBadge key={s} source={s} />)}</div>} />
        </div>

        {expanded && t.scoreBreakdown && (
          <div className="border-t border-border pt-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Score breakdown</div>
            <div className="space-y-1.5">
              {t.scoreBreakdown.map((row) => (
                <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <div>
                    <div className="font-mono text-[11px] text-muted-foreground">{row.label}</div>
                    <div className="h-1 bg-panel-2 mt-0.5">
                      <div className="h-full bg-pos" style={{ width: `${(row.value / row.max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums">{row.value}/{row.max}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-info">AI Summary</span>
            <SourceBadge source="dexscreener" />
          </div>
          <p className="text-[12px] text-foreground/80 leading-relaxed">{t.aiSummary}</p>
        </div>
      </PanelBody>
    </Panel>
  );
}
