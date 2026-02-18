# IOTA Integration Notes - Future Plan

This document describes how **Proof of Records** can integrate with IOTA after MVP, using IOTA as a notarization layer while keeping sensitive data off-chain.

## 1) IOTA as the Notarization Layer

Proof of Records should use IOTA to anchor integrity proofs, not to store full datasets.

- Off-chain: keep normalized records and canonical payloads.
- On-chain (IOTA): store minimal immutable proof metadata.
- Result: anyone can verify integrity and issuance time without exposing raw operational data publicly.

Why this model:
- Lower on-chain cost.
- Better privacy posture.
- Strong auditability via immutable hash anchoring.

---

## 2) On-Chain Data Model (Minimum Fields)

The minimum fields that should be written on-chain are:

- `event_hash`
  - SHA-256 of deterministic canonical payload.
  - Primary integrity anchor.
- `uri`
  - Reference to off-chain bundle location (or deterministic local/remote URI).
- `issuer`
  - Identifier of entity/process that issued the proof.
- `timestamp`
  - RFC3339/ISO timestamp captured at issuance.

Notes:
- Do **not** store raw records or PII on-chain.
- Keep metadata compact and deterministic where possible.

---

## 3) Move Contract Design Direction

A future Move module can expose a function such as `register_proof`.

## Suggested high-level function

```move
public entry fun register_proof(
    event_hash: vector<u8>,
    uri: vector<u8>,
    issuer: vector<u8>,
    timestamp: u64,
    ctx: &mut TxContext
)
```

## Behavioral expectations
- Validate required fields are non-empty.
- Persist a proof object/event containing the four canonical metadata fields.
- Emit an event so indexers/explorers can surface proof registration quickly.
- Optionally enforce issuer authorization model (allowlist, capability, or ownership-based controls).

## Optional future extensions
- `revoke_proof` / `supersede_proof` semantics.
- issuer registry.
- versioned schema identifiers.

---

## 4) Security Considerations

Integration should include the following controls:

- Canonicalization integrity
  - Enforce deterministic serialization before hashing.
- Replay / duplicate handling
  - Decide whether duplicate `event_hash` entries are allowed and under what issuer rules.
- Issuer authenticity
  - Bind writes to wallet/account identity and application-level issuer policy.
- Input validation
  - Check sizes, encodings, and required-field presence before writing on-chain.
- Privacy
  - Never publish raw PII or sensitive row-level data on-chain.
- Operational safeguards
  - Add monitoring and alerting around failed notarization or mismatch rates.

---

## 5) Explorer Link Construction

Explorer links should be created from network-aware base URLs plus identifiers returned after notarization.

Typical links:
- Transaction: `<explorerBase>/transaction/<txId>`
- Object: `<explorerBase>/object/<objectId>`
- Package: `<explorerBase>/package/<packageId>`

Implementation notes:
- Select base by environment/network (`mainnet`, `testnet`, `devnet`).
- Store IDs returned by notarization in the proof response for UI rendering.
- Keep link building centralized (single helper) to avoid drift.

---

## 6) Verification Pipeline with On-Chain Data

Future verification should combine local recomputation with on-chain metadata comparison.

## Step-by-step
1. Rebuild canonical payload off-chain from source records.
2. Compute `event_hash` using deterministic canonical string.
3. Fetch on-chain proof record by object/tx/event reference.
4. Compare:
   - recomputed hash vs on-chain `event_hash`
   - expected `issuer` vs on-chain `issuer`
   - expected `uri` vs on-chain `uri`
   - expected issuance time constraints vs on-chain `timestamp`
5. Report verification status and include explorer links.

## Verification outcomes
- `match = true`: all required comparisons succeed.
- `match = false`: at least one integrity/metadata mismatch.
- `indeterminate`: missing references, unavailable chain data, or malformed payload.

---

## 7) Implementation Phasing Suggestion

Phase after MVP:
- Add Move module and deployment pipeline.
- Add backend notarization endpoint to call IOTA client.
- Extend proof response with chain IDs/links.
- Upgrade verify endpoint to fetch and compare on-chain proof metadata.

This preserves current MVP architecture while adding notarization without redesigning core normalization/canonicalization logic.
