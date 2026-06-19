import type { MacroSnapshot } from "@/types";

const CG_SIMPLE =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true";
const CG_GLOBAL = "https://api.coingecko.com/api/v3/global";
const FNG_URL = "https://api.alternative.me/fng/?limit=1";
const SOL_RPC = "https://api.mainnet-beta.solana.com";

type SimpleEntry = { usd?: number; usd_market_cap?: number; usd_24h_vol?: number; usd_24h_change?: number };
type SimpleResp = { bitcoin?: SimpleEntry; ethereum?: SimpleEntry; solana?: SimpleEntry };
type GlobalResp = {
  data?: {
    total_market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    market_cap_change_percentage_24h_usd?: number;
  };
};
type FngResp = { data?: { value?: string; value_classification?: string }[] };
type PerfSamplesResp = {
  result?: { numTransactions: number; samplePeriodSecs: number; slot: number }[];
};

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

async function fetchPrices(): Promise<SimpleResp> {
  const r = await fetch(CG_SIMPLE, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`coingecko/simple ${r.status}`);
  return (await r.json()) as SimpleResp;
}
async function fetchGlobal(): Promise<GlobalResp> {
  const r = await fetch(CG_GLOBAL, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`coingecko/global ${r.status}`);
  return (await r.json()) as GlobalResp;
}
async function fetchFng(): Promise<{ value: number; label: string } | null> {
  const r = await fetch(FNG_URL, { headers: { accept: "application/json" } });
  if (!r.ok) return null;
  const j = (await r.json()) as FngResp;
  const e = j.data?.[0];
  if (!e?.value) return null;
  return { value: Number(e.value), label: e.value_classification ?? "" };
}
async function fetchSolTps(): Promise<{ tps: number; slot: number } | null> {
  const r = await fetch(SOL_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getRecentPerformanceSamples",
      params: [3],
    }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as PerfSamplesResp;
  const samples = j.result ?? [];
  if (samples.length === 0) return null;
  const totalTxs = samples.reduce((s, x) => s + x.numTransactions, 0);
  const totalSecs = samples.reduce((s, x) => s + x.samplePeriodSecs, 0);
  const tps = totalSecs > 0 ? totalTxs / totalSecs : 0;
  return { tps: Math.round(tps), slot: samples[0].slot };
}

function entry(e: SimpleEntry | undefined) {
  return {
    priceUsd: e?.usd ?? 0,
    change24hPct: e?.usd_24h_change ?? 0,
    volume24hUsd: e?.usd_24h_vol ?? 0,
    marketCapUsd: e?.usd_market_cap ?? 0,
  };
}

export async function fetchMacro(): Promise<MacroSnapshot> {
  const [prices, global, fng, sol] = await Promise.all([
    fetchPrices(),
    safe(fetchGlobal(), {} as GlobalResp),
    safe(fetchFng(), null),
    safe(fetchSolTps(), null),
  ]);
  return {
    btc: entry(prices.bitcoin),
    eth: entry(prices.ethereum),
    sol: entry(prices.solana),
    totalMarketCapUsd: global.data?.total_market_cap?.usd ?? 0,
    totalVolume24hUsd: global.data?.total_volume?.usd ?? 0,
    totalMcapChange24hPct: global.data?.market_cap_change_percentage_24h_usd ?? 0,
    fearGreed: fng,
    solana: sol,
    lastUpdated: new Date().toISOString(),
  };
}