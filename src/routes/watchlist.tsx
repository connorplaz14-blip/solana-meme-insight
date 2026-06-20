import { createFileRoute } from "@tanstack/react-router";
import { WatchlistView } from "@/components/watchlist/WatchlistView";
import { SentimentPanel } from "@/components/watchlist/SentimentPanel";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [
    { title: "Watchlist · SCBOL" },
    { name: "description", content: "Track your Solana memecoin watchlist with live price, market cap, and 24h change." },
  ]}),
  component: () => (
    <div className="p-3 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div className="xl:col-span-8"><WatchlistView /></div>
      <div className="xl:col-span-4"><SentimentPanel /></div>
    </div>
  ),
});
