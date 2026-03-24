# Proof of Records
Turn operational datasets into anchored integrity proofs with optional record-level Merkle verification.

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

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env file:

```bash
cp .env.example .env.local
```

3. Fill in real values for:

- IOTA RPC, package id, signer, issuer address
- Pinata JWT and gateway
- Supabase URL, service role key, and database URL
- test API key

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

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
