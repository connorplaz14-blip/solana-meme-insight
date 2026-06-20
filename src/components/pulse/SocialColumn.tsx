import { useEffect, useState } from "react";
import { useSocialFeed } from "@/lib/data";
import { PulseColumn } from "./PulseColumn";
import { timeAgo } from "./timeAgo";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

const KEY = "memedesk.pulse.social-queries.v1";
const DEFAULTS = ["$SOL", "$BONK", "$WIF"];

function read(): string[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
function write(v: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(v));
}

export function SocialColumn() {
  const [queries, setQueries] = useState<string[]>(DEFAULTS);
  const [active, setActive] = useState<string>(DEFAULTS[0]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const q = read();
    setQueries(q);
    setActive(q[0] ?? "$SOL");
  }, []);

  const { data, status, refresh } = useSocialFeed(active);

  function addQuery() {
    const q = draft.trim();
    if (!q) return;
    if (queries.includes(q)) {
      setActive(q);
      setDraft("");
      return;
    }
    const next = [q, ...queries].slice(0, 8);
    setQueries(next);
    write(next);
    setActive(q);
    setDraft("");
  }

  function removeQuery(q: string) {
    const next = queries.filter((x) => x !== q);
    setQueries(next);
    write(next);
    if (active === q) setActive(next[0] ?? "$SOL");
  }

  return (
    <PulseColumn
      title="X / Social"
      status={status}
      onRefresh={refresh}
      badge={
        <span className="font-mono text-[10px] text-muted-foreground">
          {data?.length ?? 0}
        </span>
      }
    >
      <div className="border-b border-border px-2 py-1.5 space-y-1.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addQuery();
          }}
          className="flex items-center gap-1"
        >
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add cashtag ($SOL) or term"
            className="flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground/60"
          />
        </form>
        <div className="flex flex-wrap gap-1">
          {queries.map((q) => (
            <span
              key={q}
              className={cn(
                "group inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px]",
                active === q
                  ? "bg-pos/20 text-pos"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground",
              )}
            >
              <button onClick={() => setActive(q)}>{q}</button>
              <button
                onClick={() => removeQuery(q)}
                className="opacity-40 hover:opacity-100"
                aria-label={`Remove ${q}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border">
        {(data?.length ?? 0) === 0 && status !== "loading" && (
          <li className="p-3 font-mono text-[11px] text-muted-foreground">
            No posts. Nitter mirrors may be rate-limited; try refreshing.
          </li>
        )}
        {data?.map((p) => (
          <li key={p.id} className="group hover:bg-accent/20">
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-mono text-[10px] text-info">{p.handle || "—"}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {timeAgo(p.publishedAt)}
                </span>
              </div>
              <div className="text-[12px] leading-snug text-foreground group-hover:text-pos line-clamp-4">
                {p.text}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </PulseColumn>
  );
}