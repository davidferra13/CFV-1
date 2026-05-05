# CODEX TASK: security-mfa-integration

## Objective

Integrate and wire the existing MFA/security module into the ChefFlow application. The code is already written but sitting uncommitted. This task connects the pieces: settings UI links, navigation entries, middleware awareness, and server action wiring. Do NOT rewrite the existing code; wire it into the app.

## Branch

codex/security-mfa-integration

## Context

A previous session wrote ~30 files implementing MFA (TOTP + SMS), re-authentication gates, brute-force protection, security event auditing, phone number management, and a security settings page. These files exist on disk but are untracked in git. The database migrations are written but NOT applied.

## Files You May INSPECT (read-only)

- `lib/auth/auth-config.ts` (current auth config, already modified)
- `lib/db/schema/schema.ts` (current schema, already modified)
- `lib/db/schema/security.ts` (new security schema)
- `app/(chef)/settings/page.tsx` (existing settings page, already modified)
- `middleware.ts` (DO NOT MODIFY, read only for understanding)
- `CLAUDE.md` (project rules)

## Files You May MODIFY

- `app/(chef)/settings/security/page.tsx` (already exists, may need fixes)
- `app/auth/mfa-verify/page.tsx` (already exists, may need fixes)
- `app/auth/reauth/page.tsx` (already exists, may need fixes)
- `components/settings/security-settings-client.tsx` (already exists, may need fixes)
- `components/phone/*` (already exists, may need fixes)
- `lib/mfa/*` (already exists, may need fixes)
- `lib/security/audit.ts`
- `lib/security/brute-force.ts`
- `lib/security/durable-rate-limit.ts`
- `lib/security/reauth-actions.ts`
- `lib/security/reauth-gate.ts`
- `lib/security/reauth.ts`
- `lib/security/security-settings-actions.ts`
- `lib/security/session.ts`
- `lib/phone/*` (already exists, may need fixes)

## Files You Must NOT Touch

- `middleware.ts`
- `lib/auth/auth-config.ts` (already modified by prior session, do not change)
- `lib/db/schema/schema.ts` (already modified by prior session, do not change)
- `database/migrations/*` (already written, do not change)
- `app/layout.tsx`
- `CLAUDE.md`
- Any file not listed in MODIFY above

## Requirements

1. All server actions in `lib/security/` and `lib/mfa/` must have: auth gate (`requireChef()` or equivalent), tenant scoping (userId from session), input validation (zod or manual), error propagation (return `{ error: string }` on failure), and mutation feedback (revalidatePath/revalidateTag after writes).

2. The security settings page at `/settings/security` must be reachable from the main settings page. Check that `app/(chef)/settings/page.tsx` links to it.

3. The MFA verify page at `/auth/mfa-verify` must handle TOTP code entry and SMS code entry. It should show appropriate UI for whichever method the user has enabled.

4. The reauth page at `/auth/reauth` must prompt for password before allowing access to sensitive operations.

5. All imports must resolve. No broken import paths. Run tsc to verify.

6. No em dashes in any string literals or comments. Use commas, semicolons, parentheses, colons, or separate sentences.

7. No "OpenClaw" in any user-visible string.

## Constraints

- Do NOT run `drizzle-kit push` or apply migrations
- Do NOT modify the database schema files
- Do NOT touch middleware.ts
- Additive changes only
- Follow existing patterns in `lib/events/actions.ts` for server action structure

## Expected Output

- All files compile with tsc
- Security settings page renders with sections for: MFA setup, phone management, active sessions, security event log
- MFA verify flow has working UI (even if backend is not connected to real SMS)
- Reauth gate has working UI
- All imports resolve

## Verification Commands

```bash
npx tsc --noEmit --skipLibCheck
git status --short  # must show only expected files
```

## Success Criteria

- [ ] tsc passes with zero errors in security/mfa/phone modules
- [ ] No em dashes in any modified file
- [ ] All server actions have auth gates
- [ ] Settings security page has navigation link from main settings
- [ ] git status is clean (all changes committed to branch)

## Rollback

```bash
git checkout main
git branch -D codex/security-mfa-integration
```

## Report Format

When complete, output:

- Branch name and commit hash
- Files modified/created (list)
- tsc result
- Any deviations from spec (explain why)
