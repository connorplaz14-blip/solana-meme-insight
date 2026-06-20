import {
  getSolMarketFn,
  getMacroFn,
  searchTokensFn,
  getTrendingFn,
  getMemeOfTheDayFn,
  getMarketPulseFn,
  getTokenChartFn,
  getNarrativesFn,
  getProvidersFn,
  getPumpfunLaunchesFn,
  getWalletPnLFn,
  getTokenHoldersFn,
  getTokenWhaleTradesFn,
} from "../live.functions";

export const liveAdapter = {
  getSolMarket: () => getSolMarketFn(),
  getMacro: () => getMacroFn(),
  searchTokens: (q: string) => searchTokensFn({ data: { q } }),
  getTrending: () => getTrendingFn(),
  getMemeOfTheDay: () => getMemeOfTheDayFn(),
  getNarratives: () => getNarrativesFn(),
  getMarketPulse: () => getMarketPulseFn(),
  getWalletPnL: (address: string) => getWalletPnLFn({ data: { address } }),
  getPumpfunLaunches: () => getPumpfunLaunchesFn(),
  getProviders: () => getProvidersFn(),
  getTokenChart: (address: string, points = 96) => getTokenChartFn({ data: { address, points } }),
  getTokenHolders: (address: string) => getTokenHoldersFn({ data: { address } }),
  getTokenWhaleTrades: (address: string, minUsd = 1000) =>
    getTokenWhaleTradesFn({ data: { address, minUsd } }),
};

export type LiveAdapter = typeof liveAdapter;