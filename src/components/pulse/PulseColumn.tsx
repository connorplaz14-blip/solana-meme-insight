import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export function PulseColumn({
  title,
  badge,
  status,
  onRefresh,
  children,
  className,
}: {
  title: string;
  badge?: ReactNode;
  status?: "loading" | "ready" | "error" | "idle";
  onRefresh?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[480px] flex-col border border-border bg-card/40 backdrop-blur-sm",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
            {title}
          </h2>
          {badge}
          {status === "loading" && (
            <span className="font-mono text-[10px] text-muted-foreground animate-pulse">…syncing</span>
          )}
          {status === "error" && (
            <span className="font-mono text-[10px] text-warn">offline</span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}