import { generateText } from "ai";
import { z } from "zod";

export type TokenAnalysis = {
  query: string;
  found: boolean;
  symbol?: string;
  name?: string;
  address?: string;
  onchain?: {
    priceUsd: number;
    marketCapUsd: number;
    liquidityUsd: number;
    volume24hUsd: number;
    h1Pct: number;
    h24Pct: number;
    ageHours: number;
    risk: string;
  };
  ai?: {
    verdict: string;
    sentiment: "bull" | "bear" | "mixed";
    sentimentScore: number;
    whyMoving: string[];
    risks: string[];
    socialPulse: Array<{ handle: string; text: string; url: string }>;
    news: Array<{ source: string; title: string; url: string }>;
  };
};

const AiSchema = z.object({
  verdict: z.string(),
  sentiment: z.enum(["bull", "bear", "mixed"]),
  sentimentScore: z.number().min(0).max(100),
  whyMoving: z.array(z.string()).max(5),
  risks: z.array(z.string()).max(5),
});

export async function analyzeToken(query: string): Promise<TokenAnalysis> {
  const { fetchSolanaTrending } = await import(
    "@/lib/data/providers/dexscreener.server"
  );
  const all = await fetchSolanaTrending(80).catch(() => []);
  const q = query.trim().replace(/^\$/, "").toLowerCase();
  const hit =
    all.find((t) => t.address.toLowerCase() === q) ||
    all.find((t) => t.symbol.toLowerCase() === q) ||
    all.find((t) => t.name.toLowerCase().includes(q));

  if (!hit) return { query, found: false };

  const { searchX } = await import("@/lib/data/providers/xfeed.server");
  const { fetchAggregatedNews } = await import(
    "@/lib/data/providers/newsfeed.server"
  );

  const [tweets, allNews] = await Promise.all([
    searchX(`$${hit.symbol}`, 8).catch(() => []),
    fetchAggregatedNews(40).catch(() => []),
  ]);

  const needle = hit.symbol.toLowerCase();
  const name = hit.name.toLowerCase();
  const news = allNews
    .filter(
      (n) =>
        n.title.toLowerCase().includes(needle) ||
        n.title.toLowerCase().includes(name) ||
        (n.summary ?? "").toLowerCase().includes(needle),
    )
    .slice(0, 4);

  const onchain = {
    priceUsd: hit.priceUsd,
    marketCapUsd: Math.round(hit.marketCapUsd),
    liquidityUsd: Math.round(hit.liquidityUsd),
    volume24hUsd: Math.round(hit.volume24hUsd),
    h1Pct: hit.changes.h1,
    h24Pct: hit.changes.h24,
    ageHours: hit.ageHours,
    risk: hit.risk,
  };

  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return {
      query,
      found: true,
      symbol: hit.symbol,
      name: hit.name,
      address: hit.address,
      onchain,
    };
  }

  const { createLovableAiGatewayProvider } = await import(
    "@/lib/data/providers/gateway.server"
  );
  const gateway = createLovableAiGatewayProvider(key);

  const tweetCtx = tweets.map((t) => ({
    handle: t.handle.replace(/^@/, ""),
    text: t.text.slice(0, 220),
    likes: t.likes ?? 0,
  }));

  const prompt = [
    `Analyze Solana token $${hit.symbol} (${hit.name}) for a trading desk.`,
    "Use ONLY the data provided. Reply with ONLY this JSON object:",
    '{"verdict":string,"sentiment":"bull"|"bear"|"mixed","sentimentScore":0-100,"whyMoving":string[],"risks":string[]}',
    "Keep verdict to ~15 words. whyMoving and risks: 2-4 bullets each, terse.",
    "",
    "ON-CHAIN:",
    JSON.stringify(onchain),
    "",
    "RECENT TWEETS:",
    JSON.stringify(tweetCtx),
    "",
    "RECENT NEWS:",
    JSON.stringify(news.map((n) => ({ source: n.source, title: n.title }))),
  ].join("\n");

  let aiBlock: TokenAnalysis["ai"] | undefined;
  try {
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });
    const parsed = parseJson(text);
    const v = AiSchema.safeParse(parsed);
    if (v.success) {
      aiBlock = {
        ...v.data,
        socialPulse: tweets.slice(0, 3).map((t) => ({
          handle: t.handle.replace(/^@/, ""),
          text: t.text.slice(0, 200),
          url: t.url,
        })),
        news: news.slice(0, 3).map((n) => ({
          source: n.source,
          title: n.title,
          url: n.url,
        })),
      };
    }
  } catch (e) {
    console.error("analyzeToken AI failed", e);
  }

  return {
    query,
    found: true,
    symbol: hit.symbol,
    name: hit.name,
    address: hit.address,
    onchain,
    ai: aiBlock,
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