# MVP Scope - Proof of Records

This document defines the delivery boundary for the initial MVP release.

# Included in MVP
These are the required features for MVP completion:

- Excel upload
  - Upload `.xlsx`/spreadsheet files as the source input for records.
- Mapping wizard
  - Map spreadsheet columns to required canonical fields (`date`, `type`, `value`, `unit`).
- Normalize rows
  - Validate and normalize mapped row values into a consistent typed structure.
- Canonical JSON
  - Build deterministic canonical JSON so equal data always produces equal output.
- Proof bundle (hash + uri)
  - Generate SHA-256 hash and a deterministic URI reference for the canonical payload.
- Proof API
  - Backend endpoint to parse, normalize, canonicalize, and return proof artifacts.
- Verify API
  - Backend endpoint to recompute/compare hash and report verification status.
- Basic UI (upload + preview + proof summary + verify)
  - Minimal pages/components to run the full flow end-to-end.

# Excluded from MVP
These capabilities are explicitly out of scope for MVP:

- Marketplace
  - No trading, exchange, or listing functionality.
- Token economics
  - No token issuance, incentives, staking, or governance mechanics.
- Financial instruments
  - No derivatives, lending, structured products, or similar finance modules.
- Multi-chain support
  - No cross-chain orchestration or multiple network integrations in MVP.
- Hardware integrations
  - No IoT/edge device integrations in this phase.
- Full blockchain analytics
  - No advanced analytics dashboards, historical indexing, or deep chain intelligence.
