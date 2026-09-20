# Copilot instructions

All guidance for this repository lives in [`AGENTS.md`](../AGENTS.md).

Read it before making changes. It is the single source of truth — do not duplicate
rules here, and do not treat this file as an override.

The constraints most often broken:

- Never add `eslint` / `typescript-eslint` — this project is on TypeScript 7 and lints with `oxlint --type-aware`.
- Never hand-write `src/components/ui/*` — use `bunx --bun shadcn@latest add <component>`.
- Never fetch prayer times from a network API — they are computed locally with `adhan`.
- Never render a high-latitude-derived prayer time without its rule marker.
