import type { ProviderInfo } from "@/types";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusMap = {
  live: { label: "Live", cls: "border-pos/40 bg-pos/10 text-pos" },
  mock: { label: "Mock", cls: "border-info/40 bg-info/10 text-info" },
  missing: { label: "Missing", cls: "border-border bg-panel-2 text-muted-foreground" },
  error: { label: "Error", cls: "border-neg/40 bg-neg/10 text-neg" },
} as const;

export function ProviderStatusCard({ p }: { p: ProviderInfo }) {
  const s = statusMap[p.status];
  return (
    <div className="border border-border bg-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel-2/40">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{p.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.category}</div>
        </div>
        <span className={cn("font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border", s.cls)}>● {s.label}</span>
      </div>
      <div className="p-3 space-y-2 text-[11px] font-mono">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Last success</span>
          <span>{p.lastSuccessIso ? fmtTime(p.lastSuccessIso) : "—"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Last error</span>
          <span className={p.lastError ? "text-neg" : ""}>{p.lastError ?? "—"}</span>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Features</div>
          <ul className="space-y-0.5">
            {p.features.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <span className="h-1 w-1 bg-muted-foreground" /> <span className="text-foreground/80 font-sans text-[11px]">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        {p.notes && <p className="text-muted-foreground font-sans pt-1 border-t border-border">{p.notes}</p>}
      </div>
    </div>
  );
}
