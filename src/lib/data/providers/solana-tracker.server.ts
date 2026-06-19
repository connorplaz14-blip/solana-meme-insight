import type { Risk } from "@/types";

export interface PumpLaunch {
  name: string;
  symbol: string;
  address: string;
  ageHours: number;
  liquidityUsd: number;
  marketCapUsd: number;
  priceUsd: number;
  change24hPct: number;
  buys24h: number;
  sells24h: number;
  logoUrl?: string;
  risk: Risk;
  source: "solana-tracker";
}

const ENDPOINT = "https://data.solanatracker.io/tokens/latest";

type STToken = {
  token?: { name?: string; symbol?: string; mint?: string; image?: string; createdOn?: string };
  pools?: Array<{
    liquidity?: { usd?: number };
    marketCap?: { usd?: number };
    price?: { usd?: number };
    txns?: { buys?: number; sells?: number };
    createdAt?: number;
  }>;
  events?: { "24h"?: { priceChangePercentage?: number } };
  risk?: { score?: number };
};

function classifyRisk(liq: number, ageHours: number, change: number): Risk {
  if (liq < 5_000 || ageHours < 1) return "extreme";
  if (liq < 25_000 || Math.abs(change) > 200) return "high";
  if (liq < 100_000 || Math.abs(change) > 60) return "medium";
  return "low";
}

export async function fetchPumpfunLaunches(limit = 25): Promise<PumpLaunch[]> {
  const apiKey = process.env.SOLANA_TRACKER_API_KEY;
  if (!apiKey) throw new Error("SOLANA_TRACKER_API_KEY not configured");

  const res = await fetch(`${ENDPOINT}?page=1`, {
    headers: { accept: "application/json", "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`Solana Tracker ${res.status}`);
  const json = (await res.json()) as STToken[];

  const out: PumpLaunch[] = [];
  for (const row of json) {
    const tok = row.token ?? {};
    const pool = row.pools?.[0];
    if (!tok.mint || !tok.symbol) continue;
    const liq = pool?.liquidity?.usd ?? 0;
    const mcap = pool?.marketCap?.usd ?? 0;
    const price = pool?.price?.usd ?? 0;
    const change = row.events?.["24h"]?.priceChangePercentage ?? 0;
    const created = pool?.createdAt ?? (tok.createdOn ? new Date(tok.createdOn).getTime() : Date.now());
    const ageHours = Math.max(0, (Date.now() - created) / 36e5);
    out.push({
      name: tok.name ?? tok.symbol,
      symbol: tok.symbol,
      address: tok.mint,
      ageHours: Math.round(ageHours * 10) / 10,
      liquidityUsd: liq,
      marketCapUsd: mcap,
      priceUsd: price,
      change24hPct: change,
      buys24h: pool?.txns?.buys ?? 0,
      sells24h: pool?.txns?.sells ?? 0,
      logoUrl: tok.image,
      risk: classifyRisk(liq, ageHours, change),
      source: "solana-tracker",
    });
  }

  // Surface highest-liquidity, freshest mints first.
  return out
    .filter((l) => l.ageHours < 48 && l.liquidityUsd > 1_000)
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, limit);
}