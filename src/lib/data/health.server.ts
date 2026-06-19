import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function recordSuccess(provider: string, latencyMs: number) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("provider_health").upsert({
    provider,
    last_ok_at: now,
    last_latency_ms: latencyMs,
    updated_at: now,
  });
}

export async function recordError(provider: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const now = new Date().toISOString();
  await supabaseAdmin.from("provider_health").upsert({
    provider,
    last_error: message.slice(0, 500),
    last_error_at: now,
    updated_at: now,
  });
}

export async function trackProvider<T>(provider: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const out = await fn();
    await recordSuccess(provider, Date.now() - start);
    return out;
  } catch (err) {
    await recordError(provider, err);
    throw err;
  }
}

export type ProviderHealthRow = {
  provider: string;
  last_ok_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  last_latency_ms: number | null;
  updated_at: string;
};

export async function readAllHealth(): Promise<ProviderHealthRow[]> {
  const { data, error } = await supabaseAdmin
    .from("provider_health")
    .select("*");
  if (error || !data) return [];
  return data as ProviderHealthRow[];
}