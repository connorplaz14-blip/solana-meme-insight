import { createFileRoute } from "@tanstack/react-router";
import { AiChat } from "@/components/ai/AiChat";
import { DailyBrief } from "@/components/ai/DailyBrief";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Desk · MemeDesk" },
      {
        name: "description",
        content:
          "Chat with MemeDesk AI about today's Solana memecoin meta — grounded in live trending, Pump.fun launches and the daily narrative brief.",
      },
      { property: "og:title", content: "AI Desk · MemeDesk" },
      {
        property: "og:description",
        content: "AI-powered Solana memecoin meta analyst, grounded in live on-chain data.",
      },
    ],
  }),
  component: AiDesk,
});

function AiDesk() {
  return (
    <div className="p-3 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div className="xl:col-span-7"><AiChat /></div>
      <div className="xl:col-span-5"><DailyBrief /></div>
    </div>
  );
}