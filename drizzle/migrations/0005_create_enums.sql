DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='app_role') THEN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='deposit_status') THEN CREATE TYPE public.deposit_status AS ENUM ('pending','approved','rejected','cancelled'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='order_status') THEN CREATE TYPE public.order_status AS ENUM ('pending','processing','completed','partial','rejected','canceled'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='pm_kind') THEN CREATE TYPE public.pm_kind AS ENUM ('binance','usdt','p2p'); END IF;
END $$;