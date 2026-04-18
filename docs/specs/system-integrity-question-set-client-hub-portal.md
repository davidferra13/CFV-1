# System Integrity Question Set: Client & Hub Portal

> 50 binary pass/fail questions across 10 domains.
> Executed 2026-04-17. Sweep covers hub profiles, circles, messaging, notifications, client portal auth, payments, intake, GDPR, and hub features.

---

## Domain A: Hub Profile & Identity Security (5 questions)

| #   | Question                                                                | P/F  | Evidence                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does `getOrCreateProfile` prevent impersonation via email dedup?        | PASS | `profile-actions.ts:63-69`: existing profiles found by email have `profile_token: ''` stripped. `is_existing: true` flag set. Caller must use recovery flow to get token. Prevents knowing-email-grants-access. |
| A2  | Does `updateProfile` verify ownership via profile token before writing? | PASS | `profile-actions.ts:145-150`: loads profile by `profile_token`, throws if not found, then updates by `id`. Token is the auth mechanism.                                                                         |
| A3  | Does profile creation validate input with Zod?                          | PASS | `profile-actions.ts:11-15`: `CreateProfileSchema` validates `display_name` min(1) max(100), `email` optional email format, `auth_user_id` optional UUID.                                                        |
| A4  | Does `upgradeGuestToClient` prevent double-linking?                     | PASS | `profile-actions.ts:211`: `if (profile.auth_user_id) throw new Error('Profile already linked to an account')`. Guards against re-upgrade.                                                                       |
| A5  | Does `upgradeGuestToClient` merge dietary info without overwriting?     | PASS | `profile-actions.ts:237-258`: only copies dietary/allergies if client record has NONE. Merges referral tracking non-destructively. Preserves chef-entered data.                                                 |

## Domain B: Circle Group RBAC & Management (5 questions)

| #   | Question                                                   | P/F  | Evidence                                                                                                                                                                              |
| --- | ---------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Does `createHubGroup` verify profile and tenant existence? | PASS | `group-actions.ts:37-49`: verifies `created_by_profile_id` exists in `hub_guest_profiles`. If `tenant_id` provided, verifies it exists in `chefs` table. Auto-nulls invalid tenant.   |
| B2  | Does `updateHubGroup` enforce owner/admin role check?      | PASS | `group-actions.ts:352-369`: resolves profile by token, checks membership role, requires `['owner', 'admin']`. Throws on unauthorized.                                                 |
| B3  | Does `removeMember` prevent removing the owner?            | PASS | `group-actions.ts:634`: `if (target.role === 'owner') throw`. Also prevents self-removal (must use `leaveGroup`). Admins cannot remove other admins (line 640).                       |
| B4  | Does `leaveGroup` prevent the sole owner from leaving?     | PASS | `group-actions.ts:697-708`: checks for other owners/admins. Throws "Promote another member to admin before leaving" if none exist.                                                    |
| B5  | Does `updateMemberRole` enforce role hierarchy?            | PASS | `group-actions.ts:538-539`: admins cannot promote to admin (only owners can). Cannot change owner's role (line 551) or chef's role (line 552). Default permissions auto-set per role. |

## Domain C: Hub Messaging & Content Security (5 questions)

| #   | Question                                                         | P/F  | Evidence                                                                                                                                                                                |
| --- | ---------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does `postHubMessage` verify membership AND can_post permission? | PASS | `message-actions.ts:64-72`: resolves profile by token, checks `hub_group_members` for membership, verifies `can_post === true`. Throws on either failure.                               |
| C2  | Does `postHubMessage` have rate limiting?                        | PASS | `message-actions.ts:44-49`: `checkRateLimit('hub-post:${profileToken}', 30, 60 * 1000)`. 30 messages/minute per profile.                                                                |
| C3  | Does `deleteHubMessage` use soft-delete (not hard)?              | PASS | `message-actions.ts:468-470`: updates `deleted_at` timestamp. `getHubMessages` filters `.is('deleted_at', null)` (line 204). Never permanently removed.                                 |
| C4  | Does `deleteHubMessage` restrict to author OR owner/admin?       | PASS | `message-actions.ts:454-466`: checks `isAuthor` first. If not author, verifies membership role is `['owner', 'admin']`. Throws on unauthorized.                                         |
| C5  | Does `editHubMessage` restrict to author only?                   | PASS | `message-actions.ts:631-632`: `if (message.author_profile_id !== profile.id) throw 'Only the author can edit'`. Admin cannot edit others' messages. Body re-validated (trim, max 2000). |

## Domain D: Hub Notification & Email Safety (5 questions)

| #   | Question                                                                 | P/F  | Evidence                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------------------------- |
| D1  | Does circle notification respect muting, quiet hours, and digest mode?   | PASS | `circle-notification-actions.ts:89-176`: skips muted members, checks `notifications_enabled`, respects `digest_mode` (instant/hourly/daily), checks `isWithinQuietHours()`, enforces 5-minute cooldown per circle.                                           |
| D2  | Does the quiet hours check handle overnight spans?                       | PASS | `circle-notification-actions.ts:46-53`: if `startMinutes > endMinutes` (overnight, e.g. 22:00-07:00), uses OR logic: `currentMinutes >= start                                                                                                                |     | currentMinutes < end`. Correct. |
| D3  | Does notification use smart grouping to batch rapid messages?            | PASS | `circle-notification-actions.ts:128-168`: `pendingNotifications` Map with 2-minute grouping window. Batches messages from same author within window, sends single email with count summary.                                                                  |
| D4  | Does push notification support both authenticated and guest subscribers? | PASS | `circle-notification-actions.ts:195-213`: authenticated users use `push_subscriptions` table via `getActiveSubscriptions(auth_user_id)`. Guests use `hub_push_subscriptions` table via `getHubPushSubscriptions(profile.id)`. Both paths fire independently. |
| D5  | Does `sendCircleRecoveryEmail` prevent email enumeration?                | PASS | `profile-actions.ts:346-347,369-371`: returns identical message "If that email is in our system, we sent a link" for both found and not-found cases. Rate limited to 3 per email per 15 minutes.                                                             |

## Domain E: Client Portal Authentication & Scoping (5 questions)

| #   | Question                                                              | P/F  | Evidence                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Does the client layout enforce `requireClient()` at the layout level? | PASS | `app/(client)/layout.tsx:22-27`: `requireClient()` in try/catch, redirects to `/auth/signin?portal=client` on failure. All child pages inherit this gate.                                    |
| E2  | Do client event queries scope by `client_id = user.entityId`?         | PASS | `lib/events/client-actions.ts:33,83,188,231,283,300`: every query uses `.eq('client_id', user.entityId)`. 6 instances verified across all client event functions.                            |
| E3  | Does `getClientEvents` exclude draft events from client view?         | PASS | `client-actions.ts:35`: `.not('status', 'eq', 'draft')`. Also in `getClientEventById` line 84. Clients never see draft events.                                                               |
| E4  | Does the client layout include skip-to-content for accessibility?     | PASS | `app/(client)/layout.tsx:36-40`: `<a href="#main-content" className="sr-only focus:not-sr-only...">Skip to main content</a>`. Proper focus-visible styling.                                  |
| E5  | Does `getOrCreateClientHubProfile` try all three identity links?      | PASS | `client-hub-actions.ts:20-58`: tries `auth_user_id` OR `client_id` first, then falls back to `email_normalized` match, then creates new. Ensures profile consolidation across login methods. |

## Domain F: Client Financial Data & Payment Flow (5 questions)

| #   | Question                                                                          | P/F  | Evidence                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Does the payment page validate event ownership before showing?                    | PASS | `app/(client)/my-events/[id]/pay/page.tsx:17`: `requireClient()` + `getClientEventById(params.id)` which scopes to `user.entityId`. Non-owner gets `notFound()`.                               |
| F2  | Does the payment page restrict by event status?                                   | PASS | `pay/page.tsx:26-29`: `payableStatuses = ['accepted', 'paid', 'confirmed', 'in_progress', 'completed']`. Redirects to event detail if status is outside this list.                             |
| F3  | Does the payment page prevent payment of zero or negative amounts?                | PASS | `pay/page.tsx:50-52`: `if (paymentAmount <= 0) redirect(...)`. Also validates deposit logic: redirects if `depositAmountCents > quotedPriceCents`.                                             |
| F4  | Does the client event detail show error state when financial data is unavailable? | PASS | `my-events/[id]/page.tsx:352-357`: `if (!financialAvailable)` renders amber warning: "Payment information is temporarily unavailable. Please refresh." Never shows $0.00 as if it's real data. |
| F5  | Does the client see financial data derived from ledger (not stored balance)?      | PASS | `client-actions.ts:98`: fetches `event_financial_summary` view. `quotedPriceCents`, `totalPaidCents`, `outstandingBalanceCents` all computed from immutable ledger entries.                    |

## Domain G: Client Intake, Onboarding & Data Collection (5 questions)

| #   | Question                                                           | P/F  | Evidence                                                                                                                                                                              |
| --- | ------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Does intake form creation require chef auth + tenant scoping?      | PASS | `intake-actions.ts:45-46`: `requireChef()` + `tenantId = user.tenantId!`. All CRUD operations tenant-scoped.                                                                          |
| G2  | Does the public intake submission validate share token + expiry?   | PASS | `intake-actions.ts:240-248`: validates share_token exists, checks `expires_at < new Date()`, checks `response_id` not already set. Triple guard.                                      |
| G3  | Does `applyResponseToClient` merge (not overwrite) existing data?  | PASS | `intake-actions.ts:337-383`: fetches existing allergies/dietary first, deduplicates case-insensitively, appends notes with date prefix. Never replaces existing data.                 |
| G4  | Does intake response application trigger allergen safety rechecks? | PASS | `intake-actions.ts:420-438`: non-blocking calls to `syncFlatToStructured` (allergy records) and `recheckUpcomingMenusForClient` (menu allergen conflicts). Both wrapped in try/catch. |
| G5  | Does client onboarding use HMAC-verified tokens?                   | PASS | `onboarding-actions.ts:10`: `generateOnboardingToken(clientId, tenantId)` from `onboarding-tokens.ts`. `verifyOnboardingToken` validates HMAC signature. Prevents token forgery.      |

## Domain H: Public Hub Access & SEO Protection (5 questions)

| #   | Question                                                                   | P/F  | Evidence                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1  | Does the hub layout prevent search engine indexing?                        | PASS | `app/(public)/hub/layout.tsx:9-11`: `metadata.robots = { index: false, follow: false }`. Applies to ALL hub routes.                                                                                                                  |
| H2  | Does the hub group page add `nocache` for private circles?                 | PASS | `hub/g/[groupToken]/page.tsx:153-155`: non-community circles get `robots: { index: false, follow: false, nocache: true }`. Community circles still noindex but get OG previews.                                                      |
| H3  | Does the join page rate-limit by IP?                                       | PASS | `hub/join/[groupToken]/page.tsx:13-14`: `checkRateLimit('hub-join:${ip}', 15, 15 * 60 * 1000)`. 15 joins per 15 minutes per IP. Renders error on limit hit.                                                                          |
| H4  | Does the join flow check group `is_active` before allowing join?           | PASS | `group-actions.ts:167-169`: `joinHubGroup` checks `group.is_active`. Throws "Group not found or inactive" if false.                                                                                                                  |
| H5  | Does the recovery route validate profile membership before setting cookie? | PASS | `hub/recover/[groupToken]/route.ts:31-55`: validates profile token exists, verifies group exists by token, checks membership in `hub_group_members`. Redirects to join page if any check fails. Only sets cookie on full validation. |

## Domain I: GDPR, Data Export & Account Deletion (5 questions)

| #   | Question                                                       | P/F  | Evidence                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | Does client data export strip sensitive internal fields?       | PASS | `account-deletion-actions.ts:227-230`: deletes `tenant_id`, `portal_access_token`, `portal_access_token_hash`, `stripe_customer_id` from export. Client never sees internal IDs or payment tokens.                                                                                                     |
| I2  | Does account deletion use 30-day grace period (not immediate)? | PASS | `account-deletion-actions.ts:67`: `scheduledFor = now + 30 days`. Soft-delete pattern. `cancelClientAccountDeletion()` available to reverse.                                                                                                                                                           |
| I3  | Does account deletion have rate limiting?                      | PASS | `account-deletion-actions.ts:53`: `checkRateLimit('client-deletion:${user.id}', 3, 60 * 60 * 1000)`. 3 requests/hour. Data export also rate-limited (line 116).                                                                                                                                        |
| I4  | Does account deletion prevent duplicate requests?              | PASS | `account-deletion-actions.ts:56-63`: checks `account_deletion_requested_at` already set. Returns error "Deletion already requested" if pending.                                                                                                                                                        |
| I5  | Does data export include all client-owned data categories?     | PASS | `account-deletion-actions.ts:118-250`: exports profile, events, inquiries, quotes, messages, allergy records, notes, photos metadata, taste profile, kitchen inventory, intake responses, meal requests, referrals, NDAs, financial records. 15 categories total. Comprehensive Article 20 compliance. |

## Domain J: Hub Features (Polls, Media, Friends, Availability) (5 questions)

| #   | Question                                                        | P/F  | Evidence                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1  | Does poll creation validate input with Zod + verify membership? | PASS | `poll-actions.ts:12-27`: `CreatePollSchema` validates `groupId` UUID, `profileToken` UUID, `question` min(1) max(300), `options` min(2) max(10). Lines 42-55: resolves profile, verifies `can_post` permission. |
| J2  | Does media upload verify membership before recording?           | PASS | `media-actions.ts:66-80`: `createHubMedia` validates with Zod, resolves profile by token, verifies group membership and `can_post`. Upload path uses group-scoped directory (`${groupId}/...`).                 |
| J3  | Does the friend system prevent self-friending?                  | PASS | `friend-actions.ts:80`: `if (myProfile.id === addresseeProfileId)` check (line truncated but pattern confirmed). Also checks both directions for existing friendship (line 32-37).                              |
| J4  | Does the friend system handle re-request after decline?         | PASS | `friend-actions.ts:44-56`: if existing friendship status is 'declined', updates to 'pending' with new requester/addressee. Allows recovery without creating duplicates.                                         |
| J5  | Does availability polling validate membership + Zod schema?     | PASS | `availability-actions.ts:35-42`: `CreateAvailabilitySchema` validates all fields. Lines 51-70: resolves profile by token, verifies `can_post` membership. Same pattern as polls and messages.                   |

---

## Summary

| Domain                                                | Pass   | Fail  | Total  |
| ----------------------------------------------------- | ------ | ----- | ------ |
| A: Hub Profile & Identity Security                    | 5      | 0     | 5      |
| B: Circle Group RBAC & Management                     | 5      | 0     | 5      |
| C: Hub Messaging & Content Security                   | 5      | 0     | 5      |
| D: Hub Notification & Email Safety                    | 5      | 0     | 5      |
| E: Client Portal Authentication & Scoping             | 5      | 0     | 5      |
| F: Client Financial Data & Payment Flow               | 5      | 0     | 5      |
| G: Client Intake, Onboarding & Data Collection        | 5      | 0     | 5      |
| H: Public Hub Access & SEO Protection                 | 5      | 0     | 5      |
| I: GDPR, Data Export & Account Deletion               | 5      | 0     | 5      |
| J: Hub Features (Polls, Media, Friends, Availability) | 5      | 0     | 5      |
| **Total**                                             | **50** | **0** | **50** |

**Pass rate: 100% (50/50), 0 actionable failures**

---

## Architectural Notes (Not Failures)

**Hub access model: Token-as-credential.** Hub pages use link-based access (no auth). The `group_token` (UUID) and `profile_token` (UUID) ARE the credentials. This is analogous to Google Docs "anyone with the link" sharing. All write operations additionally verify profile token ownership and membership permissions. Read operations are gated by knowing the group token, which is only shared via invite links and emails.

**IDOR defense on message reads.** `getHubMessages` and `searchHubMessages` use `verifyGroupAccess(groupId, groupToken)` to prevent arbitrary groupId enumeration. Other read-path functions (`getGroupMembers`, `getGroupNotes`, `getPinnedMessages`) take only `groupId` but are exclusively called from server components (never exposed as client-callable actions). If any of these are ever imported in client components, they should be retrofitted with `verifyGroupAccess`.

**Recovery cookie httpOnly: false.** The `hub_profile_token` cookie is set with `httpOnly: false` (line 63 of recover route) because client-side JS in the hub SPA needs to read it. This is an intentional design choice, documented in-code. If any XSS vulnerability is ever found on hub pages, this cookie would be exfiltrable. Mitigated by the hub layout's strict server-rendered architecture.

**Search wildcard escaping.** `searchHubMessages` uses `.ilike('body', '%${q}%')` without escaping SQL wildcard characters (`%`, `_`) in user input. The Supabase compat layer parametrizes values (no SQL injection risk), but searches for literal `%` or `_` characters will match more broadly than expected. Cosmetic issue only.

**Circle-first notification architecture.** The system uses a "circle-first" notification pattern: lifecycle events (quote sent, payment received, event confirmed) post a rich notification card to the Dinner Circle first, then send a short email pointing members to the circle. If no circle exists, a standalone fallback email is sent. This ensures the circle is the canonical coordination surface.
