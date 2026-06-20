/**
 * Birdeye historical price provider. Uses the free-tier-friendly
 * `/defi/history_price` endpoint which returns single-value points
 * (close price) at the requested interval. Good enough for a clean
 * trading sparkline; richer OHLCV requires a paid Birdeye plan.
 *
 * Docs: https://docs.birdeye.so/reference/get_defi-history-price
 */

export type ChartTimeframe = "1H" | "4H" | "1D" | "1W";

export interface ChartPoint {
  t: number;
  price: number;
}

export interface ChartSeries {
  source: "birdeye" | "synth";
  timeframe: ChartTimeframe;
  interval: string;
  points: ChartPoint[];
  /** Surfaced when the synthetic fallback fires. */
  message?: string;
}

/** Translate user-facing timeframe → (lookback seconds, Birdeye interval). */
function frameSpec(tf: ChartTimeframe): { lookbackSec: number; interval: string } {
  switch (tf) {
    case "1H":  return { lookbackSec: 60 * 60,           interval: "1m"  };
    case "4H":  return { lookbackSec: 4 * 60 * 60,       interval: "5m"  };
    case "1D":  return { lookbackSec: 24 * 60 * 60,      interval: "15m" };
    case "1W":  return { lookbackSec: 7 * 24 * 60 * 60,  interval: "1H"  };
  }
}

type BirdeyeHistoryResponse = {
  success?: boolean;
  data?: { items?: Array<{ unixTime: number; value: number }> };
  message?: string;
};

export async function fetchBirdeyeHistory(
  address: string,
  tf: ChartTimeframe,
): Promise<ChartSeries> {
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) throw new Error("BIRDEYE_API_KEY not configured");

  const { lookbackSec, interval } = frameSpec(tf);
  const timeTo = Math.floor(Date.now() / 1000);
  const timeFrom = timeTo - lookbackSec;

  const url =
    `https://public-api.birdeye.so/defi/history_price` +
    `?address=${encodeURIComponent(address)}` +
    `&address_type=token&type=${interval}` +
    `&time_from=${timeFrom}&time_to=${timeTo}`;

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "X-API-KEY": apiKey,
      "x-chain": "solana",
    },
  });
  if (!res.ok) throw new Error(`Birdeye history ${res.status}`);
  const json = (await res.json()) as BirdeyeHistoryResponse;
  if (!json.success || !json.data?.items?.length) {
    throw new Error(json.message ?? "Birdeye history empty");
  }

  const points: ChartPoint[] = json.data.items
    .filter((p) => Number.isFinite(p.value) && p.value > 0)
    .map((p) => ({ t: p.unixTime * 1000, price: p.value }));

  if (points.length < 2) throw new Error("Birdeye history too sparse");

  return { source: "birdeye", timeframe: tf, interval, points };
}

/**
 * Deterministic synthetic walk anchored to the given `nowPrice` and
 * `change24hPct`. Last-resort fallback only — surfaced as `source: "synth"`
 * so the UI can render a `SYNTH` badge.
 */
export function buildSyntheticChart(
  address: string,
  nowPrice: number,
  change24hPct: number,
  tf: ChartTimeframe,
): ChartSeries {
  const { lookbackSec, interval } = frameSpec(tf);
  const points = 96;
  const stepMs = (lookbackSec * 1000) / points;
  const now = Date.now();
  const change = (change24hPct ?? 0) / 100;
  const start = nowPrice / (1 + change || 1);
  const seed = address.length;
  const out: ChartPoint[] = [];
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const target = start * (1 + change * progress);
    const wobble = Math.sin(i / 5 + seed) * (Math.abs(change) || 0.02) * 0.08;
    out.push({ t: now - (points - i) * stepMs, price: target * (1 + wobble) });
  }
  out[out.length - 1].price = nowPrice;
  return {
    source: "synth",
    timeframe: tf,
    interval,
    points: out,
    message: "Live OHLCV unavailable — showing modelled walk.",
  };
}