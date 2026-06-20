// Lightweight RSS aggregator. No API key. Parses XML with regex —
// these feeds are stable, deterministic, and we keep the surface tiny so
// it works inside the Worker runtime (no DOMParser, no xml libs).

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  summary?: string;
};

export type SocialItem = {
  id: string;
  author: string;
  handle: string;
  text: string;
  url: string;
  publishedAt: string;
  source: string;
  // Optional fields for rich card kinds. UI degrades gracefully when absent.
  kind?: "post" | "signal" | "launch";
  ticker?: string;
  icon?: string;
  signal?: number;       // 0-100
  buzz?: number;         // -100..100
  mentions?: number;
  priceChg?: number;     // percent
  spark?: number[];      // mention counts timeseries
  links?: { label?: string; type?: string; url: string }[];
  headlines?: { text: string; src: string; lean?: string }[];
};

const NEWS_FEEDS: { source: string; url: string }[] = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" },
  { source: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function pick(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeEntities(m[1]).trim() : undefined;
}

function parseItems(xml: string): { raw: string; title?: string; link?: string; pubDate?: string; description?: string }[] {
  const out: { raw: string; title?: string; link?: string; pubDate?: string; description?: string }[] = [];
  const re = /<(item|entry)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[2];
    let link = pick(raw, "link");
    if (!link) {
      const lm = raw.match(/<link[^>]*href="([^"]+)"/i);
      if (lm) link = lm[1];
    }
    out.push({
      raw,
      title: pick(raw, "title"),
      link,
      pubDate: pick(raw, "pubDate") ?? pick(raw, "published") ?? pick(raw, "updated"),
      description: pick(raw, "description") ?? pick(raw, "summary") ?? pick(raw, "content"),
    });
  }
  return out;
}

async function fetchFeed(url: string, timeoutMs = 6000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 SCBOLBot/1.0 (+https://memedesk.app)",
        accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

export async function fetchAggregatedNews(limit = 40): Promise<NewsItem[]> {
  const xmls = await Promise.all(NEWS_FEEDS.map((f) => fetchFeed(f.url).then((x) => ({ ...f, xml: x }))));
  const items: NewsItem[] = [];
  for (const f of xmls) {
    if (!f.xml) continue;
    const parsed = parseItems(f.xml).slice(0, 15);
    for (const it of parsed) {
      if (!it.title || !it.link) continue;
      const ts = it.pubDate ? new Date(it.pubDate) : null;
      const iso = ts && !isNaN(ts.getTime()) ? ts.toISOString() : new Date().toISOString();
      items.push({
        id: `${f.source}:${it.link}`,
        title: stripHtml(it.title),
        url: it.link.trim(),
        source: f.source,
        publishedAt: iso,
        summary: it.description ? stripHtml(it.description).slice(0, 220) : undefined,
      });
    }
  }
  items.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return items.slice(0, limit);
}

function detectMode(query: string): { mode: "user" | "search"; value: string } {
  const q = query.trim();
  if (q.startsWith("@")) {
    return { mode: "user", value: q.slice(1).replace(/[^A-Za-z0-9_]/g, "") };
  }
  return { mode: "search", value: q };
}

export async function fetchSocialFeed(query: string, limit = 30): Promise<SocialItem[]> {
  const { mode, value } = detectMode(query);
  if (!value) return [];

  // Primary: live X data via Firecrawl. Bluesky stays as fallback so the
  // column never goes blank when Firecrawl is rate-limited or out of credits.
  const { searchX, userTimelineX } = await import("./xfeed.server");
  const xPosts =
    mode === "user"
      ? await userTimelineX(value, limit).catch(() => [] as SocialItem[])
      : await searchX(value, limit).catch(() => [] as SocialItem[]);

  let bsky: SocialItem[] = [];
  if (xPosts.length < 4) {
    bsky = await fetchBlueskyFeed(mode, value, Math.ceil(limit / 2)).catch(
      () => [] as SocialItem[],
    );
  }

  const seen = new Set<string>();
  const all: SocialItem[] = [];
  for (const it of [...xPosts, ...bsky]) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    all.push(it);
  }
  all.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return all.slice(0, limit);
}

// ─── Bluesky ────────────────────────────────────────────────────────────────
// Public AppView endpoints: no auth, generous rate limits.
// Docs: https://docs.bsky.app/docs/category/http-reference

const BSKY_BASE = "https://public.api.bsky.app/xrpc";

type BskyAuthor = { handle?: string; displayName?: string; did?: string };
type BskyPost = {
  uri?: string;
  cid?: string;
  author?: BskyAuthor;
  record?: { text?: string; createdAt?: string };
  indexedAt?: string;
};
type BskyFeedItem = { post?: BskyPost };

function postUrl(p: BskyPost): string {
  // uri shape: at://did:plc:xxx/app.bsky.feed.post/rkey
  const uri = p.uri ?? "";
  const m = uri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/);
  const rkey = m?.[1];
  const handle = p.author?.handle ?? p.author?.did ?? "";
  if (!rkey || !handle) return uri || "https://bsky.app";
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

function normalizePost(p?: BskyPost): SocialItem | null {
  if (!p?.uri || !p.author?.handle) return null;
  const text = (p.record?.text ?? "").trim();
  if (!text) return null;
  const iso = p.record?.createdAt ?? p.indexedAt ?? new Date().toISOString();
  return {
    id: p.uri,
    author: p.author.displayName ?? p.author.handle,
    handle: `@${p.author.handle}`,
    text,
    url: postUrl(p),
    publishedAt: iso,
    source: "Bluesky",
  };
}

async function bskyJson<T>(path: string, timeoutMs = 6000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(`${BSKY_BASE}${path}`, {
      signal: ctrl.signal,
      headers: {
        accept: "application/json",
        "user-agent": "SCBOLBot/1.0 (+https://memedesk.app)",
      },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function fetchBlueskyFeed(
  mode: "user" | "search",
  value: string,
  limit: number,
): Promise<SocialItem[]> {
  if (mode === "user") {
    // Accept bare handles ("aeyakovenko"), bsky-style ("name.bsky.social"),
    // and plain X-style handles. Try as-is, then ".bsky.social", then fall
    // back to search-as-keyword if the actor doesn't resolve.
    const candidates = value.includes(".") ? [value] : [value, `${value}.bsky.social`];
    for (const actor of candidates) {
      const json = await bskyJson<{ feed?: BskyFeedItem[] }>(
        `/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=${limit}`,
      );
      const items = (json?.feed ?? [])
        .map((f) => normalizePost(f.post))
        .filter((x): x is SocialItem => !!x);
      if (items.length > 0) return items;
    }
    // Author not found — degrade to keyword search using the handle text.
    return fetchBlueskyFeed("search", value, limit);
  }

  const json = await bskyJson<{ posts?: BskyPost[] }>(
    `/app.bsky.feed.searchPosts?q=${encodeURIComponent(value)}&limit=${limit}&sort=latest`,
  );
  return (json?.posts ?? [])
    .map((p) => normalizePost(p))
    .filter((x): x is SocialItem => !!x);
}
// ─── socialtickers.com (signal scores) ──────────────────────────────────────
// No auth. Single endpoint returns 60+ crypto tickers with signal score,
// buzz, mentions, sparkline, and embedded news headlines per ticker.

type StNewsItem = { t: string; src: string; lean?: string };
type StTicker = {
  ticker: string;
  name?: string;
  mentions?: number;
  signal?: number;
  buzz?: number;
  priceChg?: number;
  spark?: [number, number][];
  news?: { items?: StNewsItem[] };
};

async function fetchSocialTickers(): Promise<StTicker[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(
      "https://socialtickers.com/api/v1/leaderboard?class=crypto&sort=trending&win=1h",
      {
        signal: ctrl.signal,
        headers: { accept: "application/json", "user-agent": "SCBOLBot/1.0" },
      },
    );
    clearTimeout(t);
    if (!r.ok) return [];
    const j = (await r.json()) as { results?: StTicker[] };
    return j.results ?? [];
  } catch {
    return [];
  }
}

function matchTicker(t: StTicker, mode: "user" | "search", value: string): boolean {
  if (mode === "user") return false;
  const v = value.replace(/^\$/, "").toLowerCase();
  if (!v) return true;
  return (
    t.ticker?.toLowerCase().includes(v) ||
    (t.name?.toLowerCase().includes(v) ?? false)
  );
}

async function fetchSocialSignals(
  mode: "user" | "search",
  value: string,
  limit: number,
): Promise<SocialItem[]> {
  const tickers = await fetchSocialTickers();
  const filtered = tickers.filter((t) => matchTicker(t, mode, value)).slice(0, limit);
  const now = new Date().toISOString();
  return filtered.map((t) => ({
    id: `st:${t.ticker}`,
    author: t.name ?? t.ticker,
    handle: `$${t.ticker}`,
    text: (t.news?.items ?? [])
      .slice(0, 2)
      .map((n) => n.t)
      .join(" · ") || `${t.name ?? t.ticker} trending`,
    url: `https://socialtickers.com/asset/${encodeURIComponent(t.ticker)}`,
    publishedAt: now,
    source: "SocialTickers",
    kind: "signal",
    ticker: t.ticker,
    signal: typeof t.signal === "number" ? t.signal : undefined,
    buzz: typeof t.buzz === "number" ? t.buzz : undefined,
    mentions: typeof t.mentions === "number" ? t.mentions : undefined,
    priceChg: typeof t.priceChg === "number" ? t.priceChg : undefined,
    spark: (t.spark ?? []).map(([, v]) => v),
    headlines: (t.news?.items ?? []).slice(0, 4).map((n) => ({
      text: n.t,
      src: n.src,
      lean: n.lean,
    })),
  }));
}

// ─── DexScreener token profiles (launch announcements) ──────────────────────
// Free, no auth. Stream of newly profiled Solana tokens with descriptions
// and links — effectively a "launch feed" with built-in social links.

type DexProfile = {
  chainId?: string;
  tokenAddress?: string;
  url?: string;
  description?: string;
  icon?: string;
  links?: { label?: string; type?: string; url?: string }[];
};

async function dexJson<T>(url: string): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": "SCBOLBot/1.0" },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function fetchDexLaunches(
  mode: "user" | "search",
  value: string,
  limit: number,
): Promise<SocialItem[]> {
  const [latest, boosted] = await Promise.all([
    dexJson<DexProfile[]>("https://api.dexscreener.com/token-profiles/latest/v1"),
    dexJson<DexProfile[]>("https://api.dexscreener.com/token-boosts/top/v1"),
  ]);
  const merged: DexProfile[] = [...(latest ?? []), ...(boosted ?? [])].filter(
    (p) => p.chainId === "solana" && p.tokenAddress,
  );

  // Filter by query when it makes sense (tag/term). Match against description
  // and the token address suffix users sometimes paste.
  const needle = value.replace(/^[@$]/, "").toLowerCase();
  const matching = needle
    ? merged.filter(
        (p) =>
          (p.description ?? "").toLowerCase().includes(needle) ||
          (p.tokenAddress ?? "").toLowerCase().includes(needle) ||
          (p.links ?? []).some((l) =>
            (l.url ?? "").toLowerCase().includes(needle),
          ),
      )
    : merged;

  const seen = new Set<string>();
  const out: SocialItem[] = [];
  for (const p of matching) {
    if (!p.tokenAddress || seen.has(p.tokenAddress)) continue;
    seen.add(p.tokenAddress);
    const twitter = (p.links ?? []).find((l) => l.type === "twitter");
    const handle = twitter?.url?.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)/)?.[1];
    out.push({
      id: `dex:${p.tokenAddress}`,
      author: handle ? `@${handle}` : "Solana launch",
      handle: handle ? `@${handle}` : `${p.tokenAddress.slice(0, 4)}…${p.tokenAddress.slice(-4)}`,
      text: (p.description ?? "").trim() || "New Solana token profiled on DexScreener.",
      url: p.url ?? `https://dexscreener.com/solana/${p.tokenAddress}`,
      publishedAt: new Date().toISOString(),
      source: "DexScreener",
      kind: "launch",
      icon: p.icon,
      links: (p.links ?? [])
        .filter((l): l is { url: string; type?: string; label?: string } => !!l.url)
        .slice(0, 4),
    });
    if (out.length >= limit) break;
  }
  // If the user filtered to nothing, surface a few latest anyway so the column
  // is never empty.
  if (out.length === 0 && needle && merged.length > 0) {
    return fetchDexLaunches(mode, "", limit);
  }
  return out;
}
