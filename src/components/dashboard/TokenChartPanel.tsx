import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { useMemeOfTheDay } from "@/lib/data";
import { TokenChartEmbed } from "./embeds/TokenChartEmbed";
import { TokenSparkline } from "./TokenSparkline";
import { isBonded } from "@/lib/token-bonded";

export function TokenChartPanel() {
  const { data: mod } = useMemeOfTheDay();
  if (!mod?.address) {
    return (
      <Panel>
        <PanelHeader title="Token Chart" accent="info" />
        <PanelBody>
          <div className="h-72 flex items-center justify-center text-muted-foreground font-mono text-[11px]">
            Loading chart…
          </div>
        </PanelBody>
      </Panel>
    );
  }
  return (
    <div className="flex flex-col">
      <TokenSparkline address={mod.address} />
      <TokenChartEmbed
        address={mod.address}
        symbol={mod.symbol}
        bonded={isBonded(mod)}
        subtitle={`${mod.symbol} · ${mod.name}`}
        height={420}
      />
    </div>
  );
}
