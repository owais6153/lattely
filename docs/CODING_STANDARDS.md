# Coding Standards

These are observed conventions, not aspirational rules.

## Structure and naming

- Features use Nest folders containing `*.module.ts`, controller/service files, DTOs, and entities where needed.
- Classes use PascalCase; source filenames are mostly kebab-case (for example, `google-places.service.ts`).
- Controllers expose route handling and services contain persistence/business logic.
- TypeORM entities use decorators, UUID primary keys, and TypeScript union strings for status-like fields rather than database enums.

## API and validation

- DTOs use `class-validator`; the global pipe whitelists, transforms, and rejects unknown fields.
- Authenticated controllers commonly access `req.user.id` as `any`; no typed request-user abstraction is consistently used.
- Services use Nest exceptions (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`) for expected API failures.
- Responses are manually shaped in services; there is no common response wrapper or serialization layer.

## Persistence and security

- Services receive TypeORM repositories with `@InjectRepository`.
- `UsersService` uses explicit safe select lists so password hashes are normally omitted; its authentication query selects the hash intentionally.
- JWT bearer authentication is global. Public routes require `@Public()`.
- Reels are stored on local disk with UUID filenames; invalid/failed uploads are best-effort deleted.

## Formatting and linting

- Prettier config uses single quotes and trailing commas.
- ESLint is TypeScript-aware and imports Prettier/security rules. `npm run lint` automatically fixes files.
- The codebase has import-order and unused-variable rules, although current source contains some inconsistencies (for example an unused `ConfigService` injection in the reels controller and absolute `src/...` import in auth controller).

## Testing

- Nest default Jest configuration looks for `*.spec.ts` below `src`.
- No tracked test files currently exist. Do not assume a test style beyond the Jest configuration.
