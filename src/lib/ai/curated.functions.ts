import { createServerFn } from "@tanstack/react-start";
import type { CuratedTrending } from "./curated.server";

export const getCuratedTrendingFn = createServerFn({ method: "GET" })
  .inputValidator((d: { force?: boolean } | undefined) => ({
    force: Boolean(d?.force ?? false),
  }))
  .handler(async ({ data }): Promise<CuratedTrending> => {
    const { getCuratedTrending } = await import("./curated.server");
    return getCuratedTrending(data.force);
  });