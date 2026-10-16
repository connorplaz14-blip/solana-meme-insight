import { describe, expect, it } from "vitest";
import { isSolanaAddress, parseWalletRequest, parseJobResult } from "../src/lib/wallet/contracts";
import { readPreferences } from "../src/lib/wallet/preferences";

const wallet = "So11111111111111111111111111111111111111112";
const mint = "11111111111111111111111111111111";

describe("wallet request and evidence contracts", () => {
  it("validates decoded 32-byte public keys rather than just base58 length", () => {
    expect(isSolanaAddress(wallet)).toBe(true);
    expect(isSolanaAddress(mint)).toBe(true);
    expect(isSolanaAddress("z".repeat(44))).toBe(false);
    expect(isSolanaAddress("0".repeat(32))).toBe(false);
    expect(parseWalletRequest({ wallet: ` ${wallet} `, mint }).wallet).toBe(wallet);
  });
  it("rejects missing keys and client-selected service endpoints", () => {
    expect(() => parseWalletRequest({ wallet: "bad", mint })).toThrow();
    expect(() => parseWalletRequest({ wallet, mint, jobId: "bad" })).toThrow();
  });
  it("rejects mismatched wallet or token responses", () => {
    expect(() =>
      parseJobResult(
        { id: crypto.randomUUID(), wallet: mint, mint, status: "queued" },
        { wallet, mint },
      ),
    ).toThrow();
  });

  it("rejects a different analysis version during polling", () => {
    expect(() =>
      parseJobResult(
        { id: crypto.randomUUID(), wallet, mint, status: "queued" },
        { wallet, mint, jobId: crypto.randomUUID() },
      ),
    ).toThrow();
  });
  it("does not accept a completed response without validated evidence", () => {
    expect(() =>
      parseJobResult(
        { id: crypto.randomUUID(), wallet, mint, status: "complete", analysis: { netPnlUsd: 999 } },
        { wallet, mint },
      ),
    ).toThrow();
  });
  it("returns defaults for corrupt or obsolete local preferences", () => {
    expect(readPreferences("broken")).toEqual({
      mode: "simple",
      density: "comfortable",
      evidence: true,
      lots: true,
    });
    expect(readPreferences('{"mode":"evil","density":"tiny"}').mode).toBe("simple");
    expect(
      readPreferences('{"mode":"terminal","density":"compact","lots":false,"evidence":false}'),
    ).toEqual({ mode: "terminal", density: "compact", lots: false, evidence: false });
  });
});
