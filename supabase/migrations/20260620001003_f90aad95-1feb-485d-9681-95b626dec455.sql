DROP POLICY IF EXISTS "public read provider_cache" ON public.provider_cache;
DROP POLICY IF EXISTS "public read provider_health" ON public.provider_health;
REVOKE SELECT ON public.provider_cache FROM anon, authenticated;
REVOKE SELECT ON public.provider_health FROM anon, authenticated;