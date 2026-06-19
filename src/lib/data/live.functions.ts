import { createServerFn } from "@tanstack/react-start";
import type {
  MarketPulseSnapshot,
  NarrativeReport,
  ProviderInfo,
  PumpLaunch,
  SolMarket,
  Token,
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
  return {
    ...top,
    aiSummary:
      `${top.symbol} leads today's MemeDesk score with $${Math.round(top.volume24hUsd / 1_000_000)}M in 24h volume ` +
      `against $${Math.round(top.liquidityUsd / 1_000_000)}M of liquidity. ` +
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