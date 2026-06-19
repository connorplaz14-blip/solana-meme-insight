import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function readCache<T>(key: string): Promise<{ payload: T; fetchedAt: string; ttlSeconds: number; fresh: boolean } | null> {
  const { data, error } = await supabaseAdmin
    .from("provider_cache")
    .select("payload, fetched_at, ttl_seconds")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  const ageMs = Date.now() - new Date(data.fetched_at).getTime();
  return {
    payload: data.payload as T,
    fetchedAt: data.fetched_at,
    ttlSeconds: data.ttl_seconds,
    fresh: ageMs < data.ttl_seconds * 1000,
  };
}

export async function writeCache(key: string, payload: unknown, ttlSeconds: number): Promise<void> {
  await supabaseAdmin
    .from("provider_cache")
    .upsert({ key, payload: payload as never, ttl_seconds: ttlSeconds, fetched_at: new Date().toISOString() });
}

/**
 * Cache-first fetch. Returns cached value if fresh. Otherwise calls fetcher,
 * writes cache, returns new value. On fetcher failure, returns stale cache if
 * available, otherwise throws.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await readCache<T>(key);
  if (cached?.fresh) return cached.payload;
  try {
    const fresh = await fetcher();
    await writeCache(key, fresh, ttlSeconds);
    return fresh;
  } catch (err) {
    if (cached) return cached.payload;
    throw err;
  }
}