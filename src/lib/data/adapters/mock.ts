import { solMarket } from "@/mocks/sol-market";
import { trendingTokens } from "@/mocks/trending-tokens";
import { memeOfTheDay } from "@/mocks/meme-of-the-day";
import { narrativeReport, marketPulse } from "@/mocks/narratives";
import { providers } from "@/mocks/providers";
import type { PumpLaunchesResult, WalletPnLResponse } from "@/types";
import { buildSyntheticChart } from "../providers/birdeye-ohlcv.server";

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
    address: string,
    timeframe: "1H" | "4H" | "1D" | "1W" = "1D",
  ) => buildSyntheticChart(address, 0.000024, 0, timeframe),
};

export type DataAdapter = typeof mockAdapter;
