import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { MemeOfTheDayCard } from "@/components/dashboard/MemeOfTheDayCard";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { TokenChartPanel } from "@/components/dashboard/TokenChartPanel";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { Coins, MessageSquare, TrendingUp } from "lucide-react";

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
        <div className="xl:col-span-8"><JumpInCards /></div>
        <div className="xl:col-span-4"><MarketPulse /></div>
      </div>
    </div>
  );
}

function JumpInCards() {
  const cards = [
    {
      to: "/coins" as const,
      Icon: Coins,
      title: "Coins",
      desc: "24h trending pools + live Pump.fun new-pair feed.",
      accent: "info" as const,
    },
    {
      to: "/ai" as const,
      Icon: MessageSquare,
      title: "AI Desk",
      desc: "Chat to MemeDesk AI about today's meta + daily brief.",
      accent: "pos" as const,
    },
    {
      to: "/trending" as const,
      Icon: TrendingUp,
      title: "Trending",
      desc: "AI-curated narrative leaders, grouped by sub-narrative.",
      accent: "warn" as const,
    },
  ];
  return (
    <Panel>
      <PanelHeader title="Jump in" accent="info" />
      <PanelBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group border border-border bg-panel-2 hover:bg-accent/30 hover:border-foreground/30 transition-colors p-3 flex flex-col gap-2"
            >
              <c.Icon className={
                "h-4 w-4 " + (c.accent === "pos" ? "text-pos" : c.accent === "warn" ? "text-warn" : "text-info")
              } />
              <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-foreground/90">{c.title}</div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">{c.desc}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground mt-auto">Open →</div>
            </Link>
          ))}
        </div>
      </PanelBody>
    </Panel>
  );
}
