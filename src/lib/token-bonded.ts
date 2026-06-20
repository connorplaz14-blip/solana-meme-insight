import type { Source } from "@/types";

/** A token is considered "bonded" (graduated to a DEX) when it has a
 * dexscreener / geckoterminal source. Pump.fun-only tokens are not bonded. */
export function isBonded(t: { sources?: Source[] } | null | undefined): boolean {
  if (!t?.sources) return false;
  return t.sources.some((s) => s === "dexscreener" || s === "geckoterminal");
}