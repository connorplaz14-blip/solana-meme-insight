import { createFileRoute } from "@tanstack/react-router";
import { MemeOfTheDayCard } from "@/components/dashboard/MemeOfTheDayCard";
import { TokenChartPanel } from "@/components/dashboard/TokenChartPanel";

export const Route = createFileRoute("/meme-of-the-day")({
  head: () => ({ meta: [
    { title: "Meme of the Day · SCBOL" },
    { name: "description", content: "The day's top Solana memecoin with full liquidity, volume, transaction, risk, and AI-summary breakdown." },
    { property: "og:title", content: "Meme of the Day · SCBOL" },
    { property: "og:description", content: "Today's top Solana memecoin with full breakdown." },
  ]}),
  component: () => (
    <div className="p-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
      <MemeOfTheDayCard expanded />
      <TokenChartPanel />
    </div>
  ),
});
