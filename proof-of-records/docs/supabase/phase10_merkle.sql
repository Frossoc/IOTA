-- Phase 10: optional Merkle proof units metadata
-- Additive migration for public.proof_of_records

alter table if exists public.proof_of_records
  add column if not exists proof_units_mode text;

alter table if exists public.proof_of_records
  add column if not exists merkle_root text;

alter table if exists public.proof_of_records
  add column if not exists merkle_leaf_count integer;

alter table if exists public.proof_of_records
  add column if not exists merkle_algorithm text;
