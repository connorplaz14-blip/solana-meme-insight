import type { SolMarket } from "@/types";

const URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true";

type Resp = { solana?: { usd?: number; usd_market_cap?: number; usd_24h_vol?: number; usd_24h_change?: number } };

export async function fetchSolMarket(): Promise<SolMarket> {
  const res = await fetch(URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = (await res.json()) as Resp;
  const s = json.solana ?? {};
  return {
    priceUsd: s.usd ?? 0,
    change24hPct: s.usd_24h_change ?? 0,
    volume24hUsd: s.usd_24h_vol ?? 0,
    marketCapUsd: s.usd_market_cap ?? 0,
    lastUpdated: new Date().toISOString(),
  };
}