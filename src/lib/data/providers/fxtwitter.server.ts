// FxTwitter API v2 wrapper — https://docs.fxembed.com/api/twitter/
// Free, unauthenticated JSON API for X/Twitter data. Worker-safe (plain fetch).
// Used as the PRIMARY source for X content; Firecrawl stays as fallback.

const FX_BASE = "https://api.fxtwitter.com";
const UA = "memedesk/1.0 (+https://memedesk.app)";
const TTL_MS = 5 * 60 * 1000;

export type XTweet = {
  id: string;
  url: string;
  handle: string;       // @screen_name
  author: string;       // display name
  text: string;
  createdAt: string;    // ISO
  likes?: number;
  replies?: number;
  retweets?: number;
  views?: number;
  hasMedia?: boolean;
  photos?: { url: string; width?: number; height?: number }[];
  videos?: { url: string; thumb?: string; width?: number; height?: number }[];
};

type FxAuthor = { name?: string; screen_name?: string };
type FxPhoto = { url?: string; width?: number; height?: number };
type FxVideo = { url?: string; thumbnail_url?: string; width?: number; height?: number };
type FxMedia = { all?: unknown[]; photos?: FxPhoto[]; videos?: FxVideo[] };
type FxStatus = {
  id?: string;
  url?: string;
  text?: string;
  created_at?: string;
  created_timestamp?: number;
  author?: FxAuthor;
  likes?: number;
  replies?: number;
  retweets?: number;
  views?: number;
  media?: FxMedia;
};
type FxListResp = {
  code?: number;
  results?: Array<{ type?: string; status?: FxStatus } | FxStatus>;
  cursor?: { top?: string | null; bottom?: string | null };
};
type FxStatusResp = { code?: number; status?: FxStatus; tweet?: FxStatus };

type CacheEntry = { ts: number; value: unknown };
const cache = new Map<string, CacheEntry>();
function cacheGet<T>(k: string): T | null {
  const hit = cache.get(k);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    cache.delete(k);
    return null;
  }
  return hit.value as T;
}
function cacheSet(k: string, v: unknown) {
  cache.set(k, { ts: Date.now(), value: v });
}

async function fxGet<T>(path: string, timeoutMs = 8_000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${FX_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function normalize(s: FxStatus | undefined | null): XTweet | null {
  if (!s?.id) return null;
  const handle = s.author?.screen_name ?? "";
  if (!handle) return null;
  const created =
    s.created_at && !Number.isNaN(Date.parse(s.created_at))
      ? new Date(s.created_at).toISOString()
      : s.created_timestamp
        ? new Date(s.created_timestamp * 1000).toISOString()
        : new Date().toISOString();
  const media = s.media;
  const hasMedia = !!(
    media &&
    ((media.all?.length ?? 0) > 0 ||
      (media.photos?.length ?? 0) > 0 ||
      (media.videos?.length ?? 0) > 0)
  );
  const photos = (media?.photos ?? [])
    .filter((p): p is FxPhoto & { url: string } => !!p?.url)
    .map((p) => ({ url: p.url, width: p.width, height: p.height }));
  const videos = (media?.videos ?? [])
    .filter((v): v is FxVideo & { url: string } => !!v?.url)
    .map((v) => ({
      url: v.url,
      thumb: v.thumbnail_url,
      width: v.width,
      height: v.height,
    }));
  return {
    id: s.id,
    url: s.url ?? `https://x.com/${handle}/status/${s.id}`,
    handle: `@${handle}`,
    author: s.author?.name ?? `@${handle}`,
    text: (s.text ?? "").trim(),
    createdAt: created,
    likes: typeof s.likes === "number" ? s.likes : undefined,
    replies: typeof s.replies === "number" ? s.replies : undefined,
    retweets: typeof s.retweets === "number" ? s.retweets : undefined,
    views: typeof s.views === "number" ? s.views : undefined,
    hasMedia,
    photos: photos.length ? photos : undefined,
    videos: videos.length ? videos : undefined,
  };
}

function extractList(r: FxListResp | null): XTweet[] {
  if (!r?.results) return [];
  const out: XTweet[] = [];
  for (const row of r.results) {
    // Row can be { type: "status", status: {...} } or a raw FxStatus
    const status: FxStatus | undefined =
      (row as { status?: FxStatus }).status ?? (row as FxStatus);
    const n = normalize(status);
    if (n) out.push(n);
  }
  return out;
}

export async function fxSearch(query: string, count = 30): Promise<XTweet[]> {
  const q = query.trim();
  if (!q) return [];
  const key = `search:${q.toLowerCase()}:${count}`;
  const hit = cacheGet<XTweet[]>(key);
  if (hit) return hit;
  const res = await fxGet<FxListResp>(
    `/2/search?q=${encodeURIComponent(q)}&count=${Math.min(count, 100)}`,
  );
  const out = extractList(res);
  cacheSet(key, out);
  return out;
}

export async function fxUserTimeline(
  handle: string,
  count = 30,
  withReplies = false,
): Promise<XTweet[]> {
  const h = handle.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  if (!h) return [];
  const key = `user:${h.toLowerCase()}:${count}:${withReplies ? 1 : 0}`;
  const hit = cacheGet<XTweet[]>(key);
  if (hit) return hit;
  const qs = `count=${Math.min(count, 100)}${withReplies ? "&with_replies=1" : ""}`;
  const res = await fxGet<FxListResp>(`/2/profile/${encodeURIComponent(h)}/statuses?${qs}`);
  const out = extractList(res);
  cacheSet(key, out);
  return out;
}

export async function fxStatus(id: string): Promise<XTweet | null> {
  const clean = id.replace(/\D/g, "");
  if (!clean) return null;
  const key = `status:${clean}`;
  const hit = cacheGet<XTweet | null>(key);
  if (hit !== null && hit !== undefined) return hit;
  const res = await fxGet<FxStatusResp>(`/2/status/${clean}`);
  const out = normalize(res?.status ?? res?.tweet);
  cacheSet(key, out);
  return out;
}