# Staff Exit Evaluation: Account, Access & Support

Mode: Solo batch. Every scenario is marked `NEEDS-DEVELOPER-REVIEW` because no chef/developer operational review happened in this lane.

## Scenario #45: Recover a forgotten staff password

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to regain access to their assigned work without texting the chef, asking support, or hunting through old auth emails. The operational need is identity recovery fast enough that a missed password does not block a shift, task list, schedule, or event briefing.
**Context ChefFlow has:**

- Staff sign-in exists at `/staff-login` and calls the shared `signIn` action before routing to `/staff-dashboard`.
- Staff routes are protected in `STAFF_PROTECTED_PATHS` and the staff shell is guarded by `requireStaff()`.
- A generic password reset flow already exists at `/auth/forgot-password` and `/auth/reset-password`.
- `requestPasswordReset` creates a hashed recovery token, rate limits reset requests, emails a reset link, and avoids email enumeration.
- `updatePassword` validates the recovery token, enforces the password policy, expires reset links after one hour, clears the recovery token, and signs the user out.
- Staff invite claiming creates or reuses an auth user and records staff legal acceptance.
- The staff login page currently exposes main sign-in for chefs but does not expose a visible staff-specific "forgot password" recovery path.

**Data source?** No. The email delivery system and auth database are workflow infrastructure, not a passive data source. ChefFlow already owns the reset token, password policy, account role, and staff route context.
**Client-collaborative angle:** None. A client or guest should not participate in staff identity recovery. The only useful upstream party is the chef when the staff email on file is wrong or the staff record is inactive.
**Physical reality:** This usually happens on a phone, often close to call time. The flow needs a visible staff-login recovery link, short copy, large tap targets, and a clean return to `/staff-login` or `/staff-dashboard` after reset.
**Compounding:** Medium. Each reset is a one-off recovery event, but reliable self-service access reduces repeated chef interruptions and builds trust that staff can recover without a manual rescue.

**Solution design:**

- Add a "Forgot password?" action directly on `/staff-login` that pre-labels the flow as Staff Portal recovery.
- Preserve staff return context so reset completion sends staff back to `/staff-login` or `/staff-dashboard`, not only generic `/auth/signin`.
- Add recovery guidance for common staff cases: wrong email on invite, inactive staff record, expired reset link, or no email received.
- Surface a chef-side hint when the staff member's email is missing or likely incorrect, so the chef can fix the roster record instead of becoming manual support.

**Where it appears:**

- `/staff-login`
- `/auth/forgot-password` and `/auth/reset-password`
- Chef-side staff roster/member detail where email accuracy controls recovery

**What remains as permanent exit:**
Staff still leave for their email inbox and any email-provider issue such as spam filtering, lost mailbox access, or mailbox account recovery. ChefFlow should own the recovery flow but not replace email accounts.

**Priority:** Medium frequency x low effort = quick trust win
**Spec needed?** no

## Scenario #46: Handle revoked or expired token link

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need fresh access to an event briefing link so they can see arrival details, dietary alerts, tasks, and hours submission. They leave because the current token state gives them no in-app way to request a replacement or confirm whether revocation was intentional.
**Context ChefFlow has:**

- Tokenized staff event briefings live at `/staff-portal/[id]` and call `getStaffEventView`.
- The token lookup can distinguish `invalid`, `revoked`, `expired`, and `ready` states.
- Ready briefings include event date, serve time, arrival time, location, access instructions, dietary alerts, staff role, station, assignment notes, chef name, chef phone, collaborators, tasks, and hours submission.
- Chef-side token actions can generate, list, and revoke staff event tokens.
- Existing token generation reactivates an existing event/staff token by clearing `is_revoked` and extending `expires_at`.
- The current revoked/expired pages only tell staff to contact or ask the chef for a new link.
- The public token route is rate-limited by IP.

**Data source?** No. The token table is ChefFlow-owned state, but replacement access is a permissioned workflow. Expired links can often be renewed in-app; revoked links may require chef review because revocation can be intentional.
**Client-collaborative angle:** None for access control. Dinner Circle can improve the briefing data that staff need after access is restored, but clients should not restore staff portal links.
**Physical reality:** This is a day-of mobile failure state. The expired/revoked screen should offer one large "Request new link" action, fallback chef contact, and clear language that a revoked link may require chef approval.
**Compounding:** Medium. Token failures are discrete, but every request creates an access audit trail and reduces repeated chef texts.

**Solution design:**

- Add a token recovery request from expired and revoked pages that records token state, event, staff member, timestamp, and request source.
- Notify the chef in-app, and optionally by existing notification/email/SMS channels, with approve/resend and deny actions.
- For expired tokens, allow one-tap chef approval to extend or regenerate the link while preserving tenant and staff scoping.
- For revoked tokens, require explicit chef confirmation and show staff a pending state instead of implying automatic restoration.
- Keep fallback chef phone/contact visible when the event is time-sensitive.

**Where it appears:**

- `/staff-portal/[id]` expired and revoked states
- Chef-side `/events/[id]/staff` token management
- Chef notifications or staff roster activity feed

**What remains as permanent exit:**
Staff may still call or text the chef when access is urgent, when their phone cannot receive a new link, when revocation is intentional, or when the token is invalid enough that ChefFlow cannot safely identify the event/staff context.

**Priority:** Medium-high frequency x medium effort = P1 access recovery gap
**Spec needed?** yes

## Scenario #47: Report portal bug or issue

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff are not trying to file generic feedback. They need to keep service moving when a portal screen is broken, a task will not save, an error locks them out, or an event briefing seems wrong. They leave because urgent recovery often still means texting the chef or finding external support.
**Context ChefFlow has:**

- The authenticated staff layout renders `GlobalReportButton`.
- `ReportIssueDialog` captures category, message, current path, browser/user-agent context, viewport, online state, referrer, full URL, timezone, history depth, and breadcrumb session ID when present.
- `submitIssueReport` saves reports to `user_feedback`, records the reporting user/role when authenticated, and sends a developer alert.
- The dialog supports bug, feature issue, error/crash, malicious activity, security concern, and other categories.
- The staff shell includes presence tracking, staff name/email, top navigation, role switcher, and protected staff context.
- Tokenized `/staff-portal/[id]` briefings do not appear to render the global report button.
- Expired/revoked token states currently have no issue-report action.
- The error-report components and error boundaries exist elsewhere in the app, but the day-of staff recovery path is still thin.

**Data source?** No. Sentry, browser context, and feedback rows are evidence sources, but the operational need is support triage and recovery. ChefFlow should capture context and route it, not just link staff to email.
**Client-collaborative angle:** Limited. Clients may know if event details are wrong, but bug reporting should not depend on the client. If the bug is caused by missing client-provided access or dietary context, Dinner Circle can collect that upstream data separately.
**Physical reality:** Staff may be in a loud kitchen, on mobile, with dirty hands or low signal. The issue report needs minimal typing, optional screenshot/photo later, and a fallback "I need help now" route to the chef for day-of blockers.
**Compounding:** High. Every report can improve recurring staff surfaces, reveal broken routes, preserve device context, and prevent the same shift-blocking issue from recurring.

**Solution design:**

- Render issue reporting on token briefings, expired/revoked token states, and staff login/recovery surfaces, not only authenticated staff routes.
- Add a staff-specific severity path: "blocking my shift", "wrong event info", "cannot save", "login/access problem", or "security/privacy concern".
- Route urgent operational issues to the chef with event/staff context while still saving developer diagnostics.
- Attach safe context such as route, token state, event ID, staff member ID, browser info, and recent navigation without exposing unnecessary PII in public-token reports.
- Add a confirmation state that tells staff whether the report went to developer support, the chef, or both.

**Where it appears:**

- Authenticated staff layout through `GlobalReportButton`
- `/staff-portal/[id]` ready, expired, and revoked states
- `/staff-login` and staff auth recovery surfaces

**What remains as permanent exit:**
Staff still leave for immediate human escalation when the app is down, the phone has no signal, the browser cannot load ChefFlow, or a service-critical issue needs a voice call.

**Priority:** Medium-high frequency x low-medium effort = P1 support bridge
**Spec needed?** no

## Scenario #48: Switch to another role/account

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to make sure they are operating under the right identity and role before viewing schedules, tasks, client/event context, or chef/private data. They leave when the active role is unclear, the role switcher is not available, or they need to sign out and into another account.
**Context ChefFlow has:**

- The staff layout shows current staff name and email through `StaffNav`.
- The staff layout renders `RoleSwitcher` when the session reports more than one available role.
- `getAvailableRoles` lists roles for the current auth user from `user_roles`.
- `switchRole` verifies the selected role belongs to the user, sets `chefflow-active-role-id`, clears the role cache, and returns the role home path from `getHomePathForRole`.
- `auth-config` resolves preferred active roles from the cookie and refreshes JWT role, entity, tenant, and active role ID.
- Staff home path is registered as `/staff-dashboard`.
- Staff sign-out returns to `/staff-login`.
- Staff signup/invite flow can add a staff role to an existing auth user by email.
- `requireStaff()` directly queries `user_roles` and selects the first staff role path rather than visibly depending on the current active-role cookie in the inspected code, so active role semantics should be verified before relying on multi-role switching.

**Data source?** No. This is identity and session state, not external reference data. ChefFlow owns the role list, active-role cookie, session claims, home paths, and staff route gate.
**Client-collaborative angle:** None. Clients should not participate in staff role switching or account recovery.
**Physical reality:** This is a mobile and desktop shell concern. Staff need a small but unmistakable active-role/account indicator, a safe role switch menu, and a direct "not you?" sign-out path.
**Compounding:** Medium. Correct role context prevents repeated confusion and avoids support/debug time, but each switch is an individual session action.

**Solution design:**

- Keep the staff shell role switcher, but make current role, staff name, and email visible in compact mobile states as well as desktop.
- Add explicit "Switch role" and "Switch account" language so staff understand the difference between changing roles and signing out.
- Verify that all staff guards and staff data queries honor the intended active role when a user has multiple role rows.
- Add staff-login copy for "Use a different account" and "This is not my staff account" recovery paths.
- Preserve destination context when a staff member signs in after being redirected from a protected staff route.

**Where it appears:**

- Staff portal shell under `app/(staff)/layout.tsx`
- `components/shared/role-switcher.tsx`
- `/staff-login` and `/auth/signin`

**What remains as permanent exit:**
Staff still leave for external email account recovery, true account ownership disputes, device/browser profile switching, and cases where a different person needs to sign in on a shared device.

**Priority:** Medium frequency x medium effort = P1/P2 identity clarity hardening
**Spec needed?** yes

## Scenario #49: Read full legal/privacy policies

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to understand the legal terms, privacy handling, worker/contractor expectations, data rights, and code-of-conduct obligations connected to using the staff portal. They leave when the staff terms are placeholder-level or when acceptance history is not visible.
**Context ChefFlow has:**

- Staff signup requires accepting the ChefFlow Privacy Policy and Staff Terms.
- Staff invite claiming records policy acceptance through `recordPolicyAcceptancesForSubject` with role `staff`, tenant ID, subject ID, source, IP hash, and user agent when policy versions exist.
- `ROLE_REQUIRED_POLICIES` includes `privacy_policy` and `staff_terms` for staff.
- `/privacy` is a full public privacy policy with core processors, optional integrations, data rights, security, and contact details.
- `/privacy-policy` redirects to `/privacy`.
- `/staff-terms` exists but is implemented as a `LegalPolicyPlaceholder`.
- `LegalPolicyPlaceholder` explicitly says the page is draft, not attorney-reviewed, and not final policy text.
- Admin legal readiness tracks staff terms, policy versions, acceptances, professional review status, and high-risk warnings.
- Public unauthenticated route policy includes `/staff-terms`, `/privacy`, `/privacy-policy`, and `/terms`.

**Data source?** No. ChefFlow owns the public policy pages, policy-version ledger, and acceptance records. Attorney review and jurisdiction-specific legal advice remain external professional work rather than a database ChefFlow can simply ingest.
**Client-collaborative angle:** None for staff legal terms. Dinner Circle should not collect or interpret staff employment/contractor obligations.
**Physical reality:** Staff may read terms during invite signup on a phone, then want to revisit them later from the staff portal. Policies should be mobile-readable, printable/downloadable, and accessible without requiring staff to search emails.
**Compounding:** High. Policy versions, acceptance records, and reacceptance rules compound into a durable compliance trail and reduce repeated questions from staff, chefs, and support.

**Solution design:**

- Replace the placeholder `/staff-terms` page with full staff/contractor portal terms that cover scheduling, station work, time records, food safety, privacy, issue reporting, and worker-classification boundaries.
- Add a staff portal legal/settings surface that links Privacy Policy, Staff Terms, data rights, and current acceptance status.
- Show policy version, last updated date, and whether reacceptance is required.
- Keep admin legal readiness as the source of professional-review status and avoid marking staff terms approved without review.
- Add print/download affordances for staff terms and privacy policy.

**Where it appears:**

- `/staff-terms`
- `/privacy`
- Staff signup acceptance block at `/auth/staff-signup`
- Staff portal settings/legal link or account/help surface
- Admin legal readiness and policy-version ledger

**What remains as permanent exit:**
Attorney review, jurisdiction-specific labor classification advice, tax/employment interpretation, and disputes about legal obligations remain outside ChefFlow.

**Priority:** Medium frequency x medium effort = P2 compliance trust gap
**Spec needed?** yes

## Batch Summary

| #   | Title                                | Reclassified To     | Spec Needed? |
| --- | ------------------------------------ | ------------------- | ------------ |
| 45  | Recover a forgotten staff password   | Reducible           | no           |
| 46  | Handle revoked or expired token link | Partially Reducible | yes          |
| 47  | Report portal bug or issue           | Partially Reducible | no           |
| 48  | Switch to another role/account       | Reducible           | yes          |
| 49  | Read full legal/privacy policies     | Reducible           | yes          |
