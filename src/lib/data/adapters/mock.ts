import { solMarket } from "@/mocks/sol-market";
import { trendingTokens } from "@/mocks/trending-tokens";
import { memeOfTheDay } from "@/mocks/meme-of-the-day";
import { narrativeReport, marketPulse } from "@/mocks/narratives";
import { sampleWallet } from "@/mocks/wallet-pnl";
import { providers } from "@/mocks/providers";
import { generateCandleSeries } from "@/mocks/chart";

export const mockAdapter = {
  getSolMarket: async () => ({ ...solMarket, lastUpdated: new Date().toISOString() }),
  getTrending: async () => trendingTokens,
  getMemeOfTheDay: async () => memeOfTheDay,
  getNarratives: async () => narrativeReport,
  getMarketPulse: async () => marketPulse,
  getWalletPnL: async (_address: string) => sampleWallet,
  getProviders: async () => providers,
  getTokenChart: async (_address: string, points = 96) => generateCandleSeries(points),
};

export type DataAdapter = typeof mockAdapter;
