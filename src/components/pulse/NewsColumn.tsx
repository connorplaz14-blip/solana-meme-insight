import { useMemo, useState } from "react";
import { useNewsFeed } from "@/lib/data";
import { PulseColumn } from "./PulseColumn";
import { timeAgo } from "./timeAgo";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

const SOURCES = ["All", "CoinDesk", "Cointelegraph", "Decrypt", "The Block", "CryptoSlate"] as const;

export function NewsColumn() {
  const { data, status, refresh } = useNewsFeed();
  const [filter, setFilter] = useState<(typeof SOURCES)[number]>("All");

  const items = useMemo(() => {
    const arr = data ?? [];
    return filter === "All" ? arr : arr.filter((n) => n.source === filter);
  }, [data, filter]);

  return (
    <PulseColumn
      title="News"
      status={status}
      onRefresh={refresh}
      badge={
        <span className="font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      }
    >
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
        {SOURCES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
              filter === s
                ? "bg-pos/20 text-pos"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {items.length === 0 && status !== "loading" && (
          <li className="p-3 font-mono text-[11px] text-muted-foreground">No headlines.</li>
        )}
        {items.map((n) => (
          <li key={n.id} className="group hover:bg-accent/20">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-info">
                  {n.source}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {timeAgo(n.publishedAt)}
                </span>
              </div>
              <div className="text-[12px] leading-snug text-foreground group-hover:text-pos">
                {n.title}
                <ExternalLink className="ml-1 inline h-2.5 w-2.5 opacity-0 group-hover:opacity-60" />
              </div>
              {n.summary && (
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {n.summary}
                </div>
              )}
            </a>
          </li>
        ))}
      </ul>
    </PulseColumn>
  );
}