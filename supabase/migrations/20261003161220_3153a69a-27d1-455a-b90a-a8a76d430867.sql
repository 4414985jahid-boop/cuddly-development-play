create type public.app_role as enum ('admin','moderator','user');
create type public.order_status as enum ('pending','processing','completed','partial','rejected','canceled');
create type public.deposit_status as enum ('pending','approved','rejected','cancelled');
create type public.pm_kind as enum ('binance','usdt','p2p');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_id text not null unique,
  username text not null unique,
  full_name text not null default '',
  email text,
  phone text unique,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  banned boolean not null default false,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Premium SMM Store',
  hero_title text not null default 'Grow every account, delivered by real people',
  hero_text text not null default 'Premium followers, likes, views and members for Facebook, Instagram, YouTube, TikTok and Telegram — every order is hand-delivered by our team.',
  whatsapp text default '8801700000000',
  telegram text default 'support',
  email text default 'support@example.com',
  bdt_rate numeric(10,2) not null default 130,
  allow_orders boolean not null default true,
  require_verified_email boolean not null default true,
  announcement_on boolean not null default false,
  announcement_text text default ''
);
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "public settings" on public.site_settings for select to anon, authenticated using (true);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  sort int not null default 0,
  deleted_at timestamptz
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id),
  name text not null,
  active boolean not null default true,
  sort int not null default 0,
  deleted_at timestamptz,
  unique (platform_id, name)
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  description text default '',
  rate numeric(12,4) not null check (rate >= 0),
  rate_per int not null default 1000 check (rate_per > 0),
  min_qty int not null default 10,
  max_qty int not null default 10000,
  avg_time text not null default '24 hours',
  active boolean not null default true,
  sort int not null default 0,
  deleted_at timestamptz,
  unique (category_id, name)
);
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  kind pm_kind not null,
  name text not null unique,
  account text not null,
  network text,
  account_type text,
  min_amount numeric(12,2) not null default 1,
  max_amount numeric(12,2) not null default 10000,
  active boolean not null default true,
  sort int not null default 0,
  deleted_at timestamptz
);
grant select on public.platforms, public.categories, public.services, public.payment_methods to anon, authenticated;
grant all on public.platforms, public.categories, public.services, public.payment_methods to service_role;
alter table public.platforms enable row level security;
alter table public.categories enable row level security;
alter table public.services enable row level security;
alter table public.payment_methods enable row level security;
create policy "public platforms" on public.platforms for select to anon, authenticated using (active and deleted_at is null);
create policy "public categories" on public.categories for select to anon, authenticated using (active and deleted_at is null);
create policy "public services" on public.services for select to anon, authenticated using (active and deleted_at is null);
create policy "public pm" on public.payment_methods for select to anon, authenticated using (active and deleted_at is null);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  user_id uuid not null references auth.users(id),
  service_id uuid not null references public.services(id),
  platform_slug text not null,
  platform_name text not null,
  category_name text not null,
  service_name text not null,
  link text not null,
  quantity int not null,
  charge numeric(14,2) not null,
  status order_status not null default 'pending',
  admin_note text,
  delivered_qty int,
  refunded numeric(14,2) not null default 0,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references auth.users(id),
  method_id uuid not null references public.payment_methods(id),
  method_name text not null,
  method_kind pm_kind not null,
  amount numeric(14,2) not null,
  bdt_rate numeric(10,2),
  bdt_amount numeric(14,2),
  txn_id text not null,
  screenshot_path text,
  status deposit_status not null default 'pending',
  admin_note text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, idempotency_key)
);
create unique index deposits_txn_unique on public.deposits (method_id, lower(txn_id));
grant select on public.deposits to authenticated;
grant all on public.deposits to service_role;
alter table public.deposits enable row level security;
create policy "own deposits" on public.deposits for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.wallet_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  amount numeric(14,2) not null,
  kind text not null,
  ref text,
  balance_after numeric(14,2) not null,
  created_at timestamptz not null default now()
);
grant select on public.wallet_ledger to authenticated;
grant all on public.wallet_ledger to service_role;
alter table public.wallet_ledger enable row level security;
create policy "own ledger" on public.wallet_ledger for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _pid text; _uname text; _base text; _name text;
begin
  _name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'user');
  loop
    _pid := lpad((floor(random()*90000000)+10000000)::bigint::text, 8, '0');
    exit when not exists (select 1 from public.profiles where public_id=_pid);
  end loop;
  _base := lower(regexp_replace(split_part(_name,' ',1), '[^a-zA-Z0-9]', '', 'g'));
  if _base = '' then _base := 'user'; end if;
  loop
    _uname := left(_base,16) || '_' || (floor(random()*9000)+1000)::int::text;
    exit when not exists (select 1 from public.profiles where username=_uname);
  end loop;
  insert into public.profiles (id, public_id, username, full_name, email, phone, accepted_terms_at)
  values (new.id, _pid, _uname, _name, new.email, nullif(new.raw_user_meta_data->>'phone',''),
    case when new.raw_user_meta_data ? 'accepted_terms' then now() else null end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.place_order(_service_id uuid, _link text, _quantity int, _idem text)
returns json language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid(); _p profiles; _s services; _c categories; _pl platforms; _set site_settings;
  _charge numeric; _existing orders; _code text; _newbal numeric;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into _existing from orders where user_id=_uid and idempotency_key=_idem;
  if found then return json_build_object('order_code', _existing.order_code, 'charge', _existing.charge); end if;
  select * into _set from site_settings where id=1;
  if not _set.allow_orders then raise exception 'ORDERS_PAUSED'; end if;
  select * into _p from profiles where id=_uid for update;
  if _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if _set.require_verified_email and not exists (select 1 from auth.users where id=_uid and email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_VERIFIED'; end if;
  select * into _s from services where id=_service_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  select * into _c from categories where id=_s.category_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  select * into _pl from platforms where id=_c.platform_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  if _quantity < _s.min_qty or _quantity > _s.max_qty then raise exception 'QUANTITY_OUT_OF_RANGE'; end if;
  if _link !~* '^https?://[^\s]+\.[^\s]+' or length(_link) > 500 then raise exception 'INVALID_LINK'; end if;
  _charge := ceil(_quantity * _s.rate / _s.rate_per * 100) / 100;
  if _p.balance < _charge then raise exception 'INSUFFICIENT_BALANCE'; end if;
  loop
    _code := lpad((floor(random()*9000000000)+1000000000)::bigint::text,10,'0');
    exit when not exists (select 1 from orders where order_code=_code);
  end loop;
  _newbal := _p.balance - _charge;
  update profiles set balance=_newbal where id=_uid;
  insert into orders (order_code,user_id,service_id,platform_slug,platform_name,category_name,service_name,link,quantity,charge,idempotency_key)
  values (_code,_uid,_s.id,_pl.slug,_pl.name,_c.name,_s.name,_link,_quantity,_charge,_idem);
  insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_uid,-_charge,'order',_code,_newbal);
  return json_build_object('order_code', _code, 'charge', _charge);
end $$;

create or replace function public.create_deposit(_method_id uuid, _amount numeric, _txn text, _screenshot text, _idem text)
returns json language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid(); _p profiles; _m payment_methods; _set site_settings; _existing deposits; _code text;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into _existing from deposits where user_id=_uid and idempotency_key=_idem;
  if found then return json_build_object('code', _existing.code); end if;
  select * into _set from site_settings where id=1;
  select * into _p from profiles where id=_uid;
  if _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if _set.require_verified_email and not exists (select 1 from auth.users where id=_uid and email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_VERIFIED'; end if;
  select * into _m from payment_methods where id=_method_id and active and deleted_at is null;
  if not found then raise exception 'METHOD_UNAVAILABLE'; end if;
  _amount := round(_amount, 2);
  if _amount < _m.min_amount or _amount > _m.max_amount then raise exception 'AMOUNT_OUT_OF_RANGE'; end if;
  _txn := trim(_txn);
  if length(_txn) < 4 or length(_txn) > 100 then raise exception 'INVALID_TXN'; end if;
  if exists (select 1 from deposits where method_id=_m.id and lower(txn_id)=lower(_txn)) then raise exception 'DUPLICATE_TXN'; end if;
  if _screenshot is not null and _screenshot not like _uid::text || '/%' then raise exception 'INVALID_SCREENSHOT'; end if;
  loop
    _code := 'ADD-' || lpad((floor(random()*900000)+100000)::int::text,6,'0');
    exit when not exists (select 1 from deposits where code=_code);
  end loop;
  insert into deposits (code,user_id,method_id,method_name,method_kind,amount,bdt_rate,bdt_amount,txn_id,screenshot_path,idempotency_key)
  values (_code,_uid,_m.id,_m.name,_m.kind,_amount,
    case when _m.kind='p2p' then _set.bdt_rate end,
    case when _m.kind='p2p' then round(_amount*_set.bdt_rate,2) end,
    _txn,_screenshot,_idem);
  return json_build_object('code', _code);
end $$;

create or replace function public.cancel_my_order(_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _o orders; _newbal numeric;
begin
  select * into _o from orders where id=_order_id and user_id=auth.uid() for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if _o.status <> 'pending' then raise exception 'CANNOT_CANCEL'; end if;
  update profiles set balance = balance + _o.charge where id=_o.user_id returning balance into _newbal;
  update orders set status='canceled', refunded=_o.charge, updated_at=now() where id=_o.id;
  insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_o.user_id,_o.charge,'refund',_o.order_code,_newbal);
end $$;

revoke execute on function public.place_order, public.create_deposit, public.cancel_my_order from anon, public;
grant execute on function public.place_order, public.create_deposit, public.cancel_my_order to authenticated;

alter publication supabase_realtime add table public.profiles, public.orders, public.deposits;

create policy "upload own proofs" on storage.objects for insert to authenticated
  with check (bucket_id='payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own proofs" on storage.objects for select to authenticated
  using (bucket_id='payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

insert into public.site_settings (id) values (1) on conflict do nothing;
insert into public.platforms (slug,name,sort) values
 ('facebook','Facebook',1),('instagram','Instagram',2),('youtube','YouTube',3),('tiktok','TikTok',4),('telegram','Telegram',5)
on conflict (slug) do nothing;
insert into public.categories (platform_id,name,sort)
select p.id, c.name, c.sort from public.platforms p join (values
 ('facebook','Facebook Followers Very Stable',1),('facebook','Facebook Post React Love',2),('facebook','Facebook Followers 100% BD Best Service',3),
 ('instagram','Instagram Followers',1),('instagram','Instagram Likes',2),
 ('youtube','YouTube Views',1),('youtube','YouTube Subscribers',2),
 ('tiktok','TikTok Followers',1),('tiktok','TikTok Views',2),
 ('telegram','Telegram Channel Members',1),('telegram','Telegram Post Views',2)
) as c(slug,name,sort) on c.slug=p.slug
on conflict (platform_id,name) do nothing;
insert into public.services (category_id,name,description,rate,rate_per,min_qty,max_qty,avg_time)
select c.id, s.name, s.descr, s.rate, s.per, s.mn, s.mx, s.t from public.categories c join (values
 ('Facebook Followers Very Stable','Facebook Followers Stable No Drop','Real-looking profiles, 30-day refill',10,1000,100,20000,'3 hours'),
 ('Facebook Post React Love','Facebook Post React Instant Love Hidden Drop No Refill','Love reactions on any public post',10,100,50,5000,'3 hours'),
 ('Facebook Followers 100% BD Best Service','Facebook Followers BD Premium','Bangladeshi profiles',18,1000,100,10000,'6 hours'),
 ('Instagram Followers','Instagram Followers HQ','High quality, low drop',6,1000,100,50000,'12 hours'),
 ('Instagram Likes','Instagram Likes Instant','Fast start likes',1.5,1000,50,20000,'1 hour'),
 ('YouTube Views','YouTube Views Retention','Good retention views',3,1000,500,100000,'24 hours'),
 ('YouTube Subscribers','YouTube Subscribers Non-drop','Lifetime guarantee',25,1000,50,5000,'24 hours'),
 ('TikTok Followers','TikTok Followers Real','Real active users',5,1000,100,30000,'6 hours'),
 ('TikTok Views','TikTok Views Fast','Instant views',0.2,1000,1000,1000000,'1 hour'),
 ('Telegram Channel Members','Telegram Members Stable','Channel or group members',4,1000,100,50000,'12 hours'),
 ('Telegram Post Views','Telegram Post Views Last 5','Views on last 5 posts',0.5,1000,100,100000,'1 hour')
) as s(cat,name,descr,rate,per,mn,mx,t) on s.cat=c.name
on conflict (category_id,name) do nothing;
insert into public.payment_methods (kind,name,account,network,account_type,min_amount,max_amount,sort) values
 ('binance','Binance','123456789',null,'Binance Pay ID',1,10000,1),
 ('usdt','USDT','TXyourTRC20WalletAddressHere000000','TRC20',null,5,10000,2),
 ('p2p','bKash','01700000000',null,'Personal',1,1000,3),
 ('p2p','Nagad','01800000000',null,'Personal',1,1000,4),
 ('p2p','Rocket','01900000000',null,'Personal',1,1000,5)
on conflict (name) do nothing;

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
alter table public.profiles add column if not exists api_key text unique;
alter table public.orders add column if not exists source text not null default 'web';
alter table public.site_settings add column if not exists api_policy text not null default 'To work as a reseller you must first add funds to the account whose API key you use. Orders placed through the API are charged from that account balance and delivered manually by our team. Do not share your API key. Abuse, fake links or excessive requests may lead to the key being disabled.';
alter table public.site_settings add column if not exists api_rate_per_min integer not null default 60;
alter table public.site_settings add column if not exists music_enabled boolean not null default true;

create table if not exists public.api_requests (
  id bigserial primary key,
  user_id uuid not null,
  action text not null,
  ip text,
  created_at timestamptz not null default now()
);
grant all on public.api_requests to service_role;
grant usage, select on sequence public.api_requests_id_seq to service_role;
alter table public.api_requests enable row level security;
create index if not exists api_requests_user_time on public.api_requests(user_id, created_at desc);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default '',
  file_path text not null,
  cover_path text,
  is_welcome boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
grant all on public.songs to service_role;
alter table public.songs enable row level security;

create or replace function public.ensure_my_api_key(_regenerate boolean default false)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare _uid uuid := auth.uid(); _k text; _p profiles;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into _p from profiles where id=_uid for update;
  if _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if _p.api_key_hash is not null and not _p.api_enabled then raise exception 'API_DISABLED'; end if;
  if _p.api_key is not null and not _regenerate then return _p.api_key; end if;
  _k := 'sk_' || encode(gen_random_bytes(24),'hex');
  update profiles set api_key=_k, api_key_hash=encode(digest(_k,'sha256'),'hex'),
    api_key_created_at=now(), api_enabled=true
  where id=_uid;
  return _k;
end $$;
revoke all on function public.ensure_my_api_key(boolean) from public, anon;
grant execute on function public.ensure_my_api_key(boolean) to authenticated;

create or replace function public.api_place_order(_uid uuid, _service_id uuid, _link text, _quantity integer)
returns json language plpgsql security definer set search_path = public as $$
declare _p profiles; _s services; _c categories; _pl platforms; _set site_settings; _charge numeric; _code text; _newbal numeric;
begin
  select * into _set from site_settings where id=1;
  if not _set.allow_orders then raise exception 'ORDERS_PAUSED'; end if;
  select * into _p from profiles where id=_uid for update;
  if not found or _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if not _p.api_enabled then raise exception 'API_DISABLED'; end if;
  select * into _s from services where id=_service_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  select * into _c from categories where id=_s.category_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  select * into _pl from platforms where id=_c.platform_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  if _quantity < _s.min_qty or _quantity > _s.max_qty then raise exception 'QUANTITY_OUT_OF_RANGE'; end if;
  if _link !~* '^https?://[^\s]+\.[^\s]+' or length(_link) > 500 then raise exception 'INVALID_LINK'; end if;
  _charge := ceil(_quantity * _s.rate / _s.rate_per * 100) / 100;
  if _p.balance < _charge then raise exception 'INSUFFICIENT_BALANCE'; end if;
  loop
    _code := lpad((floor(random()*9000000000)+1000000000)::bigint::text,10,'0');
    exit when not exists (select 1 from orders where order_code=_code);
  end loop;
  _newbal := _p.balance - _charge;
  update profiles set balance=_newbal where id=_uid;
  insert into orders (order_code,user_id,service_id,platform_slug,platform_name,category_name,service_name,link,quantity,charge,idempotency_key,source)
  values (_code,_uid,_s.id,_pl.slug,_pl.name,_c.name,_s.name,_link,_quantity,_charge,'api-'||gen_random_uuid(),'api');
  insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_uid,-_charge,'order',_code,_newbal);
  return json_build_object('order', _code, 'charge', _charge, 'balance', _newbal);
end $$;
revoke all on function public.api_place_order(uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.api_place_order(uuid,uuid,text,integer) to service_role;

CREATE TABLE IF NOT EXISTS public.site_visits (
  visitor_id text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visitor_id, day)
);
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status public.order_status,
  new_status public.order_status NOT NULL,
  delivered_qty integer,
  refund numeric NOT NULL DEFAULT 0,
  note text,
  action_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_history_order_idx ON public.order_status_history(order_id, created_at);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own order history" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_update_order_status(_order_id uuid, _status public.order_status, _delivered integer, _note text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare _o orders; _refund numeric := 0; _target numeric; _newbal numeric; _del integer; _title text;
begin
  select * into _o from orders where id=_order_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  _note := nullif(left(trim(coalesce(_note,'')),500),'');
  if _o.status = 'pending' and _status not in ('processing','rejected') then raise exception 'INVALID_TRANSITION'; end if;
  if _o.status = 'processing' and _status not in ('completed','partial','rejected') then raise exception 'INVALID_TRANSITION'; end if;
  if _o.status not in ('pending','processing') then raise exception 'INVALID_TRANSITION'; end if;
  _del := _o.delivered_qty;
  if _status = 'partial' then
    if _delivered is null or _delivered <= 0 or _delivered >= _o.quantity then raise exception 'INVALID_DELIVERED'; end if;
    _del := _delivered;
    _target := floor(_o.charge * (_o.quantity - _delivered) / _o.quantity * 100) / 100;
  elsif _status = 'rejected' then
    _target := _o.charge;
  elsif _status = 'completed' then
    _del := _o.quantity; _target := _o.refunded;
  else
    _target := _o.refunded;
  end if;
  _refund := greatest(round(_target - _o.refunded, 2), 0);
  if _refund > 0 then
    update profiles set balance = balance + _refund where id=_o.user_id returning balance into _newbal;
    insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_o.user_id,_refund,'refund',_o.order_code,_newbal);
  end if;
  update orders set status=_status, refunded=_o.refunded+_refund, delivered_qty=_del, admin_note=coalesce(_note, admin_note), updated_at=now() where id=_o.id;
  insert into order_status_history (order_id,old_status,new_status,delivered_qty,refund,note)
  values (_o.id,_o.status,_status,_del,_refund,_note);
  _title := 'Order #' || _o.order_code || ' ' || case _status when 'processing' then 'is now processing' when 'completed' then 'completed' when 'partial' then 'partially completed' when 'rejected' then 'was rejected' else _status::text end;
  insert into notifications (user_id,title,body,kind) values (_o.user_id, _title,
    concat_ws(E'\n', _o.service_name || ' × ' || _o.quantity,
      case when _refund > 0 then 'Refunded $' || to_char(_refund,'FM999999990.00') || ' to your balance.' end, _note), 'notification');
  return json_build_object('refund', _refund, 'status', _status);
end $$;
REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, public.order_status, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, public.order_status, integer, text) TO service_role;