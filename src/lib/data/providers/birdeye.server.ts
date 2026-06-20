import type { WalletPnL } from "@/types";

const PORTFOLIO_URL = "https://public-api.birdeye.so/v1/wallet/token_list";
const TOKEN_TXS_URL = "https://public-api.birdeye.so/defi/txs/token";

export interface WhaleTrade {
  signature: string;
  owner: string;
  side: "buy" | "sell";
  tokenAmount: number;
  valueUsd: number;
  blockUnixTime: number;
}

type BirdeyeTxItem = {
  tx_hash?: string;
  txHash?: string;
  signature?: string;
  owner?: string;
  side?: string;
  type?: string;
  ui_amount?: number;
  uiAmount?: number;
  base?: { ui_amount?: number; uiAmount?: number };
  volume_usd?: number;
  volumeUSD?: number;
  value_usd?: number;
  block_unix_time?: number;
  blockUnixTime?: number;
};

type BirdeyeTxResponse = {
  success?: boolean;
  data?: { items?: BirdeyeTxItem[]; tx?: BirdeyeTxItem[] };
  message?: string;
};

export async function fetchTokenTxs(address: string, limit = 50): Promise<WhaleTrade[]> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) throw new Error("BIRDEYE_API_KEY not configured");
  const url = `${TOKEN_TXS_URL}?address=${encodeURIComponent(address)}&offset=0&limit=${limit}&tx_type=swap&sort_type=desc`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-KEY": apiKey,
      "x-chain": "solana",
    },
  });
  if (!res.ok) throw new Error(`Birdeye txs ${res.status}`);
  const json = (await res.json()) as BirdeyeTxResponse;
  if (!json.success || !json.data) throw new Error(json.message ?? "Birdeye empty txs");
  const items = json.data.items ?? json.data.tx ?? [];
  return items.map((it): WhaleTrade => {
    const sideRaw = (it.side ?? it.type ?? "").toString().toLowerCase();
    const side: "buy" | "sell" = sideRaw.includes("buy") ? "buy" : "sell";
    const valueUsd = it.volume_usd ?? it.volumeUSD ?? it.value_usd ?? 0;
    const tokenAmount = it.ui_amount ?? it.uiAmount ?? it.base?.ui_amount ?? it.base?.uiAmount ?? 0;
    return {
      signature: it.tx_hash ?? it.txHash ?? it.signature ?? "",
      owner: it.owner ?? "",
      side,
      tokenAmount,
      valueUsd,
      blockUnixTime: it.block_unix_time ?? it.blockUnixTime ?? 0,
    };
  }).filter((t) => t.signature);
}

type BirdeyeItem = {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: number;
  uiAmount?: number;
  priceUsd?: number;
  valueUsd?: number;
  priceChange24h?: number;
  logoURI?: string;
};

type BirdeyeResponse = {
  success?: boolean;
  data?: {
    wallet?: string;
    totalUsd?: number;
    items?: BirdeyeItem[];
  };
  message?: string;
};

function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

/**
 * Live wallet snapshot from Birdeye. Birdeye's free Standard tier exposes
 * current holdings + 24h price change per token. We approximate P&L from
 * those: unrealised = sum(value * change24h / (100 + change24h)), realised
 * is unavailable without trade history (left as 0 with a note in UI).
 */
export async function fetchWalletPortfolio(address: string): Promise<WalletPnL> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) throw new Error("BIRDEYE_API_KEY not configured");

  const url = `${PORTFOLIO_URL}?wallet=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-KEY": apiKey,
      "x-chain": "solana",
    },
  });
  if (!res.ok) throw new Error(`Birdeye ${res.status}`);
  const json = (await res.json()) as BirdeyeResponse;
  if (!json.success || !json.data) throw new Error(json.message ?? "Birdeye empty response");

  const items = (json.data.items ?? []).filter((i) => (i.valueUsd ?? 0) > 1);
  const totalValue = items.reduce((s, i) => s + (i.valueUsd ?? 0), 0);

  const positions = items
    .map((i) => {
      const value = i.valueUsd ?? 0;
      const change = i.priceChange24h ?? 0;
      // cost ≈ value / (1 + change/100); pnl24h = value - cost.
      const cost = change > -99 ? value / (1 + change / 100) : value;
      const pnl = value - cost;
      return {
        symbol: i.symbol ?? shortAddr(i.address),
        name: i.name ?? i.symbol ?? shortAddr(i.address),
        address: i.address,
        costUsd: Math.round(cost * 100) / 100,
        valueUsd: Math.round(value * 100) / 100,
        pnlUsd: Math.round(pnl * 100) / 100,
        roiPct: Math.round(change * 10) / 10,
        status: "open" as const,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 25);

  const unrealised = positions.reduce((s, p) => s + p.pnlUsd, 0);
  const totalCost = positions.reduce((s, p) => s + p.costUsd, 0);
  const roiPct = totalCost > 0 ? (unrealised / totalCost) * 100 : 0;

  const best = positions.reduce((a, b) => (b.roiPct > (a?.roiPct ?? -Infinity) ? b : a), positions[0]);
  const worst = positions.reduce((a, b) => (b.roiPct < (a?.roiPct ?? Infinity) ? b : a), positions[0]);

  // Composite wallet score (0-100): diversification + 24h performance.
  const diversification = Math.min(30, positions.length * 3);
  const perf = Math.max(0, Math.min(40, 20 + roiPct / 2));
  const size = Math.min(30, Math.log10(Math.max(totalValue, 1)) * 6);
  const score = Math.round(diversification + perf + size);

  return {
    address,
    score: Math.max(0, Math.min(100, score)),
    realisedUsd: 0, // unavailable without trade history; surfaced via UI note
    unrealisedUsd: Math.round(unrealised * 100) / 100,
    roiPct: Math.round(roiPct * 10) / 10,
    winRatePct: positions.length
      ? Math.round((positions.filter((p) => p.roiPct > 0).length / positions.length) * 100)
      : 0,
    avgHoldHours: 0,
    bestTrade: best
      ? { symbol: best.symbol, pnlUsd: best.pnlUsd, roiPct: best.roiPct }
      : { symbol: "—", pnlUsd: 0, roiPct: 0 },
    worstTrade: worst
      ? { symbol: worst.symbol, pnlUsd: worst.pnlUsd, roiPct: worst.roiPct }
      : { symbol: "—", pnlUsd: 0, roiPct: 0 },
    positions,
  };
}