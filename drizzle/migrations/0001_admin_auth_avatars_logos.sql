ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS instructions text DEFAULT '';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS refill_info text DEFAULT '';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id int PRIMARY KEY DEFAULT 1,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_credentials TO service_role;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  token_hash text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip text,
  revoked boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  ip text,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_login_attempts_key_idx ON public.admin_login_attempts(key, created_at DESC);
GRANT ALL ON public.admin_login_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_login_attempts_id_seq TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.admin_log (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_log_id_seq TO service_role;
ALTER TABLE public.admin_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_my_avatar(_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if _path is not null and _path not like auth.uid()::text || '/%' then
    raise exception 'INVALID_AVATAR';
  end if;
  update profiles set avatar_url = _path where id = auth.uid();
end $$;
REVOKE ALL ON FUNCTION public.set_my_avatar(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_my_avatar(text) TO authenticated;

DROP POLICY IF EXISTS "avatars own insert" ON storage.objects;
CREATE POLICY "avatars own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars own update" ON storage.objects;
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars own delete" ON storage.objects;
CREATE POLICY "avatars own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars own select" ON storage.objects;
CREATE POLICY "avatars own select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "logos public read" ON storage.objects;
CREATE POLICY "logos public read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'logos');