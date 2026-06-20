import { createFileRoute } from "@tanstack/react-router";
import { NarrativeFeed } from "@/components/dashboard/NarrativeFeed";

export const Route = createFileRoute("/narratives")({
  head: () => ({ meta: [
    { title: "Narratives · SCBOL" },
    { name: "description", content: "Daily AI-summarised narratives across Solana memecoins: dominant themes, fastest growers, repeated keywords, notable launches, and risk warnings." },
    { property: "og:title", content: "Solana Memecoin Narratives · SCBOL" },
    { property: "og:description", content: "Daily Solana memecoin narratives and themes." },
  ]}),
  component: () => <div className="p-3"><NarrativeFeed /></div>,
});
