import { createFileRoute } from "@tanstack/react-router";
import { DexScreenerEmbed, type EmbedProviderOption } from "@/components/dashboard/DexScreenerEmbed";
import { PumpfunLaunches } from "@/components/dashboard/PumpfunLaunches";

const TRENDING_PROVIDERS: EmbedProviderOption[] = [
  {
    id: "gecko",
    label: "Gecko",
    source: "geckoterminal",
    src: "https://www.geckoterminal.com/solana/pools?embed=1",
  },
  {
    id: "dexscreener",
    label: "DexScreener",
    source: "dexscreener",
    src: "https://dexscreener.com/solana?rankBy=trendingScoreH6&order=desc&embed=1&theme=dark&info=0",
  },
];

export const Route = createFileRoute("/trending")({
  head: () => ({ meta: [
    { title: "Trending Tokens · MemeDesk" },
    { name: "description", content: "Trending Solana memecoins ranked by volume, liquidity, and momentum. Filter by risk, search by symbol or contract." },
    { property: "og:title", content: "Trending Solana Memecoins · MemeDesk" },
    { property: "og:description", content: "Trending Solana memecoins with risk filters and search." },
  ]}),
  component: TrendingPage,
});

function TrendingPage() {
  return (
    <div className="p-3 space-y-3">
      <DexScreenerEmbed
        title="Trending · Solana"
        subtitle="6h trending score"
        providers={TRENDING_PROVIDERS}
        defaultProviderId="gecko"
        storageKey="trending-provider"
        height="78vh"
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <PumpfunLaunches height={620} />
        <DexScreenerEmbed
          title="Top Gainers · 24h"
          subtitle="DexScreener · Solana"
          src="https://dexscreener.com/solana?rankBy=priceChangeH24&order=desc&embed=1&theme=dark&info=0"
          height={620}
        />
      </div>
    </div>
  );
}
