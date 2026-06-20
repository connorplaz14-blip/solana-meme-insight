// Firecrawl v2 wrapper. Uses the FIRECRAWL_API_KEY secret injected by the
// Lovable Firecrawl connector. Direct API (no gateway) — call api.firecrawl.dev.
// Docs: https://docs.firecrawl.dev/api-reference/v2-introduction

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";

export type FcSearchResult = {
  url: string;
  title?: string;
  description?: string;
  // Some endpoints return ISO timestamps when available
  publishedDate?: string;
};

type FcSearchResponse = {
  success?: boolean;
  data?:
    | FcSearchResult[]
    | { web?: FcSearchResult[]; news?: FcSearchResult[] };
  // v2 sometimes nests under `web`
  web?: FcSearchResult[];
};

async function fcFetch<T>(path: string, body: unknown, timeoutMs = 12_000): Promise<T | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${FIRECRAWL_BASE}${path}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function firecrawlSearch(
  query: string,
  opts: { limit?: number; tbs?: string } = {},
): Promise<FcSearchResult[]> {
  const res = await fcFetch<FcSearchResponse>("/search", {
    query,
    limit: opts.limit ?? 20,
    tbs: opts.tbs ?? "qdr:d", // last 24h by default
  });
  if (!res) return [];
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data?.web ?? res.web ?? data?.news ?? [];
}

export type FcScrapeResult = {
  markdown?: string;
  metadata?: { title?: string; sourceURL?: string; statusCode?: number };
};

export async function firecrawlScrapeMarkdown(url: string): Promise<FcScrapeResult | null> {
  const res = await fcFetch<{ data?: FcScrapeResult } & FcScrapeResult>("/scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
    waitFor: 1500,
  });
  if (!res) return null;
  // v2 returns fields at top level; some legacy shapes use `data`
  if (res.markdown) return { markdown: res.markdown, metadata: res.metadata };
  return res.data ?? null;
}