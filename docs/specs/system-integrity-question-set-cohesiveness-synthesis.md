# System Integrity Question Set: Full Cohesiveness Synthesis

> **Purpose:** Expose every unbuilt bridge between existing working systems. Prior question sets tested domains individually or across 2-3 boundaries. This set tests the connections that SHOULD exist but DON'T, where System A and System B both work but have no bridge. Every gap here means a user does manual work the system could automate, or sees incomplete data when complete data exists elsewhere.
>
> **Origin:** Synthesized from 4 parallel research agents (backlog miner, question set miner, surface mapper, orphan finder) plus direct codebase exploration. Cross-referenced with 535+ MemPalace conversations, 60+ existing question sets, project-map, and product blueprint.
>
> **Scope:** 80 questions across 13 domains. Every question targets a real cohesiveness failure that affects ALL users unless marked [ADMIN-ONLY] or [SPECIFIC]. Ordered by leverage: highest-impact gaps first.
>
> **How to use:** Answer each question with CONNECTED (bridge exists, cite file:line), PARTIAL (data exists but pipeline incomplete), DISCONNECTED (both systems work, no bridge), or N/A. Every DISCONNECTED gets a gap number (CS-G1, CS-G2...).
>
> **Relationship to prior sets:** This is the SYNTHESIS layer. Prior sets found domain-specific issues. This set finds the spaces BETWEEN domains that no single-domain audit would catch. If a question overlaps a prior set, it's because the prior set found it within a domain but didn't trace the bridge to the other side.

---

## Domain 1: Service Lifecycle Automation (Inquiry to Retention)

> The service lifecycle blueprint defines 10 stages. The app has excellent tools at individual stages but nearly zero automatic flow between them. Overall lifecycle automation: ~15% fully automated, ~40% partially supported. These questions target the 60% that's completely manual.

**CS1. When an event transitions to `completed`, does the system auto-trigger the post-event sequence (AAR form, thank-you email, review request, tip link)?**
Today: event FSM handles `completed` state transition. AAR generator exists (`lib/ai/aar-generator.ts`). Thank-you email template exists (`lib/email/templates/thank-you.tsx`). Review request exists (`app/(public)/review/[token]/page.tsx`). Tip flow exists (`app/(public)/tip/[token]/page.tsx`). But does anything wire completion -> these actions? Or does the chef manually trigger each one? Trace `event_transitions` insert for status=completed -> downstream side effects.

**CS2. When a client submits post-event feedback via the survey system, does that feedback flow back to improve future menus for that client?**
Survey data lands in `survey_responses`. Client dietary preferences and dish ratings are captured. Menu builder reads from recipes and menu_items. Does the menu builder surface "this client rated X dish 5/5 last time" or "this client disliked Y"? Or is survey data write-only from the menu's perspective?

**CS3. When AAR data reveals a repeated issue (e.g., "ran out of appetizers" across 3 events), does the system auto-promote that issue to a pre-service checklist item?**
AAR data is generated post-event. Pre-service checklists exist. But does the system learn from repeated failures? Or does the chef have to manually remember and manually add checklist items? This is the learning loop that compounds chef quality over time.

**CS4. After an event is completed and paid, does the system auto-detect the client's lifetime value tier and adjust their priority in future inquiry triage?**
`lifetime_value_cents` exists on clients. Inquiry smart-fill parses incoming inquiries. But does inquiry ranking factor in client LTV? A returning client who's spent $15,000 should surface higher than a cold lead. Currently `estimatedValueCents` in inquiry parsing uses budget from the inquiry text, not historical LTV.

**CS5. When a client hasn't booked in 6+ months, does the dormancy detection system trigger a re-engagement sequence with personalized content (their favorite dishes, seasonal menus)?**
Dormancy nudge was built this session (chef-level, `chefs.last_login_at`). But CLIENT dormancy is different. Does the system track when a client last booked, and trigger win-back outreach with context from their booking history? Or is client re-engagement entirely manual?

**CS6. When a new inquiry arrives for a date the chef already has an event, does the system surface the conflict at triage time (before the chef reads the inquiry)?**
Date availability check was built this session for the public inquiry form (`checkPublicDateAvailability`). But does the CHEF's inquiry dashboard show a conflict indicator? When a chef opens their inquiry list, can they see at a glance which inquiries conflict with existing bookings?

**CS7. Does the referral partner who sent an inquiry get notified when that inquiry converts to a booking?**
Partners have referral tracking. Inquiry has `source` and `referral_partner_id`. Event conversion exists. But does conversion trigger a notification/email to the referring partner? This is critical for partner relationship maintenance.

---

## Domain 2: Calendar Integration Gaps

> Hub/Circles exist. Calendar exists. They share zero code. Google Calendar sync is stub-only. iCal export exists but is one-way. These questions expose every calendar isolation failure.

**CS8. When an event date changes, does the iCal feed (`/api/feeds/calendar/[token]`) serve the updated date, or does it cache the old one?**
The calendar feed generates iCal on request. Events store dates. But if the chef changes an event date after a client has subscribed to the feed, does the feed reflect the change immediately? Or is there a caching layer that serves stale dates?

**CS9. Does a dinner circle event appear on the chef's calendar view?**
Circles create events via `hub_group_events`. The chef calendar reads from `events`. Are circle-originated events visible on the same calendar as direct-booked events? Or do circle events live in a parallel universe invisible to the chef's scheduling view?

**CS10. When a chef marks a date as "unavailable" (if that feature exists), does the public inquiry form's date conflict check respect it?**
The date availability check (`checkPublicDateAvailability`) counts non-cancelled events. But what about blocked dates, vacation days, or personal calendar blocks? If the chef has a dentist appointment, the system still shows that date as available for bookings.

**CS11. Does Google Calendar two-way sync exist beyond the OAuth flow?**
Settings page has `calendar-sync`. Google OAuth is configured. But does actual event data flow in either direction? Or is this a settings page with no backend? Trace from `settings/calendar-sync` -> any actual Google Calendar API calls.

**CS12. When two events overlap on the same date for the same chef, does any system warn about resource conflicts (same equipment, same staff, overlapping prep windows)?**
Date conflict shows "you have an event." But resource-level conflicts (the chef only has one sous vide, one set of chafing dishes, one assistant) are invisible. Does equipment inventory or staff assignment cross-reference concurrent events?

---

## Domain 3: Intelligence Feedback Loops

> The system collects data at every stage but rarely feeds it back. Receipt OCR learns prices. Surveys capture satisfaction. AAR captures lessons. Prep tracking captures timing. None of these feed forward automatically.

**CS13. When receipt OCR extracts a corrected price for an ingredient, does that price update the price catalog for future cost estimates?**
Receipt intelligence (`lib/receipts/`) extracts structured data. Price catalog (`lib/pricing/`) stores ingredient prices. Receipt -> catalog bridge is "partially built" per the backlog miner. How partial? Does it auto-update, require chef approval, or not connect at all?

**CS14. When the shopping list is generated and the chef buys items, do actual purchase prices flow back to update recipe cost estimates?**
Shopping list generates quantities. Purchases happen (tracked or not). Recipe costing uses ingredient prices. If the chef pays $8/lb for salmon instead of the catalog's $12/lb, does the system learn this? Or does recipe costing perpetually use stale catalog prices?

**CS15. When prep timing is tracked (recipe peak windows, prep timeline), do actual prep durations feed back to improve future prep time estimates?**
Prep timeline spec exists. The system could estimate "this recipe takes 45 min prep." But does it learn from actual chef behavior? If a chef consistently preps their signature dish in 30 min instead of 45, does the estimate adjust?

**CS16. When Remy AI detects a client allergy mid-conversation, does the detection quality improve over time (learning from chef confirmations/rejections)?**
Allergy detection creates unconfirmed records. Chef confirms or rejects. Does rejection data feed back to improve detection? Or does the AI make the same false-positive mistakes forever?

**CS17. Does the ingredient quantity lifecycle (recipe -> buy -> purchased -> used -> leftover) produce waste analytics that surface on the dashboard?**
Ingredient lifecycle tracking is built (9/20 questions BUILT per memory). Leftover tracking exists. But does the chef ever see "you consistently over-buy parsley by 40%" or "your average food waste is 12%"? Or is the data collected but never surfaced?

**CS18. When concurrent events share ingredients (e.g., two events both need salmon), does the shopping list consolidate purchases and split costs?**
Shopping list generation exists per-event. But if a chef has Saturday lunch AND Saturday dinner both needing 5 lbs of salmon, does the system say "buy 10 lbs total" or generate two separate 5-lb entries? Ingredient overlap detection is listed as an unbuilt bridge.

---

## Domain 4: Dashboard Completeness

> The dashboard is the chef's daily command center. Multiple data sources that should surface there don't. These questions expose every dashboard blind spot.

**CS19. Does the dashboard show waitlist status (how many people are waiting for availability)?**
Waitlist exists (`availability_waitlist` table, `lib/waitlist/`). Dashboard has widgets. But waitlist data appears in zero app/ or component/ files per the orphan finder. The chef has people waiting and doesn't see it on their daily view.

**CS20. Does the dashboard show dormancy alerts for clients who haven't booked recently?**
Chef dormancy nudge was just built. But CLIENT dormancy (clients going cold) has no dashboard presence. A chef's top client hasn't booked in 8 months. Does the dashboard flag this? Or does the chef only realize when they manually scroll through client history?

**CS21. Does the dashboard show upcoming prep deadlines based on recipe peak windows and event dates?**
Prep timeline spec exists. Events have dates. Recipes have prep times. But does the dashboard render "Start prepping lamb for Saturday's dinner by Thursday" automatically? Or is prep planning entirely manual calendar work?

**CS22. Does the dashboard surface ingredient price alerts when catalog prices change significantly?**
Price catalog updates happen (OpenClaw, receipt OCR). Event costs depend on these prices. If salmon jumps from $12 to $18/lb, does the chef see "3 upcoming events affected by price increase" on their dashboard? Or do they discover it when they shop?

**CS23. Does the dashboard show a health score / business pulse that aggregates financial, operational, and client metrics?**
Individual metrics exist everywhere: revenue in financials, client count in CRM, event count in calendar, food cost % in recipes. But is there a single composite score? Settings has a health page. Admin has pulse. But does the CHEF dashboard surface a unified "your business health" indicator?

**CS24. Does the dashboard differentiate between "no data" (new chef, nothing to show) and "data failed to load" (error state)?**
Zero Hallucination Rule demands this distinction. A new chef with zero events should see encouraging empty states. A chef whose data failed to load should see error states. Are these two paths distinct across all dashboard widgets?

---

## Domain 5: Cache Architecture

> 1,426 revalidation calls across 250 files. Only 7 `unstable_cache` uses. Most data is either fully dynamic (slow) or revalidated without being cached (pointless). These questions expose the cache strategy gap.

**CS25. Which high-traffic public pages make uncached database queries on every request?**
Chef profile page (`/chef/[slug]`) reportedly makes 8+ uncached DB queries. Directory page was cached this session. But what about: event share pages, tip pages, review pages, hub join pages? These are public-facing, potentially high-traffic, and every uncached query is a DB hit per visitor.

**CS26. When `revalidatePath` is called, does it actually bust a corresponding `unstable_cache`?**
`revalidatePath` does NOT bust `unstable_cache` tags (per CLAUDE.md). With 1,426 revalidation calls but only 7 cached functions, are there mutations that call `revalidatePath` thinking they're busting cache, but the actual data is served from an `unstable_cache` with a different tag? This is a class of silent staleness bugs.

**CS27. Do any two mutations revalidate the same path but forget to revalidate each other's cache tags?**
Example: updating a chef profile revalidates `/chef/[slug]`. Updating directory approval revalidates `directory-chefs` tag. But if the profile page uses BOTH the profile data AND the directory status, a profile update that doesn't bust `directory-chefs` serves stale directory data. Trace every path that has multiple data sources.

**CS28. Are SSE broadcasts covering the same mutation surfaces as cache invalidation, or are there gaps?**
7 SSE broadcast channels exist. 1,426 revalidation calls exist. Realtime updates (SSE) and cache busting (revalidate) should fire on the same mutations. If a mutation revalidates but doesn't broadcast, other open tabs see stale data until refresh. If it broadcasts but doesn't revalidate, the next page load serves stale cache.

---

## Domain 6: Financial Pipeline Integrity

> Financial data flows through ledger -> views -> UI. Multiple points where the chain can break silently, showing $0 instead of errors.

**CS29. When a grocery purchase is recorded, does it flow to the event's food cost calculation?**
Expenses exist. Ledger entries exist. Food cost % is computed from ledger. But grocery purchases (from shopping list) are a specific expense category. If the chef buys groceries and records the receipt, does the event's food cost margin update automatically? Or does the chef have to manually create an expense entry separate from the shopping list?

**CS30. When the price catalog updates a staple ingredient price, do all future events using that ingredient reflect the new cost?**
Recipe costing pulls from price catalog. Events reference recipes via menus. But is the cost LIVE (re-computed on every view) or SNAPSHOT (captured at event creation)? If snapshot, price changes don't affect existing events. If live, a price spike mid-planning changes a quote the chef already sent.

**CS31. Does the tip flow (guest tips chef via Stripe) create a ledger entry that appears in the chef's financial summary?**
Tip page exists. Stripe processes the payment. But does the tip amount hit `ledger_entries` with the correct event association? Or do tips exist in Stripe but not in ChefFlow's financial reporting, making revenue reports incomplete?

**CS32. When an event has both a quote AND actual expenses recorded, does any surface show the variance (quoted $2,000 food cost, actual $2,400)?**
Quotes exist. Expenses exist. Both are in the ledger. But does any UI render "you estimated $X, you spent $Y, variance is $Z"? This is the core profitability feedback loop. Without it, the chef can't learn whether their quotes are accurate.

**CS33. Does `formatCurrency()` handle negative values (refunds, credits) correctly across all 16+ financial display surfaces?**
Currency formatting was standardized this session across 16 files. But refunds create negative ledger entries. Does `formatCurrency(-1500)` render as "-$15.00" or "($15.00)" or break entirely? Test across all surfaces where negative values are possible.

---

## Domain 7: Notification & Email Coverage

> 90+ notification action types defined. 86 email templates. 51 cron endpoints. These questions expose orphaned notifications, unsent emails, and cron jobs that write data nobody reads.

**CS34. Which of the 90+ notification action types have no UI handler in the notification list?**
`NotificationAction` type defines 90+ actions. The notification list component renders them. But if a new action type was added without updating the renderer, those notifications appear as blank or generic items. List every action type and verify the renderer handles it.

**CS35. Which of the 86 email templates are never imported or called from any server action?**
Templates exist in `lib/email/templates/`. Some may have been created for features that were never completed, or replaced by newer templates. Dead templates are code clutter and confusion risk (someone might wire up the wrong one).

**CS36. Which cron jobs write data that no UI surface reads?**
51 scheduled endpoints run on timers. They write to tables, update statuses, create notifications. But if no page, component, or API reads the data they write, the cron is burning compute for nothing. Example: dormancy detection writes `dormancy_nudge_sent_at` but does any dashboard show "nudge sent" status?

**CS37. When a collaborator is added to an event (co-host, sous chef, observer), do they receive a notification AND an email?**
Collaboration system exists (`lib/collaboration/actions.ts`). But the question set miner found "no collaborator notifications" as a FAIL. If a chef invites another chef to co-host, does the invitee get notified? Or do they only find out if they happen to check their network page?

**CS38. Does the email system have delivery tracking (sent, opened, bounced)?**
86 templates send emails. But does the system know if emails were delivered? If a client's email bounces, does the chef see "email failed" or does it silently disappear? Bounce handling affects data quality (bad email = dead client record).

---

## Domain 8: Public Surface Security & Performance

> Public pages are the front door. Rate limiting, token security, and performance directly affect first impressions and system safety.

**CS39. Do all public form endpoints (inquiry, RSVP, feedback, tip, review) have rate limiting?**
Public forms accept unauthenticated input. Without rate limiting, a bot can submit thousands of fake inquiries. The question set miner flagged "zero rate limiting on public forms" as a critical FAIL. Check every `app/(public)/` form submission endpoint.

**CS40. Are share tokens, review tokens, and tip tokens sufficiently entropic to prevent enumeration?**
Tokens appear in URLs: `/share/[token]`, `/review/[token]`, `/tip/[token]`. If tokens are sequential or low-entropy, an attacker could enumerate valid tokens and access other chefs' data. What is the token generation method? UUID v4? HMAC? Sequential integer?

**CS41. Can an unauthenticated user access any data beyond what's intentionally public?**
Public routes serve data without auth. But do any public API routes accidentally expose more data than intended? The question set miner found "anon can read cannabis guest profiles" as a FAIL. Systematic check: every route in `app/(public)/` and `app/api/` without auth gates.

**CS42. Does the public chef profile page make N+1 database queries that scale with content volume?**
If a chef has 50 recipes, 20 events, and 100 reviews, does the profile page make 170+ queries? Or does it batch/join efficiently? High-profile chefs with lots of content should load in under 2 seconds, not 10.

---

## Domain 9: Multi-Role Data Visibility

> Chefs, clients, admin, partners, co-hosts, staff, and guests all see different slices of the same data. These questions test whether each role sees exactly what they should, nothing more, nothing less.

**CS43. When a chef updates an event detail (date, menu, guest count), does the client's portal reflect the change immediately?**
Chef updates event via server actions. Client portal reads event data. But does the client portal bust its cache when the chef mutates? Or does the client see stale data until they hard-refresh? Trace cache invalidation from chef mutation -> client portal render.

**CS44. When a client updates their dietary restrictions via the portal, does the chef see the update without refreshing?**
Client portal has dietary update forms. Chef sees client dietary data on event pages. Same cache question in reverse. SSE should broadcast dietary changes. Does it?

**CS45. Does the admin panel show a unified view of system health that aggregates chef-level metrics?**
Admin has 37 pages. Individual chefs have health/pulse metrics. But does admin see platform-wide aggregates (total events this month, average food cost %, chefs at risk of churning)? Or does admin have to click into each chef individually?

**CS46. When a partner refers a client, can the partner see the referral's status (inquiry received, converted, event completed)?**
Partners have a portal. Referral tracking exists. But does the partner portal show referral pipeline status? Or does the partner submit a referral and never hear back unless the chef manually reaches out?

**CS47. Does the staff briefing (generated for sous chefs / event staff) include ONLY the data that role should see?**
Staff briefings contain client dietary info, event logistics, menu details. But do they also expose financial data (what the client is paying, the chef's margin)? Staff should see operational data, not financial data. Is there a data scoping filter on the briefing generator?

---

## Domain 10: Onboarding to Activation Bridge

> A chef can complete onboarding and still have a dead workspace. These questions test whether onboarding actually produces a functioning, engaged chef.

**CS48. After onboarding, does the dashboard render useful content, or is every widget an empty state?**
A fresh chef has zero events, clients, recipes, and revenue. Does the dashboard show actionable next-step prompts ("Add your first recipe," "Create your booking page"), or does it just show empty cards with $0 and 0 counts?

**CS49. Does the configuration engine (archetype selection) actually change what the chef sees?**
Three question sets feed the config engine. Archetype determines feature visibility and nav layout. But does selecting "Private Chef" vs "Caterer" vs "Cannabis Chef" actually change which features appear in the sidebar and dashboard? Or is archetype selection cosmetic-only?

**CS50. Is there a "time to first value" metric that tracks how long from signup to first meaningful action?**
The system should know: chef signed up Monday, added first recipe Tuesday, created first event Wednesday, sent first quote Thursday. Does any analytics surface track this funnel? Without it, there's no way to measure onboarding effectiveness.

**CS51. Does the embed widget / booking page work correctly for a chef who just completed onboarding but has zero settings configured?**
A new chef might share their booking link immediately. If they haven't configured: payment methods, service types, availability, pricing, the booking page should either show sensible defaults or explain what's needed. Does it handle the zero-config state?

---

## Domain 11: Feature Discovery & Navigation Cohesion

> 280 chef route pages. 70+ settings pages. ADHD user profile. Nav overwhelm is a real failure mode. These questions test whether features are findable.

**CS52. Can a chef discover the shopping list feature from the event detail page?**
Events have menus. Menus have recipes. Recipes have ingredients. Shopping lists aggregate ingredients. But is there a direct link from "I'm looking at my Saturday event" to "generate shopping list for this event"? Or does the chef have to navigate to a separate section and remember which events need lists?

**CS53. Can a chef discover the price catalog from the recipe costing view?**
Recipe cost shows ingredient prices. Some prices might be wrong or missing. Can the chef click through from a recipe's cost breakdown to the price catalog entry for that ingredient? Or are recipes and pricing isolated navigation trees?

**CS54. Does the search / command palette cover all 280+ chef pages?**
If a chef types "shopping list" or "allergy" or "tax rates" in search, do they find the right page? How many pages are indexed by the search system vs. total pages? Missing pages are undiscoverable features.

**CS55. Are the 70+ settings pages organized by task frequency, or alphabetically/arbitrarily?**
Settings should surface "things you change often" (notifications, availability, pricing) above "things you set once" (API keys, webhooks, delete account). Is the settings architecture optimized for ADHD-friendly browsing, or does it present a wall of links?

**CS56. When a new module is enabled (e.g., cannabis, catering, meal-prep), does the navigation immediately reflect the new capabilities?**
Module toggle exists in settings. Nav config reads module status. But is there a page reload required? Does the sidebar update in real-time? If a chef enables cannabis module, do they have to refresh to see the cannabis nav items?

---

## Domain 12: Data Export & Portability

> Chef's data is their business. These questions test whether all data is actually exportable.

**CS57. Does the data export feature cover ALL chef data, or only a subset?**
Export exists (`lib/exports/actions.ts`). But does it cover: recipes, menus, client info, event history, financial records, survey results, AAR reports, shopping lists, prep notes, photos, contracts, AND conversation history? Or just events + expenses?

**CS58. Can a chef export their recipe book in a format another system can import?**
Recipes are IP. If a chef leaves ChefFlow, can they take their recipes in a standard format (JSON, CSV, PDF)? Or is recipe data locked in ChefFlow's schema with no export path?

**CS59. Does the iCal feed include event metadata (location, guest count, menu) or just date/title?**
Calendar subscribers (Google Calendar, Apple Calendar) see events from the iCal feed. If the feed only includes date and title, the chef still has to open ChefFlow for details. Rich iCal events with location, notes, and attendee count reduce context-switching.

**CS60. Is financial data exportable in a format compatible with accounting software (QuickBooks, Wave, spreadsheet)?**
ChefFlow has ledger data, expenses, revenue. If a chef's accountant needs year-end data, can they get a CSV/QBO export? Or does the chef have to screenshot their financial pages?

---

## Domain 13: Cross-Feature Data Integrity

> These questions test whether data mutations in one system corrupt or orphan data in another.

**CS61. When an event is deleted (if allowed), what happens to: its ledger entries, client records, survey responses, AAR data, circle membership, calendar feed, notifications, and email history?**
Deletion is the most dangerous cross-system operation. Every downstream reference to that event becomes an orphan. Is deletion soft (status change) or hard (row delete)? Are there cascade rules? Or does deleting an event leave ghost data across 10+ tables?

**CS62. When a recipe is deleted, what happens to menu items that reference it?**
Menus have components. Components can link to recipes via `recipe_id`. If the recipe is deleted, do components become orphans with null recipe links? Does the menu still render? Does the shopping list break?

**CS63. When a client is merged (duplicate resolution), do all events, inquiries, surveys, allergies, and conversation history transfer to the surviving record?**
Client deduplication is a common operation. If "John Smith" and "J. Smith" are the same person, merging them requires updating FKs across: events, inquiries, client_allergy_records, survey_responses, conversations, hub memberships, RSVPs, dietary records. Is merge implemented? Is it complete?

**CS64. When a chef changes their slug (public URL), do all existing share links, embed widgets, and partner referral URLs break?**
Slug appears in: `/chef/[slug]`, embed scripts, partner portals, printed materials. Changing a slug is a breaking URL change. Is there a redirect from old slug to new? Or does the chef lose all inbound links?

**CS65. When a chef's Stripe Connect account is disconnected, do pending payments, tip links, and invoice pages handle the missing payment processor gracefully?**
Stripe disconnect can happen (account issue, voluntary). Every payment-dependent surface (tip page, invoice, checkout, payment recording) needs to degrade gracefully. Does it show "payments temporarily unavailable" or crash with an unhandled Stripe error?

---

## Domain 14: Operational Pressure Tests

> These questions test system behavior under real-world pressure conditions that a growing chef business will inevitably face.

**CS66. What happens when a chef has 5 events in the same week?**
Dashboard, calendar, shopping list, prep timeline, staff assignment all scale with event count. At 5 concurrent events: shopping list should consolidate ingredients across events. Prep timeline should show conflicts. Staff should show availability. Does any of this happen, or does each event exist in isolation?

**CS67. When 3 events on the same day have the same client allergy (e.g., nut allergy), is the allergy warning shown once per event or once globally?**
Allergy system is per-client-per-event. But if the same allergic guest attends multiple events (unlikely but possible with circles), the chef shouldn't see 3 identical warnings. Is there deduplication in the allergy notification pipeline?

**CS68. When the AI runtime (Ollama) goes down, which features fail silently vs. fail loudly?**
`OllamaOfflineError` exists. `parseWithOllama` throws it. But does every surface that calls an AI feature catch this error and show "AI unavailable" vs. showing nothing (looking like zero data)? List every AI-dependent surface and verify error handling.

**CS69. When the database connection pool is exhausted, do server actions queue, fail fast, or hang?**
Postgres via postgres.js has connection limits. During peak usage (5 events, multiple clients viewing portals, admin checking analytics), can connections exhaust? What's the pool size? What's the failure mode? Users see loading spinner forever, or an error?

**CS70. When an email send fails (SMTP down, rate limited), is the failure recorded and retryable?**
86 email templates. SMTP can fail. Is there a send queue with retry logic? Or is email fire-and-forget (try once, if it fails, the notification is lost forever)? Critical emails (allergy alerts, payment confirmations) cannot be lost.

---

## Domain 15: Hub/Circle Cohesiveness

> Hub groups, circles, dinner clubs exist. They're one of the richest features. But they're architecturally isolated from several core systems.

**CS71. When a circle event's date changes, are all circle members notified?**
Event dates change. Circle members have RSVPed. But does a date change trigger circle-wide notification? Or do members only find out if they check the circle feed? This is the #1 source of no-shows: guests don't know the date moved.

**CS72. Does the circle meal board reflect the actual event menu, or is it a separate manual board?**
Circles have meal boards. Events have menus. If the chef updates the event menu, does the circle meal board auto-update? Or does the chef manually post menu items to the circle separately from the menu system?

**CS73. Can a circle poll result (e.g., "vote for next month's cuisine") feed into event creation?**
Circles have polls. Events are created from inquiries or manually. But can a poll result ("Italian won with 8 votes") auto-populate the next event's theme/cuisine field? Or is the poll purely informational with no data bridge to event creation?

**CS74. When a rebook flow uses an existing circle (`existing_circle_id`), does the new event inherit the circle's member list as the guest list?**
Rebook circle flow was built this session. A new event links to an existing circle. But does the event's guest count / RSVP list populate from circle membership? Or does the chef still manually enter guest count and send individual invites despite having a complete member list in the circle?

**CS75. Does the circle activity feed show event lifecycle milestones (menu published, prep started, event completed)?**
Circle feeds show posts, media, polls. But do they show automatic milestone posts when the event progresses through its lifecycle? "Chef just published the menu for Saturday!" is valuable social engagement. Does the FSM trigger circle posts?

---

## Domain 16: Infrastructure Observability

> Single-point infrastructure (developer's PC). No redundancy. These questions test whether the system knows when it's degrading.

**CS76. Does the health check system (`/api/health/`, `/api/system/health/`) test actual database connectivity, not just HTTP response?**
A health endpoint that returns 200 without querying the DB is useless. Does the readiness check actually execute `SELECT 1` or equivalent? If the DB is down, does health report unhealthy?

**CS77. When a server action takes >5 seconds, is that latency recorded anywhere?**
Slow actions degrade UX. Does any monitoring surface capture action duration? The error reporting endpoint exists (`/api/monitoring/report-error/`). But errors are different from slowness. Is there performance monitoring?

**CS78. When a cron job fails, does anyone find out?**
51 cron endpoints. If one fails silently (throws an error, returns 500), does anyone get notified? Or does the cron keep failing every cycle until someone manually checks? Admin should see a "failed cron" dashboard.

**CS79. Is there a single page that shows "everything is working" vs. "these things are broken"?**
Health endpoints exist for: main app, AI, Ollama, sentinel. Admin has pulse, silent-failures, system pages. But is there ONE unified status page that shows green/red for every subsystem? Or does the developer have to check 5+ different pages?

**CS80. When disk usage approaches capacity (local FS storage for uploads), does the system warn before it's full?**
Storage uses local filesystem. Uploads (photos, receipts, documents) consume disk. Is there a disk usage check? Or does the first sign of trouble come when a file upload fails with "no space left on device"?

---

## Scoring Guide

| Verdict      | Meaning                                        | Action Required                                      |
| ------------ | ---------------------------------------------- | ---------------------------------------------------- |
| CONNECTED    | Bridge exists and works. Cite file:line        | None                                                 |
| PARTIAL      | Data exists on both sides, pipeline incomplete | Document what's missing, prioritize                  |
| DISCONNECTED | Both systems work independently, no bridge     | Create gap ticket (CS-G#), prioritize by user impact |
| N/A          | Not applicable to current product scope        | Document why, revisit if scope changes               |

## Priority Tiers

| Tier                            | Questions                                                                                                                                                                                           | Criteria                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| P0 (Every user, every session)  | CS1, CS6, CS19, CS24, CS29, CS43, CS52, CS61, CS66                                                                                                                                                  | Affects daily workflow for all chefs        |
| P1 (Most users, regular impact) | CS2, CS4, CS5, CS7, CS9, CS13, CS18, CS20, CS21, CS30, CS34, CS37, CS44, CS48, CS57, CS71, CS74                                                                                                     | Affects common workflows weekly             |
| P2 (Growth & scale)             | CS8, CS11, CS12, CS25, CS26, CS39, CS40, CS42, CS45, CS50, CS54, CS63, CS68, CS76, CS78                                                                                                             | Affects system reliability and growth       |
| P3 (Polish & optimization)      | CS3, CS10, CS14-CS17, CS22-CS23, CS27-CS28, CS31-CS33, CS35-CS36, CS38, CS41, CS46-CS47, CS49, CS51, CS53, CS55-CS56, CS58-CS60, CS62, CS64-CS65, CS67, CS69-CS70, CS72-CS73, CS75, CS77, CS79-CS80 | Important but not blocking daily operations |

---

## P0 Verdicts (Audited 2026-04-18)

### CS1. Post-Event Auto-Trigger: **PARTIAL**

The system fires a substantial post-event sequence on `completed` transition, but tip link is manual-only.

**CONNECTED (4 of 5 items):**

- Thank-you email: immediate via `EventCompletedEmail` + 3-day follow-up via Inngest (`lib/events/transitions.ts:911-993`, `lib/jobs/post-event-jobs.ts:109-115`)
- Review request: immediate post-event survey via `sendPostEventSurveyForEvent()` + 7-day follow-up via Inngest (`lib/events/transitions.ts:1120-1126`, `lib/jobs/post-event-jobs.ts:155-161`)
- AAR prompt: `remy_alerts` row with `alert_type: 'post_event_aar_prompt'` linking to `/events/{id}/aar` (`lib/events/transitions.ts:1383-1401`)
- Referral ask email: 14-day delay via Inngest (`lib/jobs/post-event-jobs.ts:198-204`)
- Guest feedback: 1-day delay via Inngest (`lib/jobs/post-event-jobs.ts:248-254`)
- Lifecycle cron backup: sends review requests 3-10 days post-completion for events missed by Inngest (`app/api/scheduled/lifecycle/route.ts:1144-1219`)
- Inventory auto-deduction, loyalty points, food cost variance alerts, circle archiving also fire

**DISCONNECTED (CS-G1):**

- Tip link: `createTipRequest()` exists in `lib/finance/tip-actions.ts` with full Stripe integration and tokenized public page at `/tip/[token]`, but is entirely manual. Zero reference to tip creation in transitions or post-event jobs.

---

### CS6. Inquiry Date Conflict at Triage: **PARTIAL**

Conflict signal exists but is buried and absent from key triage surfaces.

**CONNECTED:**

- Booking Score system detects conflicts: `lib/analytics/booking-score.ts:110-128` applies -50 penalty and sets `hasDateConflict: true` when inquiry date matches existing event
- `BookingScoreBadge` renders "Conflict" label on inquiry list (`app/(chef)/inquiries/page.tsx:157`) and detail page (`app/(chef)/inquiries/[id]/page.tsx:330`)

**DISCONNECTED (CS-G2):**

- "Respond Next" queue (`app/(chef)/inquiries/page.tsx:294-371`) does NOT show booking scores or conflict indicators
- Inbox triage surface (`app/(chef)/inbox/triage/[threadId]/page.tsx`) has zero date conflict awareness
- `checkDateConflicts` from `lib/availability/actions.ts:230` is only called from event form, never inquiry surfaces
- Inquiry detail "Confirmed Facts" card shows date without conflict warning (`app/(chef)/inquiries/[id]/page.tsx:706-717`)

---

### CS19. Waitlist on Dashboard: **DISCONNECTED** (CS-G3)

Zero waitlist references on the dashboard. Grepped all 19 dashboard sections, `lib/dashboard/actions.ts`, `widget-actions.ts`, `health-actions.ts`, `touchpoint-actions.ts`, `accountability.ts`, priority queue system, proactive alerts. None mention "waitlist."

Waitlist page exists at `/waitlist` with full functionality. `WaitlistManager` component exists at `components/scheduling/waitlist-manager.tsx` with stats bar (waiting/contacted/booked/expired/conversion rate). `getWaitlistStats()` returns exactly the data a dashboard widget needs. Nothing on the dashboard calls it.

---

### CS24. Dashboard Empty vs Error States: **PARTIAL**

Strong crash protection (WidgetErrorBoundary wraps every section). One section (BusinessCards) tracks and reports partial failures with visible warning banner. HeroMetrics has explicit error UI and distinguishes new accounts ("Welcome to ChefFlow") from populated ones.

**DISCONNECTED (CS-G4): 8+ sections silently degrade errors into "no data":**

- PriorityQueue: `safe()` fallback sets `allCaughtUp: true`; renders green "All caught up" banner on DB failure (`page.tsx:219-229`)
- ScheduleCards: `safe()` returns empty arrays; shows "No events scheduled yet" on failure (`schedule-cards.tsx:46-53`)
- AlertCards: `safe()` returns zeros; conditional `{count > 0 &&}` hides all alerts on failure (`alerts-cards.tsx:58-75`)
- SmartSuggestions: renders green "All caught up. No data gaps." on query failure (`smart-suggestions.tsx:184-206`)
- IntelligenceCards: returns `null` on failure, section vanishes (`intelligence-cards.tsx:8-15`)
- DinnerCircles: shows "No active circles yet" on failure (`dinner-circles-cards.tsx:19-47`)
- RespondNextCard: returns `null` on failure (`respond-next-card.tsx:9-18`)
- MetricsStrip: returns `null` on failure (`metrics-strip.tsx:59-64`)

Zero Hallucination violation: a chef whose database is down sees the same dashboard as a new chef with no data.

---

### CS29. Grocery Purchase to Food Cost: **PARTIAL**

Manual expense creation works. No automatic pipeline from shopping list completion.

**CONNECTED:**

- `event_financial_summary` view sums all expenses linked to event including `groceries` category (`20260417000005_fix_outstanding_balance_refunds.sql:57-60`)
- `createExpense()` accepts `event_id` with `groceries` category (`lib/expenses/actions.ts:155-233`)
- Receipt OCR -> expense line items -> `applyLineItemPrices()` updates ingredient prices

**DISCONNECTED (CS-G5):**

- Shopping list `completeList()` only updates list status; creates zero expenses/ledger entries (`lib/grocery/smart-list-actions.ts:845`)
- Two parallel cost-tracking tables (`expenses` vs `grocery_spend_entries`) don't sync
- `getEventProfitSummary()` reads `expenses`; `getEventFoodCost()` reads `grocery_spend_entries` separately; may return different numbers for same event
- Expenses never create ledger entries (ledger tracks revenue only)

---

### CS43. Chef Update to Client Portal: **CONNECTED**

Fully wired. No gap.

- `updateEvent` revalidates `/my-events` and `/my-events/${eventId}` (client portal paths) (`lib/events/actions.ts:550-551`)
- Client portal uses direct DB queries, no `unstable_cache` (`lib/events/client-actions.ts:19-63`)
- `transitionEvent` broadcasts to `client-event:${eventId}` SSE channel; `EventStatusWatcher` calls `router.refresh()` (`lib/events/transitions.ts:326-337`, `components/events/event-status-watcher.tsx:11-36`)
- Client list page has `ClientEventsRefresher` that refreshes on notification receipt (`components/client/client-events-refresher.tsx:1-28`)
- `updateEvent` restricted to draft/proposed status (intentional business rule); accepted+ events use `transitionEvent` with its own comprehensive cache invalidation + SSE

---

### CS52. Event to Shopping List Discovery: **CONNECTED**

Multiple well-designed discovery paths.

- Event day: primary "Grocery List" button in header linking to `/events/${id}/grocery-quote` (`app/(chef)/events/[id]/page.tsx:663-665`)
- Non-event day: "Grocery Quote" in EventActionsOverflow dropdown (`page.tsx:682-684`)
- Ops tab: `GroceryConsolidationPanel` rendered inline for events with menus (`event-detail-ops-tab.tsx:204-206`)
- Ops tab: `ShoppingSubstitutions` for non-draft events (`event-detail-ops-tab.tsx:186-188`)
- Cross-event consolidated shopping list at `/culinary/prep/shopping` reachable from nav (different feature: multi-event aggregation)

---

### CS61. Event Deletion Cascade: **PARTIAL**

Soft delete only, draft-only restriction. Architecturally sound but has a calendar feed bug.

**CONNECTED:**

- `deleteEvent()` sets `deleted_at`/`deleted_by` on draft events only (`lib/events/actions.ts:673-729`)
- `restoreEvent()` clears soft-delete flags (`lib/events/actions.ts:735-757`)
- FK cascade rules exist: `after_action_reviews`, `event_surveys`, `client_satisfaction_surveys`, `hub_group_events` all `ON DELETE CASCADE`; `ledger_entries` `ON DELETE RESTRICT`; `notifications` `ON DELETE SET NULL`
- Draft-only restriction limits blast radius (drafts rarely have ledger entries, surveys, AARs, or calendar sync)

**DISCONNECTED (CS-G6):**

- iCal calendar feed (`app/api/feeds/calendar/[token]/route.ts:42-59`) does NOT filter `deleted_at IS NOT NULL`; soft-deleted drafts still appear in calendar subscribers' feeds
- No downstream cleanup logic at all; relies entirely on soft-delete pattern + FK rules that only fire on hard delete (which never happens)

---

### CS66. Five Events in Same Week: **CONNECTED**

All six subsystems are implemented and wired together.

- Shopping consolidation: `fetchConsolidatedGroceryData(startDate, endDate)` merges ingredients across all events with per-event attribution (`lib/documents/generate-consolidated-grocery-list.ts:91-376`)
- Batch opportunities: `getBatchOpportunities()` finds shared ingredients across 2+ events (`lib/grocery/batch-opportunities.ts:21-182`)
- Capacity scoring: `computeDayCapacity()` with multi-event penalty, overload detection, rest day warnings (`lib/scheduling/capacity.ts:18-155`)
- Weekly limits: `checkBookingConflict()` enforces `max_events_per_day` AND `max_events_per_week` (`lib/scheduling/capacity-planning-actions.ts:521-627`)
- Multi-event alerts: `getMultiEventDays()` scans 90 days, surfaces on dashboard (`lib/scheduling/multi-event-days.ts:25-62`, `components/dashboard/multi-event-days-widget.tsx`)
- Staff conflicts: `eventsOverlapInTime()` checks same-day staff assignments, throws on overlap (`lib/staff/time-overlap.ts:1-29`, `lib/staff/staffing-actions.ts:223-239`)
- Prep conflicts: `detectPrepBlockConflicts()` finds overlapping prep blocks across events (`lib/scheduling/prep-block-actions.ts:35-100`)

---

## P0 Scorecard

| #    | Question                         | Verdict          | Gap #                                          |
| ---- | -------------------------------- | ---------------- | ---------------------------------------------- |
| CS1  | Post-event auto-trigger          | **PARTIAL**      | CS-G1 (tip link manual)                        |
| CS6  | Inquiry date conflict at triage  | **PARTIAL**      | CS-G2 (absent from Respond Next queue + inbox) |
| CS19 | Waitlist on dashboard            | **DISCONNECTED** | CS-G3                                          |
| CS24 | Dashboard empty vs error         | **PARTIAL**      | CS-G4 (8+ sections lie on failure)             |
| CS29 | Grocery to food cost             | **PARTIAL**      | CS-G5 (no auto-expense from shopping list)     |
| CS43 | Chef update to client portal     | **CONNECTED**    | --                                             |
| CS52 | Event to shopping list discovery | **CONNECTED**    | --                                             |
| CS61 | Event deletion cascade           | **PARTIAL**      | CS-G6 (iCal feed shows deleted drafts)         |
| CS66 | Five events in same week         | **CONNECTED**    | --                                             |

**P0 Summary: 3 CONNECTED, 5 PARTIAL, 1 DISCONNECTED.** 6 gap tickets filed.

**Top actionable gaps:**

1. **CS-G3 (Waitlist):** Add `getWaitlistStats()` call to dashboard. Data + component already exist. Estimated: 30 min.
2. **CS-G1 (Tip link):** Add `createTipRequest()` call to post-event Inngest job (e.g., 2-day delay). Infrastructure exists. Estimated: 1 hour.
3. **CS-G6 (iCal feed):** Add `AND deleted_at IS NULL` to calendar feed query. One line fix.
4. **CS-G4 (Dashboard error states):** Replace `safe()` fallbacks with error-aware pattern (like BusinessCards). Systematic but straightforward.
5. **CS-G2 (Inquiry conflict):** Add BookingScore to Respond Next queue. Badge component already exists.
6. **CS-G5 (Shopping -> expense):** Auto-create expense on shopping list completion. Architectural decision needed (auto vs. prompted).

---

## P1 Verdicts (Audited 2026-04-18)

### CS2. Survey Feedback to Menu Builder: **PARTIAL**

Feedback collected with per-dish ratings. `dish_feedback` aggregation exists (`lib/menus/dish-feedback-query.ts:16-71`). `menu_service_history` tracks liked/disliked dishes. `getDishFrequency()` and `getNeverServedDishes()` provide per-client history. But menu builder (`lib/menus/actions.ts`) has zero references to survey, feedback, or dish_feedback data. `getMenuRecommendations()` recommends based on `times_cooked` only, not client ratings. **(CS-G7)**

### CS4. Client LTV in Inquiry Triage: **PARTIAL**

Inquiry triage (`lib/intelligence/inquiry-triage.ts:47`) fetches `lifetime_value_cents` from clients table but never uses it in scoring logic (lines 97-172). Scoring uses: time urgency (0-30), budget signal (0-20), GOLDMINE score (0-15), repeat client bonus via `total_events_count` (0-15), referral source (0-10), date conflict (-10). `estimatedValueCents` output is just `confirmed_budget_cents` from inquiry text. Client lifetime journey stages (`prospect`/`first_timer`/`returning`/`loyal`/`champion`/`dormant`) exist in `lib/intelligence/client-lifetime-journey.ts` but are display-only. **(CS-G8)**

### CS5. Client Dormancy Re-engagement: **CONNECTED**

Full automated pipeline:

- Detection: `lib/clients/dormancy.ts:19-57` queries `client_financial_summary` for `is_dormant = true`, `days_since_last_event >= 90`
- Cron: `app/api/scheduled/client-reengagement/route.ts` runs weekly, finds 60-90 day dormant clients, generates AI-personalized email via `generateReengagementDraft()`
- Churn prevention: `lib/intelligence/churn-prevention-triggers.ts` provides multi-factor risk scoring with suggested actions per level
- Chef dormancy nudge (`dormancy-nudge` cron) is separate, targets chef login, not client booking

### CS7. Partner Notification on Inquiry Conversion: **DISCONNECTED** (CS-G9)

`convertInquiryToEvent()` (`lib/inquiries/actions.ts:1686`) copies `referral_partner_id` to the new event. Post-conversion side effects (lines 1858-1887) notify client and link circle. Zero partner notification. No email, no in-app notification, no webhook. Partner portal shows completed events retrospectively (`lib/partners/portal-actions.ts:119-130`), not pipeline status.

### CS9. Circle Events on Chef Calendar: **CONNECTED**

Circle events are regular `events` rows linked via `hub_group_events` junction table. Calendar query (`lib/calendar/actions.ts:114-120`) selects by `tenant_id` with no circle exclusion. `linkEventToCircle` (`lib/hub/chef-circle-actions.ts:498`) verifies `event.tenant_id` matches before linking. Circle events appear on calendar as normal items.

### CS13. Receipt OCR to Price Catalog: **CONNECTED**

Full end-to-end pipeline:

- `approveReceiptSummary` (`lib/receipts/actions.ts:385-449`) triggers both price update paths
- `applyLineItemPrices` (`lib/finance/expense-line-item-actions.ts:410-530`) updates `ingredients.last_price_cents` and `cost_per_unit_cents` with 50% deviation sanity guard
- `logIngredientPrice` (`lib/ingredients/pricing.ts:31-67`) writes to `ingredient_price_history`, recalculates `average_price_cents`, calls `propagatePriceChange()` for recipe cost cascade

### CS18. Concurrent Event Ingredient Consolidation: **PARTIAL**

Consolidation CONNECTED: `fetchConsolidatedGroceryData()` (`lib/documents/generate-consolidated-grocery-list.ts:91-376`) merges ingredients across events with per-event attribution. `BatchOpportunitiesCard` surfaces shared ingredients.

Cost splitting DISCONNECTED: consolidated list computes combined budget but does NOT split costs per event. Separate `grocery-splitting-actions.ts` splits trip costs across clients (different feature). No mechanism allocates consolidated purchase cost back to individual events. **(CS-G10)**

### CS20. Client Dormancy on Dashboard: **CONNECTED**

Three independent systems:

- `DormantClientsWidget` (`components/dashboard/dormant-clients-widget.tsx:20-67`) shows clients with 90+ days since last event, loaded via `business-section-loader.ts:320`
- Remy proactive alerts (`lib/ai/remy-proactive-alerts.ts:359-426`) has `checkDormantClients` rule with 90-day threshold and birthday cross-reference
- Automated cron re-engagement at 60-90 day window

### CS21. Prep Deadlines on Dashboard: **CONNECTED**

Full pipeline:

- Dashboard calls `getAllPrepPrompts()` from `schedule-cards.tsx:48`
- Computes prep timelines for 5 near-term events via `getEventPrepTimeline()` (`lib/prep-timeline/actions.ts:79`)
- Reads recipe peak window fields (`peak_hours_min`, `peak_hours_max`, `safety_hours_max`, `storage_method`, `freezable`)
- `computePrepTimeline()` reverse-calculates deadlines from event service datetime
- `getActivePrompts()` converts to dashboard prompts with urgency levels (`overdue`/`actionable`/`upcoming`)
- Rendered via `PrepPromptsView` with counts and links to `/events/{id}?tab=prep`

### CS30. Price Catalog Update to Event Costs: **PARTIAL**

Hybrid model: LIVE for recipe browsing (SQL view reads current `cost_per_unit_cents`), SNAPSHOT for proposed events (frozen `menu_cost_snapshot_cents` at `lib/events/transitions.ts:410-421`).

Gap: `recipe_ingredients.computed_cost_cents` is set on ingredient add but NOT refreshed when underlying price changes. `bulkUpdateIngredientPrices` updates ingredients but doesn't call `recomputeRecipeCosts()`. SQL `compute_recipe_cost_cents` prefers stale `computed_cost_cents` over live prices. Manual `recomputeRecipeCosts(recipeId)` exists but requires explicit call. **(CS-G11)**

### CS34. Notification Action Types UI Coverage: **PARTIAL**

120 `NotificationAction` types defined in `lib/notifications/types.ts:20-151`. Panel renderer (`components/notifications/notification-panel.tsx:102-104`) handles ALL types via data-driven approach with fallback to Bell icon. No action type is truly unhandled (title, body, navigation all work). However, 21 of 43 unique icon names in `NOTIFICATION_CONFIG` are NOT imported into `ICON_MAP`. ~50 of 120 action types display with wrong (fallback Bell) icon instead of configured icon. Functionally complete, visually degraded. **(CS-G12)**

### CS37. Collaborator Notification on Invite: **PARTIAL**

Email: YES. `inviteChefToEvent()` (`lib/collaboration/actions.ts:181-206`) sends email via `sendCollaborationInviteEmail()`.

In-app notification: NO. Zero calls to `createNotification()` or `createChefNotification()` in collaboration module. The `createChefNotification` helper exists at `lib/notifications/chef-actions.ts:45` (comment: "Used for collaborator/co-host notifications") but is never called from collaboration code. Known issue documented in 3 prior question sets. **(CS-G13)**

### CS44. Client Dietary Update to Chef View: **PARTIAL**

Portal dietary update (`lib/hub/client-quick-actions.ts:157`) broadcasts via SSE to circle viewers, revalidates `/dashboard`, creates chef notification. Chef sees the update in circle feed real-time.

Gap: `recheckUpcomingMenusForClient` is NOT called from portal dietary updates; only called from chef-side intake flows (`lib/clients/intake-actions.ts:433`, `lib/clients/onboarding-actions.ts:166`). Menu conflict detection disconnected from portal dietary changes. **(CS-G14)**

### CS48. Dashboard Empty State for New Chef: **CONNECTED**

HeroMetricsClient (`hero-metrics-client.tsx:25-57`) detects `isNewAccount` (all zeros) and renders "Welcome to ChefFlow" banner with actionable links: "Add a client", "Create an event", "Set up inquiry widget". OnboardingBanner and OnboardingChecklistWidget show setup progress phases. Alerts section shows onboarding progress card when `!onboardingDone`. Dashboard provides welcome content and next steps, not bare zeros.

### CS57. Data Export Coverage: **PARTIAL**

Takeout system (`lib/exports/data-takeout-actions.ts`) covers 10 categories: recipes, clients, events, financials, menus, documents, conversations, photos, ingredients, profile.

NOT covered: surveys/feedback, AARs, shopping lists, staff members, hub/circles, notifications, activity logs, automations, prep timeline/blocks, recurring events, equipment inventory, leads/prospecting, todos. Substantial subset but not ALL chef data. **(CS-G15)**

### CS71. Circle Members Notified on Date Change: **DISCONNECTED** (CS-G16)

`updateEvent` (`lib/events/actions.ts:557-583`) notifies event collaborators (co-chefs via `event_collaborators` table) on date change but has zero awareness of circles. No query against `hub_group_events` or `hub_group_members`. No auto-post to circle feed. No SSE broadcast to circle viewers. Circle members only learn about date changes if chef manually posts.

### CS74. Rebook Circle Member Inheritance: **DISCONNECTED** (CS-G17)

Rebook flow (`lib/inquiries/public-actions.ts:528-536`) calls `addEventToGroup()` to link event to circle via `hub_group_events`. That is the ONLY action. No query of `hub_group_members` for member list. No auto-creation of `event_guests` rows. No auto-population of `guest_count` from membership count. No RSVP entries from circle members.

---

## P1 Scorecard

| #    | Question                         | Verdict          | Gap #                              |
| ---- | -------------------------------- | ---------------- | ---------------------------------- |
| CS2  | Survey feedback to menu builder  | **PARTIAL**      | CS-G7                              |
| CS4  | Client LTV in inquiry triage     | **PARTIAL**      | CS-G8                              |
| CS5  | Client dormancy re-engagement    | **CONNECTED**    | --                                 |
| CS7  | Partner notified on conversion   | **DISCONNECTED** | CS-G9                              |
| CS9  | Circle events on calendar        | **CONNECTED**    | --                                 |
| CS13 | Receipt OCR to price catalog     | **CONNECTED**    | --                                 |
| CS18 | Concurrent event consolidation   | **PARTIAL**      | CS-G10 (cost split missing)        |
| CS20 | Client dormancy on dashboard     | **CONNECTED**    | --                                 |
| CS21 | Prep deadlines on dashboard      | **CONNECTED**    | --                                 |
| CS30 | Price catalog to event costs     | **PARTIAL**      | CS-G11 (stale computed_cost_cents) |
| CS34 | Notification type UI coverage    | **PARTIAL**      | CS-G12 (21 missing icons)          |
| CS37 | Collaborator notification        | **PARTIAL**      | CS-G13 (no in-app notification)    |
| CS44 | Client dietary to chef view      | **PARTIAL**      | CS-G14 (no menu recheck)           |
| CS48 | Dashboard empty state            | **CONNECTED**    | --                                 |
| CS57 | Data export coverage             | **PARTIAL**      | CS-G15 (10/25+ categories)         |
| CS71 | Circle date change notification  | **DISCONNECTED** | CS-G16                             |
| CS74 | Rebook circle member inheritance | **DISCONNECTED** | CS-G17                             |

**P1 Summary: 5 CONNECTED, 9 PARTIAL, 3 DISCONNECTED.** 11 new gap tickets (CS-G7 through CS-G17).

**Top actionable P1 gaps:**

1. **CS-G16 (Circle date change):** Wire `updateEvent` date-change block to query `hub_group_events` -> `hub_group_members` -> send circle notification. Pattern exists in collaborator notification block. ~2 hours.
2. **CS-G17 (Rebook member inheritance):** In `addEventToGroup`, query circle members and auto-create RSVP/guest entries. ~2 hours.
3. **CS-G9 (Partner conversion notification):** Add `createNotification` + email to `convertInquiryToEvent` when `referral_partner_id` exists. Template already exists. ~1 hour.
4. **CS-G13 (Collaborator in-app notification):** Add `createChefNotification()` call to `inviteChefToEvent()`. Helper already exists with correct comment. ~15 min.
5. **CS-G12 (Notification icons):** Import 21 missing icons into `ICON_MAP`. Pure cosmetic, ~30 min.
6. **CS-G14 (Menu recheck on portal dietary):** Add `recheckUpcomingMenusForClient()` call to `postDietaryUpdate()`. One line. ~15 min.
7. **CS-G8 (LTV in triage):** Add LTV-based scoring tier (e.g., 0-20 pts based on `lifetime_value_cents` thresholds) to `inquiry-triage.ts`. ~1 hour.
8. **CS-G7 (Survey to menu):** Surface `dish_feedback` ratings in menu builder when building for a returning client. Architectural decision needed.
9. **CS-G11 (Price propagation):** Add `recomputeRecipeCosts()` call to `bulkUpdateIngredientPrices`. Or fix SQL to prefer live prices over stale `computed_cost_cents`. ~1 hour.
10. **CS-G10 (Consolidated cost split):** Add per-event proportional cost allocation to consolidated grocery list. Design decision needed.
11. **CS-G15 (Export coverage):** Add missing takeout categories incrementally. Each ~30 min.
