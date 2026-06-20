// Server-only pump.fun seed fetcher. Shared between the /api/pumpfun/latest
// route and the /launches loader so SSR doesn't self-fetch a relative URL.

export type Launch = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  dev?: string;
  marketCapUsd?: number;
  marketCapSol?: number;
  devBuySol?: number;
  createdAt: number;
  twitter?: string;
  telegram?: string;
  website?: string;
  source: "ws" | "rest";
};

type PumpCoin = {
  mint: string;
  name?: string;
  symbol?: string;
  image_uri?: string;
  creator?: string;
  created_timestamp?: number;
  usd_market_cap?: number;
  market_cap?: number;
  twitter?: string;
  telegram?: string;
  website?: string;
};

const PUMP_HOSTS = [
  "https://frontend-api-v3.pump.fun",
  "https://frontend-api-v2.pump.fun",
];

let cache: { ts: number; data: Launch[] } | null = null;
const TTL_MS = 5000;

export async function fetchPumpfunSeed(): Promise<Launch[]> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL_MS) return cache.data;

  for (const host of PUMP_HOSTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(
        `${host}/coins?sort=created_timestamp&order=DESC&limit=50&offset=0&includeNsfw=false`,
        {
          signal: ctrl.signal,
          headers: {
            accept: "application/json",
            "user-agent": "Mozilla/5.0 SCBOLBot/1.0",
          },
        },
      );
      clearTimeout(t);
      if (!r.ok) continue;
      const rows = (await r.json()) as PumpCoin[];
      if (!Array.isArray(rows)) continue;
      const data: Launch[] = rows
        .filter((c) => c.mint)
        .map((c) => ({
          mint: c.mint,
          name: c.name ?? "—",
          symbol: (c.symbol ?? "").toUpperCase(),
          imageUrl: c.image_uri,
          dev: c.creator,
          marketCapUsd: c.usd_market_cap,
          marketCapSol: c.market_cap,
          createdAt: c.created_timestamp ?? Date.now(),
          twitter: c.twitter,
          telegram: c.telegram,
          website: c.website,
          source: "rest" as const,
        }));
      if (data.length > 0) cache = { ts: now, data };
      return data;
    } catch {
      // try next host
    }
  }
  return cache?.data ?? [];
}