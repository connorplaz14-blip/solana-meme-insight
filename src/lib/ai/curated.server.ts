import { generateText } from "ai";
import { z } from "zod";

export type CuratedPick = {
  symbol: string;
  name: string;
  address: string;
  bucket: string; // narrative bucket label e.g. "Dog", "Trump", "AI agents"
  why: string; // one-liner explanation
};

export type CuratedTrending = {
  generatedAtIso: string;
  dominantTheme: string;
  picks: CuratedPick[];
};

const Schema = z.object({
  dominant_theme: z.string(),
  picks: z
    .array(
      z.object({
        symbol: z.string(),
        bucket: z.string(),
        why: z.string(),
      }),
    )
    .min(4)
    .max(15),
});

function parseJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("Model returned no JSON object");
  return JSON.parse(cleaned.slice(first, last + 1));
}

let cache: { at: number; data: CuratedTrending } | null = null;
const TTL_MS = 30 * 60 * 1000;

export async function getCuratedTrending(
  force = false,
): Promise<CuratedTrending> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const { buildMarketSnapshot } = await import("./snapshot.server");
  const snap = await buildMarketSnapshot();

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    // fallback: pick by 24h vol, single bucket
    const fallback: CuratedTrending = {
      generatedAtIso: new Date().toISOString(),
      dominantTheme: snap.narrative?.dominantTheme ?? "Mixed",
      picks: snap.trending.slice(0, 8).map((t) => ({
        symbol: t.sym,
        name: t.name,
        address: t.addr,
        bucket: "Trending",
        why: `+${t.h24Pct.toFixed(1)}% 24h · $${Math.round(t.vol24hUsd / 1_000_000)}M vol`,
      })),
    };
    cache = { at: Date.now(), data: fallback };
    return fallback;
  }

  const { createLovableAiGatewayProvider } = await import(
    "@/lib/data/providers/gateway.server"
  );
  const gateway = createLovableAiGatewayProvider(apiKey);

  const trendingForPrompt = snap.trending.map((t) => ({
    symbol: t.sym,
    name: t.name,
    mcapUsd: t.mcapUsd,
    vol24hUsd: t.vol24hUsd,
    h24Pct: t.h24Pct,
    h1Pct: t.h1Pct,
    risk: t.risk,
  }));

  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system:
      "You are a Solana memecoin analyst. Bucket the supplied tokens into 3-6 narrative buckets (e.g. Dog, Cat, Frog, Trump/political, AI agents, Tech, Animal, Food). " +
      "Pick 6-12 of the most narrative-defining tokens — strongest representative per bucket first, then runners-up. " +
      "ONLY pick tokens from the list. Use the EXACT symbol given. Respond with ONLY valid JSON, no markdown.",
    prompt:
      `Schema:\n{ "dominant_theme": string, "picks": [{ "symbol": string, "bucket": string, "why": string (max 90 chars) }] }\n\n` +
      `Tokens:\n${JSON.stringify(trendingForPrompt)}\n\n` +
      `Notable narrative context: ${snap.narrative?.dominantTheme ?? "unknown"} / fastest growing: ${snap.narrative?.fastestGrowing ?? "unknown"}\n\n` +
      `Return only the JSON object.`,
  });

  const parsed = Schema.parse(parseJsonObject(text));
  const bySym = new Map(snap.trending.map((t) => [t.sym.toUpperCase(), t]));

  const picks: CuratedPick[] = [];
  for (const p of parsed.picks) {
    const tok = bySym.get(p.symbol.toUpperCase());
    if (!tok) continue;
    picks.push({
      symbol: tok.sym,
      name: tok.name,
      address: tok.addr,
      bucket: p.bucket,
      why: p.why,
    });
  }

  const data: CuratedTrending = {
    generatedAtIso: new Date().toISOString(),
    dominantTheme: parsed.dominant_theme,
    picks,
  };
  cache = { at: Date.now(), data };
  return data;
}