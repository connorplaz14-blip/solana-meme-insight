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
  getTokenChart: (address: string, timeframe: "1H" | "4H" | "1D" | "1W" = "1D") =>
    getTokenChartFn({ data: { address, timeframe } }),
};

export type LiveAdapter = typeof liveAdapter;