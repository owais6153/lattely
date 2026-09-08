# Agent Guide

## Project overview

Lattely is a TypeScript/NestJS API for a reel-led, location-aware dating workflow. It uses TypeORM with MySQL and has no frontend in this repository.

## Mandatory reading

1. Read `docs/CURRENT_STATE.md` before changing behavior.
2. Read the relevant sections of `docs/ARCHITECTURE.md` and `docs/CODEBASE_MAP.md`.
3. Read the relevant feature in `docs/FEATURES.md`.
4. Check `docs/DECISIONS.md` and `docs/KNOWN_ISSUES.md` when the task touches architecture, data, integrations, or a known risk.

## Rules

- Inspect affected code and search for existing implementations before editing.
- Preserve Nest module/controller/service/entity patterns and make the smallest reasonable change.
- Do not refactor unrelated code, duplicate functionality, silently add dependencies, or casually change public API routes or TypeORM entities.
- Verify assumptions from code/configuration; mark unsupported conclusions as **Unknown / Needs Verification**.
- Reuse existing utilities and update the relevant Markdown when behavior changes.
- Do not run frontend builds after every change; this repository has no frontend. Run validation proportionately, usually once after a coherent backend change.

## Validation

Use the repository scripts where appropriate:

```bash
npm run build
npm test
npm run lint
```

`lint` includes `--fix`, so it can modify source files. Review `git diff` afterwards. There is no separate typecheck script; `npm run build` performs TypeScript compilation.
