# Architecture Decisions - Proof of Records

This document records the core architectural decisions for the MVP implementation of **Proof of Records**.

## Decision 1: Deterministic Canonical JSON Ordering

### Decision
Use deterministic JSON serialization (`stableStringify`) that recursively sorts object keys while preserving array order.

### Rationale
Proof verification depends on producing the exact same byte string for the same logical data. Non-deterministic key ordering would create different hashes for equivalent payloads.

### Consequences
- Hashes are reproducible across environments.
- Verification can be performed independently by third parties.

---

## Decision 2: Row Sorting by (date, type, value, unit)

### Decision
Sort normalized rows ascending by:
1. `date` (string compare)
2. `type` (string compare)
3. `value` (numeric compare)
4. `unit` (string compare)

### Rationale
Input spreadsheet order can vary. Sorting gives a stable canonical row sequence independent of source ordering.

### Consequences
- Same data set yields same canonical string and hash.
- Reduces false mismatches during verification.

---

## Decision 3: Proof Bundle Structure

### Decision
Use a normalized `ProofResponse`/bundle contract including:
- `ok`
- `rows_count`
- `event_hash`
- `canonical_string`
- `uri`
- `issuer`
- `timestamp`
- `warnings`
- `errors`

### Rationale
The frontend and API need a single, explicit contract for generation and verification flows.

### Consequences
- UI rendering is straightforward and typed.
- Errors and warnings are visible without crashing the pipeline.

---

## Decision 4: Minimal On-Chain Data Stored

### Decision
Store only minimal proof identifiers on-chain (hash/reference-oriented data), not full datasets.

### Rationale
On-chain storage is costly, public, and immutable. Full record payloads are better handled off-chain.

### Consequences
- Lower cost and smaller on-chain footprint.
- Better privacy posture.

---

## Decision 5: Separation of Off-Chain and On-Chain Concerns

### Decision
Keep canonicalization, normalization, hashing, and storage URI generation off-chain in pure library modules. Treat on-chain notarization as a later step.

### Rationale
The MVP must validate proof mechanics first without coupling to blockchain transaction complexity.

### Consequences
- Faster iteration during MVP.
- Easier testability and maintainability.
- Clear migration path to later notarization.

---

## Decision 6: No Use of `any` in TypeScript

### Decision
Disallow `any` and use `unknown` + type guards for unsafe inputs (API payloads, Excel cell values).

### Rationale
This reduces runtime type bugs and clarifies boundary validation logic.

### Consequences
- Better compile-time safety.
- More explicit validation code at integration boundaries.

---

## Decision 7: UI Pipeline Stages

### Decision
Implement a staged UI pipeline:
1. Upload file
2. Parse columns/preview
3. Map required fields
4. Generate proof
5. View proof summary
6. Verify hash on verify page

### Rationale
Breaking the flow into explicit stages improves usability and error recovery.

### Consequences
- Users can inspect and correct mapping before proof generation.
- Failures are localized to a specific stage.

---

## Decision 8: Security and Privacy Notes (No PII On-Chain)

### Decision
Do not place personally identifiable information (PII) or raw sensitive records on-chain. Use hashes and references only.

### Rationale
Public chains are transparent and immutable; storing PII would create long-term privacy and compliance risks.

### Consequences
- Safer default for compliance-sensitive domains.
- Requires off-chain data governance and access controls.

---

## Decision 9: MVP Scope Boundaries

### Decision
MVP includes:
- Spreadsheet parsing
- Column mapping
- Normalization
- Deterministic canonicalization
- SHA-256 proof generation
- Local deterministic URI storage stub
- Local verification API/UI

MVP excludes:
- Production-grade decentralized storage integration
- Full on-chain Move notarization flow
- Advanced access control and multi-tenant policies

### Rationale
Scope control keeps delivery focused on proving the integrity pipeline end-to-end.

### Consequences
- Faster validation of core concept.
- Known follow-up work for production readiness.

---

## Revision Notes
- Last updated: 2026-02-16
- Status: MVP decisions (subject to revision for production hardening)
