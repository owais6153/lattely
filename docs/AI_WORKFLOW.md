# AI Workflow

## Before coding

1. Read `AGENTS.md` and `docs/CURRENT_STATE.md`.
2. Identify the relevant feature in `docs/FEATURES.md`.
3. Read its architecture/map sections and search the repository for existing implementations.
4. Inspect affected files, entities, DTOs, guards, and related tests (if any).
5. Check `docs/DECISIONS.md` and `docs/KNOWN_ISSUES.md` for constraints.

## During implementation

- Keep scope narrow and preserve the module/controller/service/entity architecture.
- Reuse existing utilities; avoid unrelated refactors and duplicate flows.
- Do not silently change dependencies, public API routes, JWT claims, static URL conventions, or entities.
- Consider the global guards and database synchronization before adding a route or entity.
- Maintain backward compatibility where supported by existing callers/data.

## After implementation

1. Format only when appropriate.
2. Run lint, noting that the script writes fixes.
3. Run relevant tests; add/repair tests when that is within task scope.
4. Run `npm run build` once after a coherent backend change.
5. Review `git diff` and confirm no unrelated files changed.
6. Update affected documentation, `CURRENT_STATE.md` when status changes, and `CHANGELOG.md` for meaningful changes.
