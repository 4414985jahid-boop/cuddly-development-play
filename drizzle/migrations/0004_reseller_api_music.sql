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