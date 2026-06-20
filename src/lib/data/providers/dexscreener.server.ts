import type { Risk, Token } from "@/types";

const BOOSTS_URL = "https://api.dexscreener.com/token-boosts/top/v1";
const TOKENS_URL = (addrs: string[]) =>
  `https://api.dexscreener.com/tokens/v1/solana/${addrs.join(",")}`;
const WSOL = "So11111111111111111111111111111111111111112";
const STABLE_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
]);

type DsPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

function num(v: unknown, d = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : d;
}

function pickRisk(liq: number, ageHours: number, change24h: number): Risk {
  if (liq < 500_000 && ageHours < 72) return "extreme";
  if (liq < 1_500_000 || ageHours < 168 || Math.abs(change24h) > 100) return "high";
  if (liq < 5_000_000 || Math.abs(change24h) > 30) return "medium";
  return "low";
}

function toToken(p: DsPair, rank: number): Token {
  const liq = num(p.liquidity?.usd);
  const vol24 = num(p.volume?.h24);
  const change24 = num(p.priceChange?.h24);
  const ageHours = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 36e5 : 0;
  const mcap = num(p.marketCap) || num(p.fdv);
  return {
    rank,
    name: p.baseToken.name,
    symbol: p.baseToken.symbol,
    address: p.baseToken.address,
    logoUrl: p.info?.imageUrl,
    priceUsd: num(p.priceUsd),
    marketCapUsd: mcap,
    liquidityUsd: liq,
    volume24hUsd: vol24,
    changes: {
      m5: num(p.priceChange?.m5),
      h1: num(p.priceChange?.h1),
      h6: num(p.priceChange?.h6),
      h24: change24,
    },
    txns: { buys24h: num(p.txns?.h24?.buys), sells24h: num(p.txns?.h24?.sells) },
    ageHours: Math.round(ageHours * 10) / 10,
    risk: pickRisk(liq, ageHours, change24),
    sources: ["dexscreener"],
  };
}

// Composite score 0–100. Surfaces tokens with real depth + activity, penalises
// micro-liquidity outliers despite huge % swings.
function scoreToken(t: Token): { score: number; breakdown: { label: string; value: number; max: number }[] } {
  const volScore = Math.min(30, Math.log10(Math.max(t.volume24hUsd, 1)) * 4);
  const liqScore = Math.min(20, Math.log10(Math.max(t.liquidityUsd, 1)) * 3);
  const changeAbs = Math.min(300, Math.abs(t.changes.h24));
  const changeScore = (changeAbs / 300) * 20;
  const txns = t.txns.buys24h + t.txns.sells24h;
  const txnScore = Math.min(15, Math.log10(Math.max(txns, 1)) * 4);
  let ageScore = 10;
  if (t.ageHours < 24) ageScore = 14;
  else if (t.ageHours > 24 * 30) ageScore = 8;
  const score = Math.round(volScore + liqScore + changeScore + txnScore + ageScore);
  return {
    score: Math.min(100, score),
    breakdown: [
      { label: "Volume 24h", value: Math.round(volScore), max: 30 },
      { label: "Liquidity depth", value: Math.round(liqScore), max: 20 },
      { label: "Price action", value: Math.round(changeScore), max: 20 },
      { label: "Txn activity", value: Math.round(txnScore), max: 15 },
      { label: "Age & history", value: Math.round(ageScore), max: 15 },
    ],
  };
}

type Boost = { chainId: string; tokenAddress: string };

async function fetchBoostedSolanaAddresses(): Promise<string[]> {
  const res = await fetch(BOOSTS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DexScreener boosts ${res.status}`);
  const json = (await res.json()) as Boost[];
  return json
    .filter((b) => b.chainId === "solana" && b.tokenAddress && b.tokenAddress !== WSOL && !STABLE_MINTS.has(b.tokenAddress))
    .map((b) => b.tokenAddress);
}

async function fetchPairsForTokens(addresses: string[]): Promise<DsPair[]> {
  if (addresses.length === 0) return [];
  // tokens/v1 accepts up to 30 addresses per call.
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) chunks.push(addresses.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(TOKENS_URL(chunk), { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`DexScreener tokens ${res.status}`);
      return (await res.json()) as DsPair[];
    }),
  );
  return results.flat();
}

export async function fetchSolanaTrending(limit = 30): Promise<Token[]> {
  const boosted = await fetchBoostedSolanaAddresses();
  const pairs = await fetchPairsForTokens(boosted.slice(0, 60));

  // De-duplicate by base token mint, keep deepest-liquidity pair, drop pairs where
  // base is SOL/stable (shouldn't happen for boosted memecoins but guard anyway).
  const byToken = new Map<string, DsPair>();
  for (const p of pairs) {
    if (!p.baseToken?.address || p.baseToken.address === WSOL || STABLE_MINTS.has(p.baseToken.address)) continue;
    if (num(p.liquidity?.usd) < 25_000) continue;
    const existing = byToken.get(p.baseToken.address);
    if (!existing || num(p.liquidity?.usd) > num(existing.liquidity?.usd)) {
      byToken.set(p.baseToken.address, p);
    }
  }

  const unique = [...byToken.values()]
    .sort((a, b) => num(b.volume?.h24) - num(a.volume?.h24))
    .slice(0, limit);

  return unique.map((p, i) => {
    const t = toToken(p, i + 1);
    const s = scoreToken(t);
    return { ...t, score: s.score, scoreBreakdown: s.breakdown };
  });
}

// Fetch live token data for an arbitrary list of mint addresses (watchlist, etc.).
// De-dupes by mint, keeps deepest-liquidity pair per token. No liquidity floor —
// users may track illiquid bags.
export async function fetchTokensByAddresses(addresses: string[]): Promise<Token[]> {
  const cleaned = Array.from(new Set(addresses.filter(Boolean)));
  if (cleaned.length === 0) return [];
  const pairs = await fetchPairsForTokens(cleaned);
  const byToken = new Map<string, DsPair>();
  for (const p of pairs) {
    if (!p.baseToken?.address) continue;
    const existing = byToken.get(p.baseToken.address);
    if (!existing || num(p.liquidity?.usd) > num(existing.liquidity?.usd)) {
      byToken.set(p.baseToken.address, p);
    }
  }
  const out: Token[] = [];
  let rank = 1;
  for (const addr of cleaned) {
    const p = byToken.get(addr);
    if (!p) continue;
    const t = toToken(p, rank++);
    const s = scoreToken(t);
    out.push({ ...t, score: s.score, scoreBreakdown: s.breakdown });
  }
  return out;
}