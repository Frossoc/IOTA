# AI Prompt Log

Purpose: track AI-assisted development prompts and outcomes for the Proof of Records MVP.

## How To Use This Log
- Add a new entry at the end when a new prompt is used.
- Keep entries chronological.
- Record the concrete files touched so changes are auditable.
- Mark uncertain details as placeholders and replace them after review.

---

## Entry 001 - MVP Type Foundation
- Date: 2026-02-16
- Purpose: Define shared TypeScript contracts for parse/proof/verify/upload flow.
- Prompt text:
  - "Create types in `types/records.ts` to support the MVP pipeline..."
- Outcome produced:
  - Added core request/response and domain types for mapping, rows, parse, proof, and verify payloads.
  - Added compatibility aliases for existing in-progress code paths.
- Important notes / decisions:
  - Kept strict typing and avoided `any`.
  - Preserved existing build compatibility while introducing new contracts.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/types/records.ts`

## Entry 002 - Proof Core Utilities (Canonicalize + Hash + Bundle)
- Date: 2026-02-16
- Purpose: Implement deterministic proof primitives and bundle builder.
- Prompt text:
  - "Implement lib core for proof generation... `stableStringify`, `sha256Hex`, `buildProofBundle` ..."
- Outcome produced:
  - Implemented deterministic stringify and SHA-256 hashing.
  - Implemented bundle assembly with canonical string and event hash.
  - Added schema-backed record typing using Zod.
- Important notes / decisions:
  - Deterministic canonicalization is key for reproducible hashes.
  - Kept logic in pure `lib` modules.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/proof/canonicalize.ts`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/proof/hash.ts`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/proof/bundle.ts`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/excel/schema.ts`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/api/proof/route.ts` (compatibility updates)

## Entry 003 - Storage Stub (Local Deterministic URI)
- Date: 2026-02-16
- Purpose: Add MVP storage behavior without IPFS.
- Prompt text:
  - "Implement a simple storage stub in `lib/storage/storeBundle.ts` ... `local://bundle/<sha256>` ..."
- Outcome produced:
  - Added `storeBundle(bundle)` returning `{ uri }` with deterministic hash-based URI.
- Important notes / decisions:
  - Decided to hash canonical JSON string, not raw object reference.
  - Storage remains local stub for MVP scope.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/storage/storeBundle.ts`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/api/proof/route.ts` (to consume new storage API)

## Entry 004 - Minimal Upload Components
- Date: 2026-02-16
- Purpose: Implement lightweight UI components for file upload, mapping, preview, and proof summary.
- Prompt text:
  - "Implement minimal UI components in /components ... UploadDropzone, MappingWizard, PreviewTable, ProofSummaryCard ..."
- Outcome produced:
  - Added minimal inline-style components with typed props and no styling library.
- Important notes / decisions:
  - Kept UI intentionally simple for MVP.
  - Standardized props around `ColumnMapping` and `ProofResponse`.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/components/UploadDropzone.tsx`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/components/MappingWizard.tsx`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/components/PreviewTable.tsx`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/components/ProofSummaryCard.tsx`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/upload/page.tsx` (integration updates)

## Entry 005 - Upload Orchestration Pipeline
- Date: 2026-02-16
- Purpose: Wire complete upload pipeline (parse -> preview -> mapping -> proof -> verify link).
- Prompt text:
  - "Update `app/upload/page.tsx` to orchestrate the full MVP pipeline..."
- Outcome produced:
  - Implemented parse and proof requests via `FormData`.
  - Added mapping initialization and proof summary rendering.
  - Added verify deep-link with encoded hash query parameter.
- Important notes / decisions:
  - Added robust fallback handling for evolving proof response shape during transition.
  - Later simplified to direct `ProofResponse` consumption once API stabilized.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/upload/page.tsx`

## Entry 006 - Verify Page
- Date: 2026-02-16
- Purpose: Implement manual verification page with expected hash input and API verification call.
- Prompt text:
  - "Implement `app/verify/page.tsx` ... read query param `expected_event_hash` ... POST `/api/verify` ..."
- Outcome produced:
  - Added verify form, API call, result rendering, and optional explorer links display.
- Important notes / decisions:
  - Input defaults from query params to support upload-to-verify flow.
  - Kept `unknown`/type-guard style for response safety.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/verify/page.tsx`

## Entry 007 - Proof API MVP Contract
- Date: 2026-02-16
- Purpose: Rework `/api/proof` to return strict `ProofResponse` and support resilient normalization behavior.
- Prompt text:
  - "Update `app/api/proof/route.ts` ... accept multipart with file+mapping ... normalize ... deterministic canonical ... return `ProofResponse` ..."
- Outcome produced:
  - Implemented Excel first-sheet parsing using ExcelJS and type guards.
  - Added deterministic row sorting and canonical object assembly.
  - Hash + URI generation implemented through proof/storage libs.
  - Returns `ok: true` response with warnings/errors; row count becomes `0` when normalization has errors.
- Important notes / decisions:
  - Fixed issuer to `biosphere-rocks` for MVP.
  - Ensured route does not crash on normalization errors.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/api/proof/route.ts`

## Entry 008 - Parse + Normalize Hardening (Placeholder)
- Date: 2026-02-16 (placeholder)
- Purpose: Improve spreadsheet parsing and normalization edge-case handling.
- Prompt text:
  - Placeholder: "Harden parse/normalize for mixed Excel cell types and missing values."
- Outcome produced:
  - Placeholder: refined date/number coercion and better row filtering.
- Important notes / decisions:
  - Placeholder: preserve deterministic behavior and avoid lossy conversions.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/excel/parseSpreadsheet.ts`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/lib/excel/normalize.ts`

## Entry 009 - API Parse Route Integration (Placeholder)
- Date: 2026-02-16 (placeholder)
- Purpose: Ensure upload parse endpoint returns columns/preview/sample row consistently.
- Prompt text:
  - Placeholder: "Update `app/api/parse/route.ts` for consistent parse response contract."
- Outcome produced:
  - Placeholder: endpoint returns `{ columns, preview, sampleRow, totalRows }`.
- Important notes / decisions:
  - Placeholder: keep runtime `nodejs` and avoid coupling with UI concerns.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/api/parse/route.ts`

## Entry 010 - Verify API Alignment (Placeholder)
- Date: 2026-02-16 (placeholder)
- Purpose: Align verify endpoint output with frontend verify rendering contract.
- Prompt text:
  - Placeholder: "Standardize `/api/verify` response fields and optional explorer object."
- Outcome produced:
  - Placeholder: verify returns computed hash, expected hash, match, and optional explorer links.
- Important notes / decisions:
  - Placeholder: local verification only; no on-chain fetch in MVP.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/app/api/verify/route.ts`

---

## Prompt Templates For Future Entries
Use this template when logging new prompts:

```md
## Entry XXX - Short Title
- Date: YYYY-MM-DD
- Purpose: ...
- Prompt text:
  - "..."
- Outcome produced:
  - ...
- Important notes / decisions:
  - ...
- Affected file paths:
  - /absolute/path/to/file
```

## Entry 011 - Project Planning and Docs Scaffolding
- Date: 2026-02-16
- Prompt description:
  - "Project planning and docs scaffolding"
- Prompt text:
  - "Create a file at `docs/ARCHITECTURE_DECISIONS.md` containing the architectural decisions for the \"Proof of Records\" project.

The file should clearly list and explain each key decision made, including:

1. Deterministic canonical JSON ordering
2. Sorting rows by (date, type, value, unit)
3. Proof bundle structure
4. Minimal on-chain data stored
5. Separation of off-chain and on-chain concerns
6. No use of `any` in TypeScript
7. UI pipeline stages
8. Security and privacy notes (no PII on-chain)
9. MVP scope boundaries

Use Markdown format with headings, subheadings, and explanation text for each decision.
Show the full file content."
  - "Create a file at `docs/MVP_SCOPE.md` that clearly defines the MVP scope for the \"Proof of Records\" project.

The file should include two sections:

# Included in MVP
List only features that must be implemented for the MVP:
- Excel upload
- Mapping wizard
- Normalize rows
- Canonical JSON
- Proof bundle (hash + uri)
- Proof API
- Verify API
- Basic UI (upload + preview + proof summary + verify)

# Excluded from MVP
List features that are explicitly out of scope:
- Marketplace
- Token economics
- Financial instruments
- Multi-chain support
- Hardware integrations
- Full blockchain analytics

Use Markdown with bullet lists and short explanatory text.
Show the full file content."
  - "Create a file at `docs/IOTA_INTEGRATION_NOTES.md` that explains how Proof of Records will integrate with IOTA in the future.

Include:
- Explanation of using IOTA as notarization layer
- What data needs to be stored on-chain (event_hash, uri, issuer, timestamp)
- How Move contracts might be designed (register_proof function)
- Security considerations
- How explorer links will be constructed
- How the verification pipeline should work with on-chain data

Use Markdown with headings and clear sections.
Show full content."
- Outcome:
  - Created documentation files.
- Notes:
  - Conventions established for AI code generation rules.
- Affected file paths:
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/ARCHITECTURE_DECISIONS.md`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/MVP_SCOPE.md`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/IOTA_INTEGRATION_NOTES.md`
  - `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/CODE_GEN_RULES.md`
