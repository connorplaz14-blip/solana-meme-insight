import { createFileRoute } from "@tanstack/react-router";
import { NewsColumn } from "@/components/pulse/NewsColumn";
import { SocialColumn } from "@/components/pulse/SocialColumn";
import { TrendingColumn } from "@/components/pulse/TrendingColumn";
import { WhalePingsColumn } from "@/components/pulse/WhalePingsColumn";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "Pulse · Fast Info Terminal · MemeDesk" },
      {
        name: "description",
        content:
          "Real-time Solana memecoin terminal: X cashtag stream, crypto news, 24h movers, and whale pings across your watchlist — all in one scannable view.",
      },
      { property: "og:title", content: "Pulse · Fast Info Terminal · MemeDesk" },
      {
        property: "og:description",
        content: "X, news, movers, and whale pings — one terminal, auto-refreshed.",
      },
    ],
  }),
  component: PulsePage,
});

function PulsePage() {
  return (
    <div className="p-3">
      <header className="mb-3">
        <h1 className="font-mono text-[14px] uppercase tracking-[0.18em] text-foreground">
          Pulse
        </h1>
        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
          Fast-info terminal · auto-refresh · {new Date().toLocaleTimeString()}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <SocialColumn />
        <NewsColumn />
        <TrendingColumn />
        <WhalePingsColumn />
      </div>
    </div>
  );
}