import type { ProviderInfo } from "@/types";

/**
 * Canonical provider catalog (server-side). Replaces the previous
 * `@/mocks/providers` import used by `live.functions.ts`. Baseline
 * `status` here is the "no health record yet" state — the dashboard
 * overrides to "live" / "error" once `health.server.ts` reports.
 *
 * Providers gated on an env-var key start as `missing` so the UI shows
 * "Not configured" instead of a misleading "Mock" badge.
 */
export function buildProviderCatalog(env: Record<string, string | undefined>): ProviderInfo[] {
  const has = (k: string) => Boolean(env[k]);
  return [
    {
      id: "dexscreener",
      name: "DexScreener",
      category: "dex",
      status: "live",
      features: ["Trending tokens", "Token detail", "Pair liquidity"],
      docsUrl: "https://docs.dexscreener.com/api/reference",
      notes: "Primary source for DEX trading + liquidity data. No key required.",
    },
    {
      id: "coingecko",
      name: "CoinGecko",
      category: "market",
      status: "live",
      features: ["SOL/BTC/ETH price + market cap", "Global market data"],
      docsUrl: "https://www.coingecko.com/en/api/documentation",
    },
    {
      id: "lovable-ai",
      name: "Lovable AI (Gemini)",
      category: "ai",
      status: has("LOVABLE_API_KEY") ? "live" : "missing",
      features: ["Daily narrative summary", "AI-curated trending", "Chat"],
      notes: "Summarises STRUCTURED data only. Never invents token metrics.",
    },
    {
      id: "solana-tracker",
      name: "Solana Tracker",
      category: "launchpad",
      status: has("SOLANA_TRACKER_API_KEY") ? "live" : "missing",
      features: ["Pump.fun + Raydium feeds", "Fresh launches"],
      docsUrl: "https://docs.solanatracker.io",
      notes: has("SOLANA_TRACKER_API_KEY")
        ? undefined
        : "Set SOLANA_TRACKER_API_KEY to enable the Pump.fun launches feed.",
    },
    {
      id: "birdeye",
      name: "Birdeye",
      category: "wallet",
      status: has("BIRDEYE_API_KEY") ? "live" : "missing",
      features: ["Wallet portfolio", "Token holders", "OHLCV (planned)"],
      docsUrl: "https://docs.birdeye.so",
      notes: has("BIRDEYE_API_KEY")
        ? undefined
        : "Set BIRDEYE_API_KEY to enable wallet portfolio + token charts.",
    },
    {
      id: "gmgn",
      name: "GMGN.cc",
      category: "dex",
      status: "live",
      features: ["Pump.fun-aware k-line chart", "Trade history"],
      docsUrl: "https://docs.gmgn.ai/index/cooperation-api-integrate-gmgn-price-chart",
      notes: "Embedded kline widget at gmgn.cc/kline/sol/{address}. No key required.",
    },
    {
      id: "dexscreener-pumpfun",
      name: "DexScreener · Pump.fun page",
      category: "launchpad",
      status: "live",
      features: ["Embedded New / Trending / Graduated pairs"],
      docsUrl: "https://dexscreener.com/solana/pumpfun",
      notes: "Embedded widget — no API key, no rate-limit on our side.",
    },
    {
      id: "x-api",
      name: "X (Twitter) API",
      category: "social",
      status: "missing",
      features: ["CT narrative scanning", "Mention velocity"],
      notes: "Not wired yet. Requires paid X API access.",
    },
  ];
}