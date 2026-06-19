import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-border bg-panel", className)}>{children}</div>;
}

export function PanelHeader({
  title, subtitle, right, accent,
}: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; accent?: "pos" | "neg" | "info" | "warn" }) {
  const dot =
    accent === "pos" ? "bg-pos" :
    accent === "neg" ? "bg-neg" :
    accent === "warn" ? "bg-warn" :
    accent === "info" ? "bg-info" : "bg-muted-foreground";
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-panel-2/40">
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
        <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/90 truncate">{title}</h3>
        {subtitle ? <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{subtitle}</span> : null}
      </div>
      {right ? <div className="flex items-center gap-2 text-[11px] text-muted-foreground">{right}</div> : null}
    </div>
  );
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("p-3", className)}>{children}</div>;
}
