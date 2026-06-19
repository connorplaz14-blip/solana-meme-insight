import { useNarratives } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { AlertTriangle, Sparkles } from "lucide-react";

export function DailyBrief() {
  const { data, status } = useNarratives();

  if (status === "loading" || !data) {
    return (
      <Panel>
        <PanelHeader title="Daily Brief" accent="info" />
        <PanelBody>
          <p className="text-[12px] text-muted-foreground font-mono">Generating today&apos;s brief…</p>
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Daily Brief"
        subtitle={new Date(data.dateIso).toLocaleDateString()}
        accent="info"
        right={
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-info">
            <Sparkles className="h-3 w-3" /> Gemini
          </span>
        }
      />
      <PanelBody className="space-y-4">
        <p className="text-[12px] leading-relaxed text-foreground/85">{data.summary}</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-border bg-panel-2 p-2">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Dominant</div>
            <div className="font-mono text-[13px] text-pos mt-0.5">{data.dominantTheme}</div>
          </div>
          <div className="border border-border bg-panel-2 p-2">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Fastest growing</div>
            <div className="font-mono text-[13px] text-warn mt-0.5">{data.fastestGrowing}</div>
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Keywords</div>
          <div className="flex flex-wrap gap-1.5">
            {data.keywords.map((k) => (
              <span
                key={k.word}
                className="font-mono text-[11px] border border-border bg-panel-2 px-1.5 py-0.5"
                style={{ opacity: 0.4 + (k.weight / 10) * 0.6 }}
              >
                {k.word} <span className="text-muted-foreground">·{k.weight}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Themes</div>
          <ul className="space-y-1.5">
            {data.items.map((it) => (
              <li key={it.theme} className="border-l-2 border-info/40 pl-2">
                <div className="font-mono text-[11px] flex items-center gap-2">
                  <span className="text-foreground">{it.theme}</span>
                  <span className={it.growthPct >= 0 ? "text-pos" : "text-neg"}>
                    {it.growthPct >= 0 ? "+" : ""}
                    {it.growthPct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{it.description}</div>
              </li>
            ))}
          </ul>
        </div>

        {data.notableLaunches.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">Notable launches</div>
            <ul className="space-y-1">
              {data.notableLaunches.map((l) => (
                <li key={l.symbol} className="font-mono text-[11px] flex items-center gap-2 flex-wrap">
                  <span className="text-foreground">${l.symbol}</span>
                  <span className="text-muted-foreground">{l.name}</span>
                  <span className="text-muted-foreground">— {l.note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.warnings.length > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-warn mb-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Warnings
            </div>
            <ul className="space-y-1">
              {data.warnings.map((w, i) => (
                <li key={i} className="font-mono text-[11px] text-warn/90 border-l-2 border-warn/40 pl-2">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}