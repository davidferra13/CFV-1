# ChefFlow Security Implementation Checklist

> Use this as the operational companion to `docs/security/README.md`.

## P0: Stop The Bleed

- [ ] Rotate the developer and agent credentials documented in `docs/research/supply-chain-audit.md`.
- [ ] Remove working passwords and tokens from scripts, tests, and example files.
- [ ] Purge exposed credentials from git history or make the repository private.
- [ ] Turn on CI secret scanning with `npm run verify:secrets`.
- [ ] Review `.env.example` and `.env.local.example` so they use placeholders only.
- [ ] Record who owns each production secret and how it is rotated.

## P1: Identity And Tenant Boundaries

- [ ] Review `middleware.ts` and `lib/auth/route-policy.ts` for every intentional public or skip-auth path.
- [ ] Run Q6, Q70, and Q87 and fix every auth-boundary failure before adding new protected features.
- [ ] Require MFA for admin, staff, and chef accounts.
- [ ] Review invite, recovery, impersonation, and role-change paths.
- [ ] Confirm tenant IDs never come from request bodies in server actions or API writes.

## P1: Public And API Surfaces

- [ ] Inventory every public token route and confirm `checkRateLimit(...)` exists.
- [ ] Inventory every webhook route and confirm signature verification exists.
- [ ] Inventory every cron route and confirm cron secret enforcement exists.
- [ ] Confirm idempotency on payment, notification, and document-generation side effects.
- [ ] Add payload-size and malformed-body handling to public POST surfaces.

## P1: Data Protection

- [ ] Create a data inventory for PII, dietary data, contracts, schedules, financials, AI artifacts, and logs.
- [ ] Mark each data type as `public`, `internal`, `restricted`, or `regulated`.
- [ ] Define retention windows and purge behavior for each sensitive data type.
- [ ] Confirm local, staging, and demo data do not contain uncontrolled production data.
- [ ] Define export and delete behavior for user-facing personal data.

## P1: Audit And Response

- [ ] Confirm privileged actions write to an audit trail.
- [ ] Alert on repeated auth failures, webhook signature failures, dead-letter growth, and large public-route traffic spikes.
- [ ] Add a breach runbook for secret rotation, session invalidation, evidence capture, and user notification.
- [ ] Confirm backups and exports are access-controlled and not silently accumulating in the repo or local workspace.

## P2: Supply Chain

- [ ] Triage the dependency findings in `docs/research/supply-chain-audit.md`.
- [ ] Replace packages with unpatched security issues where practical.
- [ ] Decide which `npm audit` findings are accepted temporarily and document why.
- [ ] Review auth, parsing, storage, and document-processing libraries first.

## P2: AI And Privacy

- [ ] For every AI surface, declare privacy level and runtime lane.
- [ ] Confirm restricted data stays on the most private runtime available.
- [ ] Confirm UI privacy claims match the actual code path and storage behavior.
- [ ] Require explicit approval for sensitive or irreversible AI actions.
- [ ] Log routing decisions and action outcomes for investigation.

## Release Gate

- [ ] `npm run verify:secrets`
- [ ] `npm audit`
- [ ] `npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q6-server-action-auth.spec.ts`
- [ ] `npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q70-public-route-auth-inventory.spec.ts`
- [ ] `npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q87-server-action-auth-completeness.spec.ts`
- [ ] feature-specific public/API/webhook tests for the surface being shipped

## Non-Negotiables For New Features

- [ ] No new public route without an explicit reason.
- [ ] No new server action without an auth guard or documented public reason.
- [ ] No new webhook without signature verification and replay safety.
- [ ] No new token route without rate limiting.
- [ ] No new sensitive data store without retention and deletion rules.
- [ ] No new AI lane without documented privacy behavior.
