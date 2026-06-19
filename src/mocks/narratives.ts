import type { NarrativeReport, MarketPulseSnapshot } from "@/types";

export const narrativeReport: NarrativeReport = {
  dateIso: new Date().toISOString(),
  summary:
    "Solana memecoins are rotating into animal-themed launches today, with dog-adjacent tokens leading 24h volume and a fresh wave of frog/cat micro-caps on Pump.fun. Buy pressure is concentrated in the top 5 by market cap, while sub-$50M names show elevated sell ratios. (Mock AI summary built from structured trending data.)",
  dominantTheme: "Dog-coin rotation",
  fastestGrowing: "Frog micro-caps",
  keywords: [
    { word: "dog", weight: 9 }, { word: "frog", weight: 7 }, { word: "cat", weight: 6 },
    { word: "pump", weight: 8 }, { word: "AI", weight: 4 }, { word: "political", weight: 3 },
    { word: "animal", weight: 7 }, { word: "Solana", weight: 10 },
  ],
  notableLaunches: [
    { name: "Fwog", symbol: "FWOG", address: "A8C3xuq...pump", note: "+32% 24h, low liq, extreme risk" },
    { name: "Pnut", symbol: "PNUT", address: "2qEHjDL...pump", note: "Holding mcap above $1B after 30 days" },
  ],
  warnings: [
    "9 tokens flagged extreme risk (liq < $1M and age < 72h).",
    "Sell pressure climbing on BOME — buy/sell ratio 0.71.",
  ],
  items: [
    { theme: "Dog rotation", growthPct: 14.2, description: "BONK, WIF leading, broad participation.", tokens: ["BONK", "WIF"], sources: ["dexscreener"] },
    { theme: "Frog micro-caps", growthPct: 28.6, description: "FWOG, PEPO surging on Pump.fun.", tokens: ["FWOG"], sources: ["pump.fun"] },
    { theme: "Cat revival", growthPct: 6.4, description: "POPCAT and MEW stabilising after pullback.", tokens: ["POPCAT", "MEW"], sources: ["dexscreener"] },
  ],
  sources: ["dexscreener", "pump.fun", "mock"],
};

export const marketPulse: MarketPulseSnapshot = {
  trendingCount: 42, newLaunchesScanned: 318, topNarrative: "Dog-coin rotation",
  highRiskFiltered: 26, condition: "Hot",
};
