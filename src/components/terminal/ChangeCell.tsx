import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/format";

export function ChangeCell({ value, className }: { value: number; className?: string }) {
  const tone = value > 0 ? "text-pos" : value < 0 ? "text-neg" : "text-muted-foreground";
  return <span className={cn("font-mono tabular-nums", tone, className)}>{fmtPct(value)}</span>;
}
