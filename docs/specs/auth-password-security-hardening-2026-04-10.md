# Spec: Auth and Password Security Hardening

> **Status:** verified
> **Priority:** P0
> **Depends on:** none
> **Estimated complexity:** medium-large (8-12 files plus 1 migration)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event             | Date             | Agent/Session | Commit |
| ----------------- | ---------------- | ------------- | ------ |
| Created           | 2026-04-08 00:00 | Codex session |        |
| Research verified | 2026-04-08 00:00 | Codex session |        |
| Status: ready     | 2026-04-08 00:00 | Codex session |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

Write me a spec on the research and knowledge we need to apply so I can build this out on April 10 when my tokens reset.

### Developer Intent

- **Core goal:** harden ChefFlow's password and account-auth flows without rewriting the entire auth stack.
- **Planning constraint:** this deliverable is a spec, not the implementation.
- **Execution timing:** the build work is intended for April 10.
- **Success condition:** one implementation brief exists that explains what is already good, what is actually weak, what research matters, what decisions to make, and what exact order to build in.

---

## What This Does (Plain English)

After this is built, ChefFlow will still use its current auth model, but password handling will be materially harder to abuse. New and changed passwords will be validated through one shared policy, obvious breached/common passwords will be rejected, login and reset abuse will be throttled by a durable limiter instead of process memory, password-change behavior will be made consistent, and the code will stop relying on Supabase settings that the app's current custom flow does not actually enforce.

---

## Why It Matters

The current system is not failing at the most basic level. User passwords are already hashed with bcrypt before they are stored, login checks use bcrypt comparison, and reset tokens are hashed before storage. That is the good part.

The weak part is everything around the hash:

- password policy is basic and inconsistent with current best practice
- abuse controls are in-memory only
- the main user flows bypass most Supabase Auth policy enforcement because the app writes `auth.users` directly
- there is an unused authenticated password-update path in code that should not exist in a hardened design

This spec fixes the real gap: turning "passwords are hashed" into "the whole password lifecycle is defensible."

---

## Research and Evidence

### Verified Local Evidence

- Chef and client signup hash passwords with bcrypt before storing them in `auth.users.encrypted_password`: [lib/auth/actions.ts:147](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L147), [lib/auth/actions.ts:148](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L148), [lib/auth/actions.ts:287](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L287)
- The auth schema stores password hashes in `encrypted_password`: [lib/db/schema/auth.ts:22](c:/Users/david/Documents/CFv1/lib/db/schema/auth.ts#L22)
- Login verifies passwords with `bcrypt.compare(...)`: [lib/auth/auth-config.ts:113](c:/Users/david/Documents/CFv1/lib/auth/auth-config.ts#L113), [lib/auth/auth-config.ts:114](c:/Users/david/Documents/CFv1/lib/auth/auth-config.ts#L114)
- Password reset tokens are SHA-256 hashed before storage: [lib/auth/actions.ts:480](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L480), [lib/auth/actions.ts:518](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L518)
- The reset flow expires recovery tokens after 1 hour and clears them after successful use: [lib/auth/actions.ts:526](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L526), [lib/auth/actions.ts:535](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L535)
- Logged-in password change currently re-verifies the old password before writing a new hash: [lib/auth/actions.ts:591](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L591), [lib/auth/actions.ts:615](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L615), [lib/auth/actions.ts:619](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L619)
- Current app-side password policy is only min `8` / max `128`: [lib/auth/actions.ts:32](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L32), [lib/auth/actions.ts:33](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L33), [lib/auth/actions.ts:43](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L43), [lib/auth/actions.ts:44](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L44), [lib/auth/actions.ts:63](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L63), [lib/auth/actions.ts:64](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L64)
- Login, signup, reset, and change-password throttling all currently depend on an in-memory map: [lib/rateLimit.ts:1](c:/Users/david/Documents/CFv1/lib/rateLimit.ts#L1), [lib/rateLimit.ts:14](c:/Users/david/Documents/CFv1/lib/rateLimit.ts#L14)
- The repo already documents this as a scale/reliability breakpoint: [docs/research/2026-04-04-dev-it-sysadmin-workflows.md:145](c:/Users/david/Documents/CFv1/docs/research/2026-04-04-dev-it-sysadmin-workflows.md#L145)
- `rate-limiter-flexible` is already installed and documented as suitable for PostgreSQL-backed limits: [docs/specs/infrastructure-acquisition-manifest.md:13](c:/Users/david/Documents/CFv1/docs/specs/infrastructure-acquisition-manifest.md#L13), [docs/specs/infrastructure-acquisition-manifest.md:70](c:/Users/david/Documents/CFv1/docs/specs/infrastructure-acquisition-manifest.md#L70)
- Supabase local auth config in the repo currently allows weaker settings than the app should use:
  - `minimum_password_length = 6`: [database/config.toml:175](c:/Users/david/Documents/CFv1/database/config.toml#L175)
  - `password_requirements = ""`: [database/config.toml:178](c:/Users/david/Documents/CFv1/database/config.toml#L178)
  - `secure_password_change = false`: [database/config.toml:211](c:/Users/david/Documents/CFv1/database/config.toml#L211)
- The app's main auth paths are custom app code, not Supabase-hosted password APIs:
  - signup writes `auth.users` directly: [lib/auth/actions.ts:152](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L152), [lib/auth/actions.ts:291](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L291)
  - login uses Auth.js credentials verification against `auth.users`: [lib/auth/auth-config.ts:73](c:/Users/david/Documents/CFv1/lib/auth/auth-config.ts#L73), [lib/auth/auth-config.ts:95](c:/Users/david/Documents/CFv1/lib/auth/auth-config.ts#L95), [lib/auth/auth-config.ts:113](c:/Users/david/Documents/CFv1/lib/auth/auth-config.ts#L113)
- **Inference from the code above:** Supabase password-policy knobs in `database/config.toml` are not the real source of truth for the app's primary email/password flows. Those controls matter only where the app routes through Supabase Auth behavior; this repo currently performs most password handling itself.
- There is an exported `updatePassword()` branch for authenticated sessions that updates the password without current-password re-verification if no recovery token is supplied: [lib/auth/actions.ts:511](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L511), [lib/auth/actions.ts:542](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L542), [lib/auth/actions.ts:548](c:/Users/david/Documents/CFv1/lib/auth/actions.ts#L548)
- Current UI usage appears to rely on `changePassword()` for settings changes and `updatePassword(..., recoveryToken)` for reset links, which means the authenticated branch of `updatePassword()` looks unused and should be removed or guarded: [components/settings/change-password-form.tsx:50](c:/Users/david/Documents/CFv1/components/settings/change-password-form.tsx#L50), [app/auth/reset-password/page.tsx:48](c:/Users/david/Documents/CFv1/app/auth/reset-password/page.tsx#L48)
- The repo's latest security audit moved overall risk from HIGH to MODERATE after previous fixes, which means this work is hardening on top of a system that already received major auth and tenant-isolation repairs: [docs/security-audit-2026-04-04.md:5](c:/Users/david/Documents/CFv1/docs/security-audit-2026-04-04.md#L5)

### Verified External Evidence

- OWASP Password Storage Cheat Sheet says Argon2id is preferred for new systems, but bcrypt remains acceptable for legacy systems at work factor `10` or greater; it also warns that bcrypt has a 72-byte input limit and recommends tuning work factor based on real server performance.
  - https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet says:
  - if MFA is not enabled, passwords shorter than 15 characters should be treated as weak
  - if MFA is enabled, passwords shorter than 8 characters are weak
  - maximum length should be at least 64 characters
  - applications should allow Unicode and whitespace
  - applications should not impose composition rules
  - applications should avoid arbitrary periodic password rotation
  - https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- NIST SP 800-63B says verifiers should:
  - require passwords of at least 8 characters
  - permit at least 64 characters
  - allow Unicode
  - reject commonly used, expected, or compromised passwords via blocklist comparison
  - avoid arbitrary periodic forced password changes
  - https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP Forgot Password Cheat Sheet says password reset flows should:
  - return consistent responses for existent and non-existent accounts
  - rate-limit reset requests
  - use secure random single-use expiring reset tokens
  - avoid automatic login after reset
  - invalidate or offer to invalidate existing sessions after reset
  - https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Supabase Password Security docs confirm:
  - password hashes are stored with bcrypt in `auth.users.encrypted_password`
  - leaked-password protection is available through Have I Been Pwned integration on supported plans
  - stronger password requirements affect new passwords and changed passwords, not legacy existing ones
  - https://supabase.com/docs/guides/auth/password-security
- Supabase reauthentication docs confirm that secure password change is intended to require recent authentication or a reauthentication nonce before password update in Supabase-managed flows.
  - https://supabase.com/docs/reference/javascript/auth-reauthentication

### Unverified but Relevant

- Whether production should allow outbound calls to a breached-password service or should use a local/common-password blocklist only.
- Whether there are active users whose current passwords are below the new minimum and whether they should be grandfathered until change/reset.
- Whether you want global invalidation of all existing JWT sessions after password reset/change in this same sprint, or only forced re-login of the current session.
- Whether MFA is intended for the near-term roadmap. The answer affects how aggressive the minimum-length policy should be.

---

## Decision Summary

### Final Decision

The April 10 sprint should harden the **current custom email/password stack** rather than replacing it.

### What We Are Keeping

- Keep bcrypt for this sprint.
- Keep the current direct `auth.users` storage model.
- Keep the generic forgot-password response behavior.
- Keep current-password verification for logged-in password changes.

### What We Are Changing

1. **Create one shared password policy module.**
   - All signup, reset, and change-password flows must call the same validator.
   - Do not leave password rules duplicated across Zod schemas.

2. **Raise the effective password standard.**
   - Phase-1 policy target: minimum `12` characters.
   - Allow long passphrases and Unicode.
   - Do not add composition rules.
   - Reject clearly compromised/common passwords via blocklist or breached-password screening.

3. **Make bcrypt handling explicit instead of implicit.**
   - Benchmark work factor on the real production host.
   - Default target is to keep or raise above `10` only if login/signup/reset latency remains acceptable.
   - Because bcrypt has a 72-byte input limit, validation must reject oversize UTF-8 byte sequences explicitly rather than silently truncating them.

4. **Replace in-memory throttling with a durable limiter.**
   - Use PostgreSQL-backed `rate-limiter-flexible` for auth abuse controls.

5. **Collapse logged-in password changes to one safe path.**
   - Remove or hard-guard the authenticated branch of `updatePassword()`.
   - Logged-in password changes must always go through current-password verification or explicit reauthentication.

6. **Improve post-change visibility and recovery behavior.**
   - Send password-changed notification email.
   - Force fresh sign-in after reset success.
   - Sign out the current session after password change success.

7. **Create audit evidence for auth changes and abuse events.**
   - Record password reset requested, password reset completed, password changed, and repeated throttle hits.
   - Make these events visible in the existing audit surfaces or at minimum write them to a durable audit trail.

### Explicit Non-Decisions

- This sprint does **not** migrate the system to Argon2id.
- This sprint does **not** replace Auth.js or Supabase auth architecture wholesale.
- This sprint does **not** add MFA unless there is extra budget after the hardening core is complete.
- This sprint does **not** force-reset every existing user password.

### Stakeholder-Grounded Boundary

Outside research confirms that business admins, finance operators, IT teams, and auditors do not stop at password policy. They expect MFA, role review, audit evidence, and safer integration credentials. Those are real needs, but they should be sequenced **after** the April 10 password hardening sprint rather than pulled into it and diluting the core work.

---

## Policy Choice Rationale

The external guidance is not identical:

- NIST's stable baseline is minimum 8 plus blocklist screening, no composition rules, and support for long passwords.
- OWASP's current operational guidance is stricter for password-only systems and treats passwords under 15 characters as weak when MFA is absent.

For ChefFlow's April 10 sprint, the correct move is a pragmatic middle ground:

- **minimum 12 characters now**
- **no complexity/composition rules**
- **block breached/common passwords**
- **support passphrases**

This is stricter than the repo's current 8-character minimum, materially stronger than the current state, and still realistic for a live public app that does not yet have MFA. If MFA ships later, revisit the minimum again. If the risk profile rises before MFA, move the minimum toward 15.

This is an implementation decision based on the cited guidance, not a direct source mandate.

---

## April 10 Build Plan

### 1. Freeze One Source of Truth for Password Policy

Create a dedicated module, likely `lib/auth/password-policy.ts`, that owns:

- minimum length
- bcrypt-compatible max byte handling
- shared user-facing validation messages
- breached/common-password rejection
- helper functions reusable by signup, reset, and change-password flows

Every auth form and server action should import this module instead of repeating its own inline rules.

### 2. Replace Duplication in Auth Actions

Update:

- `signUpChef()`
- `signUpClient()`
- `updatePassword()`
- `changePassword()`

so they all use the same policy and the same error language.

Remove the authenticated-session branch of `updatePassword()` or make it internal-only behind the same re-verification requirements as `changePassword()`. There should not be two different logged-in password mutation paths.

### 3. Add Breached/Common Password Screening

Preferred implementation order:

1. Use a direct breached-password screening mechanism in app code because the current flow is app-managed.
2. If outbound calls are acceptable, use a k-anonymity breach check.
3. If outbound calls are not acceptable, ship a local common-password blocklist for phase 1 and leave full breached-password coverage as follow-up work.

Do **not** depend on Supabase hosted enforcement alone unless the app actually moves password writes and updates into Supabase-managed APIs.

### 4. Replace `lib/rateLimit.ts` With a Durable Limiter

Use PostgreSQL-backed `rate-limiter-flexible` and split the limits by surface:

- sign-in by email + IP
- signup by email + IP
- forgot-password by normalized email + IP
- change-password by user id
- reset-token redemption by token hash or IP

Requirements:

- survives restart
- behaves consistently across multiple app processes
- preserves generic error responses
- emits structured logs for blocked attempts

### 5. Harden Password-Reset and Change Semantics

Keep what is already correct:

- generic forgot-password success response
- secure random token generation
- token hashing at rest
- 1-hour token expiry
- single-use token clearing

Add what is missing:

- sign the user out after password reset success and require standard login
- sign the current user out after successful password change
- send password-changed notification email
- ensure reset pages do not leak tokens via referrer behavior
- write durable audit entries for reset request, reset success, password change, and repeated abuse throttling

### 6. Measure bcrypt Cost Instead of Guessing

Run a short benchmark on the real production-class machine for cost `10`, `11`, and `12` and document:

- single hash time
- single compare time
- p95 sign-in latency under light concurrency

Decision rule:

- keep the highest cost factor that does not create obvious login/signup/reset degradation
- do not exceed the point where password verification becomes an easy denial-of-service amplifier

If no benchmark is done in the sprint, keep `10` and record the benchmark as an immediate follow-up.

### 7. Document the Auth Boundary

Write one short internal doc note explaining:

- app-managed password flows
- Supabase-managed password/security settings that are currently advisory only
- where future MFA or session-version invalidation would hook in

Without this note, the next person will wrongly assume `database/config.toml` is the primary control plane.

### 8. Queue The Next Security Milestone, But Do Not Pull It Forward

Research across business admins, finance operators, IT teams, and integration owners shows the next real milestone after this sprint should be:

- MFA for admin and finance-sensitive users
- broader user-visible audit trails
- integration credential review across OAuth tokens, scopes, webhook secrets, and revocation behavior

This should be recorded now so the April 10 work lands in the correct sequence.

---

## File and Surface Plan

Expected files to touch:

- `lib/auth/actions.ts`
- `lib/auth/auth-config.ts`
- `lib/auth/password-policy.ts` (new)
- `lib/rateLimit.ts` or a replacement module under `lib/security/`
- `lib/db/schema/auth.ts` if a password-change timestamp or token-version field is added
- `database/*` migration for durable rate-limit storage and any auth metadata additions
- `components/settings/change-password-form.tsx`
- `app/auth/reset-password/page.tsx`
- email template(s) for password-change notification
- docs covering the auth boundary and rollout result

---

## Verification Checklist

### Unit and Integration Checks

- Signup rejects passwords shorter than the new minimum.
- Reset and change-password reject the same weak password inputs as signup.
- Common/breached passwords are rejected everywhere, not just on one form.
- Passwords are never silently truncated.
- Existing users with older weak passwords can still sign in until they change/reset.
- `changePassword()` still requires the current password.
- Authenticated callers cannot use `updatePassword()` as a bypass path.
- Reset tokens remain single-use and expire after 1 hour.
- Password-changed emails are sent on both reset completion and logged-in password change.

### Abuse-Control Checks

- Rate-limit counters survive app restart.
- Limits work consistently across multiple processes.
- Sign-in abuse returns generic failures, not account-existence signals.
- Forgot-password abuse is throttled without revealing whether an email exists.

### Manual Security Checks

- Login with an existing valid password still succeeds.
- Reset request for a real email and a fake email produces the same visible response.
- Password reset success does not automatically keep the user logged in.
- Changing a password signs out the current session.
- New password policy text is visible and consistent in UI copy.
- Auth audit entries exist for password reset request, reset success, password change, and repeated throttle hits.

---

## Rollout Order

1. Land shared password policy.
2. Remove the duplicate/unsafe password-update path.
3. Add breached/common-password rejection.
4. Replace rate limiting with a durable store.
5. Add notification and sign-out behavior.
6. Run verification.
7. Update docs with final chosen policy and measured bcrypt cost.

This order matters. Durable throttling and one policy module are more valuable than cosmetic UI changes.

---

## Open Questions With Defaults

These do not need to block the sprint if the default is accepted:

- **Breached-password source:** default to app-side k-anonymity check if outbound access is acceptable; otherwise use a local common-password blocklist in phase 1.
- **Legacy weak passwords:** default to grandfathering existing passwords until the user changes or resets them.
- **Global session invalidation:** default to current-session sign-out now, and defer full token-version invalidation unless time remains.
- **MFA:** default to out of scope for April 10 unless the core hardening finishes early.

---

## Success Criteria

This spec is complete when the April 10 builder can execute without having to rediscover the auth boundary or guess the password policy.

The implementation is complete when:

- bcrypt hashing is still intact
- policy is centralized
- breached/common passwords are rejected
- throttling is durable
- logged-in password mutation has only one safe path
- reset/change side effects are consistent and visible

That is the minimum bar for calling the password system "safe enough" for the next stage.
