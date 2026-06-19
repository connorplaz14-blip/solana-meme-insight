import { cn } from "@/lib/utils";

const palette = ["#16a34a", "#0ea5e9", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"];

export function TokenAvatar({ symbol, size = 24, className }: { symbol: string; size?: number; className?: string }) {
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = palette[hash % palette.length];
  return (
    <span
      className={cn("inline-flex items-center justify-center font-mono font-medium text-[10px] text-black border border-border shrink-0", className)}
      style={{ width: size, height: size, backgroundColor: bg }}
      aria-hidden
    >
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}
