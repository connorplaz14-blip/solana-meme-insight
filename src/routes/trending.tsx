import { createFileRoute } from "@tanstack/react-router";
import { AiTrendingTable } from "@/components/trending/AiTrendingTable";
import { TrendingTable } from "@/components/dashboard/TrendingTable";

export const Route = createFileRoute("/trending")({
  head: () => ({ meta: [
    { title: "Trending · AI-Curated · SCBOL" },
    { name: "description", content: "AI-curated Solana memecoin narrative leaders — grouped by sub-narrative (Dog, Cat, Trump, AI agents, etc.) with one-line context." },
    { property: "og:title", content: "Trending · AI-Curated · SCBOL" },
    { property: "og:description", content: "AI-curated Solana memecoin narrative leaders, grouped by sub-narrative." },
  ]}),
  component: TrendingPage,
});

function TrendingPage() {
  return (
    <div className="p-3 space-y-3">
      <AiTrendingTable />
      <TrendingTable />
    </div>
  );
}
