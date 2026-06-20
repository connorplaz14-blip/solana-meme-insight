import { useCallback, useEffect, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { scoreWatchlistFn } from "@/lib/ai/watchlist-sentiment.functions";
import type { SentimentScore } from "@/lib/ai/watchlist-sentiment.server";
import { getWatchlist, subscribeWatchlist } from "@/lib/watchlist-store";
import { Sparkles, RotateCw, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TokenDeepDiveDialog } from "@/components/ai/TokenDeepDiveDialog";

const ALERTS_KEY = "memedesk.sentiment.flags.v1";

export function SentimentPanel() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [scores, setScores] = useState<SentimentScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<SentimentScore[]>([]);
  const [dlg, setDlg] = useState<{ open: boolean; query: string }>({
    open: false,
    query: "",
  });

  useEffect(() => {
    const sync = () =>
      setAddresses(getWatchlist().map((w) => w.address).slice(0, 25));
    sync();
    return subscribeWatchlist(sync);
  }, []);

  const load = useCallback(async () => {
    if (addresses.length === 0) {
      setScores([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const result = await scoreWatchlistFn({ data: { addresses } });
      setScores(result.sort((a, b) => b.score - a.score));
      computeAlerts(result, setAlerts);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [addresses]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Panel>
      <PanelHeader
        title="AI Sentiment"
        subtitle={`${scores.length} watched`}
        accent="info"
        right={
          <button
            onClick={() => void load()}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              loading && "animate-spin",
            )}
            aria-label="Refresh"
          >
            <RotateCw className="h-3 w-3" />
          </button>
        }
      />
      <PanelBody className="p-0">
        {err && (
          <div className="px-3 py-2 font-mono text-[11px] text-neg border-b border-border">
            {err}
          </div>
        )}
        {alerts.length > 0 && (
          <div className="px-3 py-2 border-b border-warn/30 bg-warn/[0.04]">
            <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-warn mb-1">
              <AlertCircle className="h-3 w-3" /> New alerts
            </div>
            <ul className="space-y-0.5">
              {alerts.map((a) => (
                <li key={a.address} className="font-mono text-[11px]">
                  <span className="text-foreground">${a.symbol}</span>{" "}
                  <span className="text-warn">{a.flags.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {scores.length === 0 && !loading && (
          <div className="px-3 py-4 font-mono text-[11px] text-muted-foreground">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Add tokens to your watchlist to see AI sentiment scoring.
          </div>
        )}
        <ul className="divide-y divide-border">
          {scores.map((s) => {
            const scoreCls =
              s.label === "bullish"
                ? "text-pos"
                : s.label === "bearish"
                  ? "text-neg"
                  : "text-warn";
            const Mom =
              s.momentum === "up"
                ? TrendingUp
                : s.momentum === "down"
                  ? TrendingDown
                  : Minus;
            return (
              <li
                key={s.address}
                className="px-3 py-2 hover:bg-accent/20 cursor-pointer"
                onClick={() => setDlg({ open: true, query: s.symbol })}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-foreground w-16 shrink-0">
                    ${s.symbol}
                  </span>
                  <span className={cn("font-mono text-[14px] w-8 shrink-0", scoreCls)}>
                    {s.score}
                  </span>
                  <Mom className={cn("h-3 w-3 shrink-0", scoreCls)} />
                  <span className="text-[11px] text-muted-foreground truncate flex-1">
                    {s.blurb}
                  </span>
                </div>
                {s.flags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.flags.map((f) => (
                      <span
                        key={f}
                        className="font-mono text-[9px] uppercase tracking-wider bg-warn/15 text-warn px-1 rounded-sm"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </PanelBody>
      <TokenDeepDiveDialog
        query={dlg.query}
        open={dlg.open}
        onOpenChange={(o) => setDlg((d) => ({ ...d, open: o }))}
      />
    </Panel>
  );
}

function computeAlerts(
  current: SentimentScore[],
  setAlerts: (s: SentimentScore[]) => void,
) {
  if (typeof window === "undefined") return;
  const prevRaw = window.localStorage.getItem(ALERTS_KEY);
  const prev: Record<string, string[]> = prevRaw ? safeParse(prevRaw) : {};
  const newAlerts: SentimentScore[] = [];
  const next: Record<string, string[]> = {};
  for (const s of current) {
    next[s.address] = s.flags;
    const prevFlags = new Set(prev[s.address] ?? []);
    const newFlags = s.flags.filter((f) => !prevFlags.has(f));
    if (newFlags.length > 0) newAlerts.push({ ...s, flags: newFlags });
  }
  window.localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
  setAlerts(newAlerts.slice(0, 5));
}

function safeParse(raw: string): Record<string, string[]> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}