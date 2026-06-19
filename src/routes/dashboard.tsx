import { createFileRoute } from "@tanstack/react-router";
import { MemeOfTheDayCard } from "@/components/dashboard/MemeOfTheDayCard";
import { TrendingTable } from "@/components/dashboard/TrendingTable";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { NarrativeFeed } from "@/components/dashboard/NarrativeFeed";
import { TokenChartPanel } from "@/components/dashboard/TokenChartPanel";
import { PumpfunLaunches } from "@/components/dashboard/PumpfunLaunches";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "MemeDesk · Solana Memecoin Terminal" },
    { name: "description", content: "Real-time-style intelligence dashboard for Solana memecoins: trending tokens, daily AI narratives, market pulse, and watchlist." },
    { property: "og:title", content: "MemeDesk · Solana Memecoin Terminal" },
    { property: "og:description", content: "Solana memecoin intelligence dashboard. Trending tokens, narratives, market pulse." },
  ]}),
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-4"><MemeOfTheDayCard /></div>
        <div className="xl:col-span-8"><TokenChartPanel /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-8"><TrendingTable limit={8} dense /></div>
        <div className="xl:col-span-4"><MarketPulse /></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-6"><PumpfunLaunches /></div>
        <div className="xl:col-span-6"><NarrativeFeed compact /></div>
      </div>
    </div>
  );
}
