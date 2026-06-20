import { solMarket } from "@/mocks/sol-market";
import { trendingTokens } from "@/mocks/trending-tokens";
import { memeOfTheDay } from "@/mocks/meme-of-the-day";
import { narrativeReport, marketPulse } from "@/mocks/narratives";
import { providers } from "@/mocks/providers";
import type { PumpLaunchesResult, WalletPnLResponse } from "@/types";

export const mockAdapter = {
  getSolMarket: async () => ({ ...solMarket, lastUpdated: new Date().toISOString() }),
  getTrending: async () => trendingTokens,
  getMemeOfTheDay: async () => memeOfTheDay,
  getNarratives: async () => narrativeReport,
  getMarketPulse: async () => marketPulse,
  getWalletPnL: async (address: string): Promise<WalletPnLResponse> => ({
    kind: "notice",
    address,
    notice: { kind: "missing-key", provider: "birdeye", message: "Mock adapter — no live data." },
  }),
  getPumpfunLaunches: async (): Promise<PumpLaunchesResult> => ({
    status: "missing-key",
    launches: [],
    provider: "solana-tracker",
    message: "Mock adapter — no live data.",
  }),
  getProviders: async () => providers,
  getTokenChart: async (
    _address: string,
    timeframe: "1H" | "4H" | "1D" | "1W" = "1D",
  ) => ({
    source: "synth" as const,
    timeframe,
    interval: "1H",
    points: Array.from({ length: 96 }, (_, i) => ({
      t: Date.now() - (96 - i) * 15 * 60 * 1000,
      price: 0.000024 * (1 + Math.sin(i / 6) * 0.05),
    })),
    message: "Mock adapter — no live data.",
  }),
};

export type DataAdapter = typeof mockAdapter;
