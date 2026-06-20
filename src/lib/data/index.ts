import { useEffect, useState, useCallback, useRef } from "react";
import { liveAdapter } from "./adapters/live";

// Phase 2: real DexScreener + CoinGecko + Lovable AI behind a server-fn boundary.
// Swap to `mockAdapter` from "./adapters/mock" if a provider goes down.
const adapter = liveAdapter;

export type DataState<T> = {
  data: T | null;
  status: "idle" | "loading" | "ready" | "error";
  lastUpdated: string | null;
  error?: string;
  refresh: () => void;
};

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], pollMs?: number): DataState<T> {
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
  const pollRef = useRef<pollHandle | null>(null);
  useEffect(() => {
    if (!pollMs) return;
    pollRef.current = setInterval(run, pollMs) as unknown as pollHandle;
    return () => { if (pollRef.current) clearInterval(pollRef.current as unknown as number); };
  }, [run, pollMs]);
  return { data, status, lastUpdated, error, refresh: run };
}

type pollHandle = ReturnType<typeof setInterval>;

export const useSolMarket = () => useAsync(() => adapter.getSolMarket(), []);
export const useMacro = () => useAsync(() => adapter.getMacro(), []);
export const useTrending = () => useAsync(() => adapter.getTrending(), []);
export const useMemeOfTheDay = () => useAsync(() => adapter.getMemeOfTheDay(), []);
export const useNarratives = () => useAsync(() => adapter.getNarratives(), []);
export const useMarketPulse = () => useAsync(() => adapter.getMarketPulse(), []);
export const useWalletPnL = (address: string | null) =>
  useAsync(() => address ? adapter.getWalletPnL(address) : Promise.resolve(null as never), [address]);
export const useProviders = () => useAsync(() => adapter.getProviders(), []);
export const useTokenChart = (address: string, points = 96) =>
  useAsync(() => adapter.getTokenChart(address, points), [address, points]);
export const usePumpfunLaunches = () => useAsync(() => adapter.getPumpfunLaunches(), []);
export const useTokenHolders = (address: string | null) =>
  useAsync(() => address ? adapter.getTokenHolders(address) : Promise.resolve([]), [address]);
export const useTokenWhaleTrades = (address: string | null, minUsd = 1000) =>
  useAsync(
    () => address ? adapter.getTokenWhaleTrades(address, minUsd) : Promise.resolve([]),
    [address, minUsd],
    15_000,
  );
export const useTokenRisk = (address: string | null) =>
  useAsync(() => address ? adapter.getTokenRisk(address) : Promise.resolve(null), [address]);
