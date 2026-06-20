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
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.cz",
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

export async function fetchSocialFeed(query: string, limit = 30): Promise<SocialItem[]> {
  // Try each Nitter host until one responds.
  const q = encodeURIComponent(query);
  for (const host of NITTER_HOSTS) {
    const url = `${host}/search/rss?f=tweets&q=${q}`;
    const xml = await fetchFeed(url, 5000);
    if (!xml) continue;
    const parsed = parseItems(xml).slice(0, limit);
    if (parsed.length === 0) continue;
    const items: SocialItem[] = [];
    for (const it of parsed) {
      if (!it.title || !it.link) continue;
      const ts = it.pubDate ? new Date(it.pubDate) : null;
      const iso = ts && !isNaN(ts.getTime()) ? ts.toISOString() : new Date().toISOString();
      // Nitter title is "@handle: tweet text"
      const raw = stripHtml(it.title);
      const colon = raw.indexOf(":");
      const handle = colon > 0 ? raw.slice(0, colon).replace(/^R to /, "").trim() : "";
      const text = colon > 0 ? raw.slice(colon + 1).trim() : raw;
      // Rewrite link from Nitter back to x.com
      const url = it.link.replace(/https?:\/\/[^/]+/, "https://x.com");
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
    if (items.length > 0) return items;
  }
  return [];
}