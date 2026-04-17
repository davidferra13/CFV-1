# Dinner Circle Cohesion Interrogation: 82-Question Audit

> **Created:** 2026-04-16
> **Scope:** Every user type, flow, failure point, and integration seam in the Hub/Dinner Circle system
> **Method:** Code-level investigation of all 82 questions, graded against real implementation
> **Principle:** The Dinner Circle is ChefFlow's center of gravity. ALL user types converge here. Every question must be answerable with binary pass/fail.

---

## Scorecard Summary

### Initial Audit (2026-04-16)

| Grade       | Count | Meaning                                           |
| ----------- | ----- | ------------------------------------------------- |
| **Working** | 56    | Fully implemented, handles errors, good UX        |
| **Partial** | 11    | Exists but incomplete or missing key affordances  |
| **Missing** | 3     | Feature does not exist at all                     |
| **Broken**  | 12    | Exists but has bugs, security holes, or data loss |

**Initial Score: 56/82 fully working (68%)**

### Breakdown by Phase

| Phase                        | Working | Partial | Missing | Broken |
| ---------------------------- | ------- | ------- | ------- | ------ |
| 1: Security (Q1-Q10)         | 0       | 1       | 1       | 8      |
| 2: Guest XP (Q11-Q24)        | 10      | 3       | 1       | 0      |
| 3: Client XP (Q25-Q30)       | 4       | 1       | 0       | 1      |
| 4: Chef XP (Q31-Q41)         | 10      | 1       | 0       | 0      |
| 5: Lifecycle (Q42-Q48)       | 7       | 0       | 0       | 0      |
| 6: Realtime (Q49-Q54)        | 4       | 2       | 0       | 0      |
| 7: Meals (Q55-Q60)           | 5       | 1       | 0       | 0      |
| 8: Dietary Safety (Q61-Q64)  | 3       | 1       | 0       | 0      |
| 9: Social+Notif (Q65-Q72)    | 8       | 0       | 0       | 0      |
| 10: Data Integrity (Q73-Q78) | 2       | 1       | 1       | 2      |
| 11: Public Surface (Q79-Q82) | 3       | 0       | 0       | 1      |

### Priority Fix Queue

**P0 - Security (fix immediately):**
| Q# | Issue | Severity | Fix |
|----|-------|----------|-----|
| Q1 | Profile token returned for any email lookup | HIGH | Don't return profile_token for existing profiles in getOrCreateProfile |
| Q7 | verifyGroupAccess skips check when groupToken is null | HIGH | Remove early return, make groupToken required |
| Q2 | postSystemMessage exported as server action with zero auth | MEDIUM | Move to non-'use server' file |
| Q3 | All lifecycle hooks exported as server actions with zero auth | MEDIUM | Remove 'use server' from circle-lifecycle-hooks.ts |
| Q4 | syncRSVPToHubProfile callable from browser | MEDIUM | Move to non-'use server' file |
| Q5 | createHubGroup accepts tenant_id from input | MEDIUM | Derive from session when provided |
| Q6 | getMealBoard has zero auth | MEDIUM | Add groupToken verification |
| Q8 | media_urls unbounded, no URL validation | LOW | Add .max(10) and .url() |
| Q9 | Join page has no rate limiting | MEDIUM | Add IP-based rate limit |

**P1 - Life Safety:**
| Q# | Issue | Fix |
|----|-------|-----|
| Q64 | DDL default '{}' prevents null allergy state; "never answered" = "confirmed safe" | Migration: DEFAULT NULL, update existing rows |

**P2 - Broken Features:**
| Q# | Issue | Fix |
|----|-------|-----|
| Q29 | GuestUpgradePrompt never rendered, signup ignores upgrade param | Wire component into hub-group-view, handle param in signup |
| Q52 | Edit broadcast uses wrong variable (message.group_id undefined) | Use editedMsg.group_id |
| Q73 | All sub-fetches hide failure as empty (.catch(() => [])) | Track error states per tab |
| Q74 | Chef circles page crashes on DB failure | Add try/catch or error boundary |
| Q82 | Theme picker selection never saved to DB | Add theme_id to handleSave payload |

**P3 - Missing Features:**
| Q# | Issue | Fix |
|----|-------|-----|
| Q21 | No RSVP from within circle | Add RSVP action in events tab |
| Q76 | No member cap on groups | Add cap check in joinHubGroup |

**P4 - Partial (polish):**
| Q# | Issue |
|----|-------|
| Q10 | Profile token exposed in upgrade URL query param |
| Q12 | Join page shows cold 404 for inactive circles |
| Q17 | Dietary dashboard chef-only; guests can't see aggregate |
| Q20 | Events tab shows only "linked on [date]", no event details |
| Q27 | Payment status only in chat messages, no structured view |
| Q35 | No "Chef" role badge on messages in chat feed |
| Q54 | No secondary sort for sub-millisecond message ordering |
| Q57 | Prep summary ignores actual attendance data |
| Q78 | Photo gallery has no pagination or lazy loading |

### Notable Architectural Finding

`lib/hub/circle-lifecycle-hooks.ts` is **dead code**. All 6 exported functions (`postMenuSharedToCircle`, `postQuoteSentToCircle`, etc.) are never called from production code. The system migrated to `circleFirstNotify` (`lib/hub/circle-first-notify.ts`) which provides richer notification cards, email nudges, push, and standalone email fallback. The old hooks remain as browser-callable server actions with zero auth (Q3).

---

## Coverage Map

| Q   | Title                                        | Category       | User Types Affected          |
| --- | -------------------------------------------- | -------------- | ---------------------------- |
| Q1  | Profile Token Impersonation via Email        | Security       | All guests                   |
| Q2  | System Message Injection                     | Security       | All members                  |
| Q3  | Lifecycle Hook Direct Invocation             | Security       | All members                  |
| Q4  | RSVP Sync Direct Invocation                  | Security       | All members                  |
| Q5  | Group Creation Tenant Spoofing               | Security       | Chefs                        |
| Q6  | Meal Board Unauthenticated Read              | Security       | All members                  |
| Q7  | verifyGroupAccess Null Token Bypass          | Security       | All members                  |
| Q8  | Media URL Array Unbounded                    | Security       | All members                  |
| Q9  | Join Page Rate Limiting                      | Security       | Public                       |
| Q10 | Profile Token in Upgrade URL                 | Security       | Guests upgrading             |
| Q11 | Guest Join Zero-Friction                     | Guest XP       | Public guests                |
| Q12 | Join Inactive Circle                         | Guest XP       | Public guests                |
| Q13 | Cookie-Cleared Guest Recovery                | Guest XP       | Returning guests             |
| Q14 | Guest First Visit Orientation                | Guest XP       | New guests                   |
| Q15 | Guest Post Without Profile                   | Guest XP       | Anonymous visitors           |
| Q16 | Guest Photo Upload Failure                   | Guest XP       | All guests                   |
| Q17 | Guest See Own Dietary Info Reflected         | Guest XP       | All guests                   |
| Q18 | Guest Edit Profile After Join                | Guest XP       | All guests                   |
| Q19 | Guest Leave Circle                           | Guest XP       | All guests                   |
| Q20 | Guest See Event Details                      | Guest XP       | All guests                   |
| Q21 | Guest RSVP From Circle                       | Guest XP       | All guests                   |
| Q22 | Guest Request a Meal                         | Guest XP       | All guests                   |
| Q23 | Guest Vote in Poll                           | Guest XP       | All guests                   |
| Q24 | Guest Mark Availability                      | Guest XP       | All guests                   |
| Q25 | Client Auto-Link to Circle                   | Client XP      | Authenticated clients        |
| Q26 | Client Cross-Circle View                     | Client XP      | Authenticated clients        |
| Q27 | Client See Payment Status in Circle          | Client XP      | Authenticated clients        |
| Q28 | Client Quick Actions Work                    | Client XP      | Authenticated clients        |
| Q29 | Client Upgrade Prompt Conversion             | Client XP      | Guests with client accounts  |
| Q30 | Client Unread Badge Accuracy                 | Client XP      | Authenticated clients        |
| Q31 | Chef Circle Auto-Creation on Inquiry         | Chef XP        | Chefs                        |
| Q32 | Chef Circle Auto-Creation on Event           | Chef XP        | Chefs                        |
| Q33 | Chef Inbox Shows All Circles                 | Chef XP        | Chefs                        |
| Q34 | Chef Unread Count Accuracy                   | Chef XP        | Chefs                        |
| Q35 | Chef Post As Chef Role                       | Chef XP        | Chefs                        |
| Q36 | Chef Manage Members (Promote/Remove)         | Chef XP        | Chefs                        |
| Q37 | Chef Access Dietary Dashboard                | Chef XP        | Chefs                        |
| Q38 | Chef Manage Meal Board                       | Chef XP        | Chefs                        |
| Q39 | Chef Share Menu to Circle                    | Chef XP        | Chefs                        |
| Q40 | Chef Archive Completed Circle                | Chef XP        | Chefs                        |
| Q41 | Chef Social Feed Useful                      | Chef XP        | Chefs                        |
| Q42 | Lifecycle: Menu Shared Posts to Circle       | Integration    | Chefs + Guests               |
| Q43 | Lifecycle: Quote Sent Posts to Circle        | Integration    | Chefs + Clients              |
| Q44 | Lifecycle: Payment Received Posts to Circle  | Integration    | Chefs + Clients              |
| Q45 | Lifecycle: Event Confirmed Posts to Circle   | Integration    | All members                  |
| Q46 | Lifecycle: Event Completed Posts to Circle   | Integration    | All members                  |
| Q47 | Lifecycle: Photos Ready Posts to Circle      | Integration    | All members                  |
| Q48 | Circle Created for Every Guest-Visible Event | Integration    | All users                    |
| Q49 | SSE Message Delivery Real-Time               | Realtime       | All members                  |
| Q50 | SSE Typing Indicators Work                   | Realtime       | All members                  |
| Q51 | SSE Reconnect After Disconnect               | Realtime       | All members                  |
| Q52 | Message Edit Broadcasts to All               | Realtime       | All members                  |
| Q53 | Message Delete Broadcasts to All             | Realtime       | All members                  |
| Q54 | Concurrent Message Ordering                  | Realtime       | All members                  |
| Q55 | Meal Board CRUD (Chef)                       | Meals          | Chefs                        |
| Q56 | Meal Feedback (Guest)                        | Meals          | Guests                       |
| Q57 | Meal Attendance Tracking                     | Meals          | All members                  |
| Q58 | Recurring Meals Pattern                      | Meals          | Chefs                        |
| Q59 | Weekly Prep Summary                          | Meals          | Chefs                        |
| Q60 | Meal Request From Guest                      | Meals          | Guests                       |
| Q61 | Allergy Aggregation Correct                  | Dietary Safety | Chefs + Guests               |
| Q62 | Household Dietary Included                   | Dietary Safety | Chefs                        |
| Q63 | Severe Allergy Visual Priority               | Dietary Safety | Chefs                        |
| Q64 | Unknown vs Confirmed-None Distinction        | Dietary Safety | Chefs                        |
| Q65 | Friend Request Flow                          | Social         | Authenticated clients        |
| Q66 | Chef Recommendation Sharing                  | Social         | All members                  |
| Q67 | Invite Link Copy and Share                   | Social         | All members                  |
| Q68 | Push Notification Delivery                   | Notifications  | Opted-in members             |
| Q69 | Email Notification Delivery                  | Notifications  | All members with email       |
| Q70 | Quiet Hours Respected                        | Notifications  | Members with quiet hours set |
| Q71 | Digest Mode Batching                         | Notifications  | Members on digest mode       |
| Q72 | Circle Mute/Unmute                           | Notifications  | All members                  |
| Q73 | Sub-Fetch Failure Shows Error Not Empty      | Data Integrity | All users                    |
| Q74 | Chef Circles Page Error Handling             | Data Integrity | Chefs                        |
| Q75 | Message Rate Limit Enforced                  | Data Integrity | All members                  |
| Q76 | Group Member Cap                             | Scale          | All members                  |
| Q77 | Message History Pagination                   | Scale          | All members                  |
| Q78 | Photo Gallery at 100+ Images                 | Scale          | All members                  |
| Q79 | Hub Landing Page SEO                         | Public Surface | Search engines               |
| Q80 | Circle Noindex Enforced                      | Public Surface | Search engines               |
| Q81 | Bridge Group View                            | Cross-User     | Chef-to-chef                 |
| Q82 | Theme Picker Persistence                     | Cross-User     | All members                  |

---

## Phase 1: Security & Access Control (Q1-Q10)

These are P0. Security gaps in a public system with PII (allergies, dietary restrictions, household info) are not acceptable.

### Q1: Profile Token Impersonation via Email

**Hypothesis:** `getOrCreateProfile` in `lib/hub/profile-actions.ts` does NOT return the `profile_token` to arbitrary callers who supply an existing email. Either the token is omitted from the response for existing profiles, or the function is not callable from the client.
**Failure:** Calling `getOrCreateProfile({ email: "victim@example.com" })` returns the victim's `profile_token`, enabling impersonation (post messages, edit dietary info, access all circles).
**Scope:** `lib/hub/profile-actions.ts`. Check: is this in a `'use server'` file? Does it return `profile_token` for existing email lookups?
**Impact:** HIGH. Profile tokens are bearer credentials for the entire hub identity. Email enumeration + token theft = full account takeover.
**Fix direction:** Never return `profile_token` for existing profiles via public server actions. Token should only be set via cookie during the join flow or recovery flow.

### Q2: System Message Injection

**Hypothesis:** `postSystemMessage` in `lib/hub/message-actions.ts` is NOT callable from the client, OR it requires an auth gate (chef/admin session) before inserting.
**Failure:** A browser can call `postSystemMessage({ groupId, content: "Payment of $50,000 received!" })` and inject a fake system message indistinguishable from real lifecycle events.
**Scope:** `lib/hub/message-actions.ts`. Check: is the function exported? Is it in a `'use server'` file? Does it have auth?
**Impact:** HIGH. System messages carry trust. Fake "payment received" or "event confirmed" messages would mislead guests and chefs. Violates Zero Hallucination Law 1.
**Fix direction:** Move `postSystemMessage` to a non-`'use server'` internal module, or add `requireChef()`/internal-only gate.

### Q3: Lifecycle Hook Direct Invocation

**Hypothesis:** `postMenuSharedToCircle`, `postQuoteSentToCircle`, and other lifecycle hooks in `lib/hub/circle-lifecycle-hooks.ts` are NOT callable from the client.
**Failure:** A browser calls `postQuoteSentToCircle({ eventId, totalCents: 9999999, ... })` and injects fake financial data into the circle feed.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`. Check: is this a `'use server'` file? Are functions exported?
**Impact:** HIGH. Fake financial system messages in a circle undermine trust in the entire event lifecycle narrative.
**Fix direction:** Move to non-`'use server'` file (these are internal hooks, not client actions).

### Q4: RSVP Sync Direct Invocation

**Hypothesis:** `syncRSVPToHubProfile` in `lib/hub/integration-actions.ts` is NOT callable from the client, OR it validates that the RSVP actually exists before creating profiles and joining groups.
**Failure:** A browser calls `syncRSVPToHubProfile({ email: "fake@x.com", eventId: "...", tenantId: "..." })` and creates a profile, joins the circle, and posts a "joined" system message without actually RSVPing.
**Scope:** `lib/hub/integration-actions.ts`. Check: `'use server'` directive? Exported? Validates RSVP existence?
**Impact:** MEDIUM. Unauthorized circle joins. The guest would appear as a real member.
**Fix direction:** Move to non-`'use server'` file or add RSVP existence check.

### Q5: Group Creation Tenant Spoofing

**Hypothesis:** `createHubGroup` in `lib/hub/group-actions.ts` validates that the `tenant_id` belongs to the authenticated chef's session, not accepted from arbitrary input.
**Failure:** A caller passes `tenant_id: "<other chef's UUID>"` and creates a circle associated with another chef's account.
**Scope:** `lib/hub/group-actions.ts`, `createHubGroup` function.
**Impact:** MEDIUM. Groups would appear in the wrong chef's inbox. Potential data leakage across tenants.
**Fix direction:** Derive `tenant_id` from session via `requireChef()`, not from input. (CLAUDE.md Pattern #2: "Tenant ID Comes From Session")

### Q6: Meal Board Unauthenticated Read

**Hypothesis:** `getMealBoard` in `lib/hub/meal-board-actions.ts` requires a valid `groupToken` or `profileToken` before returning data.
**Failure:** Calling `getMealBoard({ groupId: "<guessed UUID>" })` returns the full meal board (meal names, attendance, dietary info) without any authentication.
**Scope:** `lib/hub/meal-board-actions.ts`. Check: does `getMealBoard` have any auth check?
**Impact:** MEDIUM. Meal boards contain dietary info, allergy data, attendance patterns. UUID is hard to guess but not impossible (UUIDs in URLs, logs, etc.).
**Fix direction:** Add `verifyGroupAccess(groupId, groupToken)` check.

### Q7: verifyGroupAccess Null Token Bypass

**Hypothesis:** `verifyGroupAccess` in `lib/hub/message-actions.ts` does NOT have an early return when `groupToken` is null/undefined. Every call path provides a valid token.
**Failure:** The function has `if (!groupToken) return` on line 10, meaning any server action that passes `undefined` for `groupToken` bypasses the IDOR check entirely.
**Scope:** `lib/hub/message-actions.ts`, line 10. Trace all callers to see which ones pass `groupToken`.
**Impact:** HIGH. This is the primary IDOR defense for hub message actions. If bypassed, cross-group data access is possible.
**Fix direction:** Remove the early return. If SSR pages need to bypass, use a separate internal function not exposed as a server action.

### Q8: Media URL Array Unbounded

**Hypothesis:** `postHubMessage` validates `media_urls` array length and validates each URL format before inserting.
**Failure:** A caller posts a message with `media_urls: [... 10,000 URLs ...]` causing storage bloat, or with `media_urls: ["javascript:alert(1)"]` causing XSS when rendered.
**Scope:** `lib/hub/message-actions.ts`, Zod schema for `postHubMessage`.
**Impact:** MEDIUM. Resource exhaustion via unbounded arrays. XSS if URLs are rendered as `<img src>` or `<a href>` without sanitization.
**Fix direction:** Add `.max(10)` on media_urls array. Add `.url()` validation on each element.

### Q9: Join Page Rate Limiting

**Hypothesis:** The join page (`/hub/join/[groupToken]`) has rate limiting comparable to the main hub page (which has 60 req/15min IP-based).
**Failure:** No rate limiting on the join page, enabling bot-driven mass profile creation and group joins.
**Scope:** `app/(public)/hub/join/[groupToken]/page.tsx`. Check for rate limiting middleware.
**Impact:** MEDIUM. Mass fake joins would pollute member lists and trigger spam notifications.
**Fix direction:** Add IP-based rate limiting matching the main hub page pattern.

### Q10: Profile Token in Upgrade URL

**Hypothesis:** The guest upgrade flow (`/auth/signup?upgrade=${profileToken}`) does not expose the profile token in server logs, analytics, or referer headers.
**Failure:** Profile token appears in Cloudflare access logs, browser history, or analytics platforms, enabling token harvesting.
**Scope:** `components/hub/guest-upgrade-prompt.tsx`. Check the signup page for token handling.
**Impact:** LOW. Profile tokens are already in localStorage and URL fragments. But URL query params are logged more aggressively than fragments.
**Fix direction:** Use `POST` form submission instead of `GET` query param, or pass token via `sessionStorage` before redirect.

---

## Phase 2: Guest Experience (Q11-Q24)

Guests are the largest user pool. Zero friction, zero confusion, zero dead ends.

### Q11: Guest Join Zero-Friction

**Hypothesis:** A guest can go from clicking an invite link to seeing the full circle in under 3 steps (click link -> enter name -> see circle). No email required. No signup. No verification.
**Failure:** Join flow requires email, shows CAPTCHA, requires email verification, or has more than one form page.
**Scope:** `app/(public)/hub/join/[groupToken]/page.tsx`, join form component.

### Q12: Join Inactive Circle

**Hypothesis:** When a guest clicks an invite link for an inactive (completed/archived) circle, they see a clear message explaining the circle has ended, with a link to browse the chef or book again. Not a 404.
**Failure:** Guest sees a generic 404, a crash, or a blank page. No context about what happened.
**Scope:** `app/(public)/hub/join/[groupToken]/page.tsx`, `is_active` check.

### Q13: Cookie-Cleared Guest Recovery

**Hypothesis:** A guest who clears cookies can recover their identity via email. The recovery flow: click "Been here before?" -> enter email -> receive email with recovery link -> click link -> cookie re-set -> back in the circle with full history.
**Failure:** Recovery link doesn't work, email never arrives, or recovery resets the guest to a new identity (losing message history, dietary info).
**Scope:** `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` recovery flow, `lib/hub/profile-actions.ts` recovery action.

### Q14: Guest First Visit Orientation

**Hypothesis:** A new guest's first visit shows a welcome card or onboarding hint explaining what the circle is, how to use it, and what tabs are available. Not just dropped into an empty chat.
**Failure:** New guest sees an empty chat feed with no context. Doesn't know what the tabs do or why they're here.
**Scope:** `hub-group-view.tsx` welcome card logic.

### Q15: Guest Post Without Profile

**Hypothesis:** If a visitor navigates directly to `/hub/g/[token]` without joining (no profile cookie), the chat input is disabled with a clear "Join to participate" prompt. They can read but not post.
**Failure:** Visitor sees an enabled input that throws errors on submit, or the page crashes without a profile cookie.
**Scope:** `hub-feed.tsx`, `hub-input.tsx`, profile resolution logic.

### Q16: Guest Photo Upload Failure

**Hypothesis:** When a photo upload fails (network error, file too large, wrong type), the guest sees a clear error message and the gallery state is unchanged. No phantom thumbnails.
**Failure:** Upload fails silently, gallery shows a broken image, or optimistic thumbnail persists after failure.
**Scope:** `components/hub/hub-photo-gallery.tsx`, `lib/hub/media-actions.ts`.

### Q17: Guest See Own Dietary Info Reflected

**Hypothesis:** After a guest enters dietary restrictions during join or profile edit, they can see their own restrictions reflected in the dietary dashboard and their member card. Confirmation that the system "heard" them.
**Failure:** Guest enters "severe peanut allergy" but sees no confirmation anywhere in the circle that this was recorded.
**Scope:** `dietary-dashboard.tsx`, `hub-member-list.tsx`, profile display.

### Q18: Guest Edit Profile After Join

**Hypothesis:** A guest can edit their display name, dietary restrictions, allergies, and bio after joining. Changes are reflected immediately in the member list and dietary dashboard.
**Failure:** No edit button exists post-join, or edits don't propagate to other views (stale member list).
**Scope:** `hub-profile-editor.tsx`, cache invalidation after profile update.

### Q19: Guest Leave Circle

**Hypothesis:** A guest can leave a circle voluntarily. Leaving removes them from the member list and stops notifications. Their messages remain (attributed to "[Left member]" or similar). They can rejoin later.
**Failure:** No leave option exists, or leaving deletes their messages, or they can't rejoin.
**Scope:** `hub-member-list.tsx` leave action, `lib/hub/group-actions.ts` `leaveGroup`.

### Q20: Guest See Event Details

**Hypothesis:** When a circle is linked to an event, guests can see event details (date, time, location, guest count, menu if shared) directly in the circle's events tab. No need to navigate elsewhere.
**Failure:** Events tab shows event IDs or is empty. Guest has to leave the circle to see event info.
**Scope:** `hub-group-view.tsx` events tab, event data loading on the hub page.

### Q21: Guest RSVP From Circle

**Hypothesis:** If an event linked to the circle has an RSVP mechanism, the guest can RSVP directly from within the circle (not redirected to a separate page).
**Failure:** Guest must leave the circle, navigate to a separate RSVP page, and lose context.
**Scope:** `hub-group-view.tsx` events tab, RSVP integration.

### Q22: Guest Request a Meal

**Hypothesis:** A guest can submit a meal request (e.g., "Can we have pasta night?") from within the circle. The request appears in the chef's view.
**Failure:** No meal request mechanism exists, or it exists but the chef never sees it.
**Scope:** `components/hub/meal-requests.tsx`, `lib/hub/meal-board-actions.ts`.

### Q23: Guest Vote in Poll

**Hypothesis:** A guest can cast a vote in any active poll within the circle. Vote is recorded, results update in real-time for all members.
**Failure:** Vote button doesn't work, results don't update, or votes are lost on page reload.
**Scope:** `components/hub/hub-poll-card.tsx`, `lib/hub/poll-actions.ts`.

### Q24: Guest Mark Availability

**Hypothesis:** A guest can mark availability (available/maybe/unavailable) on proposed dates. The best-dates summary updates immediately.
**Failure:** Availability grid doesn't render, responses aren't saved, or the summary doesn't reflect new input.
**Scope:** `components/hub/hub-availability-grid.tsx`, `lib/hub/availability-actions.ts`.

---

## Phase 3: Client Experience (Q25-Q30)

Clients are authenticated guests. They should get everything guests get plus account-linked features.

### Q25: Client Auto-Link to Circle

**Hypothesis:** When a client with an existing hub guest profile signs in to their ChefFlow account, their guest profile is automatically linked to their auth account. They don't have to re-join circles they were already in as a guest.
**Failure:** Authenticated client sees zero circles despite having an active guest profile with the same email. Two separate identities, no bridge.
**Scope:** `lib/hub/client-hub-actions.ts`, auth callback or profile linking logic.

### Q26: Client Cross-Circle View

**Hypothesis:** An authenticated client can see ALL their circles (across all chefs they've interacted with) in one unified view, not just per-chef.
**Failure:** Client can only see circles one-at-a-time via direct links. No aggregated "My Circles" page exists.
**Scope:** Client portal routes, `lib/hub/client-hub-actions.ts`.

### Q27: Client See Payment Status in Circle

**Hypothesis:** When a client is in a circle linked to an event they're paying for, they can see their payment status (paid, pending, overdue) directly in the circle context.
**Failure:** Payment status is only visible on separate invoice/event pages. Client must leave the circle to check if they've paid.
**Scope:** `hub-group-view.tsx` events tab, financial data integration.

### Q28: Client Quick Actions Work

**Hypothesis:** Client quick actions (update guest count, update dietary info, etc.) from within the circle execute successfully and post confirmation messages to the circle feed.
**Failure:** Quick action buttons exist but throw errors, or succeed silently without circle notification.
**Scope:** `lib/hub/client-quick-actions.ts`, `components/hub/hub-quick-actions.tsx`.

### Q29: Client Upgrade Prompt Conversion

**Hypothesis:** The guest-to-client upgrade prompt appears at the right moment (after meaningful engagement, not immediately on join). Clicking it takes the guest to signup with their profile pre-linked.
**Failure:** Upgrade prompt shows on first visit (annoying), or the signup flow doesn't link the existing guest profile (creates a duplicate identity).
**Scope:** `components/hub/guest-upgrade-prompt.tsx`, signup page upgrade handling.

### Q30: Client Unread Badge Accuracy

**Hypothesis:** The unread badge count in the client portal accurately reflects unread messages across all of the client's circles. Reading messages in a circle decrements the count.
**Failure:** Badge shows stale counts, doesn't decrement after reading, or shows 0 when there are unread messages.
**Scope:** `components/hub/client-hub-unread-badge.tsx`, `lib/hub/notification-actions.ts`.

---

## Phase 4: Chef Experience (Q31-Q41)

The chef is the host. Their circle management must be effortless.

### Q31: Chef Circle Auto-Creation on Inquiry

**Hypothesis:** When a new inquiry arrives, a Dinner Circle is automatically created and linked to it. The first message in the circle is a welcome message with context about the inquiry.
**Failure:** Inquiry arrives but no circle is created. Chef has to manually create one. Or circle is created but empty (no context message).
**Scope:** `lib/hub/inquiry-circle-actions.ts`, `lib/hub/inquiry-circle-first-message.ts`.

### Q32: Chef Circle Auto-Creation on Event

**Hypothesis:** When an event reaches a guest-visible state, a Dinner Circle is auto-created (if one doesn't already exist). The compliance dashboard in admin shows events missing circles.
**Failure:** Events exist without circles. Guests have no shared space for coordination.
**Scope:** `lib/hub/integration-actions.ts`, admin hub compliance panel.

### Q33: Chef Inbox Shows All Circles

**Hypothesis:** The `/circles` page shows every circle owned by the chef's tenant, with unread counts, last message preview, and member count. Active circles sorted by most recent activity.
**Failure:** Circles are missing from the inbox, or the list doesn't update when new messages arrive.
**Scope:** `app/(chef)/circles/page.tsx`, `lib/hub/chef-circle-actions.ts`.

### Q34: Chef Unread Count Accuracy

**Hypothesis:** The chef's unread count per circle is accurate. Reading messages in a circle marks them as read. The sidebar badge (`circles-unread-badge.tsx`) aggregates across all circles.
**Failure:** Unread count doesn't decrement, or it includes messages the chef sent themselves.
**Scope:** `components/hub/circles-unread-badge.tsx`, `lib/hub/notification-actions.ts`, read marker logic in `hub-feed.tsx`.

### Q35: Chef Post As Chef Role

**Hypothesis:** When a chef posts in a circle, their messages are visually distinguished (chef badge, different color, or role indicator). Guests can immediately identify chef messages.
**Failure:** Chef messages look identical to guest messages. No role distinction in the feed.
**Scope:** `components/hub/hub-message.tsx`, role rendering.

### Q36: Chef Manage Members (Promote/Remove)

**Hypothesis:** The chef (as owner/admin) can promote members to admin, demote to viewer, or remove members entirely. Role changes take effect immediately.
**Failure:** Role management buttons exist but don't work, or removed members can still access the circle.
**Scope:** `components/hub/hub-member-list.tsx`, `lib/hub/group-actions.ts` role/removal actions.

### Q37: Chef Access Dietary Dashboard

**Hypothesis:** The chef can see an aggregated dietary dashboard for the circle showing all member allergies, dietary restrictions, and household member needs. Severe allergies are visually prioritized.
**Failure:** Dietary dashboard is empty, doesn't include household members, or treats severe allergies the same as preferences.
**Scope:** `components/hub/dietary-dashboard.tsx`, `lib/hub/household-actions.ts`.

### Q38: Chef Manage Meal Board

**Hypothesis:** The chef can create, update, and delete meals on the weekly board. They can set recurring patterns, view attendance, read feedback, and see the prep summary. Guests see changes in real-time.
**Failure:** Meal board is read-only for the chef, or changes don't propagate to guest views.
**Scope:** `components/hub/weekly-meal-board.tsx`, `lib/hub/meal-board-actions.ts`.

### Q39: Chef Share Menu to Circle

**Hypothesis:** When a chef shares a menu proposal for an event, it appears in the circle with dish names, descriptions, and any pricing (if applicable). A system message announces the share.
**Failure:** Menu sharing doesn't trigger a circle message, or the menu data is empty/malformed in the circle view.
**Scope:** `lib/hub/menu-proposal-actions.ts`, `lib/hub/circle-lifecycle-hooks.ts`.

### Q40: Chef Archive Completed Circle

**Hypothesis:** When an event completes, the chef can archive the circle. Archived circles are readable but not postable. They move to the archive tab in the chef inbox.
**Failure:** No archive mechanism, or archived circles still accept new messages, or they disappear entirely (data loss).
**Scope:** `components/hub/circle-archive-view.tsx`, `is_active` flag handling.

### Q41: Chef Social Feed Useful

**Hypothesis:** The social feed on the `/circles` page shows actionable information: new joins, meal requests, upcoming events, dietary flag changes. Not just raw activity spam.
**Failure:** Social feed shows low-value entries ("X read a message") or is empty despite circle activity.
**Scope:** `lib/hub/social-feed-actions.ts`, `components/hub/social-feed.tsx`.

---

## Phase 5: Lifecycle Integration (Q42-Q48)

The circle is the narrative thread of the service lifecycle. Every transition must echo here.

### Q42: Lifecycle - Menu Shared Posts to Circle

**Hypothesis:** When a chef shares a menu with a client, `postMenuSharedToCircle` fires and inserts a system message in the circle with menu details.
**Failure:** Menu is shared but the circle has no record of it. Members don't know a menu was proposed.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`, call site in menu sharing action.

### Q43: Lifecycle - Quote Sent Posts to Circle

**Hypothesis:** When a chef sends a quote, `postQuoteSentToCircle` fires with formatted total, per-person, and deposit amounts.
**Failure:** Quote is sent but circle has no system message. Or the amounts are wrong/missing.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`, call site in quote sending action.

### Q44: Lifecycle - Payment Received Posts to Circle

**Hypothesis:** When a payment is received (Stripe webhook or manual), a system message posts to the circle confirming the amount and new balance.
**Failure:** Payment goes through but circle has no record. Guest doesn't know their payment was received.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`, call site in payment processing.

### Q45: Lifecycle - Event Confirmed Posts to Circle

**Hypothesis:** When an event transitions to "confirmed" state, a celebration/confirmation system message posts to the circle with event details (date, time, location).
**Failure:** Event is confirmed but circle is silent. Members don't know the event is locked in.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`, call site in event FSM transitions.

### Q46: Lifecycle - Event Completed Posts to Circle

**Hypothesis:** When an event completes, a system message posts thanking attendees, with a prompt for feedback.
**Failure:** Event completes silently. No closure message, no feedback prompt.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`, call site in event completion.

### Q47: Lifecycle - Photos Ready Posts to Circle

**Hypothesis:** When event photos are uploaded, a system message posts to the circle with a preview or link to the gallery.
**Failure:** Photos are uploaded but guests have no way to know. They have to manually check the photos tab.
**Scope:** `lib/hub/circle-lifecycle-hooks.ts`, call site in photo upload.

### Q48: Circle Created for Every Guest-Visible Event

**Hypothesis:** The admin compliance dashboard (`/admin/hub`) identifies every event in a guest-visible state (accepted, paid, confirmed, in_progress) that lacks a linked circle, and offers a one-click backfill.
**Failure:** Events exist without circles and the admin has no way to find or fix them.
**Scope:** `app/(chef)/admin/hub/page.tsx`, compliance scan.

---

## Phase 6: Real-Time & Data Integrity (Q49-Q54)

Real-time is the heartbeat. If SSE breaks, the circle feels dead.

### Q49: SSE Message Delivery Real-Time

**Hypothesis:** When User A posts a message, User B sees it appear within 2 seconds without refreshing. SSE subscription is active and delivering.
**Failure:** Messages only appear on refresh. SSE connection is not established or drops silently.
**Scope:** `lib/hub/realtime.ts`, `lib/realtime/sse-server.ts`, hub SSE channel naming.

### Q50: SSE Typing Indicators Work

**Hypothesis:** When a user starts typing, other members see a typing indicator within 1 second. Indicator disappears when the user stops typing or sends the message.
**Failure:** No typing indicator ever appears, or it persists after the user stops typing (ghost typing).
**Scope:** `hub-feed.tsx` typing indicator logic, `lib/hub/realtime.ts`.

### Q51: SSE Reconnect After Disconnect

**Hypothesis:** If the SSE connection drops (network hiccup, tab sleep), the client automatically reconnects and fetches any messages missed during the gap.
**Failure:** SSE drops and never reconnects. User is stuck in a "looks connected but actually stale" state. Messages accumulate server-side but never reach the client.
**Scope:** `lib/realtime/sse-client.ts` reconnect logic, message gap detection.

### Q52: Message Edit Broadcasts to All

**Hypothesis:** When a user edits a message, all other members see the edit reflected in real-time (not just on refresh).
**Failure:** Edit is saved server-side but other clients show the old text until they refresh.
**Scope:** `lib/hub/message-actions.ts` edit action, SSE broadcast after edit.

### Q53: Message Delete Broadcasts to All

**Hypothesis:** When a user deletes a message, all other members see the message removed (or replaced with "[deleted]") in real-time.
**Failure:** Message disappears for the deleter but persists for everyone else until refresh.
**Scope:** `lib/hub/message-actions.ts` delete action, SSE broadcast after delete.

### Q54: Concurrent Message Ordering

**Hypothesis:** When two users post messages at nearly the same time, both messages appear for both users in the same order (consistent ordering by `created_at` or sequence).
**Failure:** User A sees [A, B] but User B sees [B, A]. Inconsistent ordering breaks conversation coherence.
**Scope:** Message insertion ordering, SSE delivery ordering, client-side sort logic.

---

## Phase 7: Meal System (Q55-Q60)

The meal board turns one-time event clients into recurring relationships. This is the business model upgrade path.

### Q55: Meal Board CRUD (Chef)

**Hypothesis:** Chef can create a meal (title, description, date, time, type), edit it, mark it served/cancelled, and delete it. All operations persist across page reload.
**Failure:** Any CRUD operation fails silently, data reverts on reload, or the UI doesn't reflect the change.
**Scope:** `components/hub/weekly-meal-board.tsx`, `lib/hub/meal-board-actions.ts`.

### Q56: Meal Feedback (Guest)

**Hypothesis:** After a meal is marked served, guests can submit feedback (loved/liked/neutral/disliked). Feedback is aggregated and visible to the chef.
**Failure:** Feedback buttons don't appear for served meals, submissions fail, or the chef can't see aggregated results.
**Scope:** `components/hub/meal-feedback.tsx`, `lib/hub/meal-feedback-actions.ts`, `components/hub/feedback-insights-panel.tsx`.

### Q57: Meal Attendance Tracking

**Hypothesis:** The chef can see who's eating each meal. Guests can opt in/out. The prep summary adjusts head counts based on attendance.
**Failure:** Attendance tracking doesn't exist, or it exists but the prep summary ignores it (always shows full member count).
**Scope:** `components/hub/meal-attendance.tsx`, `lib/hub/meal-board-actions.ts` attendance functions.

### Q58: Recurring Meals Pattern

**Hypothesis:** A chef can set a recurring meal pattern (e.g., "Pasta night every Tuesday"). The system auto-generates meal entries on the weekly board. Recurring patterns can be paused or cancelled.
**Failure:** Recurring patterns don't generate entries, or they can't be stopped once started.
**Scope:** `components/hub/recurring-meals-manager.tsx`, `lib/hub/meal-board-actions.ts` recurring logic.

### Q59: Weekly Prep Summary

**Hypothesis:** The weekly prep summary shows: how many meals, total head count, dietary requirements to accommodate, and total prep time (if estimated). Useful for the chef's weekly planning.
**Failure:** Prep summary is empty, shows wrong counts, or doesn't account for dietary requirements.
**Scope:** `components/hub/weekly-prep-summary.tsx`, `components/hub/week-summary-card.tsx`.

### Q60: Meal Request From Guest

**Hypothesis:** A guest can request a specific meal or dish. The request appears in the chef's view with the requester's name. The chef can approve, decline, or schedule it.
**Failure:** Meal requests go nowhere. Chef never sees them. No feedback loop to the requester.
**Scope:** `components/hub/meal-requests.tsx`, `lib/hub/meal-board-actions.ts` request handling.

---

## Phase 8: Dietary Safety (Q61-Q64)

This is life-safety. A missed allergy can kill someone. These questions are non-negotiable.

### Q61: Allergy Aggregation Correct

**Hypothesis:** The dietary dashboard aggregates ALL allergies from ALL members (including household members) without duplication or omission. If 3 members report peanut allergy, it shows peanut allergy once (with count).
**Failure:** Allergies from some members are missing. Or household member allergies are excluded. Or duplicates inflate the count.
**Scope:** `components/hub/dietary-dashboard.tsx`, `lib/hub/household-actions.ts`.

### Q62: Household Dietary Included

**Hypothesis:** When a guest adds household members (children, spouse, elderly parent) with dietary restrictions, those restrictions appear in the circle's dietary dashboard alongside the guest's own.
**Failure:** Household members' allergies are stored but never surface in the dietary dashboard. Chef doesn't know a guest's child has a dairy allergy.
**Scope:** `components/hub/household-editor.tsx`, `dietary-dashboard.tsx` data aggregation.

### Q63: Severe Allergy Visual Priority

**Hypothesis:** Severe/life-threatening allergies (peanuts, tree nuts, shellfish, fish) are visually distinct from preferences or mild sensitivities. Red badges, larger text, or top-of-list positioning.
**Failure:** Severe allergies rendered identically to "prefers no cilantro." Chef might not realize the urgency.
**Scope:** `components/hub/dietary-dashboard.tsx` severity-based color coding.

### Q64: Unknown vs Confirmed-None Distinction

**Hypothesis:** The system distinguishes between "guest hasn't answered the allergy question" (unknown risk, treat as potential danger) and "guest confirmed no allergies" (safe). The dashboard makes this distinction visible.
**Failure:** Both cases show as "no allergies listed." Chef assumes safety when the guest simply hasn't responded.
**Scope:** `lib/hub/household-actions.ts` `HouseholdDietarySummary` type, `dietary-dashboard.tsx` rendering.

---

## Phase 9: Social & Notifications (Q65-Q72)

### Q65: Friend Request Flow

**Hypothesis:** An authenticated client can send a friend request to another guest/client in the same circle. Accepting creates a bilateral connection. Declining allows re-request later.
**Failure:** Friend request button doesn't work, or accepted requests don't show in the friends list, or declined requests are permanent blocks.
**Scope:** `lib/hub/friend-actions.ts`, `components/hub/friends-list.tsx`.

### Q66: Chef Recommendation Sharing

**Hypothesis:** A member can share a chef recommendation within the circle (e.g., "You should try Chef X for Italian!"). The recommendation appears as a card with chef info.
**Failure:** Share form exists but the recommendation never renders, or it links to a nonexistent chef page.
**Scope:** `components/hub/share-chef-form.tsx`, `lib/hub/chef-share-actions.ts`.

### Q67: Invite Link Copy and Share

**Hypothesis:** Every circle member can copy the invite link to share with others. The link works and leads to the join page.
**Failure:** Copy button doesn't work (clipboard API fails), or the link is malformed, or it leads to a 404.
**Scope:** `hub-group-view.tsx` invite link copy logic.

### Q68: Push Notification Delivery

**Hypothesis:** Members who opt in to push notifications receive browser push notifications for new messages when they don't have the circle tab active.
**Failure:** Push subscription fails, service worker doesn't fire, or notifications arrive but with empty/wrong content.
**Scope:** `components/hub/hub-push-prompt.tsx`, `lib/hub/hub-push-subscriptions.ts`.

### Q69: Email Notification Delivery

**Hypothesis:** Members with email addresses receive email notifications for circle activity according to their digest preference (instant, hourly, daily). Emails include a direct link back to the circle.
**Failure:** Emails never send, link in email is broken, or instant mode floods the inbox (no debouncing).
**Scope:** `lib/hub/circle-notification-actions.ts`, `lib/hub/circle-digest.ts`.

### Q70: Quiet Hours Respected

**Hypothesis:** When a member sets quiet hours (e.g., 10 PM - 7 AM), no push or email notifications are delivered during that window. Messages queue and deliver when quiet hours end.
**Failure:** Notifications fire during quiet hours, or queued notifications are lost (never delivered after quiet hours end).
**Scope:** `components/hub/notification-preferences.tsx`, notification dispatch logic.

### Q71: Digest Mode Batching

**Hypothesis:** Members on "hourly" or "daily" digest mode receive a single batched notification with all activity, not individual notifications for each message.
**Failure:** Digest mode sends individual notifications anyway, or the digest is empty/malformed, or it includes activity the member already saw.
**Scope:** `lib/hub/circle-digest.ts`, digest generation and delivery.

### Q72: Circle Mute/Unmute

**Hypothesis:** A member can mute a circle. Muted circles send zero notifications (push, email, digest). Unmuting restores the previous notification preferences.
**Failure:** Mute doesn't stop notifications, or unmute resets preferences to defaults instead of restoring the previous settings.
**Scope:** `hub-group-view.tsx` mute toggle, notification dispatch respects mute flag.

---

## Phase 10: Data Integrity & Scale (Q73-Q78)

### Q73: Sub-Fetch Failure Shows Error Not Empty

**Hypothesis:** When a data sub-fetch fails on the hub page (members, meals, photos, etc.), the relevant tab shows an error state, not an empty state. (Zero Hallucination Law 2: never hide failure as zero.)
**Failure:** Members list fails to load and shows "No members yet" instead of "Could not load members." Guest thinks they're alone in the circle.
**Scope:** `app/(public)/hub/g/[groupToken]/page.tsx` `.catch(() => [])` patterns, tab rendering.

### Q74: Chef Circles Page Error Handling

**Hypothesis:** If `getChefCircles()` or `getChefSocialFeed()` fails on the `/circles` page, the chef sees an error state, not a crash or blank page.
**Failure:** Unhandled exception crashes the page. Chef sees Next.js error page or blank screen.
**Scope:** `app/(chef)/circles/page.tsx`, error boundary or try/catch.

### Q75: Message Rate Limit Enforced

**Hypothesis:** The 30 messages per 60 seconds rate limit is enforced per profile token. Exceeding it returns a clear error message. The UI disables the input or shows a countdown.
**Failure:** Rate limit exists server-side but the client doesn't communicate it. User keeps typing and hitting silent errors.
**Scope:** `lib/hub/message-actions.ts` rate limit, `hub-input.tsx` error display.

### Q76: Group Member Cap

**Hypothesis:** There is a reasonable member cap per circle (e.g., 100 or 200) to prevent resource exhaustion. Attempting to join a full circle shows a "circle is full" message.
**Failure:** No member cap. A viral link could add thousands of members, breaking SSE, notifications, and dietary dashboard performance.
**Scope:** `lib/hub/group-actions.ts` `joinHubGroup`, member count check.

### Q77: Message History Pagination

**Hypothesis:** Message history loads in pages (50 at a time). Scrolling up loads older messages. Performance doesn't degrade with 10,000+ messages in a circle.
**Failure:** All messages load at once (crashes on large circles), or "load more" doesn't work, or there are gaps between pages.
**Scope:** `hub-feed.tsx` cursor pagination, `lib/hub/message-actions.ts` paginated query.

### Q78: Photo Gallery at 100+ Images

**Hypothesis:** The photo gallery remains performant with 100+ images. Images are lazy-loaded. Thumbnails are used in the grid, full-size only in the lightbox.
**Failure:** Gallery loads all full-size images at once, causing multi-second load times and high bandwidth usage.
**Scope:** `components/hub/hub-photo-gallery.tsx`, image loading strategy.

---

## Phase 11: Public Surface & Cross-User (Q79-Q82)

### Q79: Hub Landing Page SEO

**Hypothesis:** The `/hub` landing page is a well-structured marketing page explaining what Dinner Circles are, with schema markup, meta tags, and calls to action. Indexed by search engines (unlike individual circles which are noindex).
**Failure:** Landing page is a placeholder, has no meta tags, or is accidentally noindex.
**Scope:** `app/(public)/hub/page.tsx`, metadata, structured data.

### Q80: Circle Noindex Enforced

**Hypothesis:** Every individual circle page (`/hub/g/*`, `/hub/me/*`, `/hub/join/*`) has `robots: noindex, nofollow`. Private circle data (messages, dietary info, member names) is never indexed.
**Failure:** A circle page is indexed by Google. Private dietary info, allergy data, and member names appear in search results.
**Scope:** `app/(public)/hub/layout.tsx` or individual page metadata.

### Q81: Bridge Group View

**Hypothesis:** Bridge-type circles (chef-to-chef introductions) render with appropriate UI. They show the two chefs, the introduction context, and a simplified message view. No meal board or guest features.
**Failure:** Bridge circles show the full guest UI (meal board, dietary dashboard, etc.) which makes no sense for a chef-to-chef introduction.
**Scope:** `components/hub/hub-bridge-view.tsx`, `hub-group-view.tsx` bridge routing.

### Q82: Theme Picker Persistence

**Hypothesis:** When a circle owner sets a visual theme (colors, emoji), the theme persists across sessions and is visible to all members. Theme is stored in the group record, not in localStorage.
**Failure:** Theme resets on page reload, or only the setter sees it (localStorage-only), or it applies to the wrong circle.
**Scope:** `components/hub/theme-picker.tsx`, `lib/hub/group-actions.ts` theme storage.

---

## Execution Protocol

### Priority Order

1. **Phase 1 (Security)** - Run first. Any FAIL here is a P0 fix before anything else.
2. **Phase 8 (Dietary Safety)** - Life-safety. Second priority.
3. **Phases 2-4 (User Experiences)** - Core usability for all user types.
4. **Phase 5 (Lifecycle)** - Integration completeness.
5. **Phases 6-7 (Realtime, Meals)** - Feature depth.
6. **Phases 9-11 (Social, Scale, Public)** - Polish and growth.

### Grading Rules

- **WORKING:** Fully implemented, handles errors, good UX, no security issues
- **PARTIAL:** Exists but missing key pieces (e.g., auth exists but has a bypass)
- **MISSING:** Feature does not exist at all
- **BROKEN:** Exists but has bugs, security holes, or data loss potential

### Audit Method

For each question:

1. Read the relevant source files (cited with file paths and line numbers)
2. Trace the data flow from user action to database and back
3. Identify error handling (or lack thereof)
4. Grade with evidence
5. If BROKEN or MISSING: describe the fix direction

### Relationship to System Integrity Question Set

Hub-specific questions already in the system integrity set:

- **Q28:** Hub Token Security (BUILT)
- **Q68:** Hub Read Action Auth (SPEC)
- **Q69:** Hub Guest Count IDOR (SPEC)
- **Q70:** Hub Noindex Meta (SPEC)

This interrogation goes deeper. Those 4 questions are necessary but not sufficient. This spec covers the full surface area across all user types, not just security boundaries.
