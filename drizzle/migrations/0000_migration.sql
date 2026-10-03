
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
