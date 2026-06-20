import { useEffect, useState } from "react";
import { analyzeTokenFn } from "@/lib/ai/analyze-token.functions";
import type { TokenAnalysis } from "@/lib/ai/analyze-token.server";
import { fmtUsd } from "@/lib/format";
import { Sparkles, AlertTriangle, TrendingUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function TokenDeepDive({ query }: { query: string }) {
  const [data, setData] = useState<TokenAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setErr(null);
    analyzeTokenFn({ data: { query } })
      .then((d) => {
        if (!cancel) setData(d);
      })
      .catch((e) => {
        if (!cancel) setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [query]);

  if (loading) {
    return (
      <div className="font-mono text-[12px] text-muted-foreground p-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-info animate-pulse" />
        Analysing ${query}…
      </div>
    );
  }
  if (err) {
    return <div className="font-mono text-[12px] text-neg p-3">{err}</div>;
  }
  if (!data?.found) {
    return (
      <div className="font-mono text-[12px] text-muted-foreground p-3">
        No data for <span className="text-foreground">${query}</span>. It may not
        be in the trending feed.
      </div>
    );
  }

  const oc = data.onchain!;
  const ai = data.ai;
  const sentCls =
    ai?.sentiment === "bull"
      ? "text-pos"
      : ai?.sentiment === "bear"
        ? "text-neg"
        : "text-warn";

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[14px] text-foreground">${data.symbol}</span>
            <span className="text-[12px] text-muted-foreground">{data.name}</span>
          </div>
          {ai && (
            <p className="text-[12px] mt-1 text-foreground/85 leading-snug">
              {ai.verdict}
            </p>
          )}
        </div>
        {ai && (
          <div className="text-right">
            <div className={cn("font-mono text-[18px] leading-none", sentCls)}>
              {ai.sentimentScore}
            </div>
            <div className={cn("font-mono text-[9px] uppercase tracking-wider", sentCls)}>
              {ai.sentiment}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
        <Stat label="Price" value={fmtUsd(oc.priceUsd, { compact: false })} />
        <Stat label="Mcap" value={fmtUsd(oc.marketCapUsd)} />
        <Stat label="Liq" value={fmtUsd(oc.liquidityUsd)} />
        <Stat label="Vol 24h" value={fmtUsd(oc.volume24hUsd)} />
        <Stat
          label="1h"
          value={`${oc.h1Pct >= 0 ? "+" : ""}${oc.h1Pct.toFixed(1)}%`}
          cls={oc.h1Pct >= 0 ? "text-pos" : "text-neg"}
        />
        <Stat
          label="24h"
          value={`${oc.h24Pct >= 0 ? "+" : ""}${oc.h24Pct.toFixed(1)}%`}
          cls={oc.h24Pct >= 0 ? "text-pos" : "text-neg"}
        />
        <Stat label="Age" value={`${Math.round(oc.ageHours)}h`} />
        <Stat label="Risk" value={oc.risk.toUpperCase()} />
      </div>

      {ai && ai.whyMoving.length > 0 && (
        <Section
          icon={<TrendingUp className="h-3 w-3 text-info" />}
          title="Why it's moving"
        >
          <ul className="space-y-1">
            {ai.whyMoving.map((w, i) => (
              <li key={i} className="text-[12px] text-foreground/85 border-l-2 border-info/40 pl-2">
                {w}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {ai && ai.risks.length > 0 && (
        <Section
          icon={<AlertTriangle className="h-3 w-3 text-warn" />}
          title="Risks"
        >
          <ul className="space-y-1">
            {ai.risks.map((w, i) => (
              <li key={i} className="text-[12px] text-warn/90 border-l-2 border-warn/40 pl-2">
                {w}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {ai && ai.socialPulse.length > 0 && (
        <Section title="Social pulse">
          <ul className="space-y-1.5">
            {ai.socialPulse.map((t, i) => (
              <li key={i} className="text-[11px] border-l-2 border-pos/40 pl-2">
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-info hover:underline"
                >
                  @{t.handle}
                </a>
                <p className="text-foreground/80">{t.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {ai && ai.news.length > 0 && (
        <Section title="News">
          <ul className="space-y-1">
            {ai.news.map((n, i) => (
              <li key={i} className="text-[11px] flex items-start gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">
                  {n.source}
                </span>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-info flex items-center gap-1"
                >
                  {n.title}
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="border border-border bg-panel-2 p-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-[12px] mt-0.5", cls)}>{value}</div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}