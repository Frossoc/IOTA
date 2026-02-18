# Code Generation Rules (AI)

These rules define how AI-generated code must be produced for the **Proof of Records** project.

## 1) Type Safety: Never Use `any`
- Do not use `any` in TypeScript code.
- Use `unknown` for untrusted input and narrow via type guards.
- Prefer explicit interfaces/types for API payloads and component props.

Why:
- Prevents silent type regressions and runtime surprises.

## 2) Deterministic Canonicalization Is Mandatory
- Canonical JSON must be deterministic.
- Use `stableStringify` from the project proof library.
- Object keys must be sorted recursively; array order must be preserved.

Why:
- Hashes must be reproducible for verification.

## 3) Keep TypeScript Strict
- Respect strict TypeScript settings already configured in the project.
- Do not weaken compiler rules to make code pass.
- Fix typing at the source instead of bypassing checks.

Why:
- Strict mode is a core quality gate for this codebase.

## 4) Use Only the Project Folder Structure
- Place new code only in approved project directories.
- Reuse existing modules in `app/`, `app/lib/`, `app/components/`, `app/types/`, and `docs/` as applicable.
- Follow existing path alias conventions (`@/*`).

Why:
- Keeps project organization predictable and maintainable.

## 5) Do Not Rename Project Folders
- Never rename core folders unless explicitly requested.
- Never move files across major module boundaries without explicit approval.

Why:
- Prevents broken imports, tooling drift, and review confusion.

## 6) Obey Architecture Decisions
- Always align generated code with `docs/ARCHITECTURE_DECISIONS.md`.
- If a request conflicts with architecture decisions, flag the conflict and use the approved architecture as default.

Why:
- Preserves consistency across contributors and AI-generated changes.

## 7) Provide Full File Contents on Generation
- When asked to create or update files, return full file content.
- Do not provide partial snippets unless explicitly requested.

Why:
- Full-file output makes auditing and replacement straightforward.

## 8) UI Styling: Inline Styles Only
- Use inline style objects for UI components unless instructed otherwise.
- Do not introduce Chakra, MUI, Tailwind class-based UI, or external styling systems for MVP UI changes.

Why:
- Maintains the project’s minimal UI approach and avoids style-stack sprawl.

## 9) Framework Scope: Next.js + TypeScript Only
- Do not add frameworks outside existing stack (Next.js, React, TypeScript).
- Do not introduce new ORMs, design systems, or app frameworks unless explicitly requested.

Why:
- Keeps MVP focused, low-risk, and lightweight.

## 10) Preserve Pure Logic Boundaries
- Keep canonicalization, hashing, normalization, and bundle construction in `app/lib/*` pure functions.
- Pages/components should orchestrate calls and render UI only.

Why:
- Improves testability and prevents business logic leakage into UI layers.

## 11) Validation and Error Handling Expectations
- Validate API inputs at boundaries (routes and parsing layers).
- Return structured errors; avoid crashes for expected invalid input.
- Surface warnings/errors in UI where relevant.

Why:
- MVP reliability depends on graceful handling of imperfect real-world spreadsheets.

## 12) Post-Change Quality Gate
- After edits, ensure TypeScript compile and lint checks pass.
- Do not consider a change complete if checks fail.

Why:
- Prevents unstable commits and protects developer velocity.

---

## Reference Documents
- `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/ARCHITECTURE_DECISIONS.md`
- `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/MVP_SCOPE.md`
- `/Users/fernandorosso/Documents/Proyectos/IOTA/proof-of-records/docs/AI_PROMPT_LOG.md`
