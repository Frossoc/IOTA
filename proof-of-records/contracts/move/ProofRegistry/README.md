# ProofRegistry (Move)

Minimal Move package scaffold for Proof of Records notarization.

## Module
- Package: `ProofRegistry`
- Module: `proof_registry::proof_registry`
- Function: `register_proof(event_hash, uri, schema_version, adapter)`

## Deployment Placeholders
- Network: `<IOTA_NETWORK>`
- RPC URL: `<IOTA_RPC_URL>`
- Package ID: `<PACKAGE_ID_AFTER_PUBLISH>`
- Module Name: `proof_registry`
- Function Name: `register_proof`

## Example Call Payload
- `event_hash`: utf8 bytes of SHA-256 hex
- `uri`: utf8 bytes of `ipfs://...` or `local://...`
- `schema_version`: utf8 bytes, e.g. `"v1"`
- `adapter`: utf8 bytes, e.g. `"records"`

## Notes
- MVP design emits `ProofRegistered` event instead of storing large on-chain state.
- No PII should be included in function args.
