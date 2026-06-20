import { createServerFn } from "@tanstack/react-start";
import type { TokenAnalysis } from "./analyze-token.server";

export const analyzeTokenFn = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) => ({
    query: String(d?.query ?? "").slice(0, 100),
  }))
  .handler(async ({ data }): Promise<TokenAnalysis> => {
    const { analyzeToken } = await import("./analyze-token.server");
    return analyzeToken(data.query);
  });