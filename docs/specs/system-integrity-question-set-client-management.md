# System Integrity Question Set: Client Management

> 55 questions across 11 domains. Every question forces a verifiable answer.
> Status: BUILT = code exists and works. GAP = identified, needs fix. N/A = intentionally excluded.
>
> **Scorecard: 30 BUILT, 25 GAP, 0 N/A**

**Scope:** Client CRUD, 30-panel detail page, client portal, invitations, dietary/allergy tracking, NDA management, loyalty program, gift cards/vouchers, referrals, segments, tags, dormancy/churn detection, health scores, intelligence, intake forms, kitchen profiles, recurring service, meal requests, photos, milestones, communication timeline, presence monitoring, engagement badges, GDPR deletion, CSV export, duplicate detection, merge, cross-system boundaries (events, inquiries, financials, AI/Remy, calendar, shopping lists).

**Principle:** Every question is binary pass/fail. "Mostly works" is not passing. Each question targets a real failure mode that would harm a chef operationally in production.

---

## Domain A: Core CRUD and Data Integrity

**A1. BUILT** - When `createClient` is called, does it enforce tenant scoping from session (not request body)? Does it prevent duplicate emails within the same tenant? What happens if two clients share an email across different tenants?

> Tenant from `requireChef()` at `lib/clients/actions.ts:328`. Duplicate email check at lines 334-356. DB constraint `UNIQUE(tenant_id, email)` at `database/migrations/20260215000001_layer_1_foundation.sql:137` allows cross-tenant sharing by design. All three creation paths (`createClient`, `createClientDirect`, `addClientFromInquiry`) enforce session-based tenant scoping.

**A2. BUILT** - When `updateClient` is called, does it use optimistic concurrency (`expected_updated_at`) to prevent stale writes? If Chef opens client detail in two tabs, edits in both, saves both, does the second save fail gracefully with a conflict toast, or silently overwrite?

> `UpdateClientSchema` includes `expected_updated_at` at line 196. Two-layer guard: app-level compare at lines 682-688 + SQL-level `.eq('updated_at', expected_updated_at)` at lines 710-711. Second save throws `createConflictError('This record changed elsewhere.')` with structured code `'CONFLICT'` from `lib/mutations/conflict.ts:11`.

**A3. BUILT** - When `deleteClient` soft-deletes a record (`deleted_at` timestamp), does every query that lists clients correctly exclude soft-deleted records? Does the `/clients/inactive` page show soft-deleted clients, or only status=inactive ones? Are these two concepts conflated?

> Every listing function filters `.is('deleted_at', null)`: `getClients:538`, `getClientById:567`, `getClientsWithStats:948`, `getClientWithStats:1047`, `searchClientsQuick:1507`, `searchClientsByName:1576`. Inactive page filters by `status === 'dormant'` on already-filtered results. Not conflated.

**A4. BUILT (fragile)** - Does `restoreClient` clear `deleted_at` AND restore the client to their previous status? Or does it restore to a default status regardless of what they were before deletion?

> `restoreClient` (lines 867-888) clears `deleted_at` and `deleted_by` but does not touch `status`. Since `deleteClient` also does not modify `status`, the original status survives the cycle. Correct by accident, not by explicit contract. No pre-deletion status snapshot is saved.

**A5. GAP** - The `clients` table has ~90 columns. Does the TypeScript type (`types/database.ts`) include all columns? The detail page uses 50+ `(client as any)` type assertions, suggesting the type definition is incomplete. Do runtime reads succeed but type safety is absent?

> Type definition at `types/database.ts:11438` has 129 columns and IS complete. The gap: `createServerClient()` returns `any` at `lib/clients/actions.ts:669`, so every function's return type is `any`. The detail page has **68** `(client as any)` casts. Runtime works, but zero compile-time protection against typos or type mismatches across the entire client pipeline.

---

## Domain B: Client Detail Page (30-Panel Monster)

**B1. BUILT** - The detail page fires 26 parallel `Promise.all` data fetches. If ANY single fetch throws (not returns empty, but throws), does it crash the entire page with the error boundary? Or does each panel degrade independently?

> Every fetch has an individual `.catch()` returning a safe fallback (`null`, `[]`, `{}`) at `app/(chef)/clients/[id]/page.tsx:148-181`. Async sub-sections wrapped in `<WidgetErrorBoundary>` + `<Suspense>` at lines 307-325. Single panel failure cannot crash the page.

**B2. GAP** - When the status badge dropdown changes a client from Active to Dormant, does it: (a) persist via `updateClientStatus`, (b) revalidate the clients list page, (c) update the health score, (d) trigger any dormancy-related follow-up rules? Or does only the badge change with no downstream effects?

> (a) Persists correctly at `components/clients/client-status-badge.tsx:42`. (b) **Missing `revalidatePath('/clients')`** for list page; only revalidates `/clients/${clientId}` at `lib/clients/actions.ts:1155`. (c) No health score recalculation triggered. (d) No dormancy automation fires. Optimistic update has proper try/catch rollback.

**B3. BUILT** - The portal link manager generates, copies, rotates, and revokes portal access tokens. When a token is revoked, does the client immediately lose portal access? Or can they continue using a cached session until it expires? What's the actual invalidation path?

> Revocation is immediate and sessionless. `revokeClientPortalToken` at `lib/client-portal/actions.ts:126-144` nulls all token fields. Portal page is `force-dynamic`, every load re-validates via `getClientPortalData` -> `hasActivePortalLink` (checks `portal_token_revoked_at`). No sessions, no cookies, no JWTs. Token IS the credential, validated per-request.

**B4. BUILT** - The engagement badge (HOT/WARM/COLD) is computed from 14-day portal activity via `computeEngagementScore`. If the client portal presence beacon stops sending (client closes browser), does the engagement score decay correctly over time? Or does it freeze at the last known state?

> Pure function at `lib/activity/engagement.ts:71-116`. Events outside 14-day window filtered out (line 80). Recency multiplier decays from 1.0 to 0.1 within window (lines 90-94). No events = score 0. Recomputed on each page render, never stored. Cannot freeze at stale value across page loads.

**B5. BUILT** - The financial panel on client detail calls `getClientFinancialDetail`. Does this use the `client_financial_summary` view (derived from ledger), or does it compute separately? If separately, can the two diverge?

> Uses `event_financial_summary` view at `lib/clients/actions.ts:1203-1213`. Same ledger-derived source as all other financial surfaces. Tips cross-checked by direct ledger query at lines 1274-1278 (same source). Cannot diverge.

---

## Domain C: Client Portal (What Clients Actually See)

**C1. BUILT** - When a client logs into the portal via magic link (portal access token), what auth mechanism is used? Is it a full Auth.js session, or a separate token-based system? Can a client portal session access chef-side routes? Is there route protection preventing `/clients` access from a portal session?

> Dual-layer: (1) Token portal at `app/client/[token]/page.tsx` is sessionless, read-only, outside route groups. (2) Full Auth.js portal at `app/(client)/` requires `requireClient()` session. Middleware at `middleware.ts:158-170` blocks cross-role route access. Chef layout double-checks with `requireChef()`. A client session cannot access `/clients`.

**C2. BUILT** - The client portal has `/my-events/[id]/pay` for payment processing. Does this page correctly integrate with Stripe? When a client pays, does the ledger entry get created on the chef's side? Does the event financial summary update? Does the chef get notified?

> Full pipeline: `createPaymentIntent` at `lib/stripe/actions.ts:39-172` with metadata. Webhook `handlePaymentSucceeded` at `app/api/webhooks/stripe/route.ts:433` creates idempotent ledger entry, transitions event to `paid`, sends in-app notification + email + push to chef. All side effects non-blocking with try/catch.

**C3. GAP** - `/my-profile/delete-account` implements GDPR account deletion with 30-day grace period. When a client requests deletion: (a) is the client immediately hidden from chef's client list? (b) Can the chef see the deletion is pending? (c) After 30 days, what data is actually purged vs. retained for financial/legal records? (d) Are ledger entries preserved (they must be, for accounting)?

> Request sets `account_deletion_requested_at` and `account_deletion_scheduled_for` at `lib/clients/account-deletion-actions.ts:47-84`. **Gaps:** (a) Client NOT hidden from chef list (deletion request fields are separate from `deleted_at`). (b) No pending-deletion indicator surfaced to chef. (c) **No automated client purge job exists.** The cron at `app/api/cron/account-purge/route.ts` only processes CHEF deletions. After 30 days, nothing happens for clients. (d) Moot since no purge runs.

**C4. BUILT** - The client portal has `/my-events/[id]/approve-menu` and `/my-events/[id]/choose-menu`. If a client approves a menu, does the event status transition correctly? Does the chef see menu approval reflected immediately? Is there a race condition if the chef modifies the menu while the client is approving?

> Atomic RPC `respond_menu_approval_atomic` uses `SELECT ... FOR UPDATE` row lock at `database/migrations/20260330000041_atomic_respond_menu_approval.sql:44-48`. Updates `menu_approval_status` (not event FSM). Chef notified via in-app + email at `lib/events/menu-approval-actions.ts:306-340`. Cache busted at line 291.

**C5. BUILT (minor gaps)** - `/my-events/[id]/contract` handles contract signing. Is the signing legally binding (timestamp, IP, user agent recorded)? Does signing trigger the correct event state transition? Can a client sign a contract after the event date has passed?

> Timestamp + user agent recorded at `lib/contracts/actions.ts:464-475`. Optimistic lock `.in('status', ['sent', 'viewed'])` prevents double-signing. Chef notified. **Gaps:** (1) IP address NOT captured (always null, only user_agent passed from client). (2) No guard against signing after event date passed. (3) No event FSM transition on signing (contract status and event status are separate).

---

## Domain D: Invitations and Onboarding

**D1. BUILT (minor gap)** - When a chef sends a client invitation via `inviteClient`, does it: (a) create a `client_invitations` record, (b) send an email with a unique token, (c) prevent duplicate invitations to the same email? What happens if the email bounces? Is there a retry mechanism or dead letter queue?

> (a) Record created at `lib/clients/actions.ts:259-271` with SHA-256 hashed token, 7-day expiry. (b) Email sent at lines 282-301. (c) Duplicate checks at lines 216-249. **Gap:** Email send is fire-and-forget (try/catch, no retry). Chef gets `{ success: true, invitationUrl }` even if email fails. No bounce handling or dead letter queue.

**D2. BUILT** - When a client accepts an invitation (uses the token), does it: (a) create an `auth_users` record, (b) create a `user_roles` record with `entity_id` pointing to the client, (c) link the client record's `auth_user_id`, (d) mark the invitation as used? What if the token is expired? What if it's used twice?

> (a) Auth user created at `lib/auth/actions.ts:335-352`. (b) Role record at lines 373-377 with `role: 'client'`. (c) Creates NEW client record with `authUserId` at lines 356-366. (d) Invitation marked used at lines 380-382. Expired token returns null (filter at `lib/auth/invitations.ts:38`). Used twice blocked by `used_at` IS NULL check + email uniqueness.

**D3. GAP** - The "Create client (no invitation)" path via `createClientDirect` creates a client record without auth. Can a chef later send an invitation to this existing client? Does it link correctly, or does it create a duplicate?

> `inviteClient` checks for existing clients with same email at `lib/clients/actions.ts:216-236` and **blocks the invitation** with "Client with this email already exists." No supported path to upgrade a shadow client to an authenticated one. If the shadow client has no email, invitation creates a brand-new client record (duplicate). The onboarding token flow is for collecting preferences, not granting auth.

**D4. GAP** - The intake form system (`client_intake_forms`, `client_intake_shares`, `client_intake_responses`) allows chefs to create custom forms, share via token, and receive responses. When `applyResponseToClient` is called, does it merge into the client record non-destructively? Or can it overwrite existing client data (dietary restrictions, allergies) without warning?

> **Destructive overwrite** at `lib/clients/intake-actions.ts:335-345`. Fields containing "allerg" overwrite `allergies`, "dietary"+"restrict" overwrites `dietary_restrictions`, "note" overwrites `notes`. No diff shown to chef, no confirmation step, no record of what was replaced. Raw response IS preserved in `unknown_fields.intake_responses` (recovery path exists), but top-level fields are silently overwritten.

**D5. GAP** - The onboarding token system (`generateOnboardingToken`, `verifyOnboardingToken`) and the invitation token system (`client_invitations`) seem like separate pathways to the same outcome. Are they? Can they conflict? Does one supersede the other?

> Two entirely separate systems. Invitations create auth accounts (DB table, SHA-256 hash, 7-day TTL). Onboarding tokens collect preferences (HMAC-signed payload, no auth). Neither knows about the other. **Conflict risk:** Chef sends both -> client completes onboarding first (data on old record) -> accepts invitation (creates NEW record) -> onboarding data orphaned on unlinked record. Onboarding token has weaker replay protection (no hard block on resubmission).

---

## Domain E: Dietary, Allergies, and Taste Profiles

**E1. BUILT** - The `client_allergy_records` table has severity levels (preference/intolerance/allergy/anaphylaxis) and source tracking (chef_entered/ai_detected/intake_form/client_stated). When an allergy is detected from an AI conversation via Remy, does it require chef confirmation (`confirmed_by_chef`) before affecting menus and shopping lists? Or can an unconfirmed AI-detected allergy silently filter ingredients?

> Menu conflict check at `lib/events/readiness.ts:808-814` filters to `confirmed_by_chef = true` AND `severity IN ('allergy', 'anaphylaxis')`. Event readiness gate at lines 413-443 blocks `paid -> confirmed` transition if unconfirmed records exist; anaphylaxis is a hard block. All new records default to `confirmed_by_chef: false` at `lib/dietary/intake.ts:143`.

**E2. GAP** - When a client updates their dietary restrictions via the portal (`/api/clients/preferences`), does it sync to the `client_allergy_records` structured table? The API route mentions "sync structured allergy records." Is this a reliable two-way sync, or can the freetext dietary field and the structured records drift apart?

> **One-way and partial.** `app/api/clients/preferences/route.ts:49-63`: `allergies` array syncs to structured records via upsert. But `dietary_restrictions` (line 46) writes ONLY to flat `clients` column, no structured record sync. **Reverse sync missing:** chef-side `confirmAllergyRecord` writes to structured table but NOT to flat `clients.allergies` array. `logDietaryChange` has **zero import statements** anywhere in codebase, so dietary changes are never logged.

**E3. GAP** - The household allergen matrix (`getHouseholdAllergenMatrix` via `client_connections`) cross-references allergies across connected clients. Does it work? If Client A has a peanut allergy and Client B (connected as spouse) doesn't, does an event for both correctly flag peanuts? Is this surfaced on the event page, or only on the client detail?

> Function exists at `lib/clients/dietary-dashboard-actions.ts:276-309` but uses `event_guests` not `client_connections` (infers household from event attendance, not explicit relationships). **Dead code from UI perspective:** zero `.tsx` files import `getHouseholdAllergenMatrix`. Not surfaced on event pages or client detail. Logic works in theory but chef never sees results.

**E4. GAP** - When a client's dietary restrictions change (logged via `logDietaryChange`), does the dietary alert system (`getDietaryAlerts`) fire for the chef? Does it show on the dashboard? Is there a notification? Or does the chef only see it when they manually visit the client detail page?

> Dashboard widget exists at `components/dashboard/dietary-alerts-widget.tsx` (imported in alerts section). Alert actions (`getDietaryAlerts`, `acknowledgeAlert`, etc.) are functional. **But `logDietaryChange` is never called.** Zero imports across entire codebase. No mutation path writes to `dietary_change_log`. Pipeline is built end-to-end but has zero data flowing into it.

**E5. GAP** - The taste profile system (`client_taste_profiles`) captures structured taste dimensions. Is this data used anywhere downstream (menu suggestions, recipe matching)? Or is it purely informational storage with no operational impact?

> Only consumed by client detail page and taste profile form. Menu intelligence (`lib/menus/menu-intelligence-actions.ts:1943`) reads from `client_preferences` (separate table with per-item ratings), NOT `client_taste_profiles`. No recipe matching, no menu building integration. Purely informational storage.

---

## Domain F: Intelligence, Health Scores, and Churn

**F1. BUILT (limited inputs)** - `getClientHealthScores` computes a health score for each client. What inputs feed the score? Event frequency? Spending? Communication recency? Portal activity? If a client hasn't booked in 90 days but messages weekly, are they "healthy" or "at risk"? Is the formula documented and tunable, or is it a black box?

> Four weighted dimensions at `lib/clients/health-score.ts:4-8`: Recency (30pts), Frequency (25pts), Monetary (25pts), Engagement (20pts, based on profile completeness + referrals). **Blind to communication** (no message/conversation data queried). Not tunable (hardcoded step functions). 90-day no-booking client with weekly messages would score ~20/30 on recency, zero credit for communication. Tier override: >365d = always "dormant", >180d = always "at_risk".

**F2. BUILT (informational only)** - The churn prevention system (`churn-prevention-triggers.ts`) has automated triggers. What do they actually do when they fire? Send a notification to the chef? Auto-send an email to the client? Create a follow-up task? Or just log a record that nobody sees?

> Returns data structure with `suggestedAction` as plain text (e.g., "Reach out personally") at `lib/intelligence/churn-prevention-triggers.ts:241-249`. No notifications sent, no emails, no tasks created, no DB writes. Results surface in Intelligence Hub UI as read-only display. Chef must act manually.

**F3. BUILT (navigational)** - The "next best action" system (`getNextBestActions`, `getClientNextBestAction`) recommends actions like "send follow-up," "propose rebooking," "acknowledge milestone." Are these recommendations actionable (clicking them initiates the action)? Or are they informational labels the chef must act on manually?

> Each action includes an `href` field. UI renders as `<Link>` at `components/clients/next-best-action-card.tsx:54-67`. Clicking navigates to the relevant page (e.g., `/inquiries`, `/clients/${clientId}`), but does NOT pre-fill forms or compose messages. Chef must find and execute the action manually after navigation.

**F4. BUILT (unvalidated)** - The rebooking prediction engine (`rebooking-predictions.ts`) estimates when a client will rebook. Is this displayed to the chef? Is it accurate (validated against historical data)? Does it factor in recurring service clients who don't need to "rebook"?

> Displayed in rebooking bar and intelligence hub. Scoring at `lib/intelligence/rebooking-predictions.ts:93-164`: repeat history (35pts), recency (30pts), regularity (20pts), loyalty bonus (15pts). Predicted date = last event + average interval. **No backtesting or accuracy validation.** Zero references to "recurring"/"retainer"/"subscription" in the file; treats all clients identically. Weekly retainer clients would be flagged "overdue" after missing one week.

**F5. BUILT (fragmented)** - The dormancy detection system has at least three implementations: `getDormantClients` (dormancy.ts), `getCoolingClients` (cooling-actions.ts), `findCoolingClients` (cooling-alert.ts), and `getClientDormancyInfo` (actions.ts). Are these redundant? Do they use different thresholds? Can a client be "dormant" by one system and "active" by another?

> Four overlapping implementations with conflicting thresholds: DB view `is_dormant` = 180d. `getDormantClients` filters >=90d AND `is_dormant=true` (90d filter is dead code since view requires 180d). `findCoolingClients`: VIP=90d, Standard=180d. Health score: "at_risk"=180d, "dormant"=365d. **A client at 200 days is simultaneously** "dormant" (DB view), "cooling" (cooling system), and "at_risk" (health score, NOT "dormant" until 365d). All four surface on the dashboard with different labels and suggested actions.

---

## Domain G: Loyalty, Gift Cards, and Referrals

**G1. BUILT** - The loyalty program (`loyalty_points`, `loyalty_tier` on clients table, plus `lib/loyalty/` actions) awards points and has tier levels. Are points awarded automatically on event completion via `auto-award.ts`? Or does the chef manually award? If auto, does the trigger fire reliably on every `completed` event transition?

> Auto-award fires from `runCompletedEventPostProcessing` at `lib/events/transitions.ts:51-74`, called inline on `completed` transition at line 1026. `awardEventPoints` at `lib/loyalty/actions.ts:770-1043` computes points (per_guest/per_dollar/per_event modes), applies bonuses, updates balance/tier. Idempotency guard: `loyalty_points_awarded` flag at line 788. 14 additional triggers via `lib/loyalty/triggers.ts` fire from 12 files across the codebase.

**G2. GAP** - When a client redeems loyalty points for a reward, does it: (a) deduct points, (b) create a voucher/incentive record, (c) apply the discount to the next event? Or does redemption stop at "points deducted" with no actual benefit applied?

> (a) Points deducted at `lib/loyalty/actions.ts:1247`. (b) Pending delivery record created at `lib/loyalty/auto-award.ts:144-194`. (c) **No automated discount application.** No code reads `loyalty_reward_redemptions` during event pricing, quote generation, or payment flow. Chef must manually honor the reward and mark it delivered. Redemption stops at "points deducted + pending delivery created."

**G3. BUILT** - The gift card system (`client_incentives` table, `/clients/gift-cards` page) supports vouchers with balance tracking (`remaining_balance_cents`). When a gift card is partially used on an event payment, does the remaining balance update? Is this integrated with the Stripe payment flow, or is it a manual ledger adjustment?

> Atomic Postgres RPC `redeem_incentive` at `lib/loyalty/redemption-actions.ts:205-215` handles three writes atomically: ledger credit, balance update, audit row. Partial use computed at line 119: `Math.min(remaining, outstandingCents)`. Integrated with Stripe: reduced outstanding balance means reduced PaymentIntent amount. Does NOT auto-transition event to 'paid'; chef confirms manually.

**G4. BUILT (manual tracking)** - The referral system has `client_referrals` table, `referral-actions.ts`, `referral-health.ts`, and `referral-tree.ts`. When Client A refers Client B: (a) is the referral tracked end-to-end from signup to first booking? (b) Does Client A earn loyalty points for the referral? (c) Is the referral visible on both clients' detail pages?

> (a) Tracking NOT automated end-to-end. Status transitions (pending -> contacted -> booked -> completed) are manually driven by chef via `updateReferralStatus`. (b) On `completed` status, referrer earns points automatically at `lib/clients/referral-actions.ts:170-177` via `awardBonusPointsInternal`. (c) Referral dashboard exists at lines 236-340; `getClientReferrals` available but per-client detail rendering depends on UI wiring.

**G5. GAP** - The referral tree (`getClientReferralTree`) implies multi-level referral chains. How deep does it go? Is there circular reference protection? If Client A refers B, B refers C, C refers A, does the tree render correctly or infinite loop?

> `getClientReferralTree` at `lib/clients/referral-tree.ts:14-85` is **single-level only**, uses fragile `referral_source` text matching against `client.full_name` (not the available `referred_by_client_id` FK). `computeReferralHealth` at `lib/clients/referral-health.ts:60-64` has a recursive `maxDepth` function with **no visited-node tracking**; circular referral chain would infinite loop and stack overflow.

---

## Domain H: Communication, Notes, and Timeline

**H1. BUILT** - The unified timeline (`getUnifiedClientTimeline`) merges events, messages, notes, and activity into a chronological feed. Are timestamps consistent across sources (all UTC, all local, or mixed)? Does the timeline correctly interleave entries from different sources, or does it group by source?

> All source columns are `timestamptz` (UTC). Sort at `lib/clients/unified-timeline.ts:208` interleaves by timestamp across 5 sources. Not grouped by source. Minor inconsistency: events use `cancelled_at ?? created_at` instead of `event_date`, but arguably intentional.

**H2. GAP** - Quick notes (`client_notes` table, `quick-notes.tsx`) support categories (General/Dietary/Preference/Logistics/Relationship) and pinning. When a note is pinned, is it visible at the top of the client detail page across all visits? Or only within the notes panel?

> Pinned notes sort to top of the notes panel only (`components/clients/quick-notes.tsx:97-99`). `QuickNotes` rendered deep in detail page at `app/(chef)/clients/[id]/page.tsx:809`, not near the header. No separate pinned-notes section at top of page. Chef must scroll to Notes panel to see pinned content. A pinned "severe peanut allergy" note would be buried.

**H3. GAP** - The follow-up rules system (`client_followup_rules`) can trigger actions on post_event, birthday, anniversary, dormancy. What mechanism actually fires these triggers? Is there a cron job? A scheduled action? An event listener? Or are the rules defined but never executed?

> Full CRUD built in `lib/clients/gifting-actions.ts:122-186`. UI manager at `components/clients/followup-rules-manager.tsx`. **But no execution mechanism exists.** Zero scheduled routes in `app/api/scheduled/` reference `client_followup_rules`. The existing `/api/scheduled/follow-ups/route.ts` handles INQUIRY follow-ups (different table). `lib/follow-up/sequence-engine.ts` reads from `followup_rules` (also different table). Rules are defined but never evaluated or executed.

**H4. GAP** - The touchpoint system (`client_touchpoint_rules`, `getUpcomingTouchpoints`) schedules future interactions. Does it integrate with the chef's calendar? Does it create calendar entries? Or is it a separate list the chef must check manually?

> `getUpcomingTouchpoints` at `lib/clients/touchpoint-actions.ts:122-161` returns plain list. Zero references to "calendar" in file. Zero references to "touchpoint" in `lib/calendar/`. Touchpoints surface only as dashboard widget and dedicated list page. No calendar entries created. Chef must manually check touchpoint list.

**H5. BUILT** - The communication stats panel (`getClientCommunicationStats`) shows communication frequency. Does it count actual emails sent, messages exchanged, and notes logged? Or does it only count activity logged within ChefFlow (missing external communications)?

> Aggregates from 7 internal sources at `lib/clients/communication-actions.ts:136-184`: events, inquiries, messages (with `sent_at`), notes, quotes, payments, referrals. Counts real records, not estimates. External communications (phone calls, personal texts) not captured unless manually logged via message log form at `app/(chef)/clients/[id]/page.tsx:833`. By design.

---

## Domain I: Segments, Tags, and Bulk Operations

**I1. BUILT (UI gap)** - Client segments (`client_segments` table, `/clients/segments` page) allow filter rule definitions. Do these filters actually work dynamically (re-evaluated on each view), or are they static at creation time? If a new client matches a segment's criteria after the segment was created, does the new client appear in that segment?

> Backend is dynamic: `evaluateSegmentFilters()` at `lib/marketing/segmentation-actions.ts:277-326` re-parses stored filters and runs live DB queries via `applyBehavioralFilters()` (lines 58-154). New matching clients appear. **UI gap:** "View Clients" button links to `/clients?segment=<id>` at `app/(chef)/clients/segments/page.tsx:50`, but the main clients page has zero segment query param handling. The link goes nowhere useful.

**I2. GAP** - The tag system (`client_tags` table, `tag-actions.ts`) supports free-form tags. Is there tag normalization (case-insensitive, trim whitespace)? Can two tags that look the same but differ in casing coexist ("VIP" vs "vip")? Is there a tag cleanup or merge capability?

> `addClientTag` at `lib/clients/tag-actions.ts:43`: `tag.trim().slice(0, 50)`, no `.toLowerCase()`. Upsert conflict key is `client_id,tag` (case-sensitive). "VIP" and "vip" are treated as distinct tags. `getAllUsedTags` deduplicates by exact string (`new Set`). No tag merge or cleanup capability anywhere.

**I3. GAP** - Bulk operations via `bulkArchiveClients` exist. What other bulk operations are available? Can a chef bulk-tag, bulk-email, or bulk-export? Or is archive the only bulk action? Is there undo for bulk archive?

> `bulkArchiveClients` at `lib/clients/bulk-actions.ts:13-33` is the **only** bulk operation. No bulk-tag, bulk-email, or bulk-export. No undo (sets `deleted_at` immediately). **`docs/USER_MANUAL.md:183` claims** "Bulk operations available: archive, delete, tag, or export to CSV" but only archive is implemented. Documentation is inaccurate.

**I4. GAP** - The CSV export (`csv-export/route.ts`) uses `csvRowSafe` for injection prevention. Does it export ALL client fields or a subset? Does it respect soft-deleted records (exclude them)? Does it include computed fields (health score, LTV, engagement)?

> Exports only **6 fields** at `app/(chef)/clients/csv-export/route.ts:13-14`: `full_name`, `email`, `phone`, `created_at`, `status`, `is_active`. No dietary, allergies, preferences, address, notes, tags, health score, LTV, or engagement. **Does NOT filter soft-deleted records** (no `.is('deleted_at', null)` unlike all other listing queries). CSV injection prevention is properly applied.

**I5. GAP** - The duplicate detection system (`findDuplicateClients`, `/clients/duplicates`) finds potential matches. The merge system (`mergeClients` in `cross-platform-matching.ts`) combines records. When two clients are merged: (a) are all events, notes, preferences, and financial records consolidated? (b) Is there an audit trail (`client_merge_log`)? (c) Can a merge be undone? (d) What happens to portal access tokens for the merged-away client?

> (a) **Partial consolidation** at `lib/clients/cross-platform-matching.ts:142-159`: only inquiries, events, and messages moved. Tags, notes, preferences, dietary, loyalty, NDAs, kitchen inventory NOT consolidated. (b) Audit trail via `client_merge_log` at lines 170-184. (c) No undo mechanism. Merged client is soft-deleted. (d) Portal access tokens NOT invalidated or transferred. Merged-away client retains valid token.

---

## Domain J: Cross-System Boundaries

**J1. GAP** - When an inquiry converts to a client via `createClientFromLead` or `addClientFromInquiry`, does ALL inquiry data transfer (name, email, phone, dietary restrictions, event details, message history)? Or are some fields lost in translation? Does the inquiry record link back to the new client?

> `addClientFromInquiry` at `lib/clients/actions.ts:1325-1394` transfers ONLY `full_name`, `email`, `phone`. **Drops** dietary restrictions, allergies, event details, message history. Inquiry links back via `client_id` update at line 1379. `createClientFromLead` (lines 591-659) is better (transfers dietary + allergies) but still drops event details and messages.

**J2. BUILT** - When an event is created for a client, does the event correctly reference the client? When the event completes, does it update the client's `lifetime_value_cents` and `total_events`? Or are these computed on read from the `client_financial_summary` view?

> Hybrid approach: DB triggers automatically update `lifetime_value_cents` on ledger insert (`database/migrations/20260215000003_layer_3_events_quotes_financials.sql:758-781`) and `total_events_count` on event completion (lines 844-862). `client_financial_summary` view provides additional computed metrics. Both stored columns and computed view derive from same ledger source.

**J3. BUILT** - The Remy AI system can reference clients in conversation (`recipe.search` context includes client dietary data). When Remy accesses client data, is it scoped to the chef's tenant? Can Remy accidentally surface Client A's allergies when discussing Client B's event?

> Tenant scoping at `lib/ai/remy-context.ts:113`: `tenantId` from session. All data loading receives `tenantId` as query filter. Client dietary data loaded per-event context at lines 1709-1712, not global. SSE channel scoped to `activity_events:${tenantId}`. No cross-tenant leak path.

**J4. BUILT** - The presence monitoring system (`/clients/presence`, `client-presence-monitor.tsx`) uses SSE to track real-time portal activity. Does this work in production (SSE through Cloudflare tunnel)? What's the reconnection behavior if the SSE connection drops? Does it show stale presence data (client shows "online" hours after they left)?

> SSE at `components/activity/client-presence-monitor.tsx:198`. Reconnection after 3 seconds at `lib/realtime/sse-client.ts:61-69`. Stale clients (>60 min) filtered on each update at line 147. Online = <5 min since last activity. No exponential backoff on repeated failures (minor concern).

**J5. BUILT** - When a client is created from an inquiry, and later the chef manually creates the same client (different path), does the duplicate detection system catch it? Or is cross-origin duplicate detection limited to within the same creation path?

> Post-hoc scan at `lib/clients/deduplication.ts:20-60` matches ALL clients within tenant by email, phone, and name regardless of creation path. Both `createClientFromLead` and `addClientFromInquiry` also check email at creation time. Cross-origin detection works.

**J6. BUILT** - The recurring service system (`/clients/[id]/recurring/`) manages ongoing meal service. Does meal request data from the client portal (`createMyMealRequest`) correctly appear on the chef's recurring board (`/clients/recurring`)? Is there real-time notification, or does the chef have to poll?

> `createMyMealRequest` at `lib/clients/client-profile-actions.ts:282-353` writes to `client_meal_requests`, revalidates `/clients/recurring` (line 319), sends in-app notification to chef with `actionUrl` (lines 324-349, non-blocking).

**J7. BUILT** - The client portal activity tracker feeds the engagement badge on the chef side. Is this the SAME data pipeline as the presence monitoring system, or a separate one? If separate, can they show contradictory states (badge says COLD, presence says online)?

> Same data pipeline. Engagement is a pure scoring function on `ActivityEvent[]` at `lib/activity/engagement.ts`. Presence monitor consumes same `ActivityEvent` type via SSE. They measure different things (engagement = 14-day aggregate, presence = real-time). Not contradictory; complementary.

**J8. GAP** - The GDPR data export (`exportClientData` in `account-deletion-actions.ts`) must include all personal data. Does it cover: client record fields, allergy records, notes about the client, photos, messages, event history, financial records, taste profile, kitchen profile, intake responses? Or is it a partial export that misses some data stores?

> Exports at `lib/clients/account-deletion-actions.ts:112-180`: client record (`select('*')`), events, inquiries, quotes, messages. **Missing:** allergy records (separate table), notes, photos, taste profile, kitchen profile, intake responses, meal requests, activity events, ledger entries, NDA records, loyalty data. At least 8 data categories omitted.

**J9. GAP** - When a chef's client has a connected `auth_user_id` (they can log into the portal), and the chef soft-deletes the client, can the user still log in? Do they see an error? Can they reactivate via `/reactivate-account`? What's the experience for a client whose chef has "deleted" them?

> `requestClientAccountDeletion` at `lib/clients/account-deletion-actions.ts:46-83` does NOT ban or disable the auth user. `resolveRoleAndTenant` at `lib/auth/auth-config.ts:56-95` looks up client by `entityId` without checking deletion status. Client can still log in during (and after) grace period. `/reactivate-account` works for CHEF accounts only (queries `chefs` table). No client reactivation from the public side.

**J10. BUILT** - The cannabis client system (`cannabis-client-actions.ts`) gates access to cannabis-related events. Is this feature complete or a stub? Does it interact with any other client management surface? Is it region-locked (legal compliance)?

> Functional access gate at `lib/clients/cannabis-client-actions.ts`: `clientHasCannabisAccess` checks `cannabis_tier_users` table, `getClientCannabisEvents` filters by `cannabis_preference`. Self-contained, no cross-references to main client management. Not a stub. No region-locking (no location/state check).

---

## Domain K: Security and Access Control (Bonus Domain)

**K1. GAP** - The `security-access-panel.tsx` stores gate codes, WiFi passwords, parking instructions, and house rules. Is this data encrypted at rest? Or is it stored as plaintext in the `clients` table? If the database is compromised, is client home security data exposed?

> `gate_code`, `wifi_password`, `security_notes` are plaintext `TEXT` columns at `database/migrations/20260322000037_ultimate_client_profile.sql:34-40`. UI masks behind toggle (`components/clients/security-access-panel.tsx:23,53`) but database stores cleartext. No `pgp_sym_encrypt` or any at-rest encryption. Full exposure on DB compromise.

**K2. GAP** - The NDA system has two implementations: `nda-actions.ts` and `nda-management-actions.ts`, plus two UI components: `components/clients/nda-panel.tsx` and `components/protection/nda-panel.tsx`. Are these duplicates? Do they read/write the same data? Can they conflict?

> **Two separate systems, different data stores.** `nda-actions.ts` (137 lines): flat columns on `clients` table (`nda_active`, `nda_coverage`, etc.), one NDA per client. `nda-management-actions.ts` (254 lines): dedicated `client_ndas` table with full CRUD, multiple NDAs per client, types/statuses. They do NOT read/write the same data. Chef could update NDA in one system and see different status in the other.

**K3. BUILT** - Photo uploads via `uploadClientPhoto` store to local filesystem (`./storage/`). Is there file type validation (prevent non-image uploads)? Size limits? Path traversal protection? Can a malicious filename escape the storage directory?

> MIME validation (jpeg/png/heic/heif/webp) at `lib/clients/photo-actions.ts:18-24`. 10MB size limit at line 14. 30-photo per-client cap at lines 84-93. Path traversal protection: storage path uses `crypto.randomUUID()` with extension derived from validated MIME (not user filename) at lines 118-119. Auth gate + tenant ownership check at lines 69-81.

**K4. BUILT** - The portal access token system generates tokens for client portal magic links. Are tokens: (a) cryptographically random, (b) hashed before storage, (c) time-limited, (d) single-use or reusable? Can a leaked token grant permanent access?

> (a) `randomBytes(32)` at `lib/client-portal/token.ts:7` (256-bit). (b) SHA-256 hashed at lines 10-12. (c) 30-day TTL at lines 3-4. (d) Reusable within TTL window. Leaked token grants access until expiry or revocation, not permanent.

**K5. GAP** - The intake form share system uses token-based public access (`/worksheet/[token]`, intake shares). Are these tokens rate-limited against brute force? Is there enumeration protection? Can someone iterate through tokens to access other clients' intake forms?

> Tokens are 256-bit cryptographically random (`gen_random_bytes(32)` at DB level), 30-day expiry, single-use check (responded flag). Brute force is computationally infeasible. **But no rate limiting** on `getShareByToken` or `submitIntakeResponse` at `lib/clients/intake-actions.ts` (contrast with `exportClientData` which has `checkRateLimit`). Defense-in-depth gap.

---

## Gap Summary (25 items, ranked by risk)

### HIGH (real operational/legal/financial impact)

| ID  | Gap                                                   | Impact                                                                           |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| C3  | No automated client GDPR purge job                    | Legal compliance failure. 30-day promise not honored.                            |
| J8  | GDPR data export missing 8+ data categories           | Incomplete data portability. GDPR Article 20 violation risk.                     |
| J9  | Soft-deleted client can still log in                  | Deleted client retains full portal access. No degraded experience.               |
| D4  | Intake responses overwrite client data destructively  | Chef loses existing dietary/allergy data without warning.                        |
| E2  | Dietary data drift (flat field vs structured records) | Allergy shown in one place, missing in another. Safety risk.                     |
| E4  | Dietary alert pipeline has zero data input            | Dashboard widget exists but always empty. Chef never gets dietary change alerts. |
| K1  | Gate codes and WiFi passwords stored as plaintext     | Full exposure on DB compromise. Client home security risk.                       |
| K2  | Two NDA systems writing to different data stores      | Contradictory NDA status. Compliance/legal confusion.                            |

### MEDIUM (degraded functionality or data quality)

| ID  | Gap                                                                       | Impact                                                              |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A5  | 68 `as any` casts, zero type safety on client pipeline                    | No compile-time bug detection. Runtime works but fragile.           |
| B2  | Status change missing list revalidation + downstream effects              | Stale client list. No dormancy automation.                          |
| D3  | No path to upgrade shadow client to authenticated                         | Chef must delete and recreate client to send portal invite.         |
| D5  | Two token systems with no coordination                                    | Onboarding data orphaned when invitation accepted.                  |
| E3  | Household allergen matrix is dead code                                    | Cross-household allergy conflicts invisible to chef.                |
| F5  | Four dormancy implementations with conflicting thresholds                 | Same client labeled differently on different dashboard widgets.     |
| G2  | Loyalty redemption has no automated discount application                  | Points deducted but chef must manually honor reward.                |
| G5  | Referral tree is single-level, fragile text matching, no cycle protection | Infinite loop risk on circular referrals.                           |
| H3  | Follow-up rules defined but never executed                                | Chef configures automation that never fires.                        |
| I3  | Only bulk archive exists; USER_MANUAL claims more                         | Documentation lie. Chef expects bulk tag/export that doesn't exist. |
| I4  | CSV export: 6 fields only, includes soft-deleted                          | Near-useless export. Leaks deleted client data.                     |
| I5  | Client merge only moves inquiries/events/messages                         | Tags, notes, preferences, loyalty, NDAs lost on merge.              |

### LOW (polish or defense-in-depth)

| ID  | Gap                                              | Impact                                                                   |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| E5  | Taste profile data has zero downstream consumers | Data entry effort with no operational return.                            |
| H2  | Pinned notes only visible within notes panel     | Important safety notes buried deep in 30-panel page.                     |
| H4  | Touchpoints not integrated with calendar         | Chef must check separate list; no calendar visibility.                   |
| I2  | No tag case normalization                        | "VIP" and "vip" coexist as separate tags.                                |
| K5  | Intake share tokens not rate-limited             | Defense-in-depth gap (brute force still infeasible due to token length). |
