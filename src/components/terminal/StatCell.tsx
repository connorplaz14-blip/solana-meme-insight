import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCell({
  label, value, sub, tone, className,
}: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "pos" | "neg" | "warn" | "info"; className?: string }) {
  const toneCls =
    tone === "pos" ? "text-pos" :
    tone === "neg" ? "text-neg" :
    tone === "warn" ? "text-warn" :
    tone === "info" ? "text-info" : "text-foreground";
  return (
    <div className={cn("flex flex-col gap-0.5 min-w-0", className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-sm leading-tight truncate", toneCls)}>{value}</span>
      {sub ? <span className="font-mono text-[10px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}
