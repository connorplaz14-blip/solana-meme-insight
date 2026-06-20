import { createFileRoute } from "@tanstack/react-router";
import { TokenListEmbed } from "@/components/dashboard/embeds/TokenListEmbed";

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
      <TokenListEmbed kind="trending" height="78vh" />
      <TokenListEmbed kind="new-pairs" height="78vh" />
    </div>
  );
}