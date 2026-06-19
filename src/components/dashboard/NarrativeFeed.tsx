import { useNarratives } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { AlertTriangle } from "lucide-react";

export function NarrativeFeed({ compact = false }: { compact?: boolean }) {
  const { data } = useNarratives();
  if (!data) return <Panel><PanelHeader title="Narrative Feed" /><PanelBody>Loading…</PanelBody></Panel>;
  return (
    <Panel>
      <PanelHeader
        title="Narrative Feed"
        subtitle={new Date(data.dateIso).toLocaleDateString()}
        accent="info"
        right={<div className="flex gap-1">{data.sources.map((s) => <SourceBadge key={s} source={s} />)}</div>}
      />
      <PanelBody className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-info mb-1">AI Summary (mock)</div>
          <p className="text-[12px] leading-relaxed text-foreground/85">{data.summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-border bg-panel-2 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Dominant theme</div>
            <div className="font-mono text-sm text-pos mt-0.5">{data.dominantTheme}</div>
          </div>
          <div className="border border-border bg-panel-2 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fastest growing</div>
            <div className="font-mono text-sm text-warn mt-0.5">{data.fastestGrowing}</div>
          </div>
          <div className="border border-border bg-panel-2 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Themes tracked</div>
            <div className="font-mono text-sm mt-0.5">{data.items.length}</div>
          </div>
        </div>

        {!compact && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Repeated keywords</div>
            <div className="flex flex-wrap gap-1.5">
              {data.keywords.map((k) => (
                <span key={k.word}
                  className="font-mono text-[11px] border border-border bg-panel-2 px-1.5 py-0.5"
                  style={{ opacity: 0.4 + (k.weight / 10) * 0.6 }}>
                  {k.word} <span className="text-muted-foreground">·{k.weight}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Notable launches</div>
          <ul className="space-y-1">
            {data.notableLaunches.map((l) => (
              <li key={l.symbol} className="font-mono text-[11px] flex items-center gap-2">
                <span className="text-foreground">${l.symbol}</span>
                <span className="text-muted-foreground">{l.name}</span>
                <span className="text-muted-foreground">— {l.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-warn mb-1.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Warnings
          </div>
          <ul className="space-y-1">
            {data.warnings.map((w, i) => (
              <li key={i} className="font-mono text-[11px] text-warn/90 border-l-2 border-warn/40 pl-2">{w}</li>
            ))}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}
