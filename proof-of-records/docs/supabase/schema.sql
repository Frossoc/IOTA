-- Proof of Records current metadata schema (documentation only)
-- Runtime code reads/writes public.proof_of_records
-- This file is a reference snapshot for the current Proof of Records table shape.

create extension if not exists pgcrypto;

create table if not exists public.proof_of_records (
  id uuid primary key default gen_random_uuid(),
  event_hash text not null,
  canonical_string text not null,
  project_name text,
  process_type text,
  description text,
  proof_units_mode text,
  rows_count integer not null default 0,
  total_units numeric not null default 0,
  ipfs_uri text,
  merkle_root text,
  merkle_leaf_count integer,
  merkle_algorithm text,
  tx_digest text,
  object_id text,
  evidence_photo_hash text,
  evidence_photo_uri text,
  created_at timestamptz not null default now()
);

create unique index if not exists proofs_event_hash_uq
  on public.proof_of_records(event_hash);

create index if not exists proofs_object_id_idx
  on public.proof_of_records(object_id);

create index if not exists proofs_tx_digest_idx
  on public.proof_of_records(tx_digest);

create index if not exists proofs_created_at_idx
  on public.proof_of_records(created_at desc);
