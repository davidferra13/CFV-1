# System Integrity Question Set: Community Circles

> 40 questions across 10 domains. Every question forces a verifiable answer.
> Status: BUILT = code exists and works. GAP = identified, needs fix. N/A = intentionally excluded.

---

## Domain 1: Data Layer (Schema Fitness)

| #   | Question                                                                              | Answer                                                                                                      | Status |
| --- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Does `hub_groups.group_type` accept 'community' without a CHECK constraint violation? | Yes. Column is `TEXT NOT NULL DEFAULT 'circle'` with no CHECK. Zod schema and TS types updated.             | BUILT  |
| 2   | Does `hub_groups.visibility` correctly gate public/private/secret?                    | Yes. CHECK constraint `('public','private','secret')`. Index `idx_hub_groups_visibility` exists.            | BUILT  |
| 3   | Is `tenant_id = null` safe for community circles? Won't FK or NOT NULL reject it?     | Safe. `tenant_id UUID REFERENCES chefs(id)` is nullable. No NOT NULL constraint.                            | BUILT  |
| 4   | Does `display_vibe TEXT[]` store topic tags without migration?                        | Yes. Column added in migration `20260330000077_open_tables.sql`. No new migration needed.                   | BUILT  |
| 5   | Will community circles pollute chef business circle queries?                          | No. `getChefCircles()` filters `.eq('tenant_id', tenantId)`. Community circles (`tenant_id=null`) excluded. | BUILT  |

## Domain 2: Authentication and Authorization

| #   | Question                                                         | Answer                                                                                                                               | Status |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 6   | Can both chefs AND clients create community circles?             | Yes. `createCommunityCircle()` uses `requireAuth()` which accepts any role.                                                          | BUILT  |
| 7   | Can unauthenticated users browse the discovery page?             | Yes. `/hub/circles` uses `getCurrentUser()` (returns null, no redirect).                                                             | BUILT  |
| 8   | Can unauthenticated users create circles?                        | No. Create form only renders when `isAuthenticated=true`. Server action calls `requireAuth()`.                                       | BUILT  |
| 9   | Is `created_by_profile_id` spoofable in `createCommunityCircle`? | No. Profile resolved server-side from session via `getOrCreateUniversalHubProfile()`.                                                | BUILT  |
| 10  | Who owns/moderates a community circle? What prevents abuse?      | Circle creator is `owner` role (set by `createHubGroup`). Owner can promote admins, remove members. No platform-wide moderation yet. | GAP    |

## Domain 3: Circle View (HubGroupView) Compatibility

| #   | Question                                                                      | Answer                                                                                                     | Status |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 11  | Does the Chat tab work for community circles?                                 | Yes. `HubFeed` uses only `groupId`/`profileToken`. No tenant/event dependency.                             | BUILT  |
| 12  | Does the Meals tab work?                                                      | Yes. `meal-board-actions.ts` queries by `group_id` only. No tenant_id.                                     | BUILT  |
| 13  | Does the Members tab work?                                                    | Yes. Queries `hub_group_members` by `group_id`.                                                            | BUILT  |
| 14  | Does the Photos tab work?                                                     | Yes. `media-actions.ts` uses `group_id`.                                                                   | BUILT  |
| 15  | Does the Schedule/Availability tab work?                                      | Yes. `availability-actions.ts` uses `group_id`. Hidden when empty.                                         | BUILT  |
| 16  | Does the Guest Status Banner (CircleClientStatus) show misleading data?       | Fixed. `page.tsx` skips `getCriticalPathForGuest` when `group_type === 'community'`. Banner never renders. | BUILT  |
| 17  | Does the Welcome card say "dinner circle" / "the chef" for community circles? | Fixed. Conditional text: "Welcome to this community circle" + community-specific bullet points.            | BUILT  |
| 18  | Does the Join prompt say "see the full plan"?                                 | Fixed. Community circles: "Join this circle to chat with the community and share your perspective."        | BUILT  |
| 19  | Is the invite/share link functional for community circles?                    | Yes. Token-based, no tenant dependency.                                                                    | BUILT  |
| 20  | Are irrelevant tabs (Events) hidden?                                          | Yes. Events tab only shows when `groupEvents.length > 0`.                                                  | BUILT  |

## Domain 4: Notifications and Digests

| #   | Question                                                       | Answer                                                                                | Status                                                   |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 21  | Do chat message notifications work for community circles?      | Yes. `notifyCircleMembers()` uses `groupId` only. No tenant filter.                   | BUILT                                                    |
| 22  | Do push notifications work?                                    | Yes. `hub-push-subscriptions.ts` uses `profileId` only.                               | BUILT                                                    |
| 23  | Do circle digests (hourly/daily) include community circles?    | Yes. `processDigests()` queries by `digest_mode` and `group_id`. No tenant filter.    | BUILT                                                    |
| 24  | Does `circleFirstNotify` work for community circles?           | No. `circle-lookup.ts` guards on `tenant_id` being truthy. Returns null. Silent drop. | N/A (lifecycle events don't apply to community circles)  |
| 25  | Do lifecycle hooks (menu shared, payment received, etc.) fire? | No. Same `circle-lookup.ts` guard. Silent drop.                                       | N/A (correct behavior; community circles have no events) |

## Domain 5: Navigation and Discovery

| #   | Question                                                               | Answer                                                                                                                               | Status                      |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| 26  | Can chefs reach the discovery page from their UI?                      | Yes, via "Browse Circles" link in `circles-inbox.tsx`.                                                                               | BUILT                       |
| 27  | Can clients reach the discovery page from their UI?                    | Yes, via "Browse Circles" button in `/my-hub`.                                                                                       | BUILT                       |
| 28  | Do community circles the chef joined appear in their `/circles` page?  | Fixed. `getChefCircles()` now also fetches community circles (tenant_id=null) via chef's group memberships, merges and deduplicates. | BUILT                       |
| 29  | Do community circles the client joined appear in their `/my-hub` page? | Yes. `getClientHubGroups()` queries `hub_group_members` by `profile_id`, then fetches groups by `id`. No tenant filter.              | BUILT                       |
| 30  | Is `/hub/circles` in the authenticated nav for chefs?                  | No. Only accessible via circles-inbox "Browse Circles" link. Not in main nav.                                                        | BUILT (sufficient via link) |

## Domain 6: Social Feed Integration

| #   | Question                                                     | Answer                                                                                                                                                                   | Status |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 31  | Do community circle messages appear in the chef social feed? | Yes. `getChefSocialFeed()` -> `getSocialFeed()` queries by membership. No tenant/type filter.                                                                            | BUILT  |
| 32  | Do community circle messages appear in the client feed?      | Yes. Same `getSocialFeed()` path via client hub profile.                                                                                                                 | BUILT  |
| 33  | Is the dashboard unread hub widget working?                  | Fixed. `getUnreadHubMessages()` corrected: `hub_profiles` -> `hub_guest_profiles`, `hub_group_messages` -> `hub_messages`, wrong column names fixed, admin client added. | BUILT  |

## Domain 7: Cross-System Connections

| #   | Question                                                                                          | Answer                                                                                                                                                                      | Status                |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 34  | Can a community circle member befriend another member?                                            | Yes. Friend system is profile-to-profile, group-agnostic. But no "add friend" button on member list in community circles.                                                   | BUILT (partial)       |
| 35  | Is the `(chef)/community` page system (directory, mentorship, etc.) related to community circles? | No. Completely separate system using `community_profiles`, `chef_directory_listings`, etc. Different DB tables.                                                             | N/A (separate system) |
| 36  | Are `chef_social_channels` (Reddit-like topic channels) redundant with community circles?         | Partially. Channels use post/comment model; circles use real-time messaging. Different interaction models. Both can coexist. Channels are chef-only; circles are universal. | N/A (complementary)   |
| 37  | Does Remy (AI concierge) know about community circles?                                            | No. Remy is not wired into HubGroupView. Source type `'remy'` exists but has no special rendering.                                                                          | N/A (not needed)      |

## Domain 8: Edge Cases and Abuse

| #   | Question                                                          | Answer                                                                                                | Status  |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------- |
| 38  | Is circle creation rate-limited?                                  | Fixed. `checkRateLimit` added: max 5 circles per hour per user profile.                               | BUILT   |
| 39  | Is the discovery page rate-limited?                               | Fixed. `checkRateLimit` added: 60 requests per 15 min per IP.                                         | BUILT   |
| 40  | Can a user create a circle with an offensive name visible to all? | Yes. No content moderation on circle names/descriptions. Public circles are immediately discoverable. | **GAP** |

## Domain 9: SEO and Indexing

| #   | Question                                                         | Answer                                                                                        | Status |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ |
| 41  | Should `/hub/circles` be indexed by search engines?              | Fixed. Page-level metadata overrides hub layout with `robots: { index: true, follow: true }`. | BUILT  |
| 42  | Do individual community circle views leak PII to search engines? | No. `/hub/g/[token]` has `robots: { index: false }` in metadata.                              | BUILT  |

## Domain 10: Completeness and UX

| #   | Question                                               | Answer                                                                                                     | Status |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------ |
| 43  | Can a circle owner edit circle details after creation? | Yes. `updateHubGroup()` allows owner/admin to update name, description, emoji, etc.                        | BUILT  |
| 44  | Can a circle owner delete/archive a circle?            | Fixed. `archiveCommunityCircle()` in community-circle-actions.ts uses universal auth, verifies owner role. | BUILT  |
| 45  | Can members leave a community circle?                  | Yes. `leaveGroup()` uses profile token. No tenant dependency.                                              | BUILT  |
| 46  | What happens when the sole owner leaves?               | Blocked. `leaveGroup()` checks for other owners/admins before allowing owner departure.                    | BUILT  |

## Domain 11: Language Cohesiveness (Second Sweep)

| #   | Question                                                                               | Answer                                                                                                                                | Status          |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 47  | Does `getCirclesUnreadCount()` include community circles in the nav badge?             | Fixed. Merges tenant-scoped + community circle groups (via membership lookup, `tenant_id IS NULL`). Deduplicates before counting.     | BUILT           |
| 48  | Does the `joinHubGroup()` system message say "dinner circle" for community circles?    | Fixed. Conditional: community = "Welcome to the circle. Chat with the community and share your perspective." Dinner = original text.  | BUILT           |
| 49  | Does the join confirmation email say "chat with the chef" / "Open Your Dinner Circle"? | Fixed. Community: "chat with the community... connect with fellow food lovers" + "Open Your Circle". Dinner: original text preserved. | BUILT           |
| 50  | Does `circle-message.tsx` say "Dinner Circle" in footer?                               | Fixed. Changed to "member of this circle" (neutral, works for all types).                                                             | BUILT           |
| 51  | Does `circle-digest.tsx` say "Dinner Circle" in body/CTA?                              | Fixed. Body: "what you missed in your circle". CTA: "Open Circle". Neutral for all types.                                             | BUILT           |
| 52  | Does `HubGroupCard` default emoji (🍽️) make sense for community circles?               | Fixed. Default emoji is now 💬 for `group_type === 'community'`, 🍽️ for dinner circles.                                               | BUILT           |
| 53  | Can partner/staff roles create or join community circles?                              | No. `requireAuth()` accepts chef/client only. Partners/staff are excluded by design. Documented, not a gap.                           | N/A (by design) |

## Domain 12: Chef UI Label Cohesiveness (Third Sweep)

| #   | Question                                                                   | Answer                                                                                         | Status |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------ |
| 54  | Does chef nav say "Dinner Circles" when it now includes community circles? | Fixed. Label changed to "Circles". Added "Browse Community" submenu linking to `/hub/circles`. | BUILT  |
| 55  | Does chef `/circles` page say "Dinner Circles"?                            | Fixed. Title: "Circles". Subtitle: "Dinner circles, community groups, and social feed".        | BUILT  |
| 56  | Does chef dashboard section say "Dinner Circles"?                          | Fixed. Label: "Circles". Empty state: "No active circles yet" + "browse community circles".    | BUILT  |

## Domain 13: Client UI Label Cohesiveness (Third Sweep)

| #   | Question                                                              | Answer                                                                               | Status |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| 57  | Does `/my-hub/notifications` title say "Dinner Circle Notifications"? | Fixed. Title: "Circle Notifications". Subtitle: "Unread updates from your circles."  | BUILT  |
| 58  | Does `/my-hub/friends` title say "Dinner Circle"?                     | Fixed. Title: "My Circle". Subtitle: "Friends you connect with across your circles." | BUILT  |

## Domain 14: Cross-System Data Flows (Third Sweep)

| #   | Question                                                               | Answer                                                                                                                         | Status |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 59  | Does `processDigests()` include community circles?                     | Yes. Queries `hub_group_members` by `digest_mode`. No tenant_id or group_type filter.                                          | BUILT  |
| 60  | Do polls work in community circles?                                    | Yes. `poll-actions.ts` uses `groupId` + `profileToken` only. No tenant dependency.                                             | BUILT  |
| 61  | Does `getHubUnreadCounts()` include community circles for clients?     | Yes. Queries `hub_group_members` by `profile_id`. No tenant filter.                                                            | BUILT  |
| 62  | Does push notification subscription work for community circle members? | Yes. `hub-push-subscriptions.ts` uses `profileId` only.                                                                        | BUILT  |
| 63  | Does `circle-lookup.ts` crash on community circles?                    | No. Guards on `tenant_id` being truthy (lines 39, 54). Returns null for community circles. All callers handle null gracefully. | BUILT  |
| 64  | Does meal board work in community circles?                             | Yes. Uses `group_id` only. Food-topic community circles may find this useful.                                                  | BUILT  |
| 65  | Does email-to-circle routing affect community circles?                 | No. Routes via tenant-specific reply-to address lookup. Community circles have no email routing.                               | N/A    |
| 66  | Can admin panel see community circles?                                 | Yes. `getGlobalHubGroups()` queries all hub_groups. Community circles show with `tenant_id: null`.                             | BUILT  |

## Domain 15: System Boundaries (Third Sweep)

| #   | Question                                                              | Answer                                                                                                                                            | Status                 |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 67  | Does account deletion clean up community circle memberships?          | **No.** `account-deletion-actions.ts` does not touch `hub_group_members` or `hub_guest_profiles`. Orphaned memberships and owned circles persist. | **GAP**                |
| 68  | Does Remy know about community circles?                               | No. No `/hub/circles` in Remy's navigation options. Clients cannot discover community circles via Remy.                                           | **GAP** (low severity) |
| 69  | Do community circle pages have Open Graph metadata for link previews? | No. `page.tsx` uses static `metadata` with `robots: noindex`. No dynamic OG title/description from circle name. Sharing a link shows no preview.  | **GAP** (low severity) |
| 70  | Is community circles in the feature classification map?               | No entry. Per monetization policy (all features free), no classification needed.                                                                  | N/A (correct)          |
| 71  | Does the public `/hub` landing page mention community circles?        | No. Only describes event-based Dinner Circles. Separate entry at `/hub/circles`.                                                                  | N/A (separate entry)   |
| 72  | Does ticket webhook auto-join affect community circles?               | No. Ticket webhooks look up event-linked circles only. Community circles have no events.                                                          | N/A (correct)          |
| 73  | Does the embed widget relate to community circles?                    | No. Embed handles inquiry capture. Separate system.                                                                                               | N/A (separate)         |

---

## Summary

| Status | Count |
| ------ | ----- |
| BUILT  | 58    |
| GAP    | 5     |
| N/A    | 10    |

### Resolved GAPs (first sweep)

1. **Q16: Guest Status Banner** - Skip lifecycle queries for community circles.
2. **Q28: Chef circles page** - `getChefCircles()` merges community circles via membership lookup.
3. **Q44: Archive action** - `archiveCommunityCircle()` uses universal auth + owner verification.
4. **Q38/39: Rate limiting** - Creation: 5/hour per user. Discovery: 60/15min per IP.
5. **Q17/18: Welcome card + join prompt** - Conditional text for community vs dinner circles.
6. **Q41: SEO** - Page-level `robots: index: true` overrides hub layout noindex.

### Resolved GAPs (second sweep)

7. **Q47: Nav badge undercount** - `getCirclesUnreadCount()` merges community circles via membership.
8. **Q48: Join system message** - Conditional text for community vs dinner circles.
9. **Q49: Join confirmation email** - Subject, body, CTA all conditional on group_type.
10. **Q50/51: Email templates** - Neutral language in circle-message and circle-digest.
11. **Q52: Default emoji** - 💬 for community, 🍽️ for dinner.

### Resolved GAPs (third sweep)

12. **Q33: Dashboard unread widget** - Fixed 5 wrong table/column refs in `getUnreadHubMessages()`.
13. **Q54-56: Chef UI labels** - "Dinner Circles" -> "Circles" across nav, page, dashboard.
14. **Q57-58: Client UI labels** - "Dinner Circle Notifications" -> "Circle Notifications", "Dinner Circle" -> "My Circle".

### Remaining GAPs

1. **Q10: Platform-wide moderation** - Circle owners moderate their own. No admin-level abuse tools. Acceptable at current scale.
2. **Q40: Content moderation on circle names** - No automated filtering. Add report mechanism when needed.
3. **Q67: Account deletion orphans** - Memberships and owned circles persist after deletion. Needs cleanup in `account-deletion-actions.ts`.
4. **Q68: Remy awareness** - Remy cannot navigate to or suggest community circles. Low severity (clients have direct access via `/my-hub` and `/hub/circles`).
5. **Q69: OG metadata** - No link preview when sharing community circle URLs. Needs dynamic `generateMetadata` on group page.
