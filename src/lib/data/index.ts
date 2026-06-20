import { useEffect, useState, useCallback } from "react";
import { liveAdapter } from "./adapters/live";

// Live data adapter: DexScreener, CoinGecko, Solana Tracker, Birdeye,
// Lovable AI Gateway (Gemini). `mockAdapter` from "./adapters/mock" is
// dev-only and not used in any production path.
const adapter = liveAdapter;

export type DataState<T> = {
  data: T | null;
  status: "idle" | "loading" | "ready" | "error";
  lastUpdated: string | null;
  error?: string;
  refresh: () => void;
};

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): DataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<DataState<T>["status"]>("loading");
  const [lastUpdated, setLast] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const run = useCallback(() => {
    setStatus("loading");
    fn()
      .then((d) => { setData(d); setLast(new Date().toISOString()); setStatus("ready"); })
      .catch((e) => { setError(String(e?.message ?? e)); setStatus("error"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { data, status, lastUpdated, error, refresh: run };
}

export const useSolMarket = () => useAsync(() => adapter.getSolMarket(), []);
export const useMacro = () => useAsync(() => adapter.getMacro(), []);
export const useTrending = () => useAsync(() => adapter.getTrending(), []);
export const useMemeOfTheDay = () => useAsync(() => adapter.getMemeOfTheDay(), []);
export const useNarratives = () => useAsync(() => adapter.getNarratives(), []);
export const useMarketPulse = () => useAsync(() => adapter.getMarketPulse(), []);
export const useWalletPnL = (address: string | null) =>
  useAsync(() => address ? adapter.getWalletPnL(address) : Promise.resolve(null as never), [address]);
export const useProviders = () => useAsync(() => adapter.getProviders(), []);
export const useTokenChart = (address: string, timeframe: "1H" | "4H" | "1D" | "1W" = "1D") =>
  useAsync(() => adapter.getTokenChart(address, timeframe), [address, timeframe]);
export const usePumpfunLaunches = () => useAsync(() => adapter.getPumpfunLaunches(), []);
