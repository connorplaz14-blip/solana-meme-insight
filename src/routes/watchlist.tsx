import { createFileRoute } from "@tanstack/react-router";
import { WatchlistView } from "@/components/watchlist/WatchlistView";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [
    { title: "Watchlist · SCBOL" },
    { name: "description", content: "Track your Solana memecoin watchlist with live price, market cap, and 24h change." },
  ]}),
  component: () => <div className="p-3"><WatchlistView /></div>,
});
