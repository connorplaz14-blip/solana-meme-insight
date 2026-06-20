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
};

const NEWS_FEEDS: { source: string; url: string }[] = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" },
  { source: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
];

// Nitter mirrors rotate frequently. We try several in order.
const NITTER_HOSTS = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.net",
  "https://nitter.cz",
  "https://nitter.tiekoetter.com",
  "https://nitter.kavin.rocks",
];

// RSSHub public instances fall back when Nitter is dead. They expose
// /twitter/keyword/:keyword and /twitter/user/:username among other routes.
const RSSHUB_HOSTS = [
  "https://rsshub.app",
  "https://rss.shab.fun",
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
        "user-agent": "Mozilla/5.0 MemeDeskBot/1.0 (+https://memedesk.app)",
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

function parseSocialXml(xml: string, fallbackHandle?: string): SocialItem[] {
  const parsed = parseItems(xml);
  const items: SocialItem[] = [];
  for (const it of parsed) {
    if (!it.title || !it.link) continue;
    const ts = it.pubDate ? new Date(it.pubDate) : null;
    const iso = ts && !isNaN(ts.getTime()) ? ts.toISOString() : new Date().toISOString();
    const raw = stripHtml(it.title);
    let handle = fallbackHandle ?? "";
    let text = raw;
    const colon = raw.indexOf(":");
    if (colon > 0 && raw.slice(0, colon).length < 40) {
      handle = raw.slice(0, colon).replace(/^R to /, "").trim();
      text = raw.slice(colon + 1).trim();
    }
    const url = it.link.trim().replace(/https?:\/\/[^/]+/, "https://x.com");
    items.push({
      id: url,
      author: handle,
      handle,
      text,
      url,
      publishedAt: iso,
      source: "X",
    });
  }
  return items;
}

export async function fetchSocialFeed(query: string, limit = 30): Promise<SocialItem[]> {
  const { mode, value } = detectMode(query);
  if (!value) return [];

  // 1) Try Nitter
  for (const host of NITTER_HOSTS) {
    const url =
      mode === "user"
        ? `${host}/${value}/rss`
        : `${host}/search/rss?f=tweets&q=${encodeURIComponent(value)}`;
    const xml = await fetchFeed(url, 5000);
    if (!xml) continue;
    const items = parseSocialXml(xml, mode === "user" ? `@${value}` : undefined).slice(0, limit);
    if (items.length > 0) return items;
  }

  // 2) RSSHub fallback
  for (const host of RSSHUB_HOSTS) {
    const url =
      mode === "user"
        ? `${host}/twitter/user/${value}`
        : `${host}/twitter/keyword/${encodeURIComponent(value)}`;
    const xml = await fetchFeed(url, 6000);
    if (!xml) continue;
    const items = parseSocialXml(xml, mode === "user" ? `@${value}` : undefined).slice(0, limit);
    if (items.length > 0) return items;
  }

  return [];
}