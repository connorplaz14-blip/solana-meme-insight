import type { TokenSearchResult } from "@/types";

const SEARCH_URL = (q: string) =>
  `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;

type DsPair = {
  chainId: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  info?: { imageUrl?: string };
};

function n(v: unknown): number {
  const x = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : 0;
}

export async function searchSolanaTokens(query: string, limit = 8): Promise<TokenSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const r = await fetch(SEARCH_URL(q), { headers: { accept: "application/json" } });
  if (!r.ok) return [];
  const json = (await r.json()) as { pairs?: DsPair[] };
  const pairs = (json.pairs ?? []).filter((p) => p.chainId === "solana" && p.baseToken?.address);
  // Keep deepest-liquidity pair per token mint.
  const byMint = new Map<string, DsPair>();
  for (const p of pairs) {
    const existing = byMint.get(p.baseToken.address);
    if (!existing || n(p.liquidity?.usd) > n(existing.liquidity?.usd)) {
      byMint.set(p.baseToken.address, p);
    }
  }
  return [...byMint.values()]
    .sort((a, b) => n(b.liquidity?.usd) - n(a.liquidity?.usd))
    .slice(0, limit)
    .map((p) => ({
      address: p.baseToken.address,
      symbol: p.baseToken.symbol,
      name: p.baseToken.name,
      logoUrl: p.info?.imageUrl,
      priceUsd: n(p.priceUsd),
      liquidityUsd: n(p.liquidity?.usd),
      volume24hUsd: n(p.volume?.h24),
      change24hPct: n(p.priceChange?.h24),
    }));
}