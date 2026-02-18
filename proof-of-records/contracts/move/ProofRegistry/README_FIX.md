# README_FIX

This folder previously contained an active Move package manifest (`Move.toml`).

It was renamed to `Move.toml.BACKUP` because the canonical Move package root for this repository is now:

- `contracts/por_contract`

Reason:
- Avoid multiple active Move package roots in one repository to reduce build/deploy ambiguity.
- Preserve the original manifest without deleting any data.
