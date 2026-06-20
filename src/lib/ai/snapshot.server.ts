import type { NarrativeReport, PumpLaunch, Token } from "@/types";

/**
 * Compact JSON snapshot fed into AI prompts (chat + curated trending).
 * Trimmed so it stays small in context but rich enough for narrative reads.
 */
export type MarketSnapshot = {
  generatedAtIso: string;
  trending: Array<{
    sym: string;
    name: string;
    addr: string;
    mcapUsd: number;
    liqUsd: number;
    vol24hUsd: number;
    h1Pct: number;
    h24Pct: number;
    ageH: number;
    risk: string;
    buys24h: number;
    sells24h: number;
  }>;
  pumpfun: Array<{
    sym: string;
    name: string;
    addr: string;
    ageH: number;
    liqUsd: number;
    mcapUsd: number;
    h24Pct: number;
    risk: string;
  }>;
  narrative: {
    dateIso: string;
    summary: string;
    dominantTheme: string;
    fastestGrowing: string;
    keywords: string[];
    items: { theme: string; growthPct: number; tokens: string[] }[];
  } | null;
  topTweets: Array<{
    handle: string;
    author: string;
    text: string;
    ts: string;
    likes: number;
    url: string;
  }>;
  topNews: Array<{
    source: string;
    title: string;
    summary?: string;
    ts: string;
    url: string;
  }>;
  xBuzz: Array<{ ticker: string; mentions: number }>;
};

export async function buildMarketSnapshot(): Promise<MarketSnapshot> {
  const { withCache } = await import("@/lib/data/cache.server");
  const { trackProvider } = await import("@/lib/data/health.server");
  const { fetchSolanaTrending } = await import("@/lib/data/providers/dexscreener.server");

  const tokens = await withCache("dexscreener:trending:30", 60, () =>
    trackProvider("dexscreener", () => fetchSolanaTrending(30)),
  );

  let launches: PumpLaunch[] = [];
  if (process.env.SOLANA_TRACKER_API_KEY) {
    try {
      const { fetchPumpfunLaunches } = await import(
        "@/lib/data/providers/solana-tracker.server"
      );
      launches = await withCache("solana-tracker:launches:25", 60, () =>
        trackProvider("solana-tracker", () => fetchPumpfunLaunches(15)),
      );
    } catch {
      launches = [];
    }
  }

  let narrative: NarrativeReport | null = null;
  try {
    const { getOrGenerateNarrative } = await import(
      "@/lib/data/providers/narrative.server"
    );
    narrative = await getOrGenerateNarrative(tokens);
  } catch {
    narrative = null;
  }

  // Social + news layer (in-memory cached, 90s)
  const [tweets, news] = await Promise.all([
    getCachedTopTweets().catch(() => []),
    getCachedTopNews().catch(() => []),
  ]);
  const xBuzz = computeBuzz(tweets);

  return {
    generatedAtIso: new Date().toISOString(),
    trending: tokens.slice(0, 25).map((t: Token) => ({
      sym: t.symbol,
      name: t.name,
      addr: t.address,
      mcapUsd: Math.round(t.marketCapUsd),
      liqUsd: Math.round(t.liquidityUsd),
      vol24hUsd: Math.round(t.volume24hUsd),
      h1Pct: Math.round(t.changes.h1 * 10) / 10,
      h24Pct: Math.round(t.changes.h24 * 10) / 10,
      ageH: Math.round(t.ageHours),
      risk: t.risk,
      buys24h: t.txns.buys24h,
      sells24h: t.txns.sells24h,
    })),
    pumpfun: launches.slice(0, 10).map((l) => ({
      sym: l.symbol,
      name: l.name,
      addr: l.address,
      ageH: Math.round(l.ageHours * 10) / 10,
      liqUsd: Math.round(l.liquidityUsd),
      mcapUsd: Math.round(l.marketCapUsd),
      h24Pct: Math.round(l.change24hPct * 10) / 10,
      risk: l.risk,
    })),
    narrative: narrative
      ? {
          dateIso: narrative.dateIso,
          summary: narrative.summary,
          dominantTheme: narrative.dominantTheme,
          fastestGrowing: narrative.fastestGrowing,
          keywords: narrative.keywords.map((k) => k.word),
          items: narrative.items.map((i) => ({
            theme: i.theme,
            growthPct: i.growthPct,
            tokens: i.tokens,
          })),
        }
      : null,
    topTweets: tweets,
    topNews: news,
    xBuzz,
  };
}

// ─── Cached social + news helpers ───────────────────────────────────────────

type CachedTweet = MarketSnapshot["topTweets"][number];
type CachedNews = MarketSnapshot["topNews"][number];

let _tweetCache: { ts: number; data: CachedTweet[] } | null = null;
let _newsCache: { ts: number; data: CachedNews[] } | null = null;
const SOCIAL_TTL_MS = 90_000;

async function getCachedTopTweets(): Promise<CachedTweet[]> {
  if (_tweetCache && Date.now() - _tweetCache.ts < SOCIAL_TTL_MS) return _tweetCache.data;
  const { fetchHandlesTimeline, SOLANA_KOLS } = await import(
    "@/lib/data/providers/xfeed.server"
  );
  const items = await fetchHandlesTimeline(SOLANA_KOLS.slice(0, 25), 2, 60).catch(
    () => [],
  );
  const cutoff = Date.now() - 6 * 3600 * 1000;
  const recent = items
    .filter((i) => +new Date(i.publishedAt) > cutoff)
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    .slice(0, 14)
    .map((i) => ({
      handle: i.handle.replace(/^@/, ""),
      author: i.author,
      text: i.text.slice(0, 240),
      ts: i.publishedAt,
      likes: i.likes ?? 0,
      url: i.url,
    }));
  _tweetCache = { ts: Date.now(), data: recent };
  return recent;
}

async function getCachedTopNews(): Promise<CachedNews[]> {
  if (_newsCache && Date.now() - _newsCache.ts < SOCIAL_TTL_MS) return _newsCache.data;
  const { fetchAggregatedNews } = await import(
    "@/lib/data/providers/newsfeed.server"
  );
  const items = await fetchAggregatedNews(20).catch(() => []);
  const trimmed = items.slice(0, 10).map((n) => ({
    source: n.source,
    title: n.title.slice(0, 180),
    summary: n.summary?.slice(0, 200),
    ts: n.publishedAt,
    url: n.url,
  }));
  _newsCache = { ts: Date.now(), data: trimmed };
  return trimmed;
}

function computeBuzz(tweets: CachedTweet[]): Array<{ ticker: string; mentions: number }> {
  const counts = new Map<string, number>();
  for (const t of tweets) {
    const matches = t.text.match(/\$[A-Za-z][A-Za-z0-9]{1,9}\b/g);
    if (!matches) continue;
    for (const m of matches) {
      const tk = m.slice(1).toUpperCase();
      counts.set(tk, (counts.get(tk) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ticker, mentions]) => ({ ticker, mentions }));
}

export { getCachedTopTweets, getCachedTopNews };