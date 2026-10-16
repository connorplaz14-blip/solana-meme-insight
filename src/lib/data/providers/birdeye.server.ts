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

type BirdeyeLeg = {
  address?: string;
  uiAmount?: number;
  ui_amount?: number;
  price?: number;
};
type BirdeyeTxItem = {
  tx_hash?: string;
  txHash?: string;
  signature?: string;
  owner?: string;
  side?: string;
  type?: string;
  txType?: string;
  quote?: BirdeyeLeg;
  base?: BirdeyeLeg;
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
  return items
    .map((it): WhaleTrade => {
      const sideRaw = (it.side ?? it.type ?? it.txType ?? "").toString().toLowerCase();
      const side: "buy" | "sell" = sideRaw.includes("buy") ? "buy" : "sell";
      // Solana public keys are case-sensitive.
      const want = address;
      const quoteAddr = it.quote?.address ?? "";
      const tokenLeg = quoteAddr === want ? it.quote : it.base;
      const otherLeg = quoteAddr === want ? it.base : it.quote;
      const tokenAmount = tokenLeg?.uiAmount ?? tokenLeg?.ui_amount ?? 0;
      // Prefer the non-token leg's USD value (SOL/USDC side is more reliable).
      const otherAmount = otherLeg?.uiAmount ?? otherLeg?.ui_amount ?? 0;
      const valueUsd = (otherLeg?.price ?? 0) * otherAmount || (tokenLeg?.price ?? 0) * tokenAmount;
      return {
        signature: it.tx_hash ?? it.txHash ?? it.signature ?? "",
        owner: it.owner ?? "",
        side,
        tokenAmount,
        valueUsd,
        blockUnixTime: it.block_unix_time ?? it.blockUnixTime ?? 0,
      };
    })
    .filter((t) => t.signature);
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

/** Current observed holdings only; historical investment cost and PnL are unknown. */
export async function fetchWalletPortfolio(address: string) {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) throw new Error("Birdeye not configured");
  const response = await fetch(`${PORTFOLIO_URL}?wallet=${encodeURIComponent(address)}`, {
    headers: { accept: "application/json", "X-API-KEY": apiKey, "x-chain": "solana" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Birdeye status ${response.status}`);
  const json = (await response.json()) as BirdeyeResponse;
  if (!json.success || !json.data) throw new Error("Birdeye response unavailable");
  const positions = (json.data.items ?? []).map((item) => ({
    address: item.address,
    symbol: item.symbol ?? null,
    quantity: item.uiAmount ?? item.balance ?? null,
    valueUsd: item.valueUsd ?? null,
    priceUsd: item.priceUsd ?? null,
  }));
  return {
    address,
    positions,
    source: "birdeye" as const,
    observedAt: null,
    fetchedAt: new Date().toISOString(),
  };
}
