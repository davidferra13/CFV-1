# System Integrity Question Set: Full Cohesion Audit

> **Purpose:** Every previous question set tested WITHIN a domain or across 2-3 boundaries. This set tests the 12 remaining uninterrogated domains AND their cross-system connections to every other ChefFlow system. Goal: force every boundary into a fully specified, verifiable state. No ambiguity. Every answer is PASS, PARTIAL, FAIL, or N/A with cited evidence.
>
> **Scope:** 120 questions across 12 domains, ordered by launch priority (user hits domain 1 first, domain 12 last). Every question targets a real failure mode that affects ALL users unless marked [ADMIN-ONLY].
>
> **How to use:** Answer each question with a concrete verdict. Every PASS must cite `file:line`. Every FAIL gets a gap number (FC-G1, FC-G2...). PARTIAL means data exists but pipeline is incomplete.
>
> **Relationship to prior sets:** This is the FINAL cohesion layer. Prior sets covered: core integrity (75Q), prep timeline (128Q), chef-to-chef (83Q), financials (70Q), dinner circles (82Q), scheduled jobs (15Q), ingredient lifecycle (20Q), stress test (100Q). This set covers the 12 domains those missed.

---

## Domain 1: Onboarding End-to-End (First Impression)

> The onboarding wizard is the first thing a new chef sees. If it breaks, there is no second chance. These questions test whether onboarding actually produces a functional chef account connected to every downstream system.

**FC1. After completing all 6 wizard steps (Profile, Portfolio, Pricing, Gmail, FirstMenu, FirstBooking), does the chef have enough data for the dashboard to render without empty-state errors?**
The dashboard reads: financial summary, upcoming events, prep prompts, recent activity, client count, inquiry count. A fresh chef has zero of these. Does every dashboard widget handle the zero-data case gracefully (empty state, not error state, not $0.00 that looks like real data)?

**FC2. The `network-step.tsx` component exists in `components/onboarding/` but is NOT imported by the wizard. Is chef-to-chef discovery permanently excluded from onboarding, or is this a gap?**
A new chef signing up has zero connections. The network is a major feature (handoffs, collab, dinner circles). Should onboarding surface "find chefs near you" or "join a dinner circle"? If excluded by design, document why. If a gap, flag it.

**FC3. When the wizard's FirstBookingStep creates a draft event, does it trigger the full event FSM (draft state), create a ledger stub, and appear on the calendar?**
Or does it create an orphan event record that the dashboard/calendar/financial systems don't know about? Trace the data path from `FirstBookingStep` submit -> server action -> DB insert -> downstream consumers.

**FC4. Does `completeOnboardingWizard()` set `onboarding_completed_at` AND trigger the post-onboarding banner dismissal, or can a chef get trapped seeing both the hub AND the banner?**
The gate logic in `app/(chef)/onboarding/page.tsx` checks both `onboarding_completed_at` and `onboarding_banner_dismissed_at`. What happens if one is set but not the other? Can the chef navigate freely per the PERMANENT rule in CLAUDE.md (no forced gates)?

**FC5. The tour system (tour-provider, tour-checklist, tour-spotlight, tour-shell) targets real DOM elements. After onboarding, do all tour targets actually exist on the pages they reference?**
Definition of Done requires every tour step to target a real element and fail closed if missing. Has anyone verified that the dashboard tour targets (`data-tour="..."` attributes) match the actual rendered DOM after a fresh onboarding?

**FC6. Does the demo data manager (`demo-data-manager.tsx`) create data that exercises every downstream system (events in all FSM states, ledger entries, recipes with ingredients, clients with dietary needs, at least one menu)?**
If demo data only creates a single draft event and one client, the chef can't explore 80% of the app. Does demo data create a realistic cross-section that lets a new chef see what a populated account looks like?

**FC7. When a chef skips onboarding entirely (clicks "Skip" or dismisses banner), do they hit any dead ends in the main app that assume onboarding was completed?**
Example: if pricing wasn't set in onboarding, does the quote builder crash or show "Set up pricing first"? If Gmail wasn't connected, does the email composer fail silently? Map every skipStep consequence.

**FC8. Does the archetype selector (`archetype-selector.tsx`) actually change anything downstream, or is it cosmetic?**
If a chef selects "Private Chef" vs "Caterer" vs "Personal Chef," does the app adapt (different default event types, different pricing templates, different dashboard widgets)? Or does archetype just set a column that nothing reads?

**FC9. The client import form (`client-import-form.tsx`) is available during onboarding. Does a CSV import during onboarding correctly create client records with tenant_id from the fresh session?**
Edge case: the chef JUST created their account. Their `tenantId` exists but may not have propagated to all caches. Does the import server action derive tenant_id from session (correct) or from a potentially stale cache?

**FC10. After onboarding, does the universal search index include the newly created data (first client, first event, first menu)?**
Universal search queries 12 entity types with tenant scoping. If a chef completes onboarding and immediately searches for their first client's name, does it appear? Or is there a cache/index delay?

---

## Domain 2: Client Portal Full Journey

> The client portal is what the chef's clients actually use. 36 pages. If the client experience is broken, the chef looks unprofessional. These questions test the full client journey from invitation to post-event.

**FC11. When a chef sends a client invitation email, does the token-based onboarding (`app/(client)/onboarding/[token]/page.tsx`) create a user record, assign the client role in `user_roles`, AND link the client to the correct chef's tenant?**
Trace: invitation email -> token click -> account creation -> role assignment -> tenant linking. At which step could this break? Does the client immediately see their events, or is there a race condition?

**FC12. Can a client view their event, approve a menu, sign a contract, and pay an invoice in a single uninterrupted flow without hitting a dead end?**
The event detail page has sub-pages: `approve-menu`, `choose-menu`, `contract`, `invoice`, `pay`, `proposal`, `payment-plan`. Are these all linked sequentially with clear CTAs? Or does the client have to navigate back to the event list and re-enter each sub-page?

**FC13. When a client submits dietary restrictions via the portal, does that data flow through to: (a) the event's dietary summary, (b) the recipe/menu allergen flags, (c) the shopping list, (d) the prep timeline allergen markers, (e) Remy's context?**
This is a 5-hop data chain. Dietary restrictions entered in the client portal must reach the chef's operational systems. Trace each hop. Where does the chain break?

**FC14. Does the client spending page (`my-spending/page.tsx`) show data derived from the ledger (correct) or from a separate client-facing balance column (potential drift)?**
Per architecture, financial state is derived from ledger entries. Does the client portal follow this rule, or does it read a stale `amount_paid` column?

**FC15. When a client joins the Hub (social circles), can they see circles created by their chef AND public circles from other chefs?**
The client Hub pages (`my-hub/`) exist alongside the public Hub pages (`hub/`). Is there a clear boundary? Can a client accidentally see another chef's private event details through a shared circle?

**FC16. Does the client RSVP/countdown page (`countdown/page.tsx`) work offline (PWA) and display correct timezone-adjusted dates?**
If a client opens the countdown on mobile without connectivity (cached PWA), does it show stale data, an error, or a graceful offline state? Does the countdown timer handle timezone differences between chef and client?

**FC17. When a client deletes their account (`my-profile/delete-account/page.tsx`), is ALL their data removed from: user_roles, client records, dietary submissions, messages, hub memberships, loyalty points, payment history references?**
GDPR compliance requires full deletion. But the ledger is immutable. How is the conflict resolved? Are ledger entries anonymized (client_name -> "Deleted Client") or retained with PII?

**FC18. Does the client chat (`my-chat/`) display messages in real-time via SSE, or does the client have to refresh?**
Chef-side uses SSE with `useSSE()` hook. Does the client portal wire up the same SSE connection? Or is it polling? Or is it static (load-once)?

**FC19. The proposal view (`proposal/[token]/page.tsx`) is public (token-gated, no auth). Can a leaked token allow a stranger to see the client's event details, pricing, and menu?**
Token-gated pages trade security for convenience. What's the token entropy? Is there a TTL? Can the token be invalidated after the client accepts?

**FC20. When a client redeems loyalty rewards (`my-rewards/`), does the redemption create a ledger entry (discount applied) that the chef's financial summary reflects?**
Reward redemption is a financial event. If it doesn't hit the ledger, the chef's profit calculations are wrong.

---

## Domain 3: Public Surfaces Cohesion (World-Facing)

> 63 public pages face the internet. SEO, booking, chef profiles, ingredient encyclopedia, directory. These are the front door. These questions test whether public surfaces accurately reflect internal state.

**FC21. When a chef updates their profile (name, photo, services, pricing), does the public chef profile page (`chef/[slug]/`) reflect the change immediately, or is it cached?**
If the public profile is statically generated or cached, a chef could update their pricing but the public page shows old rates. What's the cache strategy? Is `revalidatePath` called on profile update?

**FC22. Does the public booking page (`chef/[slug]/inquire/`) create an inquiry that appears in the chef's inquiry list AND triggers the `inquiry-received` email to the chef AND the `new-inquiry-chef` notification?**
Trace: public form submit -> inquiry record created -> chef notified (email + SSE + push). How many of these channels actually fire? Is the inquiry tenant-scoped correctly?

**FC23. The ingredient encyclopedia (`ingredients/`, `ingredient/[id]/`) has 4,000+ pages. Does each page pull live data from the pricing database, or is it statically generated with stale prices?**
If prices come from OpenClaw's `prices.db` on the Pi, and the Pi updates prices daily, do the public ingredient pages reflect today's prices or last-build prices?

**FC24. The discover page (`discover/[[...path]]/`) is the consumer-facing directory. Does it show ONLY operators who have opted into public listing, or could it expose chefs who haven't configured their public profile?**
A chef who signed up but never completed onboarding should NOT appear in the public directory. What's the visibility gate? Is it `public_profile_enabled`, `onboarding_completed_at`, or something else?

**FC25. Do all 63 public pages have correct OG metadata (title, description, image) for social sharing?**
A shared link to a chef profile, ingredient page, or event page should show a rich preview on social media. Are `generateMetadata` functions implemented on all public pages? Are fallback images configured?

**FC26. The embed widget (`public/embed/chefflow-widget.js`) renders on third-party sites. Does it respect the chef's current availability, pricing, and service types, or does it use hardcoded/stale data?**
The widget script is vanilla JS. How does it fetch live data from the ChefFlow API? Is there a public API endpoint? Does it handle CORS correctly for any origin?

**FC27. Token-gated public pages (proposal, review, feedback, survey, tip, availability, worksheet) number 13+. Do ALL of them validate token expiry, prevent replay after completion, and handle invalid tokens gracefully?**
A single token-gated page without expiry validation = permanent public access to client data. Audit all 13+ token-gated routes for consistent token validation.

**FC28. Does the gift card purchase flow (`chef/[slug]/gift-cards/`) create a Stripe checkout, email the recipient, AND create a redeemable balance in the chef's system?**
Three systems must coordinate: Stripe (payment), email (delivery), ledger (credit). If any one fails, the gift card is broken. Is there error handling for partial completion?

**FC29. The `/nearby` directory is hidden (per MEMORY.md). But the route still exists. Can someone who knows the URL access it and see unverified operator data?**
Hidden from nav is not the same as disabled. Is there a redirect, a 404, or does it render with bad data?

**FC30. Do public pages respect the "No OpenClaw in public surfaces" rule?**
Per CLAUDE.md, "OpenClaw" must never appear in user-facing surfaces. Grep all 63 public page files for "OpenClaw", "openclaw", or "open_claw" in rendered text (not imports/comments).

---

## Domain 4: Voluntary Contribution Flow (Only Revenue Model)

> This is the ONLY revenue stream. $29/month voluntary supporter contribution via Stripe. If this breaks, there is zero income. These questions test the complete payment lifecycle.

**FC31. Can a chef navigate to `/settings/billing`, click "Support ChefFlow," complete Stripe checkout, and have their `subscription_status` update to `active` without manual intervention?**
End-to-end: billing page -> Stripe checkout session creation -> Stripe redirect -> webhook fires -> status updates in DB -> UI reflects new status. Trace every step.

**FC32. When a supporter's card is declined on renewal, does the system: (a) update status to `past_due`, (b) send a notification to the chef, (c) NOT lock any features (all features are free)?**
Per monetization model, no features are locked. A failed payment should degrade supporter badges/perks only, never functionality.

**FC33. Does `getSubscriptionStatus()` correctly handle all Stripe subscription states: `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `incomplete`, `incomplete_expired`, `paused`?**
Stripe sends many states. If ChefFlow only handles `active` and `trialing`, any other state could cause undefined behavior in the UI.

**FC34. When a supporter cancels their subscription, does the Stripe webhook fire `customer.subscription.deleted`, and does ChefFlow update the status AND retain access until the billing period ends?**
Immediate cancellation vs end-of-period cancellation are different. Does ChefFlow handle both?

**FC35. Are `grandfathered` users (existing chefs before the contribution model) permanently exempt from supporter prompts?**
Per the code: `subscription_status = 'grandfathered'` should never see an upgrade banner. But does the `getSubscriptionStatus` function handle this, and is the status set correctly during migration?

**FC36. Does the billing page show a clear value proposition for the voluntary contribution, or does it look like a paywall that contradicts the "all features free" promise?**
UX question with real consequences: if the billing page implies features will be locked, chefs may feel deceived when they discover everything is free. Does the copy explicitly say "voluntary"?

**FC37. If Stripe is unreachable (outage), does the billing page show an error state, or does it render with broken checkout buttons?**
Stripe outages happen. The billing page should degrade gracefully, not show a blank page or non-functional CTAs.

**FC38. Is there any code path where `requirePro('some-slug')` actually blocks a feature for a non-supporter?**
The architecture says unknown slugs degrade to auth-only. But what about KNOWN slugs in `feature-classification.ts`? If someone adds a paid feature classification and a matching `requirePro` call, would it silently start blocking free users?

**FC39. Does the voluntary contribution appear in the chef's OWN financial summary (as a business expense), or is it invisible?**
A chef paying $29/month to ChefFlow should see it in their expense tracking if they track software subscriptions. Does the system auto-log it, or is the chef unaware of their own recurring payment?

**FC40. Is there a Stripe test mode toggle for development, and is production ABSOLUTELY using live keys?**
Stripe test mode in production = zero revenue. One wrong environment variable = complete revenue loss with no error.

---

## Domain 5: Multi-Event Week Operations (Chef Daily Reality)

> A working chef has 3-5 events per week. These questions test whether the app handles the REAL daily workflow of juggling multiple events simultaneously.

**FC41. When a chef has 3 events in the same week, does the shopping list consolidation (`generateShoppingList` with date range) correctly merge identical ingredients across events with different guest counts?**
Event A: risotto for 8. Event B: risotto for 12. Same recipe, different multipliers. Does the consolidated list show one line with quantity for 20 servings, or two separate lines?

**FC42. Does the consolidated shopping list subtract on-hand inventory ONCE (globally), or does it subtract per-event (potentially double-counting available stock)?**
If the chef has 2 lbs of butter in inventory, and Event A needs 1 lb and Event B needs 1 lb, does the list show "buy 0 lbs" (correct global subtraction) or "buy 0 lbs for A, buy 0 lbs for B" (correct but confusing)?

**FC43. When two events on the same day have overlapping prep windows (both need oven at 2 PM), does any surface flag the conflict?**
Prep blocks exist per-event. Calendar shows events. But does any system cross-reference prep blocks across events to detect resource conflicts (oven, fridge space, chef time)?

**FC44. Does the dashboard prep prompt system (`getAllPrepPrompts`) prioritize by urgency across ALL upcoming events, or does it only show prompts for the next event?**
A chef with Event A tomorrow and Event B in 3 days needs to see "Event B: start marinating TODAY" alongside "Event A: plate setup tomorrow." Does the prompt system merge and sort by actual deadline?

**FC45. When a chef completes shopping for a consolidated list, can they mark items as purchased per-event or only globally?**
If butter was on the list for both events, and the chef buys it, does "mark purchased" apply to both events' ingredient tracking? Or does the chef have to mark it twice?

**FC46. Does the calendar view show prep blocks, events, grocery deadlines, and payment due dates in a single unified view?**
Five separate systems produce calendar items. Are they all rendered on the same calendar surface? Can a chef see "Monday: prep for Event A, grocery run for Event B, payment due for Event C" in one glance?

**FC47. When one event in a multi-event week is cancelled, does the shopping list automatically recalculate, and do already-purchased ingredients get flagged as surplus?**
Cancellation mid-week is real. The shopping list should shrink. Purchased items for the cancelled event should surface as available inventory for remaining events.

**FC48. Does the weekly/daily view on the dashboard show a combined event count, total guests, total revenue expected, and prep hours remaining across all events?**
Aggregate operational intelligence for the week. Not per-event stats, but "this week: 4 events, 47 guests, $8,200 expected, 16 prep hours remaining." Does this surface exist?

**FC49. When two events use the same recipe but one chef modifies the recipe between events, does the earlier event retain its original recipe snapshot, or does it retroactively change?**
Recipe versioning matters for costing. If the chef changes an ingredient after Event A's shopping is done but before Event B, Event A's cost should not change.

**FC50. Can a chef drag-and-drop or bulk-move prep blocks between days when juggling multiple events?**
Operational flexibility. A chef realizes Monday is overloaded and wants to move Event B's prep to Tuesday. Is this a single action, or does the chef have to delete and recreate blocks?

---

## Domain 6: Email System End-to-End (Communication Backbone)

> 90+ email templates. Resend as provider. Suppression system. Sequences. This is how the chef communicates with clients. These questions test whether the email system is a reliable communication backbone.

**FC51. Of the 90+ email templates, how many are actually triggered by production code paths (server actions, cron jobs, webhooks)?**
Templates that exist but are never sent are dead code. Templates that are sent but don't exist cause runtime errors. Map: template file -> trigger path. Flag orphans.

**FC52. Does the email suppression system (`email_suppressions` table) prevent sending to: (a) hard bounces, (b) unsubscribed addresses, (c) complaint addresses? And does it check BEFORE calling Resend, not after?**
Sending to a hard bounce costs sender reputation. The suppression check must be synchronous and pre-send. Is it?

**FC53. When a client unsubscribes via `/unsubscribe`, does the suppression persist across ALL email types (transactional, marketing, notifications), or only marketing?**
Transactional emails (payment confirmations, contract signatures) should probably still send. But marketing (re-engagement, campaigns) must stop. Is there a distinction in the suppression system?

**FC54. Does the Gmail sync (`gmail_sync_status` table, `lib/integrations/gmail/`) correctly thread ChefFlow-sent emails into Gmail conversations?**
If a chef sends an email from ChefFlow and the client replies in Gmail, does the reply appear in ChefFlow? Does the original ChefFlow email appear in Gmail's sent folder? Is the `Message-ID` / `In-Reply-To` header chain maintained?

**FC55. When a sequence is running (multi-step email campaign), and the client replies or books an event mid-sequence, does the sequence automatically stop?**
Sending a "are you still interested?" email to a client who just booked is embarrassing. Does `sequence-actions.ts` check for conversion events before sending the next step?

**FC56. Do all chef-to-client emails use the chef's configured sender name and reply-to address, not "ChefFlow" or "noreply@"?**
Per memory: email sender name is "CheFlow" in config. But individual chef emails should come from the chef's identity. Does the Resend send call use `from: chefName <noreply@cheflowhq.com>` with `reply-to: chef@email.com`?

**FC57. When the Resend API is down (circuit breaker tripped), are emails queued for retry, or permanently lost?**
The circuit breaker in `send.ts` prevents hammering a down service. But what happens to the emails that couldn't send? Is there a retry queue, or does the chef never know the email failed?

**FC58. Does the daily report email (`daily-report` template) aggregate data from ALL systems: upcoming events, overdue invoices, prep deadlines, new inquiries, unread messages, and expiring quotes?**
The daily report is the chef's morning briefing. If it only covers events and invoices, the chef misses prep deadlines and new inquiries.

**FC59. Are email template components server-rendered (React Email) or client-rendered? Do they handle missing data gracefully (e.g., event with no menu yet, client with no dietary data)?**
A template that crashes on null menu data would prevent ALL emails from sending for that event. Every template must handle partial data.

**FC60. Does the developer alert system (`developer-alerts.ts`, `developer-digest` template) fire on: (a) server action errors, (b) Stripe webhook failures, (c) cron job failures, (d) AI runtime errors?**
The developer needs to know when things break. If alerts only cover one failure type, other failures go unnoticed.

---

## Domain 7: Settings Propagation (Config Actually Works?)

> 71 settings pages. The critical question: does changing a setting actually change behavior, or are settings cosmetic?

**FC61. When a chef changes their cancellation policy in `/settings/contracts`, does the next generated contract use the new policy text?**
Contract generation (`lib/ai/contract-generator.ts`) must read from the chef's current settings, not a hardcoded template. Does it?

**FC62. When a chef changes notification preferences in `/settings/notifications`, does the notification system (`channel-router.ts`) respect the new preferences on the NEXT notification?**
The tier config maps 80+ actions to channels. But per-user preferences from `resolve-preferences.ts` should override. Does changing "email only" to "push + email" take effect immediately?

**FC63. When a chef enables/disables a module in `/settings/modules`, do the corresponding nav items, dashboard widgets, and features actually appear/disappear?**
Module toggles should gate feature visibility. If a chef disables "Staff Management," do staff-related nav items, dashboard widgets, and pages become inaccessible? Or do module toggles only affect the settings page itself?

**FC64. When a chef updates their service area, availability, or pricing in settings, does the public chef profile and embed widget reflect the change?**
Three systems must sync: settings DB -> public profile -> embed widget. If any cache layer is stale, the public-facing info is wrong.

**FC65. Does changing the dashboard layout in `/settings/dashboard` actually rearrange dashboard widgets, or is the settings page a no-op?**
Dashboard customization settings exist. But does the dashboard component read these settings and conditionally render widgets? Or is the dashboard layout hardcoded?

**FC66. When a chef configures automations in `/settings/automations`, do those automations actually fire on the configured triggers?**
Automation rules (auto-send follow-up after X days, auto-change status on payment) must be wired to the event system. Are they? Or is the automations page a UI without a backend?

**FC67. Does changing the print settings in `/settings/print` affect PDF generation for menus, contracts, and prep sheets?**
Print settings (logo, header, font, color) should propagate to all generated PDFs. Does the PDF generation system read from chef settings?

**FC68. When a chef updates their Stripe Connect settings, is the change validated against Stripe's API before saving?**
Saving invalid Stripe credentials could break the entire payment flow. Is there a verification step?

**FC69. When a chef changes their timezone in profile settings, do ALL time-dependent systems (events, calendar, prep deadlines, cron notifications, email scheduling) use the new timezone?**
Timezone bugs are documented (RC1 in chaos question set). This question extends: does a timezone CHANGE propagate everywhere, or do some systems cache the old timezone?

**FC70. Is there a settings change audit log? Can a chef see what they changed and when?**
If a setting change breaks something, the chef needs to know what changed. Does `activity_log` capture settings mutations?

---

## Domain 8: Staff Portal and Permissions

> Staff portal has 6 pages. RBAC engine has 19 domains and 5 actions. These questions test whether permissions are enforced, not just defined.

**FC71. Does the staff dashboard (`app/(staff)/staff-dashboard/`) show ONLY events where the staff member is assigned, or all tenant events?**
Staff should see their assignments, not the chef's full calendar. Does the query filter by `staff_assignments` or by `tenant_id`?

**FC72. Can a `team_member` role access any of the 71 settings pages, or are settings correctly restricted to `tenant_owner` and `manager`?**
Staff accessing billing, Stripe, or contract settings would be a security issue. Does `route-policy.ts` enforce role-based access on settings routes?

**FC73. When a staff member clocks in via `staff-time/`, does the time entry link to a specific event and appear in the chef's labor cost calculations?**
Time tracking must flow into financials. If clock entries are isolated from event costing, labor costs are invisible.

**FC74. Does `requirePermission('recipes', 'view')` on the staff recipes page actually enforce read-only, or can a staff member with `view` permission accidentally trigger a mutation?**
Read-only pages that import mutation server actions could expose edit capabilities if buttons aren't conditionally rendered based on permission checks.

**FC75. When a chef creates a staff member account, does the staff member receive an invitation email with working credentials?**
Staff onboarding flow: chef creates staff record -> system creates user account -> sends invitation email -> staff clicks link -> account activated. Does this chain complete?

**FC76. Can a staff member access the kiosk mode without a separate device pairing?**
Staff at an event might need to switch between their portal (tasks, recipes) and kiosk mode (order register, check-in). Is this a seamless transition or two separate authentication flows?

**FC77. Does the permission override system (`user_permission_overrides` table) correctly MERGE with role defaults, not REPLACE them?**
If a chef grants a staff member extra `financial.view` permission, does the staff member retain their default `recipes.view` permission? Or does the override wipe the defaults?

**FC78. When a staff member is deactivated, are their active sessions invalidated immediately, or can they continue using the app until the JWT expires?**
Immediate deactivation matters when a staff member is fired. Stale JWTs could allow continued access.

**FC79. Does Remy have any awareness of staff members? Can a chef ask "who's working the Henderson event?" and get an answer?**
The Remy orchestrator has `staff.availability`, `staff.briefing`, `staff.clock_summary`, `staff.performance`, `staff.labor_dashboard`. Are these wired to actual data, or are they stubs?

**FC80. Can two staff members assigned to the same event see each other's station assignments and prep blocks?**
Event-level collaboration between staff requires cross-staff visibility. If each staff member only sees their own data, coordination fails.

---

## Domain 9: Search System Completeness

> Universal search covers 12 entity types. Command palette adds quick-create. These questions test whether search is a reliable navigation tool.

**FC81. Does universal search return results for ALL 12 entity types, or are some entity queries silently failing?**
12 parallel DB queries. If one throws (schema change, missing column), does it fail that entity silently and return the other 11? Or does the whole search fail?

**FC82. Are search results tenant-scoped for ALL entity types, including messages and client notes?**
Messages and notes contain sensitive data. If the tenant filter is missing on any one query, a chef could see another chef's messages.

**FC83. Does the command palette's quick-create (New Event, New Menu, etc.) pre-populate with the search query?**
If a chef searches "Henderson" and then clicks "New Event," does the event form pre-fill "Henderson" as the occasion or client? This is a UX acceleration that separates good search from basic search.

**FC84. Does search index the content of documents stored in the filesystem (`./storage/`)?**
Documents (contracts, PDFs, photos) are stored as files. Universal search queries DB columns only. Can a chef search for text inside a contract PDF? If not, is this a known limitation or a gap?

**FC85. When a chef creates a new entity (client, event, recipe), is it searchable immediately, or is there a delay?**
If search uses a materialized view or cache, new entities might not appear until the next refresh. Real-time searchability matters for workflow continuity.

**FC86. Does the "/" keyboard shortcut to open search work on all pages, including the client portal, staff portal, and kiosk?**
Search should be accessible everywhere. If the keyboard shortcut is only wired to the chef layout, other portals lack quick search.

**FC87. Does search handle partial matches, typos, and plurals?**
Searching "tomato" should find "tomatoes." Searching "hndrsn" should probably find "Henderson." Does the search use `ILIKE` with wildcards, or exact match? Is there fuzzy matching?

**FC88. Are deleted/archived entities excluded from search results?**
If a chef archives a client or cancels an event, it should not appear in active search results. Does the search query filter by status/archived flag?

**FC89. Does the recent search history (`search-recents.ts`) persist across sessions and sync across devices?**
If recents are stored in localStorage, they're device-specific and lost on cache clear. If stored in DB, they persist. Which is it?

**FC90. When search returns a mix of entity types, is the ordering useful (recent first? relevance? type-grouped?)?**
8 results per entity type = potentially 96 results. How are they presented? If alphabetical, the chef has to scan everything. If recent-first across types, the most relevant items surface.

---

## Domain 10: Import/Export Data Round-Trip

> CSV import, brain dump, GDPR export, CPA export, per-event export. These questions test whether data survives a round-trip and whether exports are complete.

**FC91. Does GDPR export (`exportMyData`) include ALL 18+ table groups, and does the exported JSON/CSV match the current schema?**
Schema changes (new columns, renamed tables) could cause the export to miss data. Is the export function updated when migrations run?

**FC92. Can a chef export their data via GDPR, delete their account, create a new account, and import the exported data to restore their business?**
True data portability. The export should be importable. Is there an import-from-export function? If not, is the export format documented enough for manual reimport?

**FC93. Does the CSV client import handle: duplicate detection (same email), partial data (name only, no email), and field mapping (column name variations)?**
Real CSV files are messy. Import must be resilient. Does it merge duplicates, reject them, or create duplicates?

**FC94. When the brain dump parser (`parse-brain-dump.ts`) fails to reach Ollama, do the heuristic fallbacks (`parseClientsHeuristically`, `parseRecipesHeuristically`) produce usable results?**
The heuristic fallback is the offline safety net. Does it correctly parse "John Smith, gluten free, 8 guests, May 15" into a structured client record?

**FC95. Does the CPA export package generate valid CSV files that actually import into QuickBooks, Xero, or a generic spreadsheet?**
Export is useless if the format is wrong. Has the CSV format been validated against at least one real accounting tool's import spec?

**FC96. When exporting per-event financials (`exportEventCSV`), does the export include: all ledger entries, expenses, payments, refunds, tips, and the final profit/loss?**
A partial financial export could cause tax filing errors. Every financial record for the event must be included.

**FC97. Does the bulk menu import correctly link imported dishes to existing recipes by name matching, or does it create orphan dishes?**
Menu import must match dish names to the recipe library. If "Mushroom Risotto" exists as a recipe, does the import link the dish, or create a dish with no recipe reference?

**FC98. Is there input validation on ALL import paths preventing: (a) SQL injection via CSV fields, (b) XSS via imported text, (c) oversized files, (d) wrong file types?**
Import is a system boundary (user input). Every import must sanitize. One missing validation = a vulnerability.

**FC99. Does the data request page (`/data-request`) actually trigger the GDPR export, or is it a form that sends an email to the developer?**
GDPR requires automated data access. If `/data-request` just sends an email, it's non-compliant for self-serve.

**FC100. When a chef imports expenses via CSV, do the imported expenses correctly link to events (by event name/date matching) and appear in both the expense list AND event money tabs?**
Expense import must resolve event references. If expenses are imported as orphans (no event link), the per-event financial view is incomplete.

---

## Domain 11: Kiosk and Tablet Surfaces

> Kiosk is a real device mode for events. Order register, inquiry capture, staff PIN. These questions test whether kiosk mode works as a standalone device.

**FC101. Does the kiosk pairing flow (`/kiosk/pair`) generate a secure, time-limited pairing code that links the device to a specific chef's tenant?**
An expired or reusable pairing code could let an unauthorized device access the chef's data.

**FC102. Can the kiosk operate offline using the offline queue (`offline-queue.ts`, `offline-order-queue.ts`), and do queued transactions sync correctly when connectivity returns?**
Events happen in venues with poor WiFi. Offline mode is critical. Do queued orders, payments, and inquiries sync without duplication or loss?

**FC103. Does the staff PIN entry (`staff-pin-entry.tsx`) enforce PIN uniqueness per tenant, or could two staff members have the same PIN?**
Same PIN = wrong staff member gets attributed for transactions. Is PIN uniqueness enforced at the DB level?

**FC104. When the kiosk registers an order via the order register, does it create: (a) a commerce sale record, (b) a ledger entry, (c) a receipt, (d) inventory deduction?**
Four systems must fire on a kiosk sale. Missing any one means financial drift, missing receipts, or phantom inventory.

**FC105. Does the kiosk idle reset provider (`idle-reset-provider.tsx`) clear sensitive data (previous order, client info) after timeout?**
A kiosk left unattended at an event could display the previous customer's order details to the next person.

**FC106. Can a kiosk device capture an inquiry from a potential client at an event, and does that inquiry appear in the chef's main inquiry pipeline?**
The kiosk has `kiosk-inquiry-form.tsx` and an `/api/kiosk/inquiry` endpoint. Does the captured inquiry create a real inquiry record that triggers the same notification chain as a web inquiry?

**FC107. Does the kiosk heartbeat (`heartbeat-provider.tsx`, `/api/kiosk/heartbeat`) alert the chef when a device goes offline mid-event?**
A dead kiosk at a 100-guest event is an emergency. The chef needs to know immediately, not discover it when a guest can't order.

**FC108. Is the kiosk catalog (`/api/kiosk/order/catalog`) filtered to only show menu items available for the current event, or does it show the chef's entire product catalog?**
Showing items not on tonight's menu confuses guests and creates orders the kitchen can't fulfill.

**FC109. Does the cash drawer API (`/api/kiosk/order/drawer`) track opening float, cash received, change given, and close-out reconciliation?**
Cash handling without reconciliation is a financial black hole. Does the drawer track the full cash lifecycle?

**FC110. When the kiosk is in `disabled` state (`/kiosk/disabled`), can a manager override it, or is it permanently locked until the chef enables it from their main portal?**
A disabled kiosk at a live event needs emergency re-activation. Is there a manager override PIN?

---

## Domain 12: AI System Coherence (Remy Holistic)

> Remy has 40+ task types, 100+ intelligence actions, memory, guardrails, abuse detection, and personality. These questions test whether Remy as a WHOLE SYSTEM is coherent, not just individual capabilities.

**FC111. Of Remy's 40+ task types, how many have fully wired execute functions in the orchestrator vs stubs that return placeholder data?**
A task type in the intent parser that routes to a stub means the chef gets a confident-sounding wrong answer. Map: task type -> execute function -> real data or stub.

**FC112. Does Remy's context loader (`remy-context.ts`) hit the 5-minute cache on EVERY conversation turn, or does it refresh when the chef mutates data mid-conversation?**
Chef asks Remy about upcoming events. Remy loads context (cached). Chef creates a new event in another tab. Chef asks Remy again. Does Remy see the new event? Or does the cache serve stale data for up to 5 minutes?

**FC113. When Remy drafts an email (11 draft generators), does it follow the email voice rules from memory: no AI formatting, no bold headers, no negative framing, natural and short?**
Remy's drafts are the chef's voice to clients. If drafts sound like AI, clients notice. Are the few-shot examples in `remy-personality.ts` calibrated to the chef's actual voice?

**FC114. Does Remy's Tier 2 (draft/preview) approval flow actually show the chef a preview before executing, or does it auto-execute with a "done" message?**
Tier 2 is supposed to be draft-then-approve. If the orchestrator executes immediately, the chef loses control over what Remy does on their behalf.

**FC115. Can Remy access and reason about data from ALL major systems: events, clients, recipes, menus, finances, prep, shopping, staff, calendar, inquiries, documents, analytics?**
Remy's context loader and task types suggest broad coverage. But are there blind spots? Can Remy answer "what's my most profitable event type?" (requires cross-referencing events + financials + menu costs)? Or does it only handle single-domain queries?

**FC116. Does Remy's rate limiter (`remy-guardrails.ts`) prevent a single user from overwhelming the Ollama runtime, and does it degrade gracefully (queue, not crash)?**
If a chef rapidly sends 20 messages, does Remy queue them, reject excess, or crash the Ollama connection for all users?

**FC117. When Remy detects abuse (`remy-abuse-actions.ts`), does it: (a) log the attempt, (b) block the specific message, (c) alert the developer, (d) NOT leak the system prompt in its refusal?**
Prompt injection attempts are real. Remy's refusal must be safe (no system prompt leak) and logged.

**FC118. Does Remy's memory system (`remy-memory-actions.ts`) persist preferences across conversations, and does it respect deletion when a chef says "forget that"?**
Memory persistence means Remy gets smarter over time. But deletion must be real (GDPR). Is memory stored in the DB with tenant scoping? Can it be fully wiped?

**FC119. When Remy navigates the chef to a page (using `NAV_ROUTE_MAP`), does the route map include ALL navigable pages in the app, or is it a subset?**
71 settings pages, 36+ chef pages. If `NAV_ROUTE_MAP` only covers 20 routes, Remy can't navigate to 75% of the app. What's the coverage?

**FC120. Does Remy integrate with the completion contract engine? Can a chef ask "is my Henderson dinner ready?" and get the deterministic completion result, not an AI guess?**
The completion contract is the source of truth for event readiness. If Remy bypasses it and uses AI judgment instead, it could say "looks ready" when the completion engine says "missing 3 items."

---

## Cross-Domain Integrity (The Connections Between Domains)

> These 10 bonus questions test connections BETWEEN the 12 domains above. These are the rocks most likely to be unturned because they span boundaries nobody owns.

**FC121. Onboarding -> Client Portal: When a chef completes onboarding and sends their first client invitation, does the client receive a working portal with the chef's branding (logo, colors, name)?**
Two domains must coordinate: onboarding sets up the chef profile, client portal reads it. If the public profile isn't configured during onboarding, the client portal may show generic branding.

**FC122. Settings -> Email: When a chef updates their email signature or logo in settings, does the next email sent use the new signature/logo, or does the email template cache the old one?**
Settings and email templates must be in sync. If templates pre-render with the old logo, the chef's brand is inconsistent.

**FC123. Client Portal -> Kiosk: When a client who previously RSVP'd via the portal arrives at an event with a kiosk, does the kiosk recognize them (by email, by name)?**
Two input surfaces for the same guest. If the kiosk doesn't cross-reference portal RSVPs, the chef has duplicate guest records.

**FC124. Search -> Import: After a CSV import of 50 clients, are all 50 immediately searchable, or does the chef have to wait?**
Import and search must be in sync. Bulk import followed by search should find all imported records.

**FC125. Staff Portal -> Kiosk: Can a staff member switch between their task view (staff portal) and the order register (kiosk) on the same device without re-authenticating?**
Real scenario: staff member checks their prep tasks, then walks to the register. Two apps, one device, one person.

**FC126. Email -> Client Portal: When a client clicks a link in an email (e.g., "View your menu"), does the link go to the authenticated portal or a token-gated public page?**
If the link requires auth and the client isn't logged in, they hit a login wall. If token-gated, they bypass auth but with limited functionality. Which is it, and is it consistent across all email templates?

**FC127. Multi-Event -> Remy: Can a chef ask Remy "what do I need to do this week?" and get an aggregated answer spanning all events, prep deadlines, shopping needs, and overdue invoices?**
This requires Remy to cross-reference 5+ systems simultaneously. Is the context loader rich enough?

**FC128. Public Surfaces -> Onboarding: When a potential chef visits the public site, clicks "Sign Up," and completes registration, is the transition from public site to onboarding wizard seamless (no dead page, no stale redirect)?**
The public-to-private boundary is the growth funnel. A broken transition = lost user.

**FC129. Import -> Financials: When a chef imports historical expenses via CSV, do the imported expenses affect the current year's tax calculations, profit/loss statements, and CPA export?**
Historical data import must integrate with the financial system. If imported expenses are isolated from financial views, the chef's tax prep is incomplete.

**FC130. Voluntary Contribution -> Settings -> Remy: Is there ANY behavioral difference in the app between a supporter and a non-supporter? If Remy, settings, or any feature checks subscription status, document exactly what changes.**
The promise is "all features free." This question audits the ENTIRE codebase for subscription status checks that could violate that promise.

---

## Appendix: Scoring Template

| Domain                    | Q Range     | PASS | PARTIAL | FAIL | N/A | Gaps |
| ------------------------- | ----------- | ---- | ------- | ---- | --- | ---- |
| 1. Onboarding             | FC1-FC10    |      |         |      |     |      |
| 2. Client Portal          | FC11-FC20   |      |         |      |     |      |
| 3. Public Surfaces        | FC21-FC30   |      |         |      |     |      |
| 4. Voluntary Contribution | FC31-FC40   |      |         |      |     |      |
| 5. Multi-Event Ops        | FC41-FC50   |      |         |      |     |      |
| 6. Email System           | FC51-FC60   |      |         |      |     |      |
| 7. Settings Propagation   | FC61-FC70   |      |         |      |     |      |
| 8. Staff Permissions      | FC71-FC80   |      |         |      |     |      |
| 9. Search                 | FC81-FC90   |      |         |      |     |      |
| 10. Import/Export         | FC91-FC100  |      |         |      |     |      |
| 11. Kiosk/Tablet          | FC101-FC110 |      |         |      |     |      |
| 12. AI Coherence          | FC111-FC120 |      |         |      |     |      |
| Cross-Domain              | FC121-FC130 |      |         |      |     |      |
| **TOTAL**                 | **130**     |      |         |      |     |      |

---

## Appendix: Prior Question Sets (Already Answered)

For reference, these domains have been thoroughly interrogated in prior sets and do NOT need re-asking:

- **Core system integrity:** 75Q (system-integrity-question-set.md)
- **Prep timeline:** 128Q across 5 sets + 123-item cohesion checklist
- **Chef-to-chef network:** 83Q across 3 phases
- **Financial pipeline:** 70Q across 4 interrogation rounds + commerce interrogation + financial question set
- **Dinner circles / Hub:** 82Q interrogation + 40Q community circles question set
- **Scheduled jobs:** 15Q across 29 cron routes
- **Ingredient lifecycle:** 20Q (6 BUILT, 14 SPEC)
- **Stress test:** 100Q (24/24 green on automated runs)

**Total prior coverage:** ~613 questions asked and answered.
**This set adds:** 130 new questions across 12 previously uninterrogated domains.
**Combined total:** ~743 questions forcing ChefFlow into a fully specified state.
