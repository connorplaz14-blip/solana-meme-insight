import { solMarket } from "@/mocks/sol-market";
import { trendingTokens } from "@/mocks/trending-tokens";
import { memeOfTheDay } from "@/mocks/meme-of-the-day";
import { narrativeReport, marketPulse } from "@/mocks/narratives";
import { providers } from "@/mocks/providers";
import { generateCandleSeries } from "@/mocks/chart";
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
  getTokenChart: async (_address: string, points = 96) => generateCandleSeries(points),
};

export type DataAdapter = typeof mockAdapter;
