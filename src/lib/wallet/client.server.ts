import { timingSafeEqual } from "node:crypto";
import { parseJobResult, parseWalletRequest, type WalletResponse } from "./contracts";

type Environment = Record<string, string | undefined>;
export async function requestWalletJob(
  input: unknown,
  environment: Environment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<WalletResponse> {
  const request = parseWalletRequest(input);
  const endpoint = environment.CTRL_WALLET_SERVICE_URL;
  const serviceToken = environment.CTRL_WALLET_SERVICE_TOKEN;
  const access = environment.CTRL_WALLET_ACCESS_TOKEN;
  if (!endpoint || !serviceToken || !access)
    return {
      status: "unavailable",
      message:
        "Wallet analysis is not connected yet. Provider-backed results will appear once the private analysis service is configured.",
    };
  const expected = Buffer.from(access);
  const actual = Buffer.from(request.accessToken ?? "");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return {
      status: "error",
      message: "Enter the private preview access code to analyse a wallet.",
    };
  }
  try {
    const base = new URL(endpoint);
    if (
      base.protocol !== "https:" &&
      !(base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname))
    ) {
      throw new Error("Invalid service configuration");
    }
    const url = new URL(request.jobId ? `/jobs/${request.jobId}` : "/jobs", base);
    const response = await fetcher(url, {
      method: request.jobId ? "GET" : "POST",
      redirect: "error",
      headers: { Authorization: `Bearer ${serviceToken}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      ...(request.jobId
        ? {}
        : {
            body: JSON.stringify({
              wallet: request.wallet,
              mint: request.mint,
              requestKey: request.requestKey ?? crypto.randomUUID(),
            }),
          }),
    });
    if (!response.ok)
      return {
        status: "error",
        message:
          response.status === 429
            ? "Analysis is busy. Try again shortly."
            : "The analysis service is temporarily unavailable. No result was substituted.",
      };
    return { status: "ready", job: parseJobResult(await response.json(), request) };
  } catch {
    return { status: "error", message: "Could not verify this analysis. Try again shortly." };
  }
}
