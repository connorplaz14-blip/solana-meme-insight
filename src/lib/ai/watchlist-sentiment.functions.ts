import { createServerFn } from "@tanstack/react-start";
import type { SentimentScore } from "./watchlist-sentiment.server";

export const scoreWatchlistFn = createServerFn({ method: "POST" })
  .inputValidator((d: { addresses: string[] }) => ({
    addresses: Array.isArray(d?.addresses)
      ? d.addresses.filter((a): a is string => typeof a === "string").slice(0, 30)
      : [],
  }))
  .handler(async ({ data }): Promise<SentimentScore[]> => {
    const { scoreWatchlist } = await import("./watchlist-sentiment.server");
    return scoreWatchlist(data.addresses);
  });