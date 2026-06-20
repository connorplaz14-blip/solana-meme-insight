import { useTokenRisk } from "@/lib/data";
import { shortAddr } from "@/lib/format";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

function scoreTone(score: number) {
  if (score >= 7) return { color: "text-neg", border: "border-neg/40", bg: "bg-neg/10", label: "High Risk" };
  if (score >= 4) return { color: "text-warn", border: "border-warn/40", bg: "bg-warn/10", label: "Caution" };
  return { color: "text-pos", border: "border-pos/40", bg: "bg-pos/10", label: "Low Risk" };
}

export function RiskPanel({ address }: { address: string }) {
  const { data, status } = useTokenRisk(address);

  if (status === "loading" && !data) {
    return (
      <div className="h-[65vh] flex items-center justify-center text-muted-foreground font-mono text-[11px]">
        Loading risk assessment…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="h-[65vh] flex items-center justify-center text-muted-foreground font-mono text-[11px]">
        No risk data available for this token.
      </div>
    );
  }

  const tone = scoreTone(data.score);

  return (
    <div className="h-[65vh] overflow-auto p-3 space-y-3">
      {/* Score header */}
      <div className={`border ${tone.border} ${tone.bg} p-3 flex items-center gap-3`}>
        <div className={`text-3xl font-mono ${tone.color}`}>{data.score.toFixed(1)}<span className="text-base text-muted-foreground">/10</span></div>
        <div className="flex-1">
          <div className={`font-mono text-[11px] uppercase tracking-wider ${tone.color}`}>{tone.label}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {data.rugged ? "⚠ Marked as rugged. " : ""}
            {data.jupiterVerified ? "✓ Jupiter Verified. " : "Not Jupiter Verified. "}
          </div>
        </div>
        {data.rugged ? <ShieldAlert className="h-7 w-7 text-neg" /> :
          data.score >= 4 ? <AlertTriangle className="h-7 w-7 text-warn" /> :
          <ShieldCheck className="h-7 w-7 text-pos" />}
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Top 10 Hold" value={`${data.top10Pct.toFixed(1)}%`} tone={data.top10Pct > 50 ? "neg" : data.top10Pct > 25 ? "warn" : "pos"} />
        <Stat label="Dev Holds" value={`${data.devPct.toFixed(2)}%`} tone={data.devPct > 5 ? "neg" : data.devPct > 1 ? "warn" : "pos"} />
        <Stat label="Snipers" value={String(data.sniperCount)} tone={data.sniperCount > 10 ? "neg" : data.sniperCount > 0 ? "warn" : "pos"} />
        <Stat label="Insiders" value={String(data.insiderCount)} tone={data.insiderCount > 5 ? "neg" : data.insiderCount > 0 ? "warn" : "pos"} />
      </div>

      {/* Creator */}
      {data.creator && (
        <div className="border border-border bg-panel-2/40 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Deployer wallet</div>
          <a
            href={`https://solscan.io/account/${data.creator}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] hover:text-info hover:underline"
          >
            {shortAddr(data.creator, 6, 6)} ↗
          </a>
        </div>
      )}

      {/* Risk factors */}
      <div className="border border-border bg-panel-2/40">
        <div className="px-3 py-2 border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Detected risks · {data.factors.length}
        </div>
        {data.factors.length === 0 ? (
          <div className="p-3 text-[11px] text-muted-foreground">
            No specific risk flags detected by Solana Tracker.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.factors.map((f, i) => {
              const dotColor =
                f.level === "danger" ? "bg-neg" :
                f.level === "warn" ? "bg-warn" : "bg-info";
              return (
                <li key={i} className="p-3 flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 rounded-full ${dotColor} shrink-0`} />
                  <div className="min-w-0">
                    <div className="font-mono text-[12px]">{f.name}</div>
                    {f.description && <div className="text-[11px] text-muted-foreground mt-0.5">{f.description}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "pos" | "warn" | "neg" }) {
  const color = tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : "text-pos";
  return (
    <div className="border border-border bg-panel-2/40 p-2">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-mono text-[14px] mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}