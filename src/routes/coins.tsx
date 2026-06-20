import { createFileRoute } from "@tanstack/react-router";
import { TrendingTable } from "@/components/dashboard/TrendingTable";
import { PumpfunLaunches } from "@/components/dashboard/PumpfunLaunches";
import { TokenListEmbed } from "@/components/dashboard/embeds/TokenListEmbed";

export const Route = createFileRoute("/coins")({
  head: () => ({
    meta: [
      { title: "Coins · SCBOL" },
      {
        name: "description",
        content:
          "Live Solana coin feeds: 24h trending pools and the Pump.fun new-pair stream, side by side.",
      },
      { property: "og:title", content: "Coins · SCBOL" },
      {
        property: "og:description",
        content: "24h trending Solana pools + live Pump.fun new pairs.",
      },
    ],
  }),
  component: CoinsPage,
});

function CoinsPage() {
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <TokenListEmbed kind="trending" height="82vh" />
        <TokenListEmbed kind="new-pairs" height="82vh" />
      </div>
      <details className="border border-border bg-panel-2/40">
        <summary className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground">
          Native fallback · trending + new pairs
        </summary>
        <div className="p-3 space-y-3">
          <TrendingTable />
          <PumpfunLaunches />
        </div>
      </details>
    </div>
  );
}