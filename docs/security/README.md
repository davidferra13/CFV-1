# ChefFlow Security Foundation

> Canonical build plan for preventing data leaks, unauthorized access, unsafe vendor usage, and privacy drift across ChefFlow.

## Purpose

ChefFlow already has meaningful security infrastructure in code. What it lacks is one place that translates those controls into a build sequence the team can copy for every new feature.

This document is that sequence.

## What We Are Protecting

ChefFlow handles data that should be treated as sensitive by default:

- customer and guest PII
- dietary restrictions and allergy data
- private addresses, schedules, and travel details
- payment and payout metadata
- contracts, documents, and signatures
- staff records and internal operating data
- chef business intelligence, pricing, and financials
- AI prompts, AI outputs, and action proposals

## Current Security Spine In The Repo

These are the real controls already present in the codebase and should remain the foundation instead of being replaced by ad-hoc rules:

| Area                                       | Current anchor                                                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| request auth boundary                      | `middleware.ts`                                                                                                                                                                                |
| route classification                       | `lib/auth/route-policy.ts`                                                                                                                                                                     |
| request auth context propagation           | `lib/auth/request-auth-context.ts`                                                                                                                                                             |
| page/server-action auth helpers            | `lib/auth/get-user.ts`                                                                                                                                                                         |
| API auth inventory                         | `lib/api/auth-inventory.ts`                                                                                                                                                                    |
| server-action auth inventory               | `lib/auth/server-action-inventory.ts`                                                                                                                                                          |
| AI routing and privacy policy              | `docs/ai-model-governance.md`, `lib/ai/dispatch/`                                                                                                                                              |
| structural auth tests                      | `tests/system-integrity/q6-server-action-auth.spec.ts`, `tests/system-integrity/q70-public-route-auth-inventory.spec.ts`, `tests/system-integrity/q87-server-action-auth-completeness.spec.ts` |
| public/API coverage checks                 | `tests/coverage/06-api-routes.spec.ts`                                                                                                                                                         |
| known seam failures and fixes              | `docs/specs/system-integrity-question-set-battle-tested-seams.md`                                                                                                                              |
| supply-chain and credential exposure audit | `docs/research/supply-chain-audit.md`                                                                                                                                                          |

## Immediate Reality

The biggest known risks are not theoretical:

1. `docs/research/supply-chain-audit.md` documents exposed credentials in repo history and widespread hardcoded test credentials. That is a stop-the-bleed issue.
2. ChefFlow has a very large route and API surface. The main leak risk is not one broken page, it is one unaudited route, one unauthenticated server action, or one allowlisted endpoint that drifts.
3. The product uses multiple third parties and special surfaces: Stripe, Resend, Twilio, Gmail, public token pages, cron endpoints, AI runtimes, storage, mobile, and desktop. Those surfaces need explicit boundary rules.

## Core Build Rules

These are the rules to mimic on every new feature:

1. Every route must have an explicit classification in `lib/auth/route-policy.ts`.
2. Every exported server action in a `'use server'` file must start with `requireChef()`, `requireClient()`, `requireStaff()`, `requirePartner()`, `requireAuth()`, or a documented public reason.
3. Every API route without standard auth must be intentionally inventoried in `lib/api/auth-inventory.ts` and protected by a different mechanism such as token validation, signature verification, or cron secret.
4. Every public token page must have page-level rate limiting.
5. Every webhook must verify its signature and be idempotent.
6. Every cron endpoint must reject requests without the cron secret.
7. Every admin or service-role bypass must be tenant-scoped and audit-logged.
8. Every new table or document type must declare retention, deletion, export, and visibility rules.
9. Every AI feature must declare privacy level, runtime lane, storage behavior, and approval behavior before shipping.
10. Never rely on middleware alone. Middleware is one layer; server actions and API handlers still need their own guards.

## Workstreams

## 1. Secrets And Repo Hygiene

Do first, before feature work expands the blast radius.

- Rotate every exposed credential called out in `docs/research/supply-chain-audit.md`.
- Purge exposed credentials from public git history or make the repo private.
- Move all hardcoded passwords and tokens in scripts, tests, and examples into `.env` or `.auth/`.
- Keep secret-bearing files out of git with `.gitignore`.
- Run `npm run verify:secrets` in CI and block merges on failures.

Definition of done:

- no live credential remains in repo history that can be used today
- secret scan runs in CI
- example files use placeholders, not working passwords

## 2. Identity And Access

- Keep `middleware.ts` and `lib/auth/route-policy.ts` as the single route boundary.
- Keep `getCurrentUser()` and `require*()` helpers as the only supported way to derive tenant context in app code.
- Reject request-body tenant IDs for server actions and handlers.
- Require MFA for admin, staff, and chef accounts before production rollout.
- Review role escalation paths, invite flows, and account recovery flows.

Definition of done:

- Q6, Q70, and Q87 stay green
- tenant context only comes from session or trusted server-side lookup
- privileged roles require MFA

## 3. Public, API, Webhook, And Cron Surfaces

- Review every `API_SKIP_AUTH_PREFIXES` entry regularly; treat each one as a security exception, not a convenience.
- Require signature verification for Stripe, Twilio, Resend, Wix, and other inbound webhooks.
- Require idempotency for financial, messaging, and document generation side effects.
- Put rate limits on public POST endpoints, token pages, and any enumeration-prone read route.
- Add payload size limits and body parsing guards where uploads or large payloads exist.

Definition of done:

- malformed webhooks fail closed
- cron routes reject unauthenticated callers
- token routes are rate limited
- side effects are safe to retry

## 4. Data Protection And Retention

- Create a simple data classification matrix: public, internal, restricted, regulated.
- Minimize what is stored. If ChefFlow does not need a field long-term, delete or avoid storing it.
- Define retention and purge behavior for messages, documents, AI artifacts, logs, and backups.
- Separate production data from dev and staging data. No raw production export should be used for local testing without scrubbing.
- Make sure export/delete flows exist for customer-facing personal data.

Definition of done:

- every sensitive data type has an owner, retention rule, and deletion path
- storage locations are known
- non-production environments do not carry uncontrolled real user data

## 5. Observability, Audit, And Incident Response

- Keep request IDs on every request and propagate them through critical flows.
- Audit-log admin actions, access-sensitive mutations, privilege changes, exports, and financial operations.
- Alert on unusual patterns: repeated failed auth, signature failures, sudden export volume, large token-route traffic, secret-scan failures, and queue dead letters.
- Write a breach runbook covering secret rotation, forced session invalidation, customer communication, forensic preservation, and regulatory review.

Definition of done:

- sensitive actions are traceable
- failures that could hide an incident are visible
- incident response is documented before production trust claims are made

## 6. Supply Chain And Dependency Hygiene

- Use the findings in `docs/research/supply-chain-audit.md` as the baseline backlog.
- Replace packages with known unpatched security issues where feasible.
- Run `npm audit` on a schedule and track accepted exceptions explicitly.
- Review auth, storage, and parsing libraries first because compromise there has high leverage.

Definition of done:

- accepted dependency risk is documented
- critical dependency issues are either fixed or explicitly time-boxed

## 7. AI And Privacy Boundaries

- Keep `docs/ai-model-governance.md` and `lib/ai/dispatch/` as the source of truth for routing.
- Restricted data should stay on the most private lane available.
- Do not claim stronger privacy guarantees in UI copy than the code actually enforces.
- Log AI routing decisions, approval state, and action outcomes.
- Treat AI-generated actions as untrusted until policy allows execution.

Definition of done:

- every AI lane declares privacy level and storage behavior
- restricted data does not silently drift onto a less private runtime
- user-facing privacy copy matches actual implementation

## Build Order

Use this order when planning the next security push:

1. Stop live credential and repo-history exposure.
2. Lock identity and tenant boundaries.
3. Close public/API/webhook/cron surface gaps.
4. Define retention and deletion rules for stored data.
5. Improve audit trails, alerting, and incident response.
6. Burn down dependency and vendor risk.
7. Tighten AI privacy and action governance.

## Security Release Gate

Before shipping a meaningful new surface, the team should be able to answer yes to all of these:

- Is the route classified?
- Does the server action or API handler authenticate early?
- If public, is the public exposure intentional and documented?
- If tokenized, is it rate limited?
- If webhook-driven, is the signature checked and replay-safe?
- If cron-triggered, is the cron secret enforced?
- If tenant data is touched, does tenant context come from the session instead of request input?
- If the feature stores sensitive data, are retention and deletion rules defined?
- If the feature uses AI, is privacy routing and storage behavior documented?
- Is there at least one automated test proving the boundary?

## Minimum Commands For A Security Check

Use these as the starting gate before release work:

```bash
npm run verify:secrets
npm audit
npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q6-server-action-auth.spec.ts
npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q70-public-route-auth-inventory.spec.ts
npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q87-server-action-auth-completeness.spec.ts
```

Add route-specific and webhook-specific tests when a feature expands the attack surface.

## Feature Template

When adding a new feature, copy this checklist into the spec or PR:

- route classification added or confirmed
- auth guard added at the entry point
- tenant lookup derived from session
- rate limit added if public
- signature or token validation added if externally triggered
- audit log added if privileged or sensitive
- retention and deletion behavior defined
- AI/privacy lane declared if applicable
- automated boundary test added
