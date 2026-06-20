import { createFileRoute, useSearch } from "@tanstack/react-router";
import { NewsColumn } from "@/components/pulse/NewsColumn";
import { SocialColumn } from "@/components/pulse/SocialColumn";
import { TrendingColumn } from "@/components/pulse/TrendingColumn";
import { WhalePingsColumn } from "@/components/pulse/WhalePingsColumn";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Newspaper, TrendingUp, Fish, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

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

const tabs = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "social", label: "X / Social", icon: MessageSquare },
  { key: "news", label: "News", icon: Newspaper },
  { key: "trending", label: "Trending", icon: TrendingUp },
  { key: "whales", label: "Whales", icon: Whale },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function PulsePage() {
  const search = useSearch({ from: "/pulse" }) as { tab?: string };
  const activeTab: TabKey = (search.tab as TabKey) || "all";

  const showSocial = activeTab === "all" || activeTab === "social";
  const showNews = activeTab === "all" || activeTab === "news";
  const showTrending = activeTab === "all" || activeTab === "trending";
  const showWhales = activeTab === "all" || activeTab === "whales";

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

      {/* Tab bar */}
      <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <Link
              key={t.key}
              to="/pulse"
              search={{ tab: t.key === "all" ? undefined : t.key }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap border transition-colors",
                active
                  ? "bg-pos/10 border-pos/40 text-pos"
                  : "bg-panel-2 border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <div
        className={cn(
          "grid gap-3",
          activeTab === "all"
            ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
            : "grid-cols-1"
        )}
      >
        {showSocial && <SocialColumn />}
        {showNews && <NewsColumn />}
        {showTrending && <TrendingColumn />}
        {showWhales && <WhalePingsColumn />}
      </div>
    </div>
  );
}
