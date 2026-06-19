import {
  getSolMarketFn,
  getTrendingFn,
  getMemeOfTheDayFn,
  getMarketPulseFn,
  getTokenChartFn,
  getNarrativesFn,
  getProvidersFn,
  getPumpfunLaunchesFn,
  getWalletPnLFn,
} from "../live.functions";

export const liveAdapter = {
  getSolMarket: () => getSolMarketFn(),
  getTrending: () => getTrendingFn(),
  getMemeOfTheDay: () => getMemeOfTheDayFn(),
  getNarratives: () => getNarrativesFn(),
  getMarketPulse: () => getMarketPulseFn(),
  getWalletPnL: (address: string) => getWalletPnLFn({ data: { address } }),
  getPumpfunLaunches: () => getPumpfunLaunchesFn(),
  getProviders: () => getProvidersFn(),
  getTokenChart: (address: string, points = 96) => getTokenChartFn({ data: { address, points } }),
};

export type LiveAdapter = typeof liveAdapter;