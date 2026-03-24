-- Phase 1 minimal schema for proof metadata persistence
-- Postgres / Supabase SQL

create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.clients (name, slug)
values ('Biosphere', 'biosphere')
on conflict (slug) do nothing;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  project_name text not null,
  process_type text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('excel', 'json')),
  rows_count integer not null,
  total_units numeric not null default 0,
  event_hash text not null,
  canonical_sha256 text not null,
  canonical_string text not null,
  uri text not null,
  issuer text not null,
  timestamp_iso text not null,
  tx_digest text,
  object_id text,
  explorer_tx text,
  explorer_object text,
  explorer_package text,
  evidence_photo_hash text,
  evidence_photo_uri text,
  project_context jsonb,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists proofs_event_hash_uq on public.proofs(event_hash);
create index if not exists proofs_object_id_idx on public.proofs(object_id);
create index if not exists proofs_tx_digest_idx on public.proofs(tx_digest);
create index if not exists proofs_created_at_idx on public.proofs(created_at desc);
