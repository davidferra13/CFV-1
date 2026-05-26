# Exit Eval: Chef / OPERATIONAL TOOLS & CALCULATIONS (Part 2)

> **Batch:** Wave 1 | 7 scenarios (#80-#86)
> **Role:** Chef
> **Evaluator:** Claude (Solo mode)
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)

---

## Scenario #80: Manage a waitlist during busy season

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why chef leaves:** Chef has more inquiries than available dates. Needs to track who is waiting, for which date ranges, with what occasion/priority, and auto-contact them when a cancellation opens a slot. The operational decision: "who do I bump up, who gets the next open Saturday, and how do I not lose a $3,000 booking because I forgot someone was waiting?"

**Context ChefFlow has:**

- Full calendar with availability, conflicts, and gap detection
- Client profiles with event history, spend, LTV
- Inquiry pipeline with status tracking
- Waitlist entries table with status (waiting/contacted/booked/expired)
- WaitlistManager component with filtering, stats, add/update/remove/convert actions
- Scheduled waitlist sweep API (`/api/scheduled/waitlist-sweep`)
- Waitlist notification panel
- Calendar integration showing waitlist entries

**Data source?** No. This is internal operational data, not an external API.

**Client-collaborative angle:** Client could self-add to waitlist via public booking page or Dinner Circle, specifying preferred dates, occasion, guest count, and flexibility. This eliminates the chef manually entering waitlist data from emails/texts.

**Physical reality:** Screen-based. Chef checks waitlist when a cancellation comes in or when planning next month. Dashboard/list UI is the right interface.

**Compounding:** High. Busy season patterns repeat annually. Client priority/spend history makes future waitlist decisions faster. A chef who knows "this client always books Saturdays in December" can proactively reach out.

**Solution design:**

- ChefFlow ALREADY HAS this built: `lib/scheduling/waitlist-actions.ts`, `app/(chef)/waitlist/page.tsx`, `components/scheduling/waitlist-manager.tsx`
- Full CRUD with status tracking (waiting, contacted, booked, expired)
- Waitlist-to-event conversion flow
- Stats dashboard (total, waiting, contacted, booked, expired, conversion rate)
- Scheduled sweep for auto-expiry
- Gap: priority scoring based on client LTV/spend history (would auto-sort waitlist by value)
- Gap: auto-notification when a matching date opens (cancellation triggers waitlist scan)

**Where it appears:**

- `/waitlist` dedicated page
- Calendar sidebar (waitlist entries on dates)
- Inquiry pipeline (waitlisted status)
- Public booking page (client self-add to waitlist)

**What remains as permanent exit:**
Nothing. This is fully reducible. Chef never needs a spreadsheet or notes app for waitlist management. The only gap is intelligence (auto-prioritize by LTV, auto-notify on cancellation).

**Priority:** Daily during busy season (Nov-Dec, May-Jun) x Low effort (already built, needs polish) = HIGH value, LOW remaining effort
**Spec needed?** No. Feature exists. Enhancement items (priority scoring, cancellation-triggered notifications) can go in build queue.

---

## Scenario #81: Calculate tip/gratuity split for hired staff

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why chef leaves:** After a multi-staff event, the chef receives tips (cash + card) and must split them among hired staff. The operational decision: "Who worked how many hours, what's the fair share, and how do I pay each person?" Chef currently opens a calculator or spreadsheet, tallies hours, divides tips, then sends individual Venmo/Zelle payments.

**Context ChefFlow has:**

- Staff directory with roles, rates, contact info
- Staff clock-in/clock-out with elapsed time per event
- Staff assignment per event
- Tip entry tracking (`lib/staff/tip-actions.ts`): cash tips, card tips, hours worked per staff member per shift
- Tip pool configuration: equal split, hours-based, or points-based methods
- Tip distribution preview: calculates each staff member's share with percentage
- `tip_entries`, `tip_pool_configs`, `tip_distributions` database tables
- Event close-out wizard with tip step
- Remy agent action for recording tips per event

**Data source?** No. All internal calculation based on hours worked and tip amounts entered.

**Client-collaborative angle:** None directly. Tips are between chef and staff. However, if a client adds a gratuity through the payment portal, that amount could auto-flow into the tip pool.

**Physical reality:** Often calculated at end of night, possibly in the kitchen or car. Mobile-friendly UI with large tap targets. Quick entry: "total tips tonight: $240, 3 staff, here are their hours." Result: "Pay Sarah $95, Pay Mike $80, Pay Jake $65."

**Compounding:** Medium. Pool configurations persist across events. Staff roles and typical hours build a baseline. Over time the system learns "Saturday dinner parties average $200 in tips split 3 ways."

**Solution design:**

- ChefFlow ALREADY HAS this built: `lib/staff/tip-actions.ts` with full CRUD
- Tip entry per staff member per shift (cash + card breakdown)
- Three pool methods: equal, hours-based, points-based
- Distribution preview with per-person share amounts and percentages
- Pool config saved and reusable across events
- Gap: no direct integration with event close-out wizard's tip step (tip step exists but may not wire to tip-actions)
- Gap: no "quick split" mode (enter total, select staff who worked, auto-calculate)
- Gap: no Venmo/Zelle payment link generation (permanent exit for actual payment)

**Where it appears:**

- Event close-out wizard (tip step)
- `/staff/tips` management page
- Event detail page (staff tab)
- Mobile: end-of-night quick entry

**What remains as permanent exit:**
Actual payment transfer (Venmo, Zelle, cash handoff). ChefFlow calculates the split; chef still sends money externally. Could generate "pay $X to [name]" deep links for Venmo/Zelle.

**Priority:** Per multi-staff event (weekly for active chefs) x Low effort (already built, needs wiring) = HIGH value, LOW remaining effort
**Spec needed?** No. Core feature exists. Wire tip-actions into event close-out flow and add quick-split mode.

---

## Scenario #82: Create/manage gift certificates

**Original classification:** Bridgeable (could generate tied to bookings)
**Reclassified to:** Reducible

**Why chef leaves:** A client wants to gift a private dinner experience to a friend/family member. Chef currently creates a custom certificate in Canva or Square, tracks it manually, and hopes they remember to honor it when the recipient calls. The operational decision: "How much, who's it for, when does it expire, and how do I track redemption?"

**Context ChefFlow has:**

- Full gift certificate system (`lib/gifts/gift-certificate-actions.ts`): create, list, redeem, void, stats
- Unique 8-character unambiguous codes (no O/0, I/1 confusion)
- Federal compliance: 5-year minimum expiry enforced by default
- Purchaser and recipient tracking with email
- Balance tracking (partial redemption support)
- Status lifecycle: active, redeemed, expired, voided
- Stats dashboard: total sold, total redeemed, outstanding balance, active count
- Voucher system (`lib/loyalty/voucher-actions.ts`): vouchers and gift cards with delivery
- Public gift card purchase page (`/chef/[slug]/gift-cards`)
- Client-facing gift card management (`/my-gift-cards`)
- Email templates for purchase confirmation and chef notification
- Holiday promo code creation (`lib/holidays/outreach-actions.ts`)
- Loyalty/rewards integration

**Data source?** No. Entirely internal. Code generation, tracking, redemption all in-app.

**Client-collaborative angle:** Strong. Client can purchase gift certificates directly through the chef's public profile page. Recipient receives code via email. When recipient books, they enter the code and it auto-applies. Zero chef involvement in the purchase-to-redemption flow.

**Physical reality:** Screen-based. Chef may want to print a physical certificate for hand-delivery at events. PDF generation of a branded certificate would be the bridge.

**Compounding:** Medium. Gift certificate patterns reveal: which clients gift most (referral champions), average gift value, redemption rate, seasonal gifting peaks (holidays, birthdays). This feeds client intelligence.

**Solution design:**

- ChefFlow ALREADY HAS this fully built
- Public purchase flow, code generation, balance tracking, redemption, stats
- Email delivery to recipient
- Chef notification on purchase
- Gap: printable/PDF branded certificate for physical gifting
- Gap: gift certificate as a marketing tool (e.g., "Buy a $500 dinner, get $50 bonus" promotions)

**Where it appears:**

- `/clients/gift-cards` (chef management)
- `/chef/[slug]/gift-cards` (public purchase)
- `/my-gift-cards` (client portal)
- Event payment flow (redemption code input)
- Loyalty/rewards system integration

**What remains as permanent exit:**
Nothing for digital certificates. Physical certificates might still use Canva for custom design, but ChefFlow could generate a PDF. This is fully reducible.

**Priority:** Monthly (gift-giving occasions) x Zero effort (already built) = MEDIUM value, DONE
**Spec needed?** No. Feature is complete. PDF certificate generation is a nice-to-have enhancement.

---

## Scenario #83: Send thank-you / follow-up gifts to clients

**Original classification:** Permanent exit (could remind + track)
**Reclassified to:** Partially Reducible

**Why chef leaves:** After a great event, chef wants to send a physical thank-you: a bottle of wine, flowers, a handwritten card, a jar of homemade jam. The operational decision: "Which clients deserve a gesture, what's appropriate, when should I send it, and did I follow through?"

**Context ChefFlow has:**

- Gratitude tracking system (`lib/commitment/gratitude.ts`): client_thank_you, vendor_thank_you, team_recognition, venue_thanks
- Gratitude deadlines (24 hours for client thank-you)
- Compliance tracking: overdue violations, quarterly compliance percentage
- Reliability correlation: gratitude compliance vs client return rate
- Post-event outreach panel (guest follow-up)
- Client milestone reminders (birthday, anniversary, 10th dinner)
- Holiday outreach system (`lib/holidays/outreach-actions.ts`)
- Direct outreach from client profile (email/SMS)
- Client profile: preferences, favorites, relationship notes
- Event close-out wizard with reflection step

**Data source?** No for the decision/tracking. Yes for the actual gift: Amazon, florists, wine shops are permanent external destinations.

**Client-collaborative angle:** Minimal. This is chef-initiated. However, Dinner Circle post-event feedback could surface "the client loved the lavender creme brulee" which informs what gift resonates (e.g., a lavender plant, a recipe card).

**Physical reality:** The gift itself is physical. Chef needs: (1) reminder to send, (2) suggestion of what to send, (3) confirmation they did it. The buying/sending is external.

**Compounding:** High. Gift history per client builds a relationship map. "Last year I sent wine, this year do something different." Tracking what was sent prevents repetition and shows escalating relationship investment. Clients who receive gifts have higher return rates (the gratitude correlation ChefFlow already measures).

**Solution design:**

- ChefFlow ALREADY HAS gratitude tracking, deadline enforcement, and compliance scoring
- Gap: gift suggestion engine based on client preferences, past events, occasion type
- Gap: gift log per client (what was sent, when, cost, client reaction)
- Gap: gift budget tracking (annual spend on client gifts as a business expense)
- Gap: curated gift ideas by occasion type (post-dinner, birthday, holiday, apology)
- The actual purchase/sending remains external (Amazon, florist, etc.)

**Where it appears:**

- Event close-out wizard (gratitude step)
- Client profile (relationship tab, gift history)
- Dashboard alerts (overdue thank-you notifications)
- Reminders system (milestone-triggered gift prompts)

**What remains as permanent exit:**
Purchasing and sending the physical gift. Chef will always leave to buy flowers, order wine, or mail a card. ChefFlow's job: remind, suggest, track, and measure the ROI of gratitude gestures.

**Priority:** Per event (2-4x/week for active chefs) x Medium effort (tracking exists, gift log/suggestions needed) = MEDIUM value, MEDIUM effort
**Spec needed?** No. Gratitude system exists. Gift log and suggestion features are incremental additions to the commitment domain.

---

## Scenario #84: Manage recurring meal prep schedule

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why chef leaves:** Chef has 3-5 meal prep clients on different cadences: Client A wants weekly (Mon delivery), Client B wants biweekly (Thu delivery), Client C wants daily meals. Chef currently manages this in a spreadsheet or calendar app because the schedule, menu rotation, delivery logistics, and billing all need to sync. The operational decision: "What am I cooking for whom this week, what's the shopping list, and when do I deliver?"

**Context ChefFlow has:**

- Full recurring services system (`lib/recurring/actions.ts`): create, update, pause, end
- Service types: weekly_meal_prep, weekly_dinners, daily_meals, biweekly_prep, other
- Frequency options: weekly, biweekly, monthly
- Day-of-week assignment (multi-day support)
- Rate tracking per service
- Start/end date management with pause capability
- Recurring-to-event auto-generation (`lib/scheduling/recurring-auto-generate.ts`)
- Meal prep program management (`lib/meal-prep/program-actions.ts`)
- Meal prep dashboard with program listing
- Weekly meal board (`lib/hub/meal-board/`)
- Recurring meals manager component
- Weekly planner component
- Batch aggregation for shopping across programs
- Container tracking and delivery actions
- Client recurring booking panel
- Recurring invoice generation (`lib/finance/recurring-invoice-actions.ts`)
- Circle bridge for recurring services (`lib/recurring/circle-bridge.ts`)
- Weekly retro/reflection for meal prep (`lib/recurring/weekly-retro-actions.ts`)
- Menu suggestion bundle and recommendation drafting
- Calendar integration showing recurring blocks

**Data source?** No. Entirely internal scheduling and menu management.

**Client-collaborative angle:** Strong. Meal prep clients can submit preferences, allergies, and feedback through Dinner Circle. "I'm tired of chicken" or "no onions this week" flows directly into menu planning. Client portal shows upcoming meals and delivery schedule.

**Physical reality:** Chef needs a printable weekly prep sheet: what to cook, quantities, container labels, delivery route. Print is primary for kitchen execution. Digital for planning and client communication.

**Compounding:** Very high. Menu rotation patterns, client preference evolution, seasonal ingredient availability, batch cooking efficiencies, and shopping list optimization all compound. After 3 months of weekly prep for a client, the system knows their entire preference profile and can auto-suggest menus.

**Solution design:**

- ChefFlow ALREADY HAS this comprehensively built
- Recurring service creation with full scheduling
- Auto-generation of events from recurring templates
- Meal prep programs with batch aggregation
- Weekly planner, meal board, container tracking
- Recurring invoicing
- Client-facing recurring meal portal
- Gap: consolidated weekly view across ALL prep clients (single page: "this week I'm cooking X meals for Y clients")
- Gap: menu rotation intelligence (don't repeat last week's meals)
- Gap: batch shopping list across all prep clients for one shopping trip

**Where it appears:**

- `/meal-prep` dashboard
- `/clients/[id]/recurring` per-client recurring view
- `/clients/recurring` all recurring services
- Calendar (recurring blocks)
- Weekly meal board
- Client portal (`/my-recurring`)

**What remains as permanent exit:**
Nothing for schedule management. Chef may still leave to shop (grocery stores) and deliver (driving), but the planning/tracking/billing loop is fully in-app.

**Priority:** Daily for meal prep chefs x Zero effort (already built) = CRITICAL value for meal prep operators, DONE
**Spec needed?** No. Feature is comprehensive. Cross-client weekly consolidation view and rotation intelligence are enhancements.

---

## Scenario #85: Schedule social media posts

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why chef leaves:** Chef batch-creates content (food photos, behind-the-scenes, recipe tips) and wants to schedule posts across Instagram, TikTok, Facebook at optimal times throughout the week. Currently uses Later, Buffer, or Meta Business Suite. The operational decision: "What content goes where, when does it post, and is my feed consistent?"

**Context ChefFlow has:**

- Full social media management system (`lib/social/actions.ts`)
- Annual content calendar with posts-per-week configuration
- Content pillars: recipe, behind_scenes, education, social_proof, offers, seasonal
- Multi-platform support: Instagram, Facebook, TikTok, LinkedIn, X, Pinterest, YouTube Shorts
- Per-platform captions with master caption
- Queue settings: target days, times, timezone, holdout slots
- Post status lifecycle: idea, draft, approved, queued, published, archived
- Media type support: image, video, carousel, text
- Social publishing engine (`lib/social/publishing/engine.ts`): scheduled auto-publish via cron
- OAuth credential management per platform
- Token refresh for Meta platforms
- Social post editor component
- Social queue settings form
- Annual calendar visualization
- Month grid view
- Slot card components
- Media vault for asset storage
- AI-generated captions from event data
- Post-event content generation (`lib/content/post-event-content-actions.ts`)
- Social asset management with 100MB upload support

**Data source?** Yes, but ChefFlow IS the data source here. It publishes TO external platforms via their APIs.

**Client-collaborative angle:** Minimal. Social media is chef's personal brand. Clients might be tagged or featured, but they don't participate in scheduling.

**Physical reality:** Screen-based content planning. Chef takes photos during/after events (phone), then batches scheduling during admin time. Desktop for planning, mobile for capture.

**Compounding:** High. Content calendar patterns, best-performing post types, optimal posting times, seasonal content themes all compound. A year of data reveals "carousel posts on Tuesday at 11am get 3x engagement."

**Solution design:**

- ChefFlow ALREADY HAS this substantially built
- Full content calendar, post creation, multi-platform scheduling
- Automated publishing engine via cron
- OAuth integration for platform APIs
- AI caption generation from event data
- The system can replace Later/Buffer for basic scheduling
- Gap: engagement analytics (likes, comments, shares pulled back from platforms)
- Gap: best-time-to-post optimization based on historical engagement
- Gap: Instagram Stories / Reels-specific scheduling
- Gap: content recycling (resurface high-performing posts)

**Where it appears:**

- `/marketing/social` content calendar
- `/marketing/social/settings` queue configuration
- `/marketing/social/posts/[id]` individual post editor
- `/content` content creation hub
- Event close-out (auto-generate social content)

**What remains as permanent exit:**
Platform-specific features that APIs don't support (Instagram Stories editing, TikTok effects, live streaming). Creative photo/video editing (Lightroom, CapCut). Monitoring DMs and comments on each platform. Responding to engagement is inherently on-platform.

**Priority:** Weekly (content batching) x Low effort (already built, needs engagement tracking) = MEDIUM value, mostly DONE
**Spec needed?** No. Core feature exists. Engagement analytics pull-back would be a standalone enhancement.

---

## Scenario #86: Track personal pantry / dry stock inventory

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why chef leaves:** Before shopping for an event, chef checks: "Do I already have saffron? How much olive oil is left? Did I use the last of the vanilla extract?" Currently checks a notes app, memory, or physically walks to the pantry. The operational decision: "What do I already have, so I don't buy duplicates or forget essentials?"

**Context ChefFlow has:**

- Full pantry inventory system (`lib/inventory/pantry-actions.ts`)
- Multi-location support: home, client, storage, other (with per-location types)
- Pantry items: name, quantity, unit, category, expiry date, minimum stock, notes
- Ingredient linking (pantry items can link to canonical ingredient IDs)
- CRUD operations: create location, add item, update quantity, remove item
- Drawdown for events: auto-deduct pantry items used at an event
- Low stock alerts based on minimum stock thresholds
- Expiry tracking with configurable alert windows (7-day default)
- Pantry dashboard component (`components/inventory/pantry-dashboard.tsx`): location selector, item list, add form, quick edit, low stock alerts, expiring items
- Pantry location manager component
- Pantry alerts widget on dashboard
- Par level tracking (`lib/inventory/stock-lookup-actions.ts`)
- Inventory audit system (create, count, finalize, variance report)
- Event deduction with reverse option
- Batch tracking with FIFO consumption
- Transaction history for all movements
- Demand forecasting (14-day ahead based on upcoming events)
- Shortage alerts per event ("you'll be short 2lb butter for Saturday")
- Shopping list integration: can cross-reference pantry against event needs

**Data source?** No. Internal inventory data maintained by the chef.

**Client-collaborative angle:** For meal prep clients with dedicated pantry at their home: client could update "I used the last of the rice" via portal, which adjusts chef's shopping list for next visit.

**Physical reality:** Strong physical component. Chef physically checks shelves, but the digital record prevents duplicate purchases. Voice entry via Remy ("I just used the last saffron") while hands are busy. Barcode scanning for receipt-to-pantry updates. Quick quantity adjustment should be one-tap (decrement/increment buttons).

**Compounding:** Very high. Usage patterns reveal consumption rates. After 6 months, the system knows: "You use 2 bottles of olive oil per week, your saffron lasts 3 months, you always run out of butter before events." This feeds auto-reorder suggestions and shopping list pre-population.

**Solution design:**

- ChefFlow ALREADY HAS this comprehensively built
- Multi-location pantry with full CRUD
- Low stock alerts, expiry tracking, event drawdown
- Dashboard with alerts widget
- Inventory audits and transaction history
- Demand forecasting and shortage alerts
- Gap: voice entry via Remy for hands-free pantry updates
- Gap: receipt OCR to auto-update pantry (receipt scanning exists for expenses, needs pantry bridge)
- Gap: smart shopping list that auto-subtracts pantry on-hand from event needs
- Gap: consumption rate learning (predict when staples run out)

**Where it appears:**

- `/inventory` pantry dashboard
- `/inventory/locations` location management
- Dashboard (pantry alerts widget)
- Shopping list generation (cross-reference against pantry)
- Event detail (shortage alerts)
- Event close-out (drawdown/deduction)

**What remains as permanent exit:**
Nothing for tracking. The physical act of checking shelves will always happen, but the digital record eliminates "did I already buy saffron?" moments. Chef never needs a notes app or spreadsheet for pantry tracking.

**Priority:** Per shopping trip (2-3x/week) x Zero effort (already built) = HIGH value, DONE
**Spec needed?** No. Feature is comprehensive. Voice entry and receipt-to-pantry bridge are enhancements.

---

## Batch Summary

| #   | Title                                        | Reclassified To     | Spec Needed? |
| --- | -------------------------------------------- | ------------------- | ------------ |
| 80  | Manage a waitlist during busy season         | Reducible           | No           |
| 81  | Calculate tip/gratuity split for hired staff | Reducible           | No           |
| 82  | Create/manage gift certificates              | Reducible           | No           |
| 83  | Send thank-you / follow-up gifts to clients  | Partially Reducible | No           |
| 84  | Manage recurring meal prep schedule          | Reducible           | No           |
| 85  | Schedule social media posts                  | Partially Reducible | No           |
| 86  | Track personal pantry / dry stock inventory  | Reducible           | No           |

**Batch stats:** 7 evaluated. 5 Reducible, 2 Partially Reducible, 0 Bridgeable, 0 Permanent. 0 specs needed.

**Key finding:** 6 of 7 scenarios in this batch are ALREADY SUBSTANTIALLY BUILT in ChefFlow. The original exit-points analysis classified several as "Bridgeable" or noted them as future features, but the codebase reveals they have been implemented with full server actions, UI components, and database tables. The remaining gaps are polish items (priority scoring, voice entry, cross-system wiring) rather than greenfield builds.

**Already-built features discovered:**

- Waitlist: Full CRUD + stats + auto-sweep + notification panel
- Tip splitting: Three pool methods + per-staff tracking + distribution preview
- Gift certificates: Public purchase flow + code generation + balance tracking + redemption
- Recurring meal prep: Programs + auto-generation + batch aggregation + weekly planner + invoicing
- Social scheduling: Annual calendar + multi-platform publishing engine + OAuth + AI captions
- Pantry tracking: Multi-location + drawdown + alerts + demand forecasting + shortage detection
