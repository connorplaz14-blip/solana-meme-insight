import { useEffect, useMemo, useState } from "react";
import { useSocialFeed } from "@/lib/data";
import { PulseColumn } from "./PulseColumn";
import { timeAgo } from "./timeAgo";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Link as LinkIcon,
  Rocket,
  MessageCircle,
  Newspaper,
} from "lucide-react";

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

  const counts = useMemo(() => {
    const c = { signal: 0, launch: 0, post: 0 };
    for (const it of data ?? []) {
      const k = (it.kind ?? "post") as keyof typeof c;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [data]);

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
            Sources: SocialTickers signal · DexScreener launches · Bluesky.
            Try a different tag or a preset.
          </li>
        )}
        {data?.map((p) => {
          const kind = p.kind ?? "post";
          if (kind === "signal") return <SignalCard key={p.id} item={p} />;
          if (kind === "launch") return <LaunchCard key={p.id} item={p} />;
          return <PostCard key={p.id} item={p} />;
        })}
      </ul>
    </PulseColumn>
  );
}

// ─── Cards ──────────────────────────────────────────────────────────────────

type Item = NonNullable<ReturnType<typeof useSocialFeed>["data"]>[number];

function SourceBadge({ source }: { source: string }) {
  const cls =
    source === "Bluesky"
      ? "bg-info/15 text-info"
      : source === "SocialTickers"
        ? "bg-pos/15 text-pos"
        : source === "DexScreener"
          ? "bg-warn/15 text-warn"
          : "bg-muted/30 text-muted-foreground";
  return (
    <span
      className={cn(
        "font-mono text-[9px] uppercase tracking-wider px-1 rounded-sm",
        cls,
      )}
    >
      {source}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (!values?.length) return null;
  const w = 60;
  const h = 16;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / Math.max(values.length - 1, 1);
  const d = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="text-pos">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function SignalCard({ item }: { item: Item }) {
  const signal = item.signal ?? 0;
  const buzz = item.buzz ?? 0;
  const buzzPos = buzz >= 0;
  return (
    <li className="group bg-pos/[0.03] hover:bg-pos/[0.07] border-l-2 border-pos/40">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3 py-2"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Activity className="h-3 w-3 text-pos shrink-0" />
            <span className="font-mono text-[11px] font-semibold text-pos truncate">
              ${item.ticker}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground truncate">
              {item.author}
            </span>
          </div>
          <SourceBadge source={item.source} />
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              sig
            </span>
            <div className="h-1 w-16 bg-muted/30 rounded-sm overflow-hidden">
              <div
                className="h-full bg-pos"
                style={{ width: `${Math.min(100, Math.max(0, signal))}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-foreground">{signal}</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 font-mono text-[10px]",
              buzzPos ? "text-pos" : "text-neg",
            )}
          >
            {buzzPos ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(buzz)}
          </div>
          {typeof item.mentions === "number" && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.mentions} mentions
            </span>
          )}
          <div className="ml-auto">
            {item.spark && <Sparkline values={item.spark} />}
          </div>
        </div>
        {item.headlines && item.headlines.length > 0 && (
          <ul className="space-y-0.5">
            {item.headlines.slice(0, 3).map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-muted-foreground group-hover:text-foreground"
              >
                <Newspaper className="h-2.5 w-2.5 mt-0.5 shrink-0 opacity-50" />
                <span className="font-mono text-[8px] uppercase tracking-wider opacity-60 shrink-0">
                  {h.src}
                </span>
                <span className="line-clamp-1">{h.text}</span>
              </li>
            ))}
          </ul>
        )}
      </a>
    </li>
  );
}

function LaunchCard({ item }: { item: Item }) {
  return (
    <li className="group hover:bg-accent/20">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3 py-2"
      >
        <div className="flex items-start gap-2">
          {item.icon ? (
            <img
              src={item.icon}
              alt=""
              className="h-8 w-8 rounded-sm border border-border shrink-0 bg-muted/20"
              loading="lazy"
            />
          ) : (
            <div className="h-8 w-8 rounded-sm bg-warn/20 grid place-items-center shrink-0">
              <Rocket className="h-4 w-4 text-warn" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="font-mono text-[10px] text-info truncate">
                {item.handle}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <SourceBadge source={item.source} />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {timeAgo(item.publishedAt)}
                </span>
              </span>
            </div>
            <div className="text-[12px] leading-snug text-foreground group-hover:text-pos line-clamp-3">
              {item.text}
            </div>
            {item.links && item.links.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.links.map((l, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-wider px-1 py-0.5 rounded-sm bg-muted/30 text-muted-foreground"
                  >
                    <LinkIcon className="h-2.5 w-2.5" />
                    {l.type || l.label || "link"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </a>
    </li>
  );
}

function PostCard({ item }: { item: Item }) {
  return (
    <li className="group hover:bg-accent/20">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3 py-2"
      >
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="flex items-center gap-1 min-w-0">
            <MessageCircle className="h-3 w-3 text-info shrink-0" />
            <span className="font-mono text-[10px] text-info truncate">
              {item.handle || "—"}
            </span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <SourceBadge source={item.source} />
            <span className="font-mono text-[10px] text-muted-foreground">
              {timeAgo(item.publishedAt)}
            </span>
          </span>
        </div>
        <div className="text-[12px] leading-snug text-foreground group-hover:text-pos line-clamp-4">
          {item.text}
        </div>
      </a>
    </li>
  );
}