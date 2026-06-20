import { tool } from "ai";
import { z } from "zod";

/**
 * Tool catalog given to SCBOL AI in the chat route. Each tool runs server-side
 * and returns small, JSON-serializable results that the model can quote in
 * its reply. Keep result shapes flat and short — they go straight back into
 * the model context.
 */
export function buildSCBOLTools() {
  return {
    lookup_token: tool({
      description:
        "Look up a Solana token by ticker (e.g. 'BONK', '$WIF') or mint address. " +
        "Returns current price, market cap, liquidity, 1h/24h change, age, risk and links.",
      inputSchema: z.object({
        query: z.string().describe("Ticker, name, or Solana mint address"),
      }),
      execute: async ({ query }) => {
        const { fetchSolanaTrending } = await import(
          "@/lib/data/providers/dexscreener.server"
        );
        const all = await fetchSolanaTrending(80).catch(() => []);
        const q = query.trim().replace(/^\$/, "").toLowerCase();
        const hit =
          all.find((t) => t.address.toLowerCase() === q) ||
          all.find((t) => t.symbol.toLowerCase() === q) ||
          all.find((t) => t.name.toLowerCase().includes(q));
        if (!hit) return { found: false, query };
        return {
          found: true,
          symbol: hit.symbol,
          name: hit.name,
          address: hit.address,
          priceUsd: hit.priceUsd,
          marketCapUsd: Math.round(hit.marketCapUsd),
          liquidityUsd: Math.round(hit.liquidityUsd),
          volume24hUsd: Math.round(hit.volume24hUsd),
          h1Pct: hit.changes.h1,
          h24Pct: hit.changes.h24,
          buys24h: hit.txns.buys24h,
          sells24h: hit.txns.sells24h,
          ageHours: hit.ageHours,
          risk: hit.risk,
          chartUrl: `https://dexscreener.com/solana/${hit.address}`,
        };
      },
    }),

    get_token_tweets: tool({
      description:
        "Fetch recent X posts mentioning a token (cashtag or mint). Use when the user " +
        "asks what people are saying about a token, or for sentiment context.",
      inputSchema: z.object({
        ticker: z.string().describe("Cashtag like 'BONK' or full $ form"),
        limit: z.number().int().min(1).max(15).default(8),
      }),
      execute: async ({ ticker, limit }) => {
        const { searchX } = await import("@/lib/data/providers/xfeed.server");
        const tag = ticker.startsWith("$") ? ticker : `$${ticker}`;
        const posts = await searchX(tag, limit).catch(() => []);
        return {
          ticker: tag,
          count: posts.length,
          tweets: posts.slice(0, limit).map((p) => ({
            handle: p.handle.replace(/^@/, ""),
            text: p.text.slice(0, 240),
            likes: p.likes ?? 0,
            ts: p.publishedAt,
            url: p.url,
          })),
        };
      },
    }),

    get_kol_take: tool({
      description:
        "Pull the latest 5 tweets from a specific KOL handle. Use when the user asks " +
        "what a person thinks ('what does ansem say', '@blknoiz06 view').",
      inputSchema: z.object({
        handle: z.string().describe("X handle, with or without @"),
      }),
      execute: async ({ handle }) => {
        const { userTimelineX } = await import(
          "@/lib/data/providers/xfeed.server"
        );
        const h = handle.replace(/^@/, "");
        const posts = await userTimelineX(h, 5).catch(() => []);
        return {
          handle: h,
          tweets: posts.map((p) => ({
            text: p.text.slice(0, 280),
            likes: p.likes ?? 0,
            ts: p.publishedAt,
            url: p.url,
          })),
        };
      },
    }),

    search_news: tool({
      description:
        "Search aggregated crypto news headlines for a term. Returns recent matches " +
        "from CoinDesk, Cointelegraph, Decrypt, The Block and CryptoSlate.",
      inputSchema: z.object({
        query: z.string().describe("Search term — token name, ticker, or topic"),
        hours: z.number().int().min(1).max(168).default(48),
      }),
      execute: async ({ query, hours }) => {
        const { fetchAggregatedNews } = await import(
          "@/lib/data/providers/newsfeed.server"
        );
        const all = await fetchAggregatedNews(50).catch(() => []);
        const cutoff = Date.now() - hours * 3600 * 1000;
        const q = query.toLowerCase();
        const hits = all
          .filter((n) => +new Date(n.publishedAt) > cutoff)
          .filter(
            (n) =>
              n.title.toLowerCase().includes(q) ||
              (n.summary ?? "").toLowerCase().includes(q),
          )
          .slice(0, 8)
          .map((n) => ({
            source: n.source,
            title: n.title,
            summary: n.summary?.slice(0, 220),
            ts: n.publishedAt,
            url: n.url,
          }));
        return { query, count: hits.length, news: hits };
      },
    }),
  };
}