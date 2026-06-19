import { useMarketPulse } from "@/lib/data";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { StatCell } from "@/components/terminal/StatCell";

const condColors: Record<string, string> = {
  Hot: "text-pos border-pos/40 bg-pos/10",
  Neutral: "text-info border-info/40 bg-info/10",
  Dead: "text-muted-foreground border-border bg-panel-2",
  Risky: "text-neg border-neg/40 bg-neg/10",
};

export function MarketPulse() {
  const { data } = useMarketPulse();
  if (!data) return <Panel><PanelHeader title="Market Pulse" /><PanelBody>Loading…</PanelBody></Panel>;
  return (
    <Panel>
      <PanelHeader title="Market Pulse" accent="info" />
      <PanelBody className="space-y-3">
        <div className={`inline-flex items-center px-2 py-1 font-mono text-[11px] uppercase tracking-wider border ${condColors[data.condition]}`}>
          ● Market: {data.condition}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCell label="Trending" value={data.trendingCount.toString()} />
          <StatCell label="New launches scanned" value={data.newLaunchesScanned.toString()} />
          <StatCell label="Top narrative" value={data.topNarrative} tone="pos" />
          <StatCell label="High-risk filtered" value={data.highRiskFiltered.toString()} tone="warn" />
        </div>
      </PanelBody>
    </Panel>
  );
}
