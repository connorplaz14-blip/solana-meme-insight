import type { Token } from "@/types";

/**
 * Synthesise a plausible 24h price walk anchored to the token's current
 * priceUsd and change24h. DexScreener's free tier doesn't expose OHLCV
 * history, so we build a deterministic-ish series for the chart UI until
 * Phase 3 (Birdeye / Solana Tracker) ships real candles.
 */
export function buildSyntheticSeries(token: Token, points = 96): { t: number; price: number; volume: number }[] {
  const now = Date.now();
  const stepMs = (24 * 60 * 60 * 1000) / points;
  const change = token.changes.h24 / 100;
  const start = token.priceUsd / (1 + change || 1);
  const out: { t: number; price: number; volume: number }[] = [];
  let p = start;
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const target = start * (1 + change * progress);
    const wobble = Math.sin(i / 5 + token.address.length) * (Math.abs(change) || 0.02) * 0.08;
    p = target * (1 + wobble);
    out.push({
      t: now - (points - i) * stepMs,
      price: p,
      volume: (token.volume24hUsd / points) * (0.6 + Math.random() * 0.8),
    });
  }
  out[out.length - 1].price = token.priceUsd;
  return out;
}