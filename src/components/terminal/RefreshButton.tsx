import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 border border-border bg-panel-2 hover:bg-accent px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      <RefreshCcw className={cn("h-3 w-3", loading && "animate-spin")} />
      Refresh
    </button>
  );
}
