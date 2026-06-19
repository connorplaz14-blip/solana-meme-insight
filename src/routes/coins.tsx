import { createFileRoute } from "@tanstack/react-router";
import { DexScreenerEmbed } from "@/components/dashboard/DexScreenerEmbed";

export const Route = createFileRoute("/coins")({
  head: () => ({
    meta: [
      { title: "Coins · MemeDesk" },
      {
        name: "description",
        content:
          "Live Solana coin feeds: 24h trending pools and the Pump.fun new-pair stream, side by side.",
      },
      { property: "og:title", content: "Coins · MemeDesk" },
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
      <DexScreenerEmbed
        title="Trending · Solana · 24h"
        subtitle="GeckoTerminal · sorted by 24h volume"
        src="https://www.geckoterminal.com/solana/pools?embed=1&sort=h24_volume_usd"
        source="geckoterminal"
        height="78vh"
      />
      <DexScreenerEmbed
        title="Pump.fun · New Pairs · Live"
        subtitle="GeckoTerminal · bonding-curve pools as they appear"
        src="https://www.geckoterminal.com/solana/pump-fun/pools?embed=1"
        source="geckoterminal"
        height="78vh"
      />
    </div>
  );
}