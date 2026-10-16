export type WalletPreferences = {
  mode: "simple" | "terminal";
  density: "compact" | "comfortable";
  evidence: boolean;
  lots: boolean;
};
export const defaults: WalletPreferences = {
  mode: "simple",
  density: "comfortable",
  evidence: true,
  lots: true,
};
export function readPreferences(raw: string | null): WalletPreferences {
  try {
    const p: unknown = JSON.parse(raw ?? "null");
    if (!p || typeof p !== "object") return { ...defaults };
    const value = p as Record<string, unknown>;
    return {
      mode: value.mode === "terminal" ? "terminal" : "simple",
      density: value.density === "compact" ? "compact" : "comfortable",
      evidence: typeof value.evidence === "boolean" ? value.evidence : true,
      lots: typeof value.lots === "boolean" ? value.lots : true,
    };
  } catch {
    return { ...defaults };
  }
}
