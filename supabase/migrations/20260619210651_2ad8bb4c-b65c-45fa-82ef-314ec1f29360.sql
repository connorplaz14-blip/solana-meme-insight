
CREATE TABLE public.provider_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  ttl_seconds integer NOT NULL DEFAULT 60
);
GRANT SELECT ON public.provider_cache TO anon, authenticated;
GRANT ALL ON public.provider_cache TO service_role;
ALTER TABLE public.provider_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read provider_cache" ON public.provider_cache FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.narratives (
  date date PRIMARY KEY,
  summary text NOT NULL,
  dominant_theme text NOT NULL,
  fastest_growing text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  notable_launches jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload_hash text,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.narratives TO anon, authenticated;
GRANT ALL ON public.narratives TO service_role;
ALTER TABLE public.narratives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read narratives" ON public.narratives FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.provider_health (
  provider text PRIMARY KEY,
  last_ok_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  last_latency_ms integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_health TO anon, authenticated;
GRANT ALL ON public.provider_health TO service_role;
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read provider_health" ON public.provider_health FOR SELECT TO anon, authenticated USING (true);
