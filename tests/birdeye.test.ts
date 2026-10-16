// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { fetchWalletPortfolio } from "../src/lib/data/providers/birdeye.server";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("returns current holdings without inventing acquired costs or profit", async () => {
  vi.stubEnv("BIRDEYE_API_KEY", "test-key");
  vi.stubGlobal("fetch", async () =>
    Response.json({
      success: true,
      data: {
        items: [
          {
            address: "mint",
            symbol: "TOKEN",
            uiAmount: 10,
            valueUsd: 20,
            priceUsd: 2,
            priceChange24h: 100,
          },
        ],
      },
    }),
  );
  const portfolio = await fetchWalletPortfolio("wallet");
  expect(portfolio).not.toHaveProperty("realisedUsd");
  expect(portfolio).not.toHaveProperty("unrealisedUsd");
  expect(portfolio).not.toHaveProperty("score");
  expect(portfolio.positions[0]).not.toHaveProperty("costUsd");
});
