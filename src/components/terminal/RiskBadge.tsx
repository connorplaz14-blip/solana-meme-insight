import type { Risk } from "@/types";
import { cn } from "@/lib/utils";

export function RiskBadge({ risk }: { risk: Risk }) {
  const map: Record<Risk, string> = {
    low: "border-pos/40 text-pos bg-pos/10",
    medium: "border-warn/40 text-warn bg-warn/10",
    high: "border-neg/40 text-neg bg-neg/10",
    extreme: "border-neg text-neg bg-neg/20",
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-[1px] text-[10px] font-mono uppercase tracking-wider border", map[risk])}>
      {risk}
    </span>
  );
}
