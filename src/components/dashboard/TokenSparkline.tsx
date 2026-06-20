import { useMemo, useState } from "react";
import { useTokenChart } from "@/lib/data";
import { SourceBadge } from "@/components/terminal/SourceBadge";
import { cn } from "@/lib/utils";

type Timeframe = "1H" | "4H" | "1D" | "1W";
const FRAMES: Timeframe[] = ["1H", "4H", "1D", "1W"];

function formatPrice(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p >= 1) return `$${p.toFixed(4)}`;
  if (p >= 0.001) return `$${p.toFixed(6)}`;
  return `$${p.toExponential(2)}`;
}

export function TokenSparkline({ address, height = 88 }: { address: string; height?: number }) {
  const [tf, setTf] = useState<Timeframe>("1D");
  const { data, status } = useTokenChart(address, tf);

  const view = useMemo(() => {
    if (!data || !("points" in data) || data.points.length < 2) return null;
    const prices = data.points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 1000;
    const h = 100;
    const step = w / (data.points.length - 1);
    const path = data.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(2)},${(h - ((p.price - min) / range) * h).toFixed(2)}`)
      .join(" ");
    const area = `${path} L${w},${h} L0,${h} Z`;
    const first = prices[0];
    const last = prices[prices.length - 1];
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { path, area, last, changePct, min, max, source: data.source as "birdeye" | "synth" };
  }, [data]);

  const tone = view ? (view.changePct >= 0 ? "pos" : "neg") : "info";
  const stroke = tone === "pos" ? "hsl(var(--pos))" : tone === "neg" ? "hsl(var(--neg))" : "hsl(var(--info))";
  const fill = tone === "pos" ? "hsl(var(--pos) / 0.12)" : "hsl(var(--neg) / 0.12)";

  return (
    <div className="border-b border-border bg-panel-2/30">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Price</span>
          {view && (
            <>
              <span className="font-mono text-[12px]">{formatPrice(view.last)}</span>
              <span className={cn("font-mono text-[11px]", view.changePct >= 0 ? "text-pos" : "text-neg")}>
                {view.changePct >= 0 ? "+" : ""}{view.changePct.toFixed(2)}%
              </span>
              <SourceBadge source={view.source === "birdeye" ? "birdeye" : "mock"} />
              {view.source === "synth" && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-warn border border-warn/40 bg-warn/10 px-1">
                  synth
                </span>
              )}
            </>
          )}
        </div>
        <div className="inline-flex border border-border bg-panel font-mono text-[10px] uppercase tracking-wider shrink-0">
          {FRAMES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTf(f)}
              className={cn(
                "px-2 py-[2px] transition-colors",
                f === tf ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height }} className="w-full">
        {status === "loading" && !view && (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-[10px]">
            loading {tf}…
          </div>
        )}
        {view && (
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full block">
            <path d={view.area} fill={fill} />
            <path d={view.path} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
        {!view && status === "ready" && (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-[10px]">
            no price history for this token
          </div>
        )}
      </div>
    </div>
  );
}