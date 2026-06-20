import { generateText } from "ai";
import { z } from "zod";

export type SentimentScore = {
  address: string;
  symbol: string;
  score: number;
  label: "bullish" | "bearish" | "neutral";
  momentum: "up" | "flat" | "down";
  flags: string[];
  blurb: string;
};

const ItemSchema = z.object({
  symbol: z.string(),
  score: z.number().min(0).max(100),
  label: z.enum(["bullish", "bearish", "neutral"]),
  momentum: z.enum(["up", "flat", "down"]),
  flags: z.array(z.string()).max(4),
  blurb: z.string(),
});
const ListSchema = z.object({ items: z.array(ItemSchema) });

export async function scoreWatchlist(
  addresses: string[],
): Promise<SentimentScore[]> {
  if (addresses.length === 0) return [];
  const { fetchSolanaTrending } = await import(
    "@/lib/data/providers/dexscreener.server"
  );
  const all = await fetchSolanaTrending(80).catch(() => []);
  const hits = addresses
    .map((a) => all.find((t) => t.address === a))
    .filter((t): t is NonNullable<typeof t> => !!t);
  if (hits.length === 0) return [];

  const { searchX } = await import("@/lib/data/providers/xfeed.server");
  const tweetGroups = await Promise.all(
    hits.map((h) =>
      searchX(`$${h.symbol}`, 4)
        .catch(() => [])
        .then((tweets) => ({
          symbol: h.symbol,
          address: h.address,
          tweets: tweets.slice(0, 4).map((t) => t.text.slice(0, 180)),
        })),
    ),
  );

  const ctx = hits.map((h) => {
    const tg = tweetGroups.find((g) => g.address === h.address);
    return {
      symbol: h.symbol,
      name: h.name,
      h1Pct: h.changes.h1,
      h24Pct: h.changes.h24,
      vol24hUsd: Math.round(h.volume24hUsd),
      liquidityUsd: Math.round(h.liquidityUsd),
      risk: h.risk,
      tweets: tg?.tweets ?? [],
    };
  });

  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    // fallback: heuristic
    return hits.map((h) => heuristic(h.address, h));
  }

  const { createLovableAiGatewayProvider } = await import(
    "@/lib/data/providers/gateway.server"
  );
  const gateway = createLovableAiGatewayProvider(key);

  const prompt = [
    "Score each Solana token 0-100 on sentiment+momentum for a trading desk.",
    "Use both price action and tweet snippets. Reply ONLY with JSON:",
    '{"items":[{"symbol":string,"score":0-100,"label":"bullish"|"bearish"|"neutral","momentum":"up"|"flat"|"down","flags":string[],"blurb":string}]}',
    'Possible flags: "breaking-news","kol-mention","unusual-volume","low-liquidity","high-risk","viral".',
    "blurb: max 12 words. One item per input token, same symbol.",
    "",
    "TOKENS:",
    JSON.stringify(ctx),
  ].join("\n");

  try {
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });
    const parsed = parseJson(text);
    const v = ListSchema.safeParse(parsed);
    if (v.success) {
      return hits.map((h) => {
        const m = v.data.items.find(
          (x) => x.symbol.toUpperCase() === h.symbol.toUpperCase(),
        );
        if (!m) return heuristic(h.address, h);
        return {
          address: h.address,
          symbol: h.symbol,
          score: Math.round(m.score),
          label: m.label,
          momentum: m.momentum,
          flags: m.flags,
          blurb: m.blurb,
        };
      });
    }
  } catch (e) {
    console.error("scoreWatchlist failed", e);
  }
  return hits.map((h) => heuristic(h.address, h));
}

function heuristic(
  address: string,
  h: { symbol: string; changes: { h1: number; h24: number } },
): SentimentScore {
  const c = h.changes.h24;
  const score = Math.max(0, Math.min(100, 50 + c / 2));
  return {
    address,
    symbol: h.symbol,
    score: Math.round(score),
    label: c > 5 ? "bullish" : c < -5 ? "bearish" : "neutral",
    momentum: h.changes.h1 > 1 ? "up" : h.changes.h1 < -1 ? "down" : "flat",
    flags: [],
    blurb: `24h ${c >= 0 ? "+" : ""}${c.toFixed(1)}%`,
  };
}

function parseJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}