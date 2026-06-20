import { useCallback, useEffect, useState } from "react";
import { getSocialPulseFn } from "@/lib/ai/social-pulse.functions";
import type { SocialPulse } from "@/lib/ai/social-pulse.server";
import { Sparkles, RotateCw, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiSocialPulse() {
  const [data, setData] = useState<SocialPulse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setErr(null);
    try {
      const d = await getSocialPulseFn({ data: { force } });
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const t = setInterval(() => void load(false), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="border-b border-border bg-info/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-info/[0.06]"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-info" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-info">
            AI Pulse
          </span>
          {data && (
            <span className="font-mono text-[9px] text-muted-foreground">
              · {new Date(data.generatedAtIso).toLocaleTimeString()}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void load(true);
            }}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              loading && "animate-spin",
            )}
            aria-label="Refresh"
          >
            <RotateCw className="h-3 w-3" />
          </button>
          {open ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-2">
          {err && (
            <div className="font-mono text-[10px] text-neg border-l-2 border-neg/40 pl-2">
              {err}
            </div>
          )}
          {!data && !err && (
            <div className="font-mono text-[10px] text-muted-foreground">
              {loading ? "Summarising chatter…" : "—"}
            </div>
          )}
          {data && data.topThemes.length === 0 && !loading && (
            <div className="font-mono text-[10px] text-muted-foreground">
              Not enough recent chatter to summarise.
            </div>
          )}
          {data?.topThemes.map((t, i) => (
            <div
              key={i}
              className="border-l-2 border-info/40 pl-2 py-0.5"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px] text-foreground font-semibold">
                  {t.title}
                </span>
                {t.tickers.slice(0, 4).map((tk) => (
                  <span
                    key={tk}
                    className="font-mono text-[9px] text-pos bg-pos/10 px-1 rounded-sm"
                  >
                    ${tk.replace(/^\$/, "")}
                  </span>
                ))}
                <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                  {t.tweetCount}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {t.oneLiner}
              </p>
            </div>
          ))}
          {data?.surprisingTake && (
            <div className="border-l-2 border-warn/50 pl-2 py-0.5">
              <div className="font-mono text-[9px] uppercase tracking-wider text-warn">
                Surprising take · @{data.surprisingTake.handle}
              </div>
              <a
                href={data.surprisingTake.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-foreground hover:text-warn line-clamp-2"
              >
                {data.surprisingTake.text}
              </a>
            </div>
          )}
          {data && data.risingHandles.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" /> Rising
              </div>
              <ul className="space-y-0.5">
                {data.risingHandles.map((r) => (
                  <li key={r.handle} className="font-mono text-[10px] flex gap-1.5">
                    <span className="text-info shrink-0">@{r.handle.replace(/^@/, "")}</span>
                    <span className="text-muted-foreground truncate">{r.takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}