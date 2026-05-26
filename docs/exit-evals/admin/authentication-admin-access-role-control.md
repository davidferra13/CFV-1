# Exit Eval: Admin / AUTHENTICATION, ADMIN ACCESS & ROLE CONTROL

> Wave 3 | 8 scenarios | Role: ADMIN
> Evaluated: 2026-05-25 | Mode: Solo (NEEDS-DEVELOPER-REVIEW)

---

## Scenario #1: Sign in after session expiry

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Session token has expired or been invalidated. The admin needs to re-authenticate to regain access to the `/admin` portal. The operational reason is restoring an active session so they can continue platform operator tasks. The redirect happens automatically in `app/(admin)/layout.tsx` via `requireAdmin()` which calls `redirect('/auth/signin?redirect=/admin')`.

**Context ChefFlow has:**

- The redirect URL (`/admin`) is preserved in the query string
- The admin's email is known from their prior session
- The `platform_admins` table has their row with `is_active = true`
- Auth.js session infrastructure handles token lifecycle

**Data source?** No. Authentication is an identity verification ceremony, not a data lookup.

**Client-collaborative angle:** None. This is an operator-only flow.

**Physical reality:** Screen-based. Admin is at a workstation managing platform operations. Password manager autofill is the expected ergonomic.

**Compounding:** Low. Session restoration is a one-off event each time it happens. No learning accumulates.

**Solution design:**

- Preserve redirect context through the signin flow (already done: `?redirect=/admin`)
- Ensure password-manager-friendly input fields (autocomplete attributes)
- Show clear "session expired" vs "not authorized" distinction on signin page
- Consider longer session TTL for admin accounts to reduce frequency
- Admin-specific "you were signed in as [email]" hint on redirect

**Where it appears:**

- `/auth/signin` page (with `?redirect=/admin`)
- Any admin page when session expires mid-use

**What remains as permanent exit:**
The credential ceremony itself. ChefFlow cannot and should not store passwords or generate MFA codes. The admin will always interact with their password manager or authenticator app externally.

**Priority:** Medium frequency (daily/multi-daily depending on session TTL) x Low effort (polish, not new feature) = Low priority
**Spec needed?** No

---

## Scenario #2: Retrieve admin password or MFA code

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** The admin needs to retrieve a credential (password from 1Password/iCloud Keychain, TOTP code from an authenticator app, or magic link from email) to complete authentication. This is fundamental credential custody that must remain external.

**Context ChefFlow has:**

- The email the admin should sign in with
- The authentication method configured (credentials/OAuth/magic link)
- The redirect destination after successful auth

**Data source?** No. Credential stores are inherently external for security isolation.

**Client-collaborative angle:** None. Single-operator authentication.

**Physical reality:** Screen-based. Touch ID / Face ID on device could reduce this exit if WebAuthn/passkeys are supported. Password manager autofill minimizes the exit to near-zero friction.

**Compounding:** None. Each authentication event is independent.

**Solution design:**

- Support WebAuthn/passkeys to eliminate the exit entirely for devices with biometric hardware
- Ensure `autocomplete="username"` and `autocomplete="current-password"` on signin fields
- Clear error states when credentials fail (wrong password vs account locked vs not an admin)
- If MFA is added, support TOTP with clear "open your authenticator" messaging

**Where it appears:**

- `/auth/signin` page credential fields
- Any future MFA challenge screen

**What remains as permanent exit:**
The credential retrieval itself is always external by design. With passkeys, this exit can become a biometric tap rather than an app switch.

**Priority:** High frequency (every session start) x Low effort (field attributes + passkey support) = Medium priority
**Spec needed?** No (passkey support is a separate auth infrastructure decision)

---

## Scenario #3: Bootstrap the first owner/admin row

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Before `/admin` can admit any operator, at least one row must exist in `platform_admins` with `access_level = 'owner'`. This is a chicken-and-egg problem: no one can use the admin panel to create the first admin. The migration `20260401000065_platform_admins.sql` handles this by auto-inserting the founder row from the `chefs` + `user_roles` tables where `email = 'davidferra13@gmail.com'`.

**Context ChefFlow has:**

- The founder email is hardcoded in `lib/platform/owner-account.ts` as `FOUNDER_EMAIL`
- The migration contains the bootstrap INSERT with ON CONFLICT handling
- The `protect_last_owner` trigger in `20260404000001_rbac_foundation.sql` prevents removal of the last owner
- `DB_BOOT_CONTRACT_OBJECTS` in `lib/db/boot-contract.ts` checks `platform_admins` table existence

**Data source?** No. This is a one-time infrastructure operation.

**Client-collaborative angle:** None.

**Physical reality:** Terminal/migration tool. This happens once per deployment.

**Compounding:** None. One-time bootstrap per environment.

**Solution design:**

- Already handled: migration auto-bootstraps from founder email in chefs table
- Document the bootstrap path clearly (already in migration comments)
- `boot-contract.ts` checks table exists at runtime
- If table exists but no active owner, surface this in System Health as a critical alert
- Keep the founder email constant in `lib/platform/owner-account.ts` as the recovery anchor

**Where it appears:**

- `database/migrations/20260401000065_platform_admins.sql` (bootstrap INSERT)
- `lib/db/boot-contract.ts` (table existence check)
- `/admin/system` could surface "no active owner" as critical health issue

**What remains as permanent exit:**
The initial migration execution itself. Someone must run the SQL against the database for the first time. This is infrastructure, not application behavior.

**Priority:** Extremely low frequency (once per environment) x Already handled = No action needed
**Spec needed?** No

---

## Scenario #4: Investigate why an expected admin cannot enter `/admin`

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why admin leaves:** An operator who should have admin access gets redirected to `/auth/signin?redirect=/admin` and needs to diagnose why. Possible causes: (a) no row in `platform_admins` for their `auth_user_id`, (b) `is_active = false`, (c) `access_level = 'vip'` (VIP cannot enter admin), (d) email mismatch between auth session and `platform_admins` row, (e) `user_roles` bridge missing. Currently the admin would go to Supabase dashboard or SQL console to inspect these rows.

**Context ChefFlow has:**

- `lib/auth/admin-access.ts` resolves access from `platform_admins` by `auth_user_id`
- `getCurrentAdminUser()` explicitly excludes VIP from admin panel
- The `platform_admins` schema has `auth_user_id`, `email`, `access_level`, `is_active`
- `user_roles` maps auth users to entity IDs
- The admin detail page already resolves and displays access levels per chef

**Data source?** Yes, internal database. All the diagnostic data exists in `platform_admins`, `user_roles`, and the auth session.

**Client-collaborative angle:** None. Internal operator diagnostics.

**Physical reality:** Screen-based. Admin is debugging from a workstation.

**Compounding:** Medium. Understanding common access failure patterns helps resolve future cases faster. A diagnostic panel that shows "why denied" would serve every future case.

**Solution design:**

- Add an owner-only "Admin Access Diagnostics" panel in `/admin/users/[chefId]` that shows:
  - Whether a `platform_admins` row exists for the user
  - The `auth_user_id` resolved from `user_roles`
  - Current `access_level` and `is_active` state
  - Whether their email matches across auth session and platform_admins
  - Clear explanation of why VIP != admin panel access
- Add a "why was I blocked?" diagnostic on the signin redirect page (owner-only, via query param)
- Never expose self-promotion paths from diagnostics (enforced by Q56 test)

**Where it appears:**

- `/admin/users/[chefId]` detail page (partially exists via ChefAccessPanel showing access_level)
- Potential new owner-only diagnostic widget
- `/auth/signin` page could show "access denied: VIP does not include admin panel" when relevant

**What remains as permanent exit:**
If the issue is at the auth provider level (account disabled, email unverified in Auth.js), the admin still needs provider-level access to resolve it.

**Priority:** Medium frequency (any time a new operator is onboarded or access breaks) x Medium effort (read-only diagnostic panel) = High priority
**Spec needed?** No (small enough to implement directly)

---

## Scenario #5: Promote a trusted operator to admin

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** The owner wants to grant admin-panel access to a trusted operator. Currently there is no UI for this. The `ChefAccessPanel` component handles VIP grant/revoke and comp controls, but explicitly states "Owner/Admin access. Cannot be changed to VIP from here" for existing admins/owners. There is no `grantAdmin()` server action. The operator must INSERT directly into `platform_admins` via SQL.

**Context ChefFlow has:**

- `platform_admins` table with full schema (`auth_user_id`, `email`, `access_level`, `is_active`, `notes`, `created_by_auth_user_id`)
- `setVIPAccess()` in `chef-admin-actions.ts` already handles VIP grant with self-promotion guards (rejects if user already has admin/owner)
- Q56 system integrity test ensures no chef-facing action can insert into `platform_admins`
- `protect_last_owner` trigger prevents orphaning the last owner
- `logAdminAction()` provides audit trail infrastructure
- `requireAdmin()` gate on all admin mutations

**Data source?** Yes, internal database write. The data and authorization logic all exist internally.

**Client-collaborative angle:** None. Internal operator management.

**Physical reality:** Screen-based. Deliberate, infrequent platform management action.

**Compounding:** Low. Admin promotion is rare (a handful of operators across the platform lifetime).

**Solution design:**

- Add owner-only `grantAdminAccess(authUserId, accessLevel, notes)` server action in `lib/admin/chef-admin-actions.ts`
- Guard: only owners can promote to admin; only owners can promote to owner (with confirmation)
- Prevent self-promotion (already enforced structurally by Q56)
- Immutable audit log entry with `action_type: 'role_assigned'`
- UI: owner-only section in `/admin/users/[chefId]` below VIP controls
- Require notes/reason for promotion
- Show the `created_by_auth_user_id` on the platform_admins row for provenance

**Where it appears:**

- `/admin/users/[chefId]` page, owner-only section
- Audit log at `/admin/audit`

**What remains as permanent exit:**
If the target user does not yet have an auth account or chef profile, the owner must first ensure they exist in the system. Account creation itself stays in the normal signup flow.

**Priority:** Low frequency (rare platform event) x Medium effort (new server action + UI) = Medium priority
**Spec needed?** No (pattern matches existing VIP grant flow closely)

---

## Scenario #6: Remove or demote an admin

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** The owner needs to revoke admin-panel access from an operator (terminated, role change, security incident). Currently requires SQL UPDATE to set `is_active = false` or change `access_level`. The `protect_last_owner` trigger prevents removing the last owner at the database level.

**Context ChefFlow has:**

- `platform_admins` table with `is_active` flag (soft-delete pattern, preserving audit trail)
- `protect_last_owner` trigger in `20260404000001_rbac_foundation.sql` prevents orphaning
- VIP revocation already exists in `setVIPAccess(chefId, false)` using the deactivation pattern
- Audit log infrastructure ready (`logAdminAction`)
- Q56 test ensures only admins can mutate `platform_admins`

**Data source?** Yes, internal database mutation.

**Client-collaborative angle:** None.

**Physical reality:** Screen-based. High-stakes deliberate action requiring confirmation.

**Compounding:** Low. Infrequent event.

**Solution design:**

- Add owner-only `revokeAdminAccess(authUserId)` server action
- Set `is_active = false` (never DELETE, preserving audit trail)
- Guard: owners cannot demote themselves if they are the last owner (trigger enforces this at DB level, but UI should prevent the attempt)
- Guard: admins cannot demote other admins; only owners can
- Require confirmation dialog with the target admin's email displayed
- Immutable audit entry
- UI: owner-only "Revoke Admin" button in `/admin/users/[chefId]` when target has admin access

**Where it appears:**

- `/admin/users/[chefId]` page, owner-only section
- Audit log at `/admin/audit`

**What remains as permanent exit:**
If the demotion is related to a security incident, the owner may also need to invalidate active sessions at the auth provider level (force sign-out).

**Priority:** Low frequency (rare, high-stakes) x Medium effort (mirror of VIP revoke pattern) = Medium priority
**Spec needed?** No (mirrors existing revocation patterns)

---

## Scenario #7: Confirm VIP is not admin

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why admin leaves:** An operator needs to verify that a VIP-designated chef does NOT have admin panel access. The code makes this distinction clearly: `getCurrentAdminUser()` in `lib/auth/admin.ts` explicitly returns null for VIP (`if (access.accessLevel === 'vip') return null`). The `ChefAccessPanel` component displays the access level badge. But the explanation of what VIP means operationally may not be immediately clear to a new admin reviewing access.

**Context ChefFlow has:**

- `lib/auth/admin.ts` line 39: `if (access.accessLevel === 'vip') return null` (explicit exclusion)
- `ChefAccessPanel` shows access level badges (owner/admin/vip) with color coding
- The panel displays "Owner/Admin access. Cannot be changed to VIP from here" when applicable
- `hasAdminAccess()` in `admin-access.ts` checks for 'admin' or 'owner' only
- `hasPrivilegedAccess()` returns true for VIP (feature access), distinct from admin panel access
- `docs/specs/platform-role-hierarchy.md` documents the distinction

**Data source?** Yes, internal data. All information is in `platform_admins` table.

**Client-collaborative angle:** None.

**Physical reality:** Screen-based. Quick verification glance.

**Compounding:** Medium. Once an admin understands the VIP/admin distinction, they never need to verify it again. But new operators need this clarity.

**Solution design:**

- Already partially solved: `ChefAccessPanel` shows access level with distinct color (purple for VIP vs red for admin vs amber for owner)
- Add explicit tooltip or info text on VIP badge: "VIP: all features unlocked, focus mode bypassed. No admin panel access."
- In `/admin/users/[chefId]`, show a clear "Admin Panel Access: No" indicator for VIP users
- Add a "Role Explainer" section or link to role hierarchy docs within the access panel
- Consider a dedicated "Platform Access Overview" page listing all privileged users with their levels

**Where it appears:**

- `/admin/users/[chefId]` ChefAccessPanel (already shows the distinction)
- Potential "Platform Access Overview" admin page

**What remains as permanent exit:**
Nothing. This is fully solvable in-app with clearer UI text and role explanation.

**Priority:** Low frequency (occasional verification) x Very low effort (text/tooltip addition) = Low priority
**Spec needed?** No

---

## Scenario #8: Audit an access anomaly

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** Something unexpected happened with access: an unauthorized user appeared in admin logs, an admin's session behaved unexpectedly, or access was granted/revoked without the expected audit trail. The admin needs to correlate platform_admins state, auth session events, and the admin_audit_log to reconstruct what happened. Currently, `admin_audit_log` captures admin actions via `logAdminAction()`, but auth-level events (login attempts, session creation/destruction, password changes) live in the auth provider's logs.

**Context ChefFlow has:**

- `admin_audit_log` table with actor_email, actor_user_id, action_type, target_id, details, ip_address, timestamp
- `/admin/audit` page displaying the log (last 200 entries)
- `logAdminAction()` captures: account changes, email sends, flag toggles, cannabis access, moderation, preview toggles
- `PresenceBeacon` tracks who is actively in admin
- All admin mutations go through `requireAdmin()` which validates session

**Data source?** Partially. Admin actions are captured internally, but auth-level session events (login timestamps, IP addresses, failed attempts, token invalidations) live in the auth provider.

**Client-collaborative angle:** None.

**Physical reality:** Screen-based. Forensic investigation requiring cross-referencing.

**Compounding:** High. Access anomaly investigation patterns repeat. Building better correlation surfaces compounds knowledge about the platform's security posture.

**Solution design:**

- Extend `logAdminAction` to capture auth events where possible (successful admin login, failed admin login attempt if detectable)
- Add correlation IDs or session IDs to audit entries so events from a single session can be grouped
- Add admin-facing "Access Timeline" view per user showing: platform_admins changes, audit log entries, last known session timestamps
- Link to auth provider dashboard from anomaly entries (deep link where possible)
- Add "auth event" as an audit action type for events ChefFlow can observe (session start, redirect to signin)
- Flag anomalies automatically: login from new IP, access after extended inactivity, rapid successive failures

**Where it appears:**

- `/admin/audit` page (existing, needs enrichment)
- `/admin/users/[chefId]` could show a per-user access timeline
- `/admin/presence` shows current live sessions

**What remains as permanent exit:**
Auth provider logs for events ChefFlow cannot observe (password changes, MFA enrollment, OAuth token refresh failures). These remain external forensic evidence.

**Priority:** Low frequency (rare anomalies) x Medium effort (audit enrichment) = Low-medium priority
**Spec needed?** No (incremental improvements to existing audit surface)

---

## Batch Summary

| #   | Title                                                   | Reclassified To | Spec Needed? |
| --- | ------------------------------------------------------- | --------------- | ------------ |
| 1   | Sign in after session expiry                            | Permanent       | No           |
| 2   | Retrieve admin password or MFA code                     | Permanent       | No           |
| 3   | Bootstrap the first owner/admin row                     | Permanent       | No           |
| 4   | Investigate why an expected admin cannot enter `/admin` | Reducible       | No           |
| 5   | Promote a trusted operator to admin                     | Bridgeable      | No           |
| 6   | Remove or demote an admin                               | Bridgeable      | No           |
| 7   | Confirm VIP is not admin                                | Reducible       | No           |
| 8   | Audit an access anomaly                                 | Bridgeable      | No           |

---

## Evidence Summary

**Key files examined:**

- `lib/auth/admin-access.ts` - Core access resolution from `platform_admins` table
- `lib/auth/admin.ts` - `requireAdmin()`, `getCurrentAdminUser()`, VIP exclusion logic
- `lib/auth/route-policy.ts` - ADMIN_PATHS classification, middleware integration
- `lib/platform/owner-account.ts` - `FOUNDER_EMAIL`, `isFounderEmail()`, owner identity resolution
- `lib/admin/audit.ts` - `logAdminAction()` with 45 action types
- `lib/admin/chef-admin-actions.ts` - `suspendChef`, `compChef`, `setVIPAccess`, `issueAdminCredit`
- `components/admin/chef-access-panel.tsx` - VIP/comp UI with admin/owner guards
- `app/(admin)/layout.tsx` - Runtime `requireAdmin()` gate with redirect
- `app/(admin)/admin/audit/page.tsx` - Audit log display
- `app/(admin)/admin/users/[chefId]/page.tsx` - Chef detail with access level resolution
- `database/migrations/20260401000065_platform_admins.sql` - Table creation + founder bootstrap
- `database/migrations/20260404000001_rbac_foundation.sql` - `protect_last_owner` trigger
- `database/migrations/20260418000001_vip_access_level.sql` - VIP constraint addition
- `lib/db/boot-contract.ts` - `platform_admins` existence check
- `tests/system-integrity/q56-admin-self-promotion.spec.ts` - Privilege escalation prevention

**Overall assessment:** The auth/admin/role infrastructure is mature and well-defended. The two Reducible scenarios (#4, #7) are minor UI clarity improvements. The three Bridgeable scenarios (#5, #6, #8) involve adding owner-only mutation flows that mirror existing patterns (VIP grant/revoke). No new specs needed; all improvements are incremental extensions of existing architecture.
