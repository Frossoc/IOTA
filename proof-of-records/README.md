# Proof of Records
Turn operational datasets into anchored integrity proofs with optional record-level Merkle verification.

## Quick Start

```bash
git clone https://github.com/Frossoc/IOTA.git
cd IOTA/proof-of-records
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Quick Review (for judges)

To test the project quickly:

1. Run the app locally
2. Upload a structured dataset (JSON / CSV)
3. The system generates a deterministic hash
4. The hash is anchored on IOTA testnet
5. You can verify the transaction in the IOTA Explorer

No complex setup required beyond environment variables.

## Environment Setup

```bash
cp .env.example .env.local
```

Then fill in the minimum required values in `.env.local`:

- `IOTA_PRIVATE_KEY`
  - wallet used to anchor proofs on IOTA testnet
- `IOTA_PACKAGE_ID`
  - deployed Move package id for the proof contract
- `SUPABASE_URL`
  - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`
  - backend-only Supabase key
- `DATABASE_URL`
  - Postgres connection string for persistence
- `NEXT_PUBLIC_GATEWAY_URL`
  - HTTP gateway used to open IPFS evidence links in the browser

Optional:

- `PINATA_JWT`
  - only required if you want photo evidence uploads to work
- `IOTA_ISSUER_ADDRESS`
  - optional issuer/source address shown in proof metadata
- `API_KEY_AUTH_MODE`
  - keep `soft` for easy local demo usage

Notes:

- `.env.example` is intentionally simplified for hackathon review
- advanced mainnet and internal-only settings are omitted on purpose
- request limits remain configurable through the byte-based variables shown in `.env.example`

## Hackathon Scope

This repository contains multiple experiments under the broader IOTA workspace.
For hackathon review, run and evaluate only:

- `/proof-of-records`

Primary routes to review:

- `/`
- `/upload`
- `/verify`
- `/dashboard`
- `/proof/[id]`

## Overview

Proof of Records is a Next.js App Router + TypeScript project for turning spreadsheets or JSON datasets into deterministic proofs that can be hashed, persisted, published, and anchored on IOTA testnet. It includes public proof pages, downloadable bundles, PDF summaries, Supabase-backed persistence, API key protection, and optional Phase 10 Merkle proof units.

## Key Features

- Excel upload flow with column mapping and optional photo evidence
- JSON proof generation API with optional base64 evidence
- Deterministic canonicalization and SHA-256 hashing
- On-chain anchoring on IOTA testnet with safe mainnet gating
- Public verification endpoints and proof pages
- PDF summary export and bundle export
- Supabase best-effort persistence for proof metadata
- API key auth, rate limiting, and audit logging
- Optional Merkle mode for record-level verification with one anchored root

## IOTA Usage

The app uses IOTA as the on-chain integrity anchor:

- `event_hash` commitments are registered on-chain through the Move package configured in env
- testnet is the default network
- mainnet requires both env enablement and explicit confirmation
- `/api/verify` can compare a local canonical hash against on-chain proof objects or transaction-derived proof objects

## Architecture

- Frontend:
  - `/upload` for proof creation and operator workflow
  - `/verify` for manual verification
  - `/dashboard` for persisted proofs
  - `/proof/[id]` for public proof views
- API:
  - `/api/proof` for Excel multipart proofs
  - `/api/proof-json` for JSON proofs
  - `/api/verify` for local + on-chain verification
  - `/api/verify-row` for Merkle row-to-root verification
  - `/api/proof-summary` for PDF export
  - `/api/verify-proof` for public proof lookup by persisted id
  - `/api/proof-bundle` for bundle download
- Storage and persistence:
  - Pinata/IPFS for bundle and evidence storage
  - Supabase `public.proof_of_records` for proof metadata
- On-chain:
  - IOTA Move package for proof registration

## Demo Routes

- `/`
- `/upload`
- `/verify`
- `/dashboard`
- `/proof/[id]`

## Submission Notes

- Use `.env.example` as the setup template
- Do not commit real `.env.local` values
- Testnet is the intended demo network unless mainnet is explicitly authorized
