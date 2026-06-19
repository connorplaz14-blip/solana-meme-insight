import { useEffect, useState } from "react";
import { Panel, PanelHeader, PanelBody } from "@/components/terminal/Panel";
import { TokenAvatar } from "@/components/terminal/TokenAvatar";
import { CopyAddress } from "@/components/terminal/CopyAddress";
import { useTokenDetail } from "@/components/token/TokenDetailProvider";
import { getCuratedTrendingFn } from "@/lib/ai/curated.functions";
import type { CuratedTrending } from "@/lib/ai/curated.server";
import { RefreshCw, Sparkles } from "lucide-react";

export function AiTrendingTable() {
  const { open } = useTokenDetail();
  const [data, setData] = useState<CuratedTrending | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    setLoading(true);
    setError(null);
    try {
      const r = await getCuratedTrendingFn({ data: { force } });
      setData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  const buckets = groupByBucket(data?.picks ?? []);

  return (
    <Panel>
      <PanelHeader
        title="AI-Curated Trending"
        subtitle={
          data
            ? `Dominant: ${data.dominantTheme} · ${new Date(data.generatedAtIso).toLocaleTimeString()}`
            : "Selecting today's narrative leaders…"
        }
        accent="pos"
        right={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-info">
              <Sparkles className="h-3 w-3" /> Gemini
            </span>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="inline-flex items-center gap-1 border border-border bg-panel-2 hover:bg-accent px-2 py-[2px] font-mono text-[10px] uppercase tracking-wider disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        }
      />
      <PanelBody className="p-0">
        {error && (
          <div className="px-3 py-3 font-mono text-[11px] text-neg">{error}</div>
        )}
        {loading && !data && (
          <div className="px-3 py-6 font-mono text-[11px] text-muted-foreground text-center">
            Selecting today&apos;s narrative leaders…
          </div>
        )}
        {data && buckets.length === 0 && (
          <div className="px-3 py-6 font-mono text-[11px] text-muted-foreground text-center">
            No picks returned. Try refresh.
          </div>
        )}
        {buckets.map((b) => (
          <div key={b.name} className="border-b border-border last:border-b-0">
            <div className="px-3 py-1.5 bg-panel-2/40 border-b border-border flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-pos" />
              <h4 className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/90">
                {b.name}
              </h4>
              <span className="font-mono text-[10px] text-muted-foreground">
                {b.picks.length} pick{b.picks.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul>
              {b.picks.map((p) => (
                <li
                  key={p.address}
                  className="border-b border-border/50 last:border-b-0 px-3 py-2 hover:bg-accent/20"
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() =>
                        open({ address: p.address, symbol: p.symbol, name: p.name })
                      }
                      className="flex items-center gap-2 min-w-0 hover:text-pos transition-colors"
                    >
                      <TokenAvatar symbol={p.symbol} size={22} />
                      <div className="min-w-0">
                        <div className="text-[12px] truncate">{p.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          ${p.symbol}
                        </div>
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-foreground/80 leading-relaxed">
                        {p.why}
                      </div>
                      <div className="mt-1">
                        <CopyAddress address={p.address} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </PanelBody>
    </Panel>
  );
}

function groupByBucket(picks: CuratedTrending["picks"]) {
  const map = new Map<string, CuratedTrending["picks"]>();
  for (const p of picks) {
    const arr = map.get(p.bucket) ?? [];
    arr.push(p);
    map.set(p.bucket, arr);
  }
  return Array.from(map.entries())
    .map(([name, picks]) => ({ name, picks }))
    .sort((a, b) => b.picks.length - a.picks.length);
}