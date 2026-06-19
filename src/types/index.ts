export type Risk = "low" | "medium" | "high" | "extreme";
export type Source = "dexscreener" | "coingecko" | "bitquery" | "solana-tracker" | "birdeye" | "vybe" | "pump.fun" | "mock";
export type ProviderStatus = "live" | "mock" | "missing" | "error";

export interface SolMarket {
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  marketCapUsd: number;
  lastUpdated: string;
}

export interface TokenChanges { m5: number; h1: number; h6: number; h24: number; }
export interface TokenTxns { buys24h: number; sells24h: number; }

export interface Token {
  rank?: number;
  name: string;
  symbol: string;
  address: string;
  logoUrl?: string;
  priceUsd: number;
  marketCapUsd: number;
  liquidityUsd: number;
  volume24hUsd: number;
  changes: TokenChanges;
  txns: TokenTxns;
  ageHours: number;
  risk: Risk;
  sources: Source[];
  score?: number;
  scoreBreakdown?: { label: string; value: number; max: number }[];
  aiSummary?: string;
}

export interface NarrativeItem {
  theme: string;
  growthPct: number;
  description: string;
  tokens: string[];
  sources: Source[];
}
export interface NarrativeReport {
  dateIso: string;
  summary: string;
  dominantTheme: string;
  fastestGrowing: string;
  keywords: { word: string; weight: number }[];
  notableLaunches: { name: string; symbol: string; address: string; note: string }[];
  warnings: string[];
  items: NarrativeItem[];
  sources: Source[];
}

export interface MarketPulseSnapshot {
  trendingCount: number;
  newLaunchesScanned: number;
  topNarrative: string;
  highRiskFiltered: number;
  condition: "Hot" | "Neutral" | "Dead" | "Risky";
}

export interface WatchlistEntry { address: string; name: string; symbol: string; addedAt: string; }

export interface WalletPnL {
  address: string;
  score: number;
  realisedUsd: number;
  unrealisedUsd: number;
  roiPct: number;
  winRatePct: number;
  avgHoldHours: number;
  bestTrade: { symbol: string; pnlUsd: number; roiPct: number };
  worstTrade: { symbol: string; pnlUsd: number; roiPct: number };
  positions: { symbol: string; name: string; address: string; costUsd: number; valueUsd: number; pnlUsd: number; roiPct: number; status: "open" | "closed" }[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  category: "dex" | "market" | "launchpad" | "wallet" | "ai" | "social" | "scraping";
  status: ProviderStatus;
  features: string[];
  lastSuccessIso?: string;
  lastError?: string;
  docsUrl?: string;
  notes?: string;
}
