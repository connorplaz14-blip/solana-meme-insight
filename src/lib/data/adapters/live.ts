import {
  getSolMarketFn,
  getMacroFn,
  searchTokensFn,
  getTrendingFn,
  getTokensByAddressesFn,
  getMemeOfTheDayFn,
  getMarketPulseFn,
  getTokenChartFn,
  getNarrativesFn,
  getProvidersFn,
  getPumpfunLaunchesFn,
  getWalletPnLFn,
  getTokenHoldersFn,
  getTokenWhaleTradesFn,
  getTokenRiskFn,
  getNewsFeedFn,
  getSocialFeedFn,
} from "../live.functions";

export const liveAdapter = {
  getSolMarket: () => getSolMarketFn(),
  getMacro: () => getMacroFn(),
  searchTokens: (q: string) => searchTokensFn({ data: { q } }),
  getTrending: () => getTrendingFn(),
  getTokensByAddresses: (addresses: string[]) => getTokensByAddressesFn({ data: { addresses } }),
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
  getTokenRisk: (address: string) => getTokenRiskFn({ data: { address } }),
  getNewsFeed: () => getNewsFeedFn(),
  getSocialFeed: (q: string) => getSocialFeedFn({ data: { q } }),
};

export type LiveAdapter = typeof liveAdapter;