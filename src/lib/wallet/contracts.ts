import { z } from "zod";

const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function isSolanaAddress(value: string): boolean {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  let n = 0n;
  for (const char of value) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return false;
    n = n * 58n + BigInt(digit);
  }
  const bytes = n === 0n ? 0 : Math.ceil(n.toString(16).length / 2);
  const leading = value.length - value.replace(/^1+/, "").length;
  return bytes + leading === 32;
}

const address = z.string().trim().refine(isSolanaAddress, "Enter a valid Solana public key.");
const requestSchema = z.object({
  wallet: address,
  mint: address,
  jobId: z.string().uuid().optional(),
  requestKey: z.string().uuid().optional(),
  accessToken: z.string().max(256).optional(),
});
export type WalletRequest = z.infer<typeof requestSchema>;
export const parseWalletRequest = (data: unknown) => requestSchema.parse(data);
const amount = z
  .string()
  .max(100)
  .regex(/^-?\d+(\.\d+)?$/)
  .nullable();
const timestamp = z.string().datetime({ offset: true }).nullable();
const match = z.object({
  closed_lot_match_id: z.string(),
  matched_quantity: z.string(),
  entry_signature: z.string(),
  exit_signature: z.string(),
  cost_basis_usd: amount,
  proceeds_usd: amount,
  realized_pnl_usd: amount,
  gross_pnl_usd: amount,
});
export const analysisSchema = z.object({
  version: z.string().uuid(),
  wallet: address,
  mint: address,
  method: z.literal("ctrl-fifo-v1"),
  accounting: z.object({
    grossPnlUsd: amount,
    netPnlUsd: amount,
    feesUsd: amount,
    knownGrossPnlUsd: amount,
    remainingQuantity: z.string().nullable(),
    eventCount: z.number().int().nonnegative(),
    matches: z.array(match),
    warnings: z.array(z.string()),
  }),
  coverage: z.object({
    status: z.enum(["partial", "complete"]),
    historyExhausted: z.boolean(),
    transactionCount: z.number().int().nonnegative(),
    recordBudget: z.number().int().max(2000),
    warnings: z.array(z.string()),
  }),
  sources: z.array(
    z.object({
      provider: z.string(),
      payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
      fetchedAt: z.string().datetime({ offset: true }),
      recordCount: z.number().int().nonnegative(),
      parserVersion: z.string(),
    }),
  ),
  observedAt: timestamp,
  fetchedAt: timestamp,
  computedAt: z.string().datetime({ offset: true }),
  resumeCursor: z.string().nullable(),
});
export type WalletAnalysis = z.infer<typeof analysisSchema>;
const jobSchema = z.object({
  id: z.string().uuid(),
  wallet: address,
  mint: address,
  status: z.enum(["queued", "running", "complete", "failed"]),
  analysis: analysisSchema.nullable().optional(),
  error: z.string().nullable().optional(),
});
export type WalletJob = z.infer<typeof jobSchema>;
export function parseJobResult(
  data: unknown,
  request: Pick<WalletRequest, "wallet" | "mint" | "jobId">,
): WalletJob {
  const job = jobSchema.parse(data);
  if (job.wallet !== request.wallet || job.mint !== request.mint)
    throw new Error("Mismatched analysis");
  if (request.jobId && request.jobId !== job.id) throw new Error("Mismatched version");
  if (job.status !== "complete" && job.analysis) throw new Error("Premature analysis");
  if (
    job.status === "complete" &&
    (!job.analysis ||
      job.analysis.wallet !== request.wallet ||
      job.analysis.mint !== request.mint ||
      job.analysis.version !== job.id)
  )
    throw new Error("Invalid evidence");
  return job;
}
export type WalletResponse =
  { status: "ready"; job: WalletJob } | { status: "unavailable" | "error"; message: string };
