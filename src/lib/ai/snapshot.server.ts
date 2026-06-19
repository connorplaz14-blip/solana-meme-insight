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
  };
}