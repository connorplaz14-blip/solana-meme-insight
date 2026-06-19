import type { Token } from "@/types";
import { trendingTokens } from "./trending-tokens";

export const memeOfTheDay: Token = {
  ...trendingTokens[0],
  aiSummary:
    "BONK leads today on consistent buy pressure across Raydium and Orca, with the buy/sell ratio above 1.1 over the past 24h. Liquidity above $14M and an age of 700+ days keep risk in the low band relative to fresh launches. AI summary based on structured DEX data (mock).",
  scoreBreakdown: [
    { label: "Liquidity depth", value: 18, max: 20 },
    { label: "Volume / mcap", value: 15, max: 20 },
    { label: "Buy pressure", value: 17, max: 20 },
    { label: "Age & history", value: 19, max: 20 },
    { label: "Holder spread", value: 18, max: 20 },
  ],
};
