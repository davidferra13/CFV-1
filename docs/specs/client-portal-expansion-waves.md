# Client Portal Expansion: 5-Wave Build Prompts

> Generated 2026-05-10. Each wave is a self-contained agent handoff prompt.
> Copy-paste each wave into a new Claude Code agent session.

---

## Wave 1: S-Tier Foundations (My Documents, My Notifications, My Household)

```
## TASK: Build 3 new client portal domains

You are building 3 new top-level domains in ChefFlow's client portal at `app/(client)/`.
Read CLAUDE.md first. This is a Next.js 14 app with App Router, Drizzle ORM, PostgreSQL,
Auth.js v5, dark stone-900 theme.

### Architecture patterns (MANDATORY - follow exactly)

**Page pattern** (see `app/(client)/my-spending/page.tsx` for minimal example):
- Server component, `export const metadata`
- Call `await requireClient()` from `@/lib/auth/get-user` (returns user with id, email, entityId, tenantId, role)
- Fetch data via server actions in `lib/` domain files
- Render client component from `components/` or co-located file
- Include `<ActivityTracker eventType="page_viewed" />` at bottom

**Layout**: Already handled by `app/(client)/layout.tsx`. No new layouts needed.

**Styling**: Tailwind, dark mode (bg-stone-900, text-stone-100), Cards from `@/components/ui/card`,
Badges from `@/components/ui/badge`, Alerts from `@/components/ui/alert`. Max width `max-w-5xl mx-auto`.

**Nav integration**: After building all 3 domains, add them to the `navItems` array in
`components/navigation/client-nav.tsx`. Use icons from `@/components/ui/icons` (lucide re-exports).
My Documents goes after Payments. My Notifications is NOT a nav item (it's the NotificationBell target).
My Household goes after Profile.

### Domain 1: My Documents (`/my-documents`)

**What**: Centralized document hub. All contracts, invoices, proposals, and receipts across all events.
Currently these are scattered inside individual event detail pages. Clients need one place to find
"my invoice from March."

**Data sources** (these already exist, query them):
- `lib/contracts/actions.ts` - getClientEventContract (adapt to get ALL contracts for a client)
- `lib/events/client-actions.ts` - getClientEvents (has payment/invoice data)
- `lib/proposals/client-proposal-actions.ts` - client proposals
- `lib/finance/client-spending-insights.ts` - financial records

**Build**:
1. Server action: `lib/documents/client-document-actions.ts`
   - `getClientDocuments()` - aggregates contracts, invoices, proposals across all events
   - Returns typed array: `{ id, type: 'contract'|'invoice'|'proposal'|'receipt', title, eventTitle, date, status, downloadUrl?, viewUrl }`
   - Auth: use requireClient(), scope to user's entityId
2. Page: `app/(client)/my-documents/page.tsx`
   - Filter tabs: All | Contracts | Invoices | Proposals | Receipts
   - Each row: document type icon, title, event name, date, status badge, "View" link (to existing event sub-page)
   - Empty state: "No documents yet. Documents from your events will appear here."
   - Loading: `app/(client)/my-documents/loading.tsx`
3. No new database tables needed. Aggregation queries only.

### Domain 2: My Notifications (`/my-notifications`)

**What**: Full notification history page. The NotificationBell component already exists in the layout
at `components/notifications/notification-bell.tsx` but links nowhere. This is where it should land.

**Data sources**:
- `lib/notifications/client-actions.ts` - notification queries
- `components/notifications/notification-bell.tsx` - existing bell component (read for context)
- `components/notifications/notification-provider.tsx` - existing provider
- Check `database/migrations/` for notification table schema (search for "notification")

**Build**:
1. Server action: `lib/notifications/client-notification-actions.ts`
   - `getClientNotificationHistory(page?: number)` - paginated notification list
   - `markAllAsRead()` - bulk mark read
   - Auth: requireClient(), scope to user ID
2. Page: `app/(client)/my-notifications/page.tsx`
   - Grouped by date (Today, Yesterday, This Week, Earlier)
   - Each notification: icon by type, message, timestamp, read/unread indicator, click-through link
   - "Mark all as read" button at top
   - Pagination at bottom
   - Loading: `app/(client)/my-notifications/loading.tsx`
3. Wire: Update NotificationBell to link to `/my-notifications` (currently may link nowhere or show a dropdown only)

### Domain 3: My Household (`/my-household`)

**What**: Manage household members and their dietary needs/allergies. Chef-side already has full
household CRUD. Client needs self-service.

**Data sources**:
- Search for "household" across `lib/` and `database/migrations/` to find the existing schema and actions
- `lib/clients/client-profile-actions.ts` - existing profile actions (may have household helpers)
- Check `components/clients/` for any household components

**Build**:
1. Server action: `lib/household/client-household-actions.ts`
   - `getMyHousehold()` - list household members
   - `addHouseholdMember(data)` - add with name, relationship, dietary, allergies
   - `updateHouseholdMember(id, data)` - edit
   - `removeHouseholdMember(id)` - soft delete with confirmation
   - Auth: requireClient(), scope to entityId
2. Page: `app/(client)/my-household/page.tsx`
   - Card per household member: name, relationship, dietary badges, allergy warnings
   - "Add Member" button opens inline form or modal
   - Edit/remove per member
   - Empty state: "Add your household members so your chef knows everyone's needs."
   - Loading: `app/(client)/my-household/loading.tsx`
3. Add to client-nav.tsx: `{ href: '/my-household', label: 'Household', icon: Users2 }` after Profile

### IMPORTANT RULES
- Never use em dashes in any text (use commas, semicolons, colons, or separate sentences)
- Never expose "OpenClaw" in UI text
- Every server action needs: auth gate, tenant scoping, input validation, error propagation
- Use `Promise.allSettled` for parallel data fetching (see my-rewards/page.tsx pattern)
- Dark theme: stone-900 bg, stone-100 text, brand-600 accents
- Run `npx tsc --noEmit --skipLibCheck` after building to verify no type errors
```

---

## Wave 2: A-Tier Event Experience (My Recap, My Calendar, My Guests)

```
## TASK: Build 3 new client portal domains (Wave 2)

You are building 3 new domains in ChefFlow's client portal at `app/(client)/`.
Read CLAUDE.md first. Next.js 14 App Router, Drizzle ORM, PostgreSQL, dark stone-900 theme.

### Architecture patterns

Follow the exact patterns in existing client portal pages:
- `app/(client)/my-spending/page.tsx` (minimal server component pattern)
- `app/(client)/my-rewards/page.tsx` (complex data fetching with Promise.allSettled)
- `app/(client)/layout.tsx` (auth via requireClient())
- `components/navigation/client-nav.tsx` (nav structure)

Every page: server component, `requireClient()` auth gate, data fetch, client component render,
`<ActivityTracker>` at bottom. Tailwind dark theme. Max width `max-w-5xl mx-auto`.

### Domain 1: My Recap (`/my-events/[id]/recap`)

**What**: Post-event recap page. The chef generates rich content (photos, after-action reports, stories)
but clients only see a basic event-summary. This is the "here's what we made for you" page
that clients share on social media.

**This is a sub-page of My Events, not a new top-level domain.**

**Data sources** (read these to understand what exists):
- `app/(chef)/events/[id]/story/` - chef's event story page (photos + narrative)
- `app/(chef)/events/[id]/aar/` - after-action report
- `app/(client)/my-events/[id]/event-summary/page.tsx` - existing client summary (enhance, don't replace)
- `lib/events/client-actions.ts` - getClientEventById
- Search for "event_photos", "event_media", "event_story" in lib/ and database/migrations/
- `lib/email/templates/photos-ready.tsx` - email that says "your photos are ready" (currently links nowhere in portal)

**Build**:
1. Server action: `lib/events/client-recap-actions.ts`
   - `getEventRecap(eventId)` - returns: event details, photo gallery, menu served (with dish descriptions), chef's notes/narrative (if shared), timeline of the evening
   - Only available for events with status "completed"
   - Auth: requireClient(), verify event belongs to this client
2. Page: `app/(client)/my-events/[id]/recap/page.tsx`
   - Hero: event date, location, guest count, event type
   - Photo gallery: grid layout, lightbox on click (use existing image patterns)
   - Menu recap: dishes served with descriptions (from the finalized menu)
   - Chef's notes: narrative text if the chef wrote one
   - "Share This Event" button (generates a shareable public link or downloads a summary)
   - "Book Again" CTA at bottom linking to /book-now
   - Loading: `app/(client)/my-events/[id]/recap/loading.tsx`
3. Wire: Add "View Recap" link on event detail page (`app/(client)/my-events/[id]/page.tsx`) for completed events
4. Wire: Update photos-ready email template to link to `/my-events/[id]/recap`

### Domain 2: My Calendar (`/my-calendar`)

**What**: Simple month calendar showing the client's booked events and key deadlines.
Reduces "when is my dinner again?" messages to the chef.

**Data sources**:
- `lib/events/client-actions.ts` - getClientEvents (already returns dates, statuses)
- `lib/client-work-graph/actions.ts` - getClientWorkGraphSnapshot (has action-required items with deadlines)
- Check for any existing calendar components in `components/calendar/` or `components/events/`

**Build**:
1. Server action: `lib/calendar/client-calendar-actions.ts`
   - `getClientCalendarEvents(month: number, year: number)` - returns events and deadlines for a given month
   - Each item: { date, title, type: 'event'|'deadline'|'payment_due', eventId, status, color }
   - Deadlines include: menu approval due, payment due, final guest count due, contract signing due
   - Auth: requireClient(), scope to entityId
2. Page: `app/(client)/my-calendar/page.tsx`
   - Month grid view (simple, not a full calendar library; build with CSS grid)
   - Color-coded dots: green = confirmed event, amber = pending action, blue = upcoming
   - Click a day to see event cards for that date
   - Month navigation (prev/next arrows)
   - List view toggle below calendar showing upcoming items chronologically
   - Loading: `app/(client)/my-calendar/loading.tsx`
3. Add to client-nav.tsx: `{ href: '/my-calendar', label: 'Calendar', icon: CalendarDays }` - insert before Payments

### Domain 3: My Guests (`/my-events/[id]/guests`)

**What**: Host-side guest management for a specific event. View guest list, RSVPs, dietary rollup,
add/remove guests. Currently hosts manage guests through public share links only.

**This is a sub-page of My Events, not a new top-level domain.**

**Data sources**:
- Search for "rsvp", "guest", "sharing" in lib/ to find existing guest/RSVP actions
- `lib/sharing/actions.ts` - RSVP and share functions
- `app/(chef)/events/[id]/guest-card/` - chef's guest management (reference for data model)
- `app/(client)/my-events/[id]/page.tsx` - existing event detail (already shows some RSVP info)
- Check database/migrations/ for guest_rsvps, event_guests, or similar tables

**Build**:
1. Server action: `lib/events/client-guest-actions.ts`
   - `getEventGuests(eventId)` - returns guest list with RSVP status, dietary info, allergies
   - `getDietaryRollup(eventId)` - aggregated dietary needs across all guests (e.g., "3 gluten-free, 1 nut allergy")
   - `addGuest(eventId, data)` - add a guest (name, email, dietary)
   - `removeGuest(eventId, guestId)` - remove
   - `resendRSVPInvite(eventId, guestId)` - resend RSVP link
   - Auth: requireClient(), verify this client is the host of this event
2. Page: `app/(client)/my-events/[id]/guests/page.tsx`
   - Guest list table: name, RSVP status (confirmed/pending/declined), dietary badges
   - Dietary rollup card at top: aggregated allergies and restrictions across all guests
   - "Add Guest" form (name + email minimum)
   - "Share RSVP Link" button (generates/copies the public RSVP link)
   - "Resend Invite" per guest
   - Empty state: "No guests added yet. Share your event link to start collecting RSVPs."
   - Loading: `app/(client)/my-events/[id]/guests/loading.tsx`
3. Wire: Add "Manage Guests" button on event detail page for events in bookable/confirmed status

### IMPORTANT RULES
- Never use em dashes in any text
- Never expose "OpenClaw" in UI text
- Every server action: auth gate, tenant scoping, input validation, error propagation
- Promise.allSettled for parallel fetches
- Dark theme: stone-900 bg, stone-100 text, brand-600 accents
- Run `npx tsc --noEmit --skipLibCheck` after building
```

---

## Wave 3: A/B-Tier Engagement (My Preferences, My Meals, My Referrals)

```
## TASK: Build 3 new client portal domains (Wave 3)

You are building 3 new domains in ChefFlow's client portal at `app/(client)/`.
Read CLAUDE.md first. Next.js 14 App Router, Drizzle ORM, PostgreSQL, dark stone-900 theme.

### Architecture patterns

Follow existing client portal pages exactly:
- `app/(client)/my-spending/page.tsx` (minimal pattern)
- `app/(client)/my-rewards/page.tsx` (complex pattern with Promise.allSettled)
- Auth: `requireClient()` from `@/lib/auth/get-user`
- Dark theme, max-w-5xl, ActivityTracker at bottom
- Nav: `components/navigation/client-nav.tsx`

### Domain 1: My Preferences (`/my-preferences`)

**What**: Dedicated dietary/allergy/preference management page. The current `/my-profile` page has
basic dietary fields, but the chef-side tracks much richer data: spice tolerance, cuisine preferences,
dislikes, favorites, allergy severity. The preference systems between hub-side and chef-side are
documented as NOT connected (see `docs/specs/codex-preference-sync-bridge.md`). This page is the
client's self-service preference center.

**Data sources**:
- `app/(client)/my-profile/page.tsx` and `client-profile-form.tsx` - existing profile with dietary fields
- `app/(client)/my-profile/meal-collaboration-panel.tsx` - existing meal collab panel
- `lib/clients/client-profile-actions.ts` - getMyProfile and related
- Search for "preference", "dietary", "allergy", "spice", "cuisine" in lib/ and database/
- `docs/specs/codex-preference-sync-bridge.md` - the sync gap spec
- `docs/specs/codex-guest-preference-profile.md` - richer preference columns

**Build**:
1. Server action: `lib/preferences/client-preference-actions.ts`
   - `getMyPreferences()` - returns all preference data (dietary restrictions, allergies with severity, cuisine prefs, spice tolerance, dislikes, favorites)
   - `updateMyPreferences(data)` - save preferences
   - These should write to the same tables the chef-side reads, bridging the sync gap
   - Auth: requireClient()
2. Page: `app/(client)/my-preferences/page.tsx`
   - Section 1: Dietary Restrictions (checkboxes: vegetarian, vegan, gluten-free, etc.)
   - Section 2: Allergies (list with severity: mild/moderate/severe per allergen)
   - Section 3: Cuisine Preferences (like/dislike/neutral per cuisine type)
   - Section 4: Spice Tolerance (slider: none/mild/medium/hot/extra hot)
   - Section 5: Dislikes (free-text list of specific ingredients/dishes)
   - Section 6: Favorites (free-text list)
   - Save button with optimistic update + toast
   - Info banner: "Your chef will see these preferences for all future events"
   - Loading: `app/(client)/my-preferences/loading.tsx`
3. Add to client-nav.tsx after Profile, before Payments

### Domain 2: My Meals (`/my-meals`)

**What**: For residency/recurring clients. Weekly meal board front-and-center in the portal.
Currently residency clients navigate to a specific Dinner Circle to find their meal board.
This promotes it to a first-class portal domain.

**Data sources**:
- `app/(chef)/meal-prep/` - chef's meal prep pages (reference for data model)
- Search for "meal_board", "meal_prep", "meal_plan" in lib/ and database/
- `app/(public)/hub/` - HubGroupView has meal board functionality
- `lib/hub/client-hub-actions.ts` - hub/circle data that includes meal boards
- `docs/specs/meal-feedback.md`, `docs/specs/weekly-template-cloning.md` - meal feature specs

**Build**:
1. Server action: `lib/meals/client-meal-actions.ts`
   - `getMyMealBoard()` - returns current week's meal plan (if client has active meal-prep/residency relationship)
   - `getUpcomingMeals(weeks?: number)` - future weeks
   - `submitMealFeedback(mealId, rating, notes)` - feedback on a specific meal
   - `requestMealChange(mealId, request)` - request a substitution or change
   - Auth: requireClient()
2. Page: `app/(client)/my-meals/page.tsx`
   - Week view: Mon-Sun grid with meals per day (breakfast/lunch/dinner if applicable)
   - Each meal card: dish name, description, dietary badges, photo if available
   - Feedback button per meal (thumbs up/down + optional note)
   - "Request Change" button per meal
   - Week navigation (prev/next)
   - If no active meal program: "This feature is for weekly meal prep clients. Talk to your chef about recurring meal service." with Book Now CTA
   - Loading: `app/(client)/my-meals/loading.tsx`
3. Add to client-nav.tsx: `{ href: '/my-meals', label: 'Meals', icon: UtensilsCrossed }` - only show if client has active meal program (conditionally rendered)

### Domain 3: My Referrals (`/my-referrals`)

**What**: Referral tracking dashboard. The `share-chef` page exists in My Hub but provides no
tracking. Clients who refer friends want to know: did my referral sign up? Did I earn points?
The `post-event-referral-ask.tsx` email asks clients to refer but gives no visibility into results.

**Data sources**:
- `app/(client)/my-hub/share-chef/page.tsx` - existing share page
- `lib/loyalty/actions.ts` - loyalty transactions may include referral credits
- Search for "referral" in lib/ and database/migrations/
- `lib/email/templates/post-event-referral-ask.tsx` - referral email
- Check loyalty_config for referral_points setting

**Build**:
1. Server action: `lib/referrals/client-referral-actions.ts`
   - `getMyReferrals()` - list of people I've referred: name/email, status (invited/signed_up/first_event_completed), points earned
   - `getMyReferralLink()` - unique referral link for this client
   - `getReferralStats()` - total referred, total who signed up, total points earned from referrals
   - Auth: requireClient()
2. Page: `app/(client)/my-referrals/page.tsx`
   - Stats row at top: "X Referred | Y Signed Up | Z Points Earned"
   - Referral link section: copyable link, share buttons
   - Referral list: table showing each referral with status badge and points earned
   - How it works: brief explanation ("Refer a friend, earn X points when they book their first event")
   - Empty state: "Share your chef with friends and earn rewards!"
   - Loading: `app/(client)/my-referrals/loading.tsx`
3. Add to My Hub nav or as standalone in sidebar near Rewards

### IMPORTANT RULES
- Never use em dashes in any text
- Never expose "OpenClaw" in UI text
- Every server action: auth gate, tenant scoping, input validation, error propagation
- Promise.allSettled for parallel fetches
- Dark theme: stone-900 bg, stone-100 text, brand-600 accents
- Run `npx tsc --noEmit --skipLibCheck` after building
```

---

## Wave 4: B-Tier Trust and Retention (My Receipts, My Recurring, My Passport)

```
## TASK: Build 3 new client portal domains (Wave 4)

You are building 3 new domains in ChefFlow's client portal at `app/(client)/`.
Read CLAUDE.md first. Next.js 14 App Router, Drizzle ORM, PostgreSQL, dark stone-900 theme.

### Architecture patterns

Follow existing client portal pages:
- `app/(client)/my-spending/page.tsx` (minimal), `app/(client)/my-rewards/page.tsx` (complex)
- Auth: `requireClient()` from `@/lib/auth/get-user`
- Dark theme, max-w-5xl, ActivityTracker, loading.tsx per route

### Domain 1: My Receipts (`/my-receipts`)

**What**: Grocery cost transparency. The service lifecycle blueprint (Stage 7) explicitly states
"Grocery receipts shared with client (if pass-through model)" and "Grocery reconciliation shared
(actuals vs. estimate)." Zero client-facing pages exist for this.

For clients using the pass-through grocery model, this builds trust: "here's what your groceries
actually cost vs. what we estimated."

**Data sources**:
- `app/(chef)/events/[id]/receipts/` - chef's receipt management
- `app/(chef)/events/[id]/procurement/` - procurement data
- `app/(chef)/events/[id]/grocery-quote/` - grocery estimates
- Search for "receipt", "grocery", "procurement" in lib/ and database/
- `lib/email/templates/commerce-sale-receipt.tsx` - receipt email template
- `lib/finance/client-spending-insights.ts` - spending data

**Build**:
1. Server action: `lib/receipts/client-receipt-actions.ts`
   - `getMyReceipts()` - all grocery receipts across events, with: event title, date, store, items, total, receipt image URL if uploaded
   - `getGroceryReconciliation(eventId)` - estimated vs actual grocery cost for a specific event
   - Auth: requireClient(), scope to entityId
2. Page: `app/(client)/my-receipts/page.tsx`
   - Filter by event (dropdown)
   - Receipt cards: store name, date, total, item count, link to full receipt image
   - Reconciliation summary per event: "Estimated: $X | Actual: $Y | Difference: $Z"
   - If no pass-through model: "Your chef handles grocery costs directly. No receipts to display."
   - Loading: `app/(client)/my-receipts/loading.tsx`

### Domain 2: My Recurring (`/my-recurring`)

**What**: Manage recurring service schedules. Chef has `/clients/recurring`, `/finance/recurring`,
`/finance/retainers`. Client has nothing. Weekly meal-prep clients and retainer clients can't view
or manage their schedule.

**Data sources**:
- `app/(chef)/clients/recurring/` - chef's recurring board
- Search for "recurring", "retainer", "subscription" in lib/ and database/
- `lib/finance/` - financial records related to recurring payments

**Build**:
1. Server action: `lib/recurring/client-recurring-actions.ts`
   - `getMyRecurringServices()` - active recurring arrangements: type (weekly meal prep, monthly retainer, etc.), schedule, next date, price, status
   - `getRecurringHistory(serviceId)` - past sessions/deliveries for a recurring service
   - `requestScheduleChange(serviceId, request)` - request a date change or pause
   - Auth: requireClient()
2. Page: `app/(client)/my-recurring/page.tsx`
   - Active services list: card per service showing type, frequency, next date, price
   - Each card expandable to show recent history (last 5 sessions)
   - "Request Change" button per service (opens form: reschedule, pause, or cancel request)
   - If no recurring services: "No recurring services active. Ask your chef about weekly meal prep or monthly retainer options." with Book Now CTA
   - Loading: `app/(client)/my-recurring/loading.tsx`
3. Add to client-nav.tsx near Calendar/Bookings if client has active recurring services

### Domain 3: My Passport (`/my-passport`)

**What**: Client self-service for communication and autonomy preferences. From the
`codex-client-passport-and-delegation.md` spec: communication mode (direct vs delegate),
chef autonomy level, standing instructions, auto-approve thresholds, default locations.
Currently all chef-entered. Client should control their own passport.

**Data sources**:
- `docs/specs/codex-client-passport-and-delegation.md` - full passport spec
- `docs/specs/codex-client-passport-persistence.md` - persistence spec
- Search for "passport", "delegation", "autonomy" in lib/ and database/
- `lib/clients/client-profile-actions.ts` - may have some passport fields already

**Build**:
1. Server action: `lib/passport/client-passport-actions.ts`
   - `getMyPassport()` - current passport settings
   - `updateMyPassport(data)` - save settings
   - Fields: communication_mode ('direct'|'delegate'|'hybrid'), delegate_contact (name, phone, email),
     chef_autonomy_level ('ask_everything'|'trust_basics'|'full_trust'),
     auto_approve_threshold (dollar amount for auto-approving menu changes),
     standing_instructions (free text: "always use organic", "no cilantro ever"),
     default_locations (array of saved addresses)
   - Auth: requireClient()
2. Page: `app/(client)/my-passport/page.tsx`
   - Section 1: Communication Mode - radio buttons with descriptions
     ("I handle everything" / "My assistant handles logistics" / "Split: I decide menus, assistant handles scheduling")
   - Section 2: Delegate Contact - form fields for assistant/spouse/manager contact info
   - Section 3: Chef Trust Level - slider or radio
     ("Ask me about everything" / "Handle basics, ask about big decisions" / "I trust you completely")
   - Section 4: Auto-Approve Threshold - "Automatically approve menu changes under $___"
   - Section 5: Standing Instructions - textarea
   - Section 6: Default Locations - list of saved addresses with add/edit/remove
   - Save with toast confirmation
   - Loading: `app/(client)/my-passport/loading.tsx`
3. Add to client-nav.tsx after Preferences, before Payments

### IMPORTANT RULES
- Never use em dashes in any text
- Never expose "OpenClaw" in UI text
- Every server action: auth gate, tenant scoping, input validation, error propagation
- Promise.allSettled for parallel fetches
- Dark theme: stone-900 bg, stone-100 text, brand-600 accents
- Run `npx tsc --noEmit --skipLibCheck` after building
```

---

## Wave 5: C/D-Tier Polish (My Gift Cards, My Reviews, My Recipes, My Timeline, Browse Dates)

```
## TASK: Build 5 lighter client portal domains (Wave 5 - polish)

You are building 5 smaller domains in ChefFlow's client portal at `app/(client)/`.
Read CLAUDE.md first. Next.js 14 App Router, Drizzle ORM, PostgreSQL, dark stone-900 theme.
These are lighter builds than previous waves. Keep each page focused and simple.

### Architecture patterns

Same as all client portal pages:
- Server component, `requireClient()` auth, data fetch, client component, ActivityTracker
- Dark theme, max-w-5xl, Cards/Badges/Alerts from @/components/ui/
- Loading.tsx per route

### Domain 1: My Gift Cards (`/my-gift-cards`)

**What**: View gift card balances, redemption history, send gift cards to friends.
Purchase exists on public chef profile pages. Confirmation emails go out. No portal page to manage.

**Data sources**:
- `lib/loyalty/voucher-actions.ts` - getVoucherAndGiftCards (already used on my-rewards)
- Search for "gift_card", "voucher" in lib/ and database/
- `app/(public)/chef/[slug]/gift-cards/` - public purchase page (reference)

**Build**:
1. `lib/gift-cards/client-gift-card-actions.ts`
   - `getMyGiftCards()` - purchased and received gift cards with balance, status, recipient
   - `getGiftCardTransactions(cardId)` - usage history per card
2. `app/(client)/my-gift-cards/page.tsx`
   - Card per gift card: balance, original value, recipient (if sent), status, expiry
   - Click to expand: transaction history
   - "Send a Gift Card" CTA linking to public purchase page
   - Empty: "No gift cards yet."

### Domain 2: My Reviews (`/my-reviews`)

**What**: View past reviews you've submitted. Edit pending ones. See how your testimonial
appears on the chef's profile.

**Data sources**:
- Search for "review", "testimonial", "feedback" in lib/ and database/
- `app/(chef)/reviews/` - chef's review dashboard (reference)
- `app/(public)/review/` - public review submission

**Build**:
1. `lib/reviews/client-review-actions.ts`
   - `getMyReviews()` - all reviews with: event title, date, rating, text, status (published/pending/draft), chef response if any
   - `updateReview(reviewId, data)` - edit a pending/draft review
2. `app/(client)/my-reviews/page.tsx`
   - Review cards: star rating, event name, date, excerpt, status badge
   - Click to expand: full review text, chef's response, "Edit" button if still editable
   - Events awaiting review: list of completed events with no review + "Write Review" CTA
   - Empty: "No reviews yet. After your next event, share your experience!"

### Domain 3: My Recipes (`/my-recipes`)

**What**: Collection of recipes shared by the chef. Emotional keepsake.
The `recipe-share.tsx` email sends recipes to clients but they land in email only.

**Data sources**:
- `lib/email/templates/recipe-share.tsx` - recipe sharing email
- Search for "recipe_share", "shared_recipe" in lib/ and database/
- `app/(chef)/recipes/` - chef's recipe management

**Build**:
1. `lib/recipes/client-recipe-actions.ts`
   - `getMySharedRecipes()` - recipes the chef has shared with this client
2. `app/(client)/my-recipes/page.tsx`
   - Recipe cards: name, cuisine tag, prep time, image if available
   - Click to expand: full recipe (ingredients, instructions, chef's notes)
   - Empty: "Your chef hasn't shared any recipes with you yet. After your next event, they might share something special!"
   - Search/filter by cuisine type

### Domain 4: My Timeline (`/my-events/[id]/timeline`)

**What**: Visual journey timeline for a specific event showing every milestone from inquiry
to completion. Event reminder emails fire at 30d/14d/2d but there's no visual timeline.
The journey stepper on event detail partially covers this; this is the expanded version.

**This is a sub-page of My Events.**

**Data sources**:
- `lib/events/journey-steps.ts` - buildJourneySteps, getCurrentJourneyAction
- `lib/events/operating-spine.ts` - buildClientEventProgress
- `app/(client)/my-events/[id]/page.tsx` - existing event detail with journey stepper

**Build**:
1. `lib/events/client-timeline-actions.ts`
   - `getEventTimeline(eventId)` - full chronological timeline: inquiry submitted, quote sent, contract signed, menu approved, payment made, event day, photos shared, review submitted, etc. with dates
2. `app/(client)/my-events/[id]/timeline/page.tsx`
   - Vertical timeline visualization (line with dots/icons per milestone)
   - Each milestone: icon, title, date, status (completed/current/upcoming)
   - Current step highlighted
   - Upcoming steps shown as faded/dashed
   - Link back to event detail

### Domain 5: Browse Dates (`/browse-dates`)

**What**: Let clients browse the chef's available dates for self-serve booking.
The `availability-signal.tsx` email notifies about openings. This is the portal browser.

**Data sources**:
- `app/(chef)/availability/` - chef's availability management
- Search for "availability", "available_dates" in lib/ and database/
- `lib/email/templates/availability-signal.tsx` - availability email

**Build**:
1. `lib/availability/client-availability-actions.ts`
   - `getChefAvailability(month: number, year: number)` - available dates for the client's chef
   - Only shows dates the chef has explicitly marked as available (not the chef's full calendar)
2. `app/(client)/browse-dates/page.tsx`
   - Month calendar grid (reuse pattern from Wave 2's My Calendar if built)
   - Available dates highlighted in green, unavailable grayed out
   - Click available date to pre-fill Book Now with that date
   - If chef hasn't published availability: "Your chef hasn't published their available dates. Use Book Now to request a specific date."

### Nav updates (all at once at the end):
- My Gift Cards: near Rewards
- My Reviews: near Profile
- My Recipes: near bottom, optional/secondary
- Browse Dates: near Book Now button
- Timeline and Guests are sub-pages, no nav entry needed

### IMPORTANT RULES
- Never use em dashes in any text
- Never expose "OpenClaw" in UI text
- Every server action: auth gate, tenant scoping, input validation, error propagation
- Promise.allSettled for parallel fetches
- Dark theme: stone-900 bg, stone-100 text, brand-600 accents
- Run `npx tsc --noEmit --skipLibCheck` after building
```
