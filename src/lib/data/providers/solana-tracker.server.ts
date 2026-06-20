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
const HOLDERS_ENDPOINT = (mint: string) =>
  `https://data.solanatracker.io/tokens/${mint}/holders/top`;
const TOKEN_ENDPOINT = (mint: string) =>
  `https://data.solanatracker.io/tokens/${mint}`;

export interface TopHolder {
  rank: number;
  address: string;
  amount: number;
  percentage: number;
  valueUsd: number;
  insider?: boolean;
}

type STHolder = {
  address?: string;
  wallet?: string;
  amount?: number;
  percentage?: number;
  percent?: number;
  value?: { usd?: number } | number;
  insider?: boolean;
};

export async function fetchTopHolders(mint: string, limit = 20): Promise<TopHolder[]> {
  const apiKey = process.env.SOLANA_TRACKER_API_KEY;
  if (!apiKey) throw new Error("SOLANA_TRACKER_API_KEY not configured");
  const res = await fetch(HOLDERS_ENDPOINT(mint), {
    headers: { accept: "application/json", "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`Solana Tracker holders ${res.status}`);
  const json = (await res.json()) as STHolder[] | { holders?: STHolder[] };
  const rows: STHolder[] = Array.isArray(json) ? json : (json.holders ?? []);
  return rows.slice(0, limit).map((h, i) => {
    const addr = h.address ?? h.wallet ?? "";
    const value =
      typeof h.value === "number" ? h.value : (h.value?.usd ?? 0);
    const pct = h.percentage ?? h.percent ?? 0;
    return {
      rank: i + 1,
      address: addr,
      amount: h.amount ?? 0,
      percentage: pct,
      valueUsd: value,
      insider: h.insider ?? false,
    };
  }).filter((h) => h.address);
}

export interface TokenRiskFactor {
  name: string;
  description: string;
  level: "warn" | "danger" | "info";
  score: number;
}

export interface TokenRisk {
  score: number; // 0-10
  rugged: boolean;
  jupiterVerified: boolean;
  top10Pct: number;
  devPct: number;
  sniperCount: number;
  insiderCount: number;
  factors: TokenRiskFactor[];
  creator?: string;
}

type STRiskFactor = { name?: string; description?: string; level?: string; score?: number };
type STTokenDetail = {
  token?: { creation?: { creator?: string } | string };
  risk?: {
    score?: number;
    rugged?: boolean;
    jupiterVerified?: boolean;
    top10?: number;
    dev?: { percentage?: number };
    snipers?: { count?: number };
    insiders?: { count?: number };
    risks?: STRiskFactor[];
  };
};

export async function fetchTokenRisk(mint: string): Promise<TokenRisk | null> {
  const apiKey = process.env.SOLANA_TRACKER_API_KEY;
  if (!apiKey) throw new Error("SOLANA_TRACKER_API_KEY not configured");
  const res = await fetch(TOKEN_ENDPOINT(mint), {
    headers: { accept: "application/json", "x-api-key": apiKey },
  });
  if (!res.ok) throw new Error(`Solana Tracker token ${res.status}`);
  const json = (await res.json()) as STTokenDetail;
  if (!json.risk) return null;
  const r = json.risk;
  const creation = json.token?.creation;
  const creator = typeof creation === "string" ? creation : creation?.creator;
  const normLevel = (l?: string): TokenRiskFactor["level"] => {
    const v = (l ?? "").toLowerCase();
    if (v === "danger" || v === "high") return "danger";
    if (v === "warn" || v === "warning" || v === "medium") return "warn";
    return "info";
  };
  return {
    score: r.score ?? 0,
    rugged: !!r.rugged,
    jupiterVerified: !!r.jupiterVerified,
    top10Pct: r.top10 ?? 0,
    devPct: r.dev?.percentage ?? 0,
    sniperCount: r.snipers?.count ?? 0,
    insiderCount: r.insiders?.count ?? 0,
    factors: (r.risks ?? []).map((f) => ({
      name: f.name ?? "Unknown risk",
      description: f.description ?? "",
      level: normLevel(f.level),
      score: f.score ?? 0,
    })),
    creator,
  };
}

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