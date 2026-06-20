// X (Twitter) feed sourced through Firecrawl. Replaces flaky Nitter/RSSHub
// mirrors. Two modes:
//   · search  →  Firecrawl /search with `site:x.com <term>` — returns
//                  tweet titles + URLs + snippets directly.
//   · user    →  Firecrawl /scrape on https://x.com/<handle> and parse the
//                  markdown for individual tweet links.
//
// Output normalizes to SocialItem from newsfeed.server.ts.

import { firecrawlSearch, firecrawlScrapeMarkdown } from "./firecrawl.server";
import type { SocialItem } from "./newsfeed.server";

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

/** Free-text / cashtag / hashtag search via Firecrawl. */
export async function searchX(query: string, limit = 25): Promise<SocialItem[]> {
  const key = `search:${query.toLowerCase()}:${limit}`;
  const hit = cached(key);
  if (hit) return hit;

  // Strip leading $/# so Google search interprets them; pad with site filter.
  const term = query.replace(/^[#$]/, "").trim();
  if (!term) return [];
  const fcQuery = `site:x.com ${query.startsWith("$") ? `$${term}` : term}`;

  const results = await firecrawlSearch(fcQuery, { limit: Math.min(limit, 30), tbs: "qdr:d" });

  const seen = new Set<string>();
  const out: SocialItem[] = [];
  for (const r of results) {
    const parsed = parseStatusUrl(r.url);
    if (!parsed) continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);

    // Search titles look like: "User Name on X: "tweet body""
    let text = (r.description ?? r.title ?? "").trim();
    const onX = (r.title ?? "").match(/^(.+?)\s+on\s+X:\s*"?(.*?)"?$/i);
    let author = onX?.[1]?.trim() ?? "";
    if (onX?.[2]) text = onX[2];
    if (!author) author = `@${parsed.handle}`;

    const iso = r.publishedDate
      ? new Date(r.publishedDate).toISOString()
      : new Date().toISOString();

    out.push({
      id: `x:${parsed.id}`,
      author,
      handle: `@${parsed.handle}`,
      text: cleanTweetText(text),
      url: `https://x.com/${parsed.handle}/status/${parsed.id}`,
      publishedAt: iso,
      source: "X",
      kind: "post",
    });
    if (out.length >= limit) break;
  }
  store(key, out);
  return out;
}

/** Scrape a public X profile page and pull recent status links. */
export async function userTimelineX(handle: string, limit = 25): Promise<SocialItem[]> {
  const h = handle.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  if (!h) return [];
  const key = `user:${h.toLowerCase()}:${limit}`;
  const hit = cached(key);
  if (hit) return hit;

  const scraped = await firecrawlScrapeMarkdown(`https://x.com/${h}`);
  if (!scraped?.markdown) {
    // Fall back to a search query so the column isn't empty when X blocks the scrape.
    return searchX(`from:${h}`, limit);
  }

  // Markdown links look like: [text](https://x.com/handle/status/123...)
  const linkRe = /\[([^\]]{1,400})\]\((https?:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+)[^)]*\)/g;
  const seen = new Set<string>();
  const out: SocialItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(scraped.markdown)) !== null) {
    const parsed = parseStatusUrl(m[2]);
    if (!parsed) continue;
    if (parsed.handle.toLowerCase() !== h.toLowerCase()) continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    const text = cleanTweetText(m[1]);
    if (text.length < 4) continue;
    out.push({
      id: `x:${parsed.id}`,
      author: `@${parsed.handle}`,
      handle: `@${parsed.handle}`,
      text,
      url: `https://x.com/${parsed.handle}/status/${parsed.id}`,
      publishedAt: new Date().toISOString(),
      source: "X",
      kind: "post",
    });
    if (out.length >= limit) break;
  }
  // If markdown parsing yielded nothing usable, fall back to search.
  const final = out.length > 0 ? out : await searchX(`from:${h}`, limit);
  store(key, final);
  return final;
}