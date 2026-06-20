// X List member scraper. FxTwitter has no list endpoint, so we use Firecrawl
// to scrape the public list page once and extract member handles. Twitter
// often gates the full members view behind auth, so this is best-effort —
// callers must always have a curated fallback.

import { firecrawlScrapeMarkdown } from "./firecrawl.server";

const TTL_MS = 6 * 60 * 60 * 1000; // 6h
type Entry = { ts: number; handles: string[] };
const cache = new Map<string, Entry>();

// Curated Solana KOL lists supplied by the user. The duplicated 1777… id
// is intentionally collapsed.
export const SOLANA_KOL_LISTS = [
  "1777037601578287430",
  "1747955009617006656",
  "1726621096902807989",
  "1587987762908651520",
];

// Strip out Twitter's own navigation / system handles so they don't pollute
// the roster when we scrape the list page.
const BLOCKED = new Set([
  "home", "explore", "notifications", "messages", "i", "search", "compose",
  "settings", "tos", "privacy", "about", "login", "signup", "logout",
  "twitter", "x", "support", "help", "tweetdeck", "verified", "premium",
  "intent", "share", "hashtag", "bookmarks", "communities", "topics", "lists",
]);

function extractHandles(md: string): string[] {
  const found = new Set<string>();
  // Match both @mentions and bare profile URLs.
  const reMention = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{2,15})\b/g;
  const reProfile = /(?:x|twitter)\.com\/([A-Za-z0-9_]{2,15})(?:[\/?#"\)\s]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = reMention.exec(md)) !== null) {
    const h = m[1];
    if (!BLOCKED.has(h.toLowerCase())) found.add(h);
  }
  while ((m = reProfile.exec(md)) !== null) {
    const h = m[1];
    if (BLOCKED.has(h.toLowerCase())) continue;
    // Skip path segments that look like routes, not handles.
    if (/^\d+$/.test(h)) continue;
    found.add(h);
  }
  return Array.from(found);
}

export async function fetchListMembers(listId: string): Promise<string[]> {
  const id = listId.replace(/\D/g, "");
  if (!id) return [];
  const hit = cache.get(id);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.handles;

  // Try /members first (more comprehensive when accessible), then the list
  // page itself as a fallback for the timeline preview.
  const urls = [
    `https://x.com/i/lists/${id}/members`,
    `https://x.com/i/lists/${id}`,
  ];
  const all = new Set<string>();
  for (const url of urls) {
    const res = await firecrawlScrapeMarkdown(url).catch(() => null);
    if (!res?.markdown) continue;
    for (const h of extractHandles(res.markdown)) all.add(h);
    if (all.size >= 30) break;
  }
  const handles = Array.from(all);
  cache.set(id, { ts: Date.now(), handles });
  return handles;
}

export async function fetchAllListMembers(
  listIds: string[] = SOLANA_KOL_LISTS,
): Promise<string[]> {
  const results = await Promise.allSettled(listIds.map((id) => fetchListMembers(id)));
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const h of r.value) seen.add(h);
  }
  return Array.from(seen);
}