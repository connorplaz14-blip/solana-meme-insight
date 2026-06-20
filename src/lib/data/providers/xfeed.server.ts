// X (Twitter) feed. Primary source: FxTwitter v2 (free JSON, no key).
// Fallback: Firecrawl (Google-indexed snippets + profile scrape), with
// per-tweet enrichment via FxTwitter `/2/status/{id}` to recover text,
// author, real timestamps, and engagement metrics.
//
// Output normalizes to SocialItem from newsfeed.server.ts.

import { firecrawlSearch, firecrawlScrapeMarkdown } from "./firecrawl.server";
import { fxSearch, fxUserTimeline, fxStatus, type XTweet } from "./fxtwitter.server";
import type { SocialItem } from "./newsfeed.server";

// Curated Solana KOL / big-account list. Used when query == "kols" / "@kols".
// Mix of founders, traders, analysts, and culture accounts. Keep this small
// (parallel fetch fans out to each handle on every refresh).
export const SOLANA_KOLS = [
  // Traders / KOLs
  "blknoiz06",        // Ansem
  "MustStopMurad",
  "Cupseyy",
  "notthreadguy",
  "frankdegods",
  "trader1sz",
  "MoonOverlord",
  "0xRamonos",
  "ZssBecker",
  "gake_eth",
  // Solana / infra founders
  "aeyakovenko",      // Anatoly Yakovenko (Solana co-founder)
  "rajgokal",         // Raj Gokal (Solana co-founder)
  "0xMert_",          // Mert Mumtaz (Helius)
  "weremeow",         // Meow — Jupiter founder
  "a1lon9",           // Alon — Pump.fun co-founder
  // Project / culture accounts
  "pumpdotfun",
  "JupiterExchange",
  "TheOnlyNom",       // BONK core contributor
  "bonk_inu",
  "dogwifcoin",
  "SolanaFndn",
  "SolanaFloor",
  // Risk / on-chain analysts
  "zachxbt",
  "lookonchain",
  "bubblemaps",
  "Rugcheckxyz",
  "DefiIgnas",
];

// Optional tag map for UI chips / future filtering. Unused entries default
// to "kol" at the call site.
export const KOL_TAGS: Record<string, "trader" | "founder" | "culture" | "risk" | "kol"> = {
  blknoiz06: "trader",
  MustStopMurad: "trader",
  Cupseyy: "trader",
  notthreadguy: "trader",
  frankdegods: "trader",
  trader1sz: "trader",
  MoonOverlord: "trader",
  "0xRamonos": "trader",
  ZssBecker: "trader",
  gake_eth: "trader",
  aeyakovenko: "founder",
  rajgokal: "founder",
  "0xMert_": "founder",
  weremeow: "founder",
  a1lon9: "founder",
  pumpdotfun: "culture",
  JupiterExchange: "culture",
  TheOnlyNom: "culture",
  bonk_inu: "culture",
  dogwifcoin: "culture",
  SolanaFndn: "culture",
  SolanaFloor: "culture",
  zachxbt: "risk",
  lookonchain: "risk",
  bubblemaps: "risk",
  Rugcheckxyz: "risk",
  DefiIgnas: "risk",
};

const TTL_MS = 5 * 60 * 1000;
type CacheEntry = { ts: number; items: SocialItem[] };
const cache = new Map<string, CacheEntry>();

function cached(key: string): SocialItem[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.items;
}
function store(key: string, items: SocialItem[]) {
  cache.set(key, { ts: Date.now(), items });
}

function parseStatusUrl(url: string): { handle: string; id: string } | null {
  const m = url.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,20})\/status\/(\d{5,25})/i);
  if (!m) return null;
  return { handle: m[1], id: m[2] };
}

function cleanTweetText(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^"|"$/g, "")
    .trim();
}

function xtweetToItem(t: XTweet): SocialItem {
  return {
    id: `x:${t.id}`,
    author: t.author,
    handle: t.handle,
    text: t.text,
    url: t.url,
    publishedAt: t.createdAt,
    source: "X",
    kind: "post",
    likes: t.likes,
    replies: t.replies,
    retweets: t.retweets,
    views: t.views,
    hasMedia: t.hasMedia,
    photos: t.photos,
    videos: t.videos,
  };
}

/**
 * Fan-out fetch across a list of handles. Pulls a few tweets per account,
 * merges, dedupes, and sorts by recency. Used for the "KOLs" preset and as
 * a fallback when a $TICKER search returns nothing notable.
 */
export async function fetchHandlesTimeline(
  handles: string[],
  perHandle = 3,
  limit = 30,
): Promise<SocialItem[]> {
  const key = `multi:${handles.join(",").toLowerCase()}:${perHandle}:${limit}`;
  const hit = cached(key);
  if (hit) return hit;

  const results = await Promise.allSettled(
    handles.map((h) => fxUserTimeline(h, perHandle)),
  );
  const seen = new Set<string>();
  const out: SocialItem[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const t of r.value) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(xtweetToItem(t));
    }
  }
  // Prefer accounts with traction: weight by likes within last 24h, fallback recency.
  const now = Date.now();
  out.sort((a, b) => {
    const ageA = now - +new Date(a.publishedAt);
    const ageB = now - +new Date(b.publishedAt);
    const recentA = ageA < 24 * 3600 * 1000;
    const recentB = ageB < 24 * 3600 * 1000;
    if (recentA && recentB) return (b.likes ?? 0) - (a.likes ?? 0);
    return ageA - ageB;
  });
  const final = out.slice(0, limit);
  store(key, final);
  return final;
}

/** Enrich a list of (handle,id) tuples in parallel via FxTwitter /2/status. */
async function enrichIds(
  ids: { handle: string; id: string }[],
  cap = 10,
): Promise<Map<string, XTweet>> {
  const slice = ids.slice(0, cap);
  const settled = await Promise.allSettled(slice.map((x) => fxStatus(x.id)));
  const out = new Map<string, XTweet>();
  settled.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) out.set(slice[i].id, r.value);
  });
  return out;
}

/** Free-text / cashtag / hashtag / `from:` search via FxTwitter, Firecrawl fallback. */
export async function searchX(query: string, limit = 25): Promise<SocialItem[]> {
  const key = `search:${query.toLowerCase()}:${limit}`;
  const hit = cached(key);
  if (hit) return hit;

  const term = query.trim();
  if (!term) return [];

  // 1) Primary: FxTwitter search. Handles $TICK, #tag, "from:user", plain text.
  // For $TICKER / #tag / keyword searches we bias toward bigger accounts by
  // requiring some traction — keeps the column free of bot spam. `from:` and
  // explicit operator queries are passed through untouched.
  const hasOperator = /\b(from|to|list|filter|min_faves|min_retweets):/i.test(term);
  const fxTerm = hasOperator ? term : `${term} min_faves:25 -filter:replies`;
  const primary = await fxSearch(fxTerm, Math.min(limit, 30)).catch(() => []);
  if (primary.length >= 3) {
    const items = primary.slice(0, limit).map(xtweetToItem);
    store(key, items);
    return items;
  }

  // 2) Fallback: Firecrawl Google-indexed `site:x.com` results.
  const stripped = term.replace(/^[#$]/, "");
  const fcQuery = `site:x.com ${term.startsWith("$") ? `$${stripped}` : stripped}`;
  const results = await firecrawlSearch(fcQuery, {
    limit: Math.min(limit, 30),
    tbs: "qdr:d",
  }).catch(() => []);

  const seen = new Set<string>(primary.map((t) => t.id));
  const parsed: { handle: string; id: string; r: (typeof results)[number] }[] = [];
  for (const r of results) {
    const p = parseStatusUrl(r.url);
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    parsed.push({ ...p, r });
  }

  // 3) Enrich Firecrawl hits via FxTwitter status lookup for clean data.
  const enriched = await enrichIds(parsed, 10);

  const out: SocialItem[] = primary.map(xtweetToItem);
  for (const { handle, id, r } of parsed) {
    const tweet = enriched.get(id);
    if (tweet) {
      out.push(xtweetToItem(tweet));
      continue;
    }
    // Plain Firecrawl fallback when enrichment fails.
    let text = (r.description ?? r.title ?? "").trim();
    const onX = (r.title ?? "").match(/^(.+?)\s+on\s+X:\s*"?(.*?)"?$/i);
    let author = onX?.[1]?.trim() ?? "";
    if (onX?.[2]) text = onX[2];
    if (!author) author = `@${handle}`;
    const iso = r.publishedDate
      ? new Date(r.publishedDate).toISOString()
      : new Date().toISOString();
    out.push({
      id: `x:${id}`,
      author,
      handle: `@${handle}`,
      text: cleanTweetText(text),
      url: `https://x.com/${handle}/status/${id}`,
      publishedAt: iso,
      source: "X",
      kind: "post",
    });
    if (out.length >= limit) break;
  }
  const final = out.slice(0, limit);
  store(key, final);
  return final;
}

/** User timeline via FxTwitter, Firecrawl-scrape fallback with enrichment. */
export async function userTimelineX(handle: string, limit = 25): Promise<SocialItem[]> {
  const h = handle.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  if (!h) return [];
  const key = `user:${h.toLowerCase()}:${limit}`;
  const hit = cached(key);
  if (hit) return hit;

  // 1) Primary: FxTwitter /2/profile/{h}/statuses
  const primary = await fxUserTimeline(h, Math.min(limit, 30)).catch(() => []);
  if (primary.length > 0) {
    const items = primary.slice(0, limit).map(xtweetToItem);
    store(key, items);
    return items;
  }

  // 2) Fallback: scrape profile via Firecrawl + enrich
  const scraped = await firecrawlScrapeMarkdown(`https://x.com/${h}`).catch(() => null);
  if (!scraped?.markdown) {
    const fromSearch = await searchX(`from:${h}`, limit);
    store(key, fromSearch);
    return fromSearch;
  }

  const linkRe = /\[([^\]]{1,400})\]\((https?:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+)[^)]*\)/g;
  const seen = new Set<string>();
  const parsed: { handle: string; id: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(scraped.markdown)) !== null) {
    const p = parseStatusUrl(m[2]);
    if (!p) continue;
    if (p.handle.toLowerCase() !== h.toLowerCase()) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    parsed.push({ ...p, text: cleanTweetText(m[1]) });
  }

  const enriched = await enrichIds(parsed, 10);
  const out: SocialItem[] = [];
  for (const { handle: hh, id, text } of parsed) {
    const t = enriched.get(id);
    if (t) {
      out.push(xtweetToItem(t));
    } else if (text.length >= 4) {
      out.push({
        id: `x:${id}`,
        author: `@${hh}`,
        handle: `@${hh}`,
        text,
        url: `https://x.com/${hh}/status/${id}`,
        publishedAt: new Date().toISOString(),
        source: "X",
        kind: "post",
      });
    }
    if (out.length >= limit) break;
  }

  const final = out.length > 0 ? out : await searchX(`from:${h}`, limit);
  store(key, final);
  return final;
}