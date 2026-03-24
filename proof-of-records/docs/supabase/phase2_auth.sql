-- Phase 2 auth/rate-limit/audit minimal migration
-- Apply with: psql "$DATABASE_URL" -f docs/supabase/phase2_auth.sql

create extension if not exists pgcrypto;

create table if not exists public.clients_por (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.api_keys_por (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients_por(id) on delete set null,
  key_prefix text,
  key_hash text not null unique,
  env text,
  is_active boolean not null default true,
  quota_per_minute integer not null default 60,
  quota_per_day integer not null default 10000,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists api_keys_por_client_idx on public.api_keys_por(client_id);
create index if not exists api_keys_por_active_env_idx on public.api_keys_por(is_active, env);

create table if not exists public.usage_counters_por (
  id bigserial primary key,
  api_key_id uuid not null references public.api_keys_por(id) on delete cascade,
  client_ip text not null,
  window_type text not null check (window_type in ('minute', 'day')),
  window_start timestamptz not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (api_key_id, client_ip, window_type, window_start)
);

create index if not exists usage_counters_por_key_window_idx
  on public.usage_counters_por(api_key_id, window_type, window_start);

create table if not exists public.audit_logs_por (
  id bigserial primary key,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  latency_ms integer not null,
  ip text,
  user_agent text,
  api_key_id uuid references public.api_keys_por(id) on delete set null,
  client_id uuid references public.clients_por(id) on delete set null,
  request_size_bytes integer,
  response_size_bytes integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_por_endpoint_time_idx
  on public.audit_logs_por(endpoint, created_at desc);

create index if not exists audit_logs_por_api_key_time_idx
  on public.audit_logs_por(api_key_id, created_at desc);
