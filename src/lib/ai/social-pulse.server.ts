import { generateText } from "ai";
import { z } from "zod";

export type SocialPulse = {
  generatedAtIso: string;
  topThemes: Array<{
    title: string;
    oneLiner: string;
    tickers: string[];
    tweetCount: number;
  }>;
  surprisingTake: { handle: string; text: string; url: string } | null;
  risingHandles: Array<{ handle: string; engagement: number; takeaway: string }>;
};

const PulseSchema = z.object({
  topThemes: z
    .array(
      z.object({
        title: z.string(),
        oneLiner: z.string(),
        tickers: z.array(z.string()),
        tweetCount: z.number(),
      }),
    )
    .max(3),
  surprisingTake: z
    .object({
      handle: z.string(),
      text: z.string(),
      url: z.string(),
    })
    .nullable(),
  risingHandles: z
    .array(
      z.object({
        handle: z.string(),
        engagement: z.number(),
        takeaway: z.string(),
      }),
    )
    .max(3),
});

let _cache: { ts: number; data: SocialPulse } | null = null;
const TTL = 5 * 60 * 1000;

export async function getSocialPulse(force = false): Promise<SocialPulse> {
  if (!force && _cache && Date.now() - _cache.ts < TTL) return _cache.data;

  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const { getCachedTopTweets, getCachedTopNews } = await import("./snapshot.server");
  const { createLovableAiGatewayProvider } = await import(
    "@/lib/data/providers/gateway.server"
  );

  const [tweets, news] = await Promise.all([
    getCachedTopTweets().catch(() => []),
    getCachedTopNews().catch(() => []),
  ]);

  const empty: SocialPulse = {
    generatedAtIso: new Date().toISOString(),
    topThemes: [],
    surprisingTake: null,
    risingHandles: [],
  };
  if (tweets.length === 0 && news.length === 0) return empty;

  const gateway = createLovableAiGatewayProvider(key);

  const prompt = [
    "You are summarising Solana memecoin X chatter for a trading desk.",
    "Identify the 3 dominant themes RIGHT NOW from the tweets + headlines.",
    "Pick ONE surprising / contrarian take. Pick the top 3 KOL handles by",
    "engagement (likes) and write a 1-line takeaway each.",
    "Reply with ONLY a JSON object matching this shape, no prose:",
    "{",
    '  "topThemes":[{"title":string,"oneLiner":string,"tickers":string[],"tweetCount":number}],',
    '  "surprisingTake":{"handle":string,"text":string,"url":string}|null,',
    '  "risingHandles":[{"handle":string,"engagement":number,"takeaway":string}]',
    "}",
    "",
    "TWEETS:",
    JSON.stringify(tweets),
    "",
    "NEWS:",
    JSON.stringify(news),
  ].join("\n");

  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    prompt,
  });

  const parsed = parseJsonFromText(text);
  const validated = PulseSchema.safeParse(parsed);
  if (!validated.success) return empty;

  const data: SocialPulse = {
    generatedAtIso: new Date().toISOString(),
    ...validated.data,
  };
  _cache = { ts: Date.now(), data };
  return data;
}

function parseJsonFromText(text: string): unknown {
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