import { createServerFn } from "@tanstack/react-start";
import type {
  MarketPulseSnapshot,
  MacroSnapshot,
  NarrativeReport,
  ProviderInfo,
  PumpLaunch,
  SolMarket,
  Token,
  TokenSearchResult,
  WalletPnLResult,
} from "@/types";
import { providers as providerCatalog } from "@/mocks/providers";
import { sampleWallet } from "@/mocks/wallet-pnl";

export const getSolMarketFn = createServerFn({ method: "GET" }).handler(async (): Promise<SolMarket> => {
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchSolMarket } = await import("./providers/coingecko.server");
  return withCache("coingecko:sol-market", 30, () => trackProvider("coingecko", fetchSolMarket));
});

export const getMacroFn = createServerFn({ method: "GET" }).handler(async (): Promise<MacroSnapshot> => {
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchMacro } = await import("./providers/macro.server");
  return withCache("macro:tape:v1", 30, () => trackProvider("coingecko", fetchMacro));
});

export const searchTokensFn = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => ({ q: String(d?.q ?? "").trim().slice(0, 60) }))
  .handler(async ({ data }): Promise<TokenSearchResult[]> => {
    if (!data.q || data.q.length < 2) return [];
    const { withCache } = await import("./cache.server");
    const { trackProvider } = await import("./health.server");
    const { searchSolanaTokens } = await import("./providers/dexsearch.server");
    return withCache(`dexscreener:search:${data.q.toLowerCase()}`, 60, () =>
      trackProvider("dexscreener", () => searchSolanaTokens(data.q, 8)),
    );
  });

export const getTrendingFn = createServerFn({ method: "GET" }).handler(async (): Promise<Token[]> => {
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchSolanaTrending } = await import("./providers/dexscreener.server");
  return withCache("dexscreener:trending:30", 60, () => trackProvider("dexscreener", () => fetchSolanaTrending(30)));
});

export const getMemeOfTheDayFn = createServerFn({ method: "GET" }).handler(async (): Promise<Token> => {
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchSolanaTrending } = await import("./providers/dexscreener.server");
  const tokens = await withCache("dexscreener:trending:30", 60, () =>
    trackProvider("dexscreener", () => fetchSolanaTrending(30)),
  );
  const top = [...tokens].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const compactUsd = (n: number) =>
    "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  return {
    ...top,
    aiSummary:
      `${top.symbol} leads today's MemeDesk score with ${compactUsd(top.volume24hUsd)} in 24h volume ` +
      `against ${compactUsd(top.liquidityUsd)} of liquidity. ` +
      `Price moved ${top.changes.h24.toFixed(1)}% over 24h. ` +
      `Buy/sell ratio: ${(top.txns.buys24h / Math.max(top.txns.sells24h, 1)).toFixed(2)}.`,
  };
});

export const getMarketPulseFn = createServerFn({ method: "GET" }).handler(async (): Promise<MarketPulseSnapshot> => {
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchSolanaTrending } = await import("./providers/dexscreener.server");
  const tokens = await withCache("dexscreener:trending:30", 60, () =>
    trackProvider("dexscreener", () => fetchSolanaTrending(30)),
  );
  const highRisk = tokens.filter((t) => t.risk === "high" || t.risk === "extreme").length;
  const newLaunches = tokens.filter((t) => t.ageHours < 72).length;
  const avgChange = tokens.reduce((s, t) => s + t.changes.h24, 0) / Math.max(tokens.length, 1);
  const condition: MarketPulseSnapshot["condition"] =
    avgChange > 8 ? "Hot" : avgChange < -8 ? "Dead" : highRisk > tokens.length / 2 ? "Risky" : "Neutral";
  return {
    trendingCount: tokens.length,
    newLaunchesScanned: newLaunches,
    topNarrative: tokens[0]?.symbol ? `${tokens[0].symbol} momentum` : "Mixed",
    highRiskFiltered: highRisk,
    condition,
  };
});

export const getTokenChartFn = createServerFn({ method: "GET" })
  .inputValidator((d: { address: string; points?: number }) => ({
    address: String(d?.address ?? ""),
    points: Number(d?.points ?? 96),
  }))
  .handler(async ({ data }) => {
    if (!data.address) return [];
    const { withCache } = await import("./cache.server");
    const { trackProvider } = await import("./health.server");
    const { fetchSolanaTrending } = await import("./providers/dexscreener.server");
    const { buildSyntheticSeries } = await import("./providers/chart.server");
    const tokens = await withCache("dexscreener:trending:30", 60, () =>
      trackProvider("dexscreener", () => fetchSolanaTrending(30)),
    );
    const token = tokens.find((t) => t.address === data.address) ?? tokens[0];
    if (!token) return [];
    return buildSyntheticSeries(token, data.points);
  });

export const getNarrativesFn = createServerFn({ method: "GET" }).handler(async (): Promise<NarrativeReport> => {
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchSolanaTrending } = await import("./providers/dexscreener.server");
  const { getOrGenerateNarrative } = await import("./providers/narrative.server");
  const tokens = await withCache("dexscreener:trending:30", 60, () =>
    trackProvider("dexscreener", () => fetchSolanaTrending(30)),
  );
  return trackProvider("lovable-ai", () => getOrGenerateNarrative(tokens));
});

export const getProvidersFn = createServerFn({ method: "GET" }).handler(async (): Promise<ProviderInfo[]> => {
  const { readAllHealth } = await import("./health.server");
  const health = await readAllHealth();
  const byProvider = new Map(health.map((h) => [h.provider, h]));

  return providerCatalog.map((p) => {
    const h = byProvider.get(p.id);
    if (!h) return p;
    const recentlyOk = h.last_ok_at && Date.now() - new Date(h.last_ok_at).getTime() < 10 * 60 * 1000;
    const status: ProviderInfo["status"] = recentlyOk
      ? "live"
      : h.last_error
        ? "error"
        : p.status;
    return {
      ...p,
      status,
      lastSuccessIso: h.last_ok_at ?? p.lastSuccessIso,
      lastError: h.last_error ?? undefined,
      notes: h.last_latency_ms != null ? `Last latency ${h.last_latency_ms}ms. ${p.notes ?? ""}`.trim() : p.notes,
    };
  });
});

export const getPumpfunLaunchesFn = createServerFn({ method: "GET" }).handler(async (): Promise<PumpLaunch[]> => {
  if (!process.env.SOLANA_TRACKER_API_KEY) return [];
  const { withCache } = await import("./cache.server");
  const { trackProvider } = await import("./health.server");
  const { fetchPumpfunLaunches } = await import("./providers/solana-tracker.server");
  try {
    return await withCache("solana-tracker:launches:25", 60, () =>
      trackProvider("solana-tracker", () => fetchPumpfunLaunches(25)),
    );
  } catch {
    return [];
  }
});

export const getWalletPnLFn = createServerFn({ method: "POST" })
  .inputValidator((d: { address: string }) => ({ address: String(d?.address ?? "").trim() }))
  .handler(async ({ data }): Promise<WalletPnLResult> => {
    const nowIso = new Date().toISOString();
    const addr = data.address;
    const looksLikeSolAddr = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

    if (!looksLikeSolAddr || !process.env.BIRDEYE_API_KEY) {
      return { ...sampleWallet, address: addr || sampleWallet.address, source: "mock", lastUpdatedIso: nowIso };
    }
    const { withCache } = await import("./cache.server");
    const { trackProvider } = await import("./health.server");
    const { fetchWalletPortfolio } = await import("./providers/birdeye.server");
    try {
      const live = await withCache(`birdeye:wallet:${addr}`, 30, () =>
        trackProvider("birdeye", () => fetchWalletPortfolio(addr)),
      );
      return { ...live, source: "birdeye", lastUpdatedIso: nowIso };
    } catch {
      return { ...sampleWallet, address: addr, source: "mock", lastUpdatedIso: nowIso };
    }
  });