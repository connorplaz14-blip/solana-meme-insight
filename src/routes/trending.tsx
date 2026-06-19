import { createFileRoute } from "@tanstack/react-router";
import { TrendingTable } from "@/components/dashboard/TrendingTable";

export const Route = createFileRoute("/trending")({
  head: () => ({ meta: [
    { title: "Trending Tokens · MemeDesk" },
    { name: "description", content: "Trending Solana memecoins ranked by volume, liquidity, and momentum. Filter by risk, search by symbol or contract." },
    { property: "og:title", content: "Trending Solana Memecoins · MemeDesk" },
    { property: "og:description", content: "Trending Solana memecoins with risk filters and search." },
  ]}),
  component: () => <div className="p-3"><TrendingTable /></div>,
});
