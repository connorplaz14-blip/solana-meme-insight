import { useEffect, useMemo, useState } from "react";
import { useSocialFeed } from "@/lib/data";
import { PulseColumn } from "./PulseColumn";
import { timeAgo } from "./timeAgo";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

const KEY = "memedesk.pulse.social-queries.v2";
const DEFAULTS = [
  "$SOL",
  "$BONK",
  "$WIF",
  "@aeyakovenko",
  "@SolanaFloor",
  "solana memecoin",
];

const PRESETS = [
  "$SOL",
  "$BONK",
  "$WIF",
  "$JUP",
  "@aeyakovenko",
  "@SolanaFloor",
  "@blknoiz06",
  "@gake_eth",
  "pump.fun",
  "solana memecoin",
  "rugpull",
  "airdrop",
];

function classify(q: string): { label: string; cls: string } {
  const t = q.trim();
  if (t.startsWith("@")) return { label: "USER", cls: "text-info" };
  if (t.startsWith("$")) return { label: "TAG", cls: "text-pos" };
  return { label: "TERM", cls: "text-muted-foreground" };
}

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
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    const q = read();
    setQueries(q);
    setActive(q[0] ?? "$SOL");
  }, []);

  const { data, status, refresh } = useSocialFeed(active);
  const meta = useMemo(() => classify(active), [active]);

  function addQuery() {
    const q = draft.trim();
    if (!q) return;
    if (queries.includes(q)) {
      setActive(q);
      setDraft("");
      return;
    }
    const next = [q, ...queries].slice(0, 12);
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

  function addPreset(p: string) {
    if (!queries.includes(p)) {
      const next = [p, ...queries].slice(0, 12);
      setQueries(next);
      write(next);
    }
    setActive(p);
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
            placeholder="@user, $TAG, or keyword"
            className="flex-1 bg-transparent font-mono text-[11px] outline-none placeholder:text-muted-foreground/60"
          />
          <button
            type="button"
            onClick={() => setShowPresets((v) => !v)}
            className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground px-1"
          >
            {showPresets ? "hide" : "presets"}
          </button>
        </form>
        {showPresets && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => addPreset(p)}
                className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
        )}
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
        <div className="flex items-center gap-2 pt-0.5">
          <span className={cn("font-mono text-[9px] uppercase tracking-wider", meta.cls)}>
            {meta.label}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground truncate">
            {active}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {(data?.length ?? 0) === 0 && status !== "loading" && (
          <li className="p-3 font-mono text-[11px] text-muted-foreground">
            No posts for <span className="text-foreground">{active}</span>.
            Sources: Bluesky search · X mirrors (Nitter/RSSHub, often blocked
            in 2026). Try a different tag or a preset.
          </li>
        )}
        {data?.map((p) => (
          <li key={p.id} className="group hover:bg-accent/20">
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-mono text-[10px] text-info truncate">
                  {p.handle || "—"}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-wider px-1 rounded-sm",
                      p.source === "Bluesky"
                        ? "bg-info/15 text-info"
                        : "bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {p.source}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {timeAgo(p.publishedAt)}
                  </span>
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