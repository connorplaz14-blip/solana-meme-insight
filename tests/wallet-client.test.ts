// @vitest-environment node
import { expect, it } from "vitest";
import { requestWalletJob } from "../src/lib/wallet/client.server";
const input = {
  wallet: "So11111111111111111111111111111111111111112",
  mint: "11111111111111111111111111111111",
};
const env = {
  CTRL_WALLET_SERVICE_URL: "https://ctrl.example",
  CTRL_WALLET_SERVICE_TOKEN: "server-secret",
  CTRL_WALLET_ACCESS_TOKEN: "operator",
};

it("returns an honest unavailable state when infrastructure is missing", async () => {
  const result = await requestWalletJob(input, {}, () => {
    throw Error("network should not run");
  });
  expect(result.status).toBe("unavailable");
});
it("rejects unauthorized preview access before contacting private service", async () => {
  const result = await requestWalletJob(input, env, () => {
    throw Error("network should not run");
  });
  expect(result.status).toBe("error");
});
it("sanitizes upstream failures without returning secrets or mock data", async () => {
  const result = await requestWalletJob(
    { ...input, accessToken: "operator" },
    env,
    async () => new Response("server-secret", { status: 503 }),
  );
  expect(result.status).toBe("error");
  expect(JSON.stringify(result)).not.toContain("server-secret");
  expect(JSON.stringify(result)).not.toContain("sampleWallet");
});
it("validates service identity before returning queued job", async () => {
  const result = await requestWalletJob(
    { ...input, accessToken: "operator" },
    env,
    async (url, init) => {
      expect(String(url)).toBe("https://ctrl.example/jobs");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer server-secret");
      return Response.json({
        id: crypto.randomUUID(),
        wallet: input.mint,
        mint: input.mint,
        status: "queued",
      });
    },
  );
  expect(result.status).toBe("error");
});
