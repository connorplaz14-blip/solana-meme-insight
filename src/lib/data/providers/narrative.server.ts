import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./gateway.server";
import type { NarrativeReport, Token } from "@/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const NarrativeSchema = z.object({
  summary: z.string().describe("2–4 sentence overview of today's Solana memecoin market based ONLY on the provided tokens."),
  dominant_theme: z.string().describe("Short label, e.g. 'Dog-coin rotation', 'AI memes', 'Frog micro-caps'."),
  fastest_growing: z.string().describe("Short label for the fastest-growing sub-narrative."),
  keywords: z.array(z.object({ word: z.string(), weight: z.number().min(1).max(10) })).min(4).max(8),
  items: z.array(z.object({
    theme: z.string(),
    growthPct: z.number(),
    description: z.string(),
    tokens: z.array(z.string()),
  })).min(2).max(5),
  warnings: z.array(z.string()).min(1).max(4),
});

function reducePayload(tokens: Token[]) {
  return tokens.slice(0, 25).map((t) => ({
    symbol: t.symbol,
    name: t.name,
    mcapUsd: Math.round(t.marketCapUsd),
    liqUsd: Math.round(t.liquidityUsd),
    vol24hUsd: Math.round(t.volume24hUsd),
    change24hPct: Math.round(t.changes.h24 * 10) / 10,
    ageHours: t.ageHours,
    risk: t.risk,
  }));
}

async function hashPayload(input: unknown): Promise<string> {
  const text = JSON.stringify(input);
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrGenerateNarrative(tokens: Token[]): Promise<NarrativeReport> {
  const date = todayUtcIso();
  const reduced = reducePayload(tokens);
  const hash = await hashPayload(reduced);

  const { data: existing } = await supabaseAdmin
    .from("narratives")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (existing && existing.payload_hash === hash) {
    return rowToReport(existing, tokens);
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const gateway = createLovableAiGatewayProvider(apiKey);
  const { object: out } = await generateObject({
    model: gateway("google/gemini-3-flash-preview"),
    schema: NarrativeSchema,
    system:
      "You are a Solana memecoin market analyst. You may ONLY summarise the structured token list you receive. " +
      "Do not invent token names, prices, market caps, or percentages. Do not reference tokens outside the list. " +
      "Keep prose tight and professional, like a trading desk note.",
    prompt:
      `Today's top Solana memecoin pairs (from DexScreener):\n\n${JSON.stringify(reduced, null, 2)}\n\n` +
      `Identify dominant narrative themes, fastest-growing sub-themes, key risk warnings, and concise keyword tags.`,
  });

  const notable = tokens
    .filter((t) => t.ageHours < 72 || t.risk === "extreme")
    .slice(0, 3)
    .map((t) => ({ name: t.name, symbol: t.symbol, address: t.address, note: `${t.changes.h24.toFixed(1)}% 24h · liq ${Math.round(t.liquidityUsd / 1000)}k` }));

  await supabaseAdmin.from("narratives").upsert({
    date,
    summary: out.summary,
    dominant_theme: out.dominant_theme,
    fastest_growing: out.fastest_growing,
    keywords: out.keywords,
    items: out.items.map((i) => ({ ...i, sources: ["dexscreener"] })),
    warnings: out.warnings,
    notable_launches: notable,
    payload_hash: hash,
    generated_at: new Date().toISOString(),
  });

  return {
    dateIso: new Date().toISOString(),
    summary: out.summary,
    dominantTheme: out.dominant_theme,
    fastestGrowing: out.fastest_growing,
    keywords: out.keywords,
    notableLaunches: notable,
    warnings: out.warnings,
    items: out.items.map((i) => ({ ...i, sources: ["dexscreener"] })),
    sources: ["dexscreener", "coingecko"],
  };
}

function rowToReport(row: Record<string, unknown>, _tokens: Token[]): NarrativeReport {
  return {
    dateIso: (row.generated_at as string) ?? new Date().toISOString(),
    summary: row.summary as string,
    dominantTheme: row.dominant_theme as string,
    fastestGrowing: (row.fastest_growing as string) ?? "",
    keywords: (row.keywords as { word: string; weight: number }[]) ?? [],
    notableLaunches: (row.notable_launches as { name: string; symbol: string; address: string; note: string }[]) ?? [],
    warnings: (row.warnings as string[]) ?? [],
    items: (row.items as NarrativeReport["items"]) ?? [],
    sources: ["dexscreener", "coingecko"],
  };
}