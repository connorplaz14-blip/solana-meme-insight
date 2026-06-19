import type { WalletPnL } from "@/types";
export const sampleWallet: WalletPnL = {
  address: "8xT9...A21q", score: 74,
  realisedUsd: 18420.55, unrealisedUsd: 6210.10, roiPct: 184.2,
  winRatePct: 62, avgHoldHours: 41,
  bestTrade: { symbol: "WIF", pnlUsd: 12420, roiPct: 412 },
  worstTrade: { symbol: "BOME", pnlUsd: -2810, roiPct: -64 },
  positions: [
    { symbol: "BONK", name: "Bonk", address: "DezX...263", costUsd: 1200, valueUsd: 2840, pnlUsd: 1640, roiPct: 136, status: "open" },
    { symbol: "WIF", name: "dogwifhat", address: "EKpQ...zcjm", costUsd: 3010, valueUsd: 15430, pnlUsd: 12420, roiPct: 412, status: "closed" },
    { symbol: "POPCAT", name: "Popcat", address: "7GCi...W2hr", costUsd: 2100, valueUsd: 1880, pnlUsd: -220, roiPct: -10, status: "open" },
    { symbol: "BOME", name: "Book of Meme", address: "ukHH...4J82", costUsd: 4400, valueUsd: 1590, pnlUsd: -2810, roiPct: -64, status: "closed" },
    { symbol: "PNUT", name: "Pnut", address: "2qEH...pump", costUsd: 800, valueUsd: 1410, pnlUsd: 610, roiPct: 76, status: "open" },
  ],
};
