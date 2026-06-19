import {
  getSolMarketFn,
  getTrendingFn,
  getMemeOfTheDayFn,
  getMarketPulseFn,
  getTokenChartFn,
  getNarrativesFn,
  getProvidersFn,
} from "../live.functions";
import { sampleWallet } from "@/mocks/wallet-pnl";

export const liveAdapter = {
  getSolMarket: () => getSolMarketFn(),
  getTrending: () => getTrendingFn(),
  getMemeOfTheDay: () => getMemeOfTheDayFn(),
  getNarratives: () => getNarrativesFn(),
  getMarketPulse: () => getMarketPulseFn(),
  // Wallet P&L stays mock until Phase 3 (Birdeye / Vybe / Solana Tracker).
  getWalletPnL: async (_address: string) => sampleWallet,
  getProviders: () => getProvidersFn(),
  getTokenChart: (address: string, points = 96) => getTokenChartFn({ data: { address, points } }),
};

export type LiveAdapter = typeof liveAdapter;