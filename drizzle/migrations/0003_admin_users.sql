ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sign_in_method text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_key_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_key_created_at timestamptz;

ALTER TABLE public.admin_log ADD COLUMN IF NOT EXISTS old_value jsonb;
ALTER TABLE public.admin_log ADD COLUMN IF NOT EXISTS new_value jsonb;

CREATE TABLE IF NOT EXISTS public.sign_ins (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip text,
  device text,
  method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sign_ins_user_idx ON public.sign_ins(user_id, created_at DESC);
GRANT SELECT ON public.sign_ins TO authenticated;
GRANT ALL ON public.sign_ins TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sign_ins_id_seq TO service_role;
ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own sign ins" ON public.sign_ins;
CREATE POLICY "own sign ins" ON public.sign_ins FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'notification',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  shown_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own notifications" ON public.notifications;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.mark_my_notifications(_ids uuid[], _shown boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if _shown then
    update notifications set shown_at = coalesce(shown_at, now()), read_at = coalesce(read_at, now()) where user_id = auth.uid() and id = any(_ids);
  else
    update notifications set read_at = coalesce(read_at, now()) where user_id = auth.uid() and id = any(_ids);
  end if;
end $$;
REVOKE ALL ON FUNCTION public.mark_my_notifications(uuid[], boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_my_notifications(uuid[], boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user uuid, _amount numeric, _note text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _bal numeric; _newbal numeric;
begin
  _amount := round(_amount, 2);
  if _amount = 0 then raise exception 'ZERO_AMOUNT'; end if;
  select balance into _bal from profiles where id = _user for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  _newbal := _bal + _amount;
  if _newbal < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
  update profiles set balance = _newbal where id = _user;
  insert into wallet_ledger (user_id, amount, kind, ref, balance_after)
  values (_user, _amount, case when _amount > 0 then 'admin_add' else 'admin_subtract' end, left(_note, 200), _newbal);
  return _newbal;
end $$;
REVOKE ALL ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) TO service_role;