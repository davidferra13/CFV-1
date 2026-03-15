# Research: Calendar Integration, Cooking Classes, Packages, and Commerce Features

**Date:** 2026-03-15
**Type:** Exhaustive web research (no code changes)
**Purpose:** Inform future ChefFlow features: calendar sync, cooking class management, experience/package building, gift certificates, online meal prep store, delivery route planning

---

## 1. CALENDAR INTEGRATION

### 1a. Google Calendar API

**Capabilities:**

- Full two-way sync: read/write/edit events
- Push notifications via webhooks (HTTPS required)
- Incremental sync via `syncToken` (avoids full re-fetch every time)
- Supports Acl, CalendarList, Events, and Settings resource change notifications

**Webhook/Push Notification Details:**

- Notification channels expire after max 7 days (604800s TTL)
- No automatic renewal: you must call `watch()` again before expiration
- Google explicitly states notifications are "not 100% reliable" and a small percentage of messages will be dropped
- Webhook receives POST with `X-Goog-Channel-Expiration` header
- Must use HTTPS for the callback URL

**Incremental Sync Implementation:**

- First call: full sync (no syncToken). Returns all events + a `syncToken`
- Subsequent calls: pass `syncToken`, get only changed events
- `syncToken` expires after ~1 hour of non-use; server returns 410, triggering full re-sync
- If many changes: paginated response with `pageToken` instead of `syncToken`
- Query parameter set must remain consistent across all sync calls

**Rate Limits:**

- Default: 1,000,000 queries/day per project
- Per-user rate limits also apply (not publicly documented exact number)

**Pricing:**

- The Calendar API itself is free
- Push notifications may incur charges through Google Cloud Platform
- Practical cost: effectively free for typical SaaS usage volumes

**OAuth Setup:**

- Standard OAuth 2.0 flow
- Scopes: `calendar.readonly`, `calendar.events`, `calendar.events.readonly`
- Requires Google Cloud Console project + credentials

### 1b. Microsoft Graph API (Outlook/Exchange)

**Capabilities:**

- Full CRUD on calendar events
- Webhook change notifications (subscriptions)
- Shared/delegated calendar support (`canEdit`, `canShare`, `canViewPrivateItems`)
- Works with Exchange Online (M365), Outlook.com

**Webhook Details:**

- Subscription-based: create subscription with expiration
- Minimum expiration: 45 minutes (auto-set if shorter)
- Must be renewed before expiration or create new subscription
- Limit: 1,000 active subscriptions per mailbox for Outlook resources

**Pricing:**

- Microsoft Graph API calendar access is free for registered Azure applications
- No per-call charges for standard calendar operations
- Azure app registration is free

**Important 2026 Note:**

- Exchange Web Services (EWS) deprecated October 1, 2026
- All integrations must use Microsoft Graph API going forward

### 1c. Apple Calendar (CalDAV)

**Approach:**

- No REST API; CalDAV protocol only
- No standard OAuth flow (requires app-specific passwords)
- No webhook/push notification support

**Limitations:**

- No real-time change notifications; must poll for changes
- Authentication via app-specific passwords (not ideal for SaaS)
- Third-party apps have restricted access to advanced scheduling features
- Different CalDAV implementations across providers cause inconsistencies
- Recurring events and timezone handling are particularly tricky

**Practical Implication for ChefFlow:**

- Apple Calendar sync is the hardest to implement and maintain
- Consider using a unified calendar API (Cronofy or Nylas) to abstract this away

### 1d. How HoneyBook, Dubsado, and Calendly Handle Calendar Sync

**HoneyBook:**

- Syncs Google, Microsoft, and Apple calendars
- Two-way sync: external meetings visible in HoneyBook and vice versa
- Limitation: edits made to HoneyBook events in external calendar do NOT sync back
- HoneyBook + Calendly integration is one-way only (Calendly -> HoneyBook)

**Dubsado:**

- Uses **Cronofy** (third-party unified calendar API) for all calendar integration
- Supports Google, Apple, Outlook.com, Office 365, and Exchange via Cronofy
- True two-way sync: changes in Dubsado reflect in external calendar and vice versa
- This is the gold standard approach for a SaaS platform

**Calendly:**

- Primarily a scheduling tool, not a CRM
- One-way feed into other platforms
- No native Dubsado integration (requires Zapier)

**Key Takeaway:** Dubsado's approach (using Cronofy) is the best model. A unified calendar API eliminates the need to maintain 3+ separate calendar integrations.

### 1e. ICS File Standard (RFC 5545)

**What Can Be Included:**

- VEVENT (events), VTODO (tasks), VJOURNAL (journal entries), VFREEBUSY (free/busy info), VALARM (alarms/reminders)
- Event fields: DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION, ATTENDEE, ORGANIZER, RRULE (recurrence), CATEGORIES, STATUS, PRIORITY, SEQUENCE, UID
- Custom fields via X- prefix extensions (e.g., X-CHEFFLOW-EVENT-ID)
- Timezone definitions via VTIMEZONE component

**Compatibility:**

- Universally supported: Google Calendar, Apple Calendar, Outlook, Thunderbird, Yahoo Calendar
- Partial support in some platforms (Outlook historically has RRULE quirks)
- Can be attached to emails for one-click "Add to Calendar"
- Can be hosted at a URL for subscription-based calendar feeds

**Use Cases for ChefFlow:**

- Email event confirmations with .ics attachment (zero API dependency)
- Public calendar feed URL for chef's availability
- Export events to any calendar app
- Import bookings from other platforms

### 1f. Airbnb Experiences Calendar

**API Access:**

- Airbnb API is restricted to approved partners only (2026)
- Individual hosts/experience providers cannot get direct API access
- Must use third-party channel management software for API integration

**Export/Sync Options:**

- Airbnb provides ICS calendar export URL (ends with .ics)
- Changes on Airbnb auto-reflect in subscribed calendars (depends on sync interval)
- Google Calendar sync is supported for Experiences: booked reservations sync to Google Calendar, and Google Calendar events block Experiences availability

**How Chefs Currently Sync Airbnb Bookings:**

- Copy ICS URL from Airbnb -> paste into Google Calendar or other platform
- Use channel management software (Guesty, Hospitable, etc.)
- Manual cross-reference (common for small-scale operators)

**iCal Sync Limitation:**

- ICS sync updates periodically (every few hours), NOT real-time
- Creates double-booking risk during the sync delay

### 1g. Channel Management / Calendar Consolidation

**Two Sync Methods:**

1. **iCal (ICS URL):** Copy-paste calendar links between platforms. Updates every few hours (not real-time). Double-booking risk during delay. Free, simple, universal.

2. **API Integration:** Direct certified connection between platforms. Push-based: instant blocking when booking occurs. Used by professional channel managers (Guesty, Hospitable, Lodgify). Eliminates double-booking risk.

**How Channel Managers Work:**

- Pull reservations from all connected channels
- Sync all individual calendars so only available dates are bookable
- Multi-calendar view showing all bookings from all sources
- When booking comes in on one platform, instantly blocks dates on all others
- Saves operators ~20 hours/week vs manual management

**Relevance for ChefFlow:**

- ChefFlow could function as the chef's "channel manager" consolidating bookings from their website, Airbnb Experiences, direct inquiries, meal prep orders, and cooking classes into one calendar

---

## 2. UNIFIED CALENDAR APIs (Build vs Buy)

### 2a. Cronofy

**What It Is:** Unified Calendar API connecting Google, Apple, Outlook.com, Office 365, and Exchange (including on-premise) through a single API.

**Key Features:**

- Real-time two-way sync (not polling-based)
- Push notifications on calendar changes
- OAuth2 for all providers (including Apple via their own auth layer)
- Availability API for scheduling
- 99.99% SLA guarantee
- Data hosting in US or Germany (GDPR, HIPAA, SOC 2, ISO 27001/27701/27018)
- v1 API maintained for 10+ years (no breaking changes)

**Pricing:**

- API access starts at EUR 749/month
- Per-user pricing model (billed only when users are active)
- Scheduler product starts at EUR 14/active account/month

**Who Uses It:** Dubsado uses Cronofy for their calendar integration.

### 2b. Nylas

**What It Is:** Unified API for calendar, email, and contacts (broader scope than Cronofy).

**Key Features:**

- Calendar, email, and contact APIs in one platform
- Embeddable UI widgets (scheduling pages)
- Availability checks and scheduling components
- Covers Google, Outlook, Exchange, Apple

**Pricing:**

- Starts at $0.90/connected account/month (significantly cheaper than Cronofy)
- No overage fees for notifications

**Concerns:**

- Has deprecated two API versions already (v1 -> v2 -> v3); migration cost
- Backend relies on external API calls for real-time data (latency at scale)
- Broader focus (email + contacts + calendar) means less calendar specialization

### 2c. Build vs Buy Recommendation

| Approach                                                 | Pros                                                                  | Cons                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Direct API integration** (Google + Microsoft + CalDAV) | No third-party dependency, no monthly cost                            | 3 separate integrations to maintain, Apple is very difficult, no unified abstraction |
| **Cronofy**                                              | Enterprise-grade, proven (Dubsado uses it), stable API, all providers | EUR 749/month minimum, expensive for early stage                                     |
| **Nylas**                                                | Cheap ($0.90/account), includes email+contacts API                    | API stability concerns, latency at scale, broader focus                              |
| **Hybrid: Google direct + ICS for others**               | Free, covers 80%+ of users                                            | No real-time sync for Apple/Outlook, maintenance burden                              |

**Practical Recommendation for ChefFlow:**

- Start with **Google Calendar API direct integration** (free, covers majority of users)
- Use **ICS file generation** for universal compatibility (email attachments, feed URLs)
- Add **Microsoft Graph API** as second priority
- Skip Apple direct integration; offer ICS subscription URL instead
- Consider Nylas if/when multi-provider sync becomes a frequent user request

---

## 3. CAPACITY PLANNING

### 3a. Buffer Time Between Events

**How Platforms Handle It:**

- Buffer time can be set before, after, or both before and after appointments
- Customers don't see buffer time directly; it's factored into availability calculation
- Example: 1-hour event + 15-minute buffer = requires 1h15m available slot
- Industry standard: 15-30 minutes between service jobs

**Private Chef Specific Buffers:**

- Travel time between locations (variable by distance)
- Grocery shopping time before events
- Prep/mise en place time (1-4 hours depending on menu complexity)
- Cleanup time post-event (30-90 minutes)
- Equipment loading/unloading (15-30 minutes each way)

**Platform Examples:**

- Acuity Scheduling: per-service buffer before/after
- Wix Bookings: post-appointment buffer
- Microsoft Bookings: configurable buffer with travel time consideration

### 3b. Maximum Events Per Day/Week

**How Tools Handle Limits:**

- Cap daily/weekly bookings to prevent overbooking
- Real-time display of open time slots
- Auto-block when capacity reached
- Some platforms allow different capacities by day of week

**Private Chef Considerations:**

- Solo chef: typically max 1-2 events per day (dinner parties)
- Meal prep: can batch multiple clients in one day
- Cooking classes: usually 1-2 per day (2-3 hour sessions)
- Corporate events: often full-day commitment
- Weekly max varies: 4-6 events/week is common for active private chefs

### 3c. Seasonal Capacity

**How Chefs Manage High/Low Season:**

- High season (holidays, wedding season): higher rates, earlier booking requirements, may hire additional staff
- Low season: offer promotions, cooking classes, meal prep subscriptions, reduce availability
- Tools like Deputy keep inactive staff in system without full billing
- ZoomShift designed for seasonal highs and lows
- Some platforms offer seasonality-friendly billing (pause during closure)

**Dynamic Pricing Connection:**

- Peak season surcharges common in luxury concierge (20-50%+ markups)
- Holiday booking often requires weeks of advance notice
- Group size directly impacts pricing (per-person rate decreases at scale, but total increases)

---

## 4. COOKING CLASS MANAGEMENT

### 4a. Platform Comparison

| Platform               | Commission                                                         | Key Features                                                 | Virtual?                 |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------ |
| **Airbnb Experiences** | 20% of booking                                                     | Global audience, built-in reviews, insurance                 | Virtual option available |
| **Cozymeal**           | Undisclosed (reported as high, 30-40% estimated from chef reviews) | #1 cooking class platform, private chef marketplace          | Yes                      |
| **ClassBento**         | Marketplace listing                                                | Hosts multiple providers (including CocuSocial)              | Yes                      |
| **CocuSocial**         | Varies by city                                                     | 17+ US cities, hotels/restaurants as venues, $63-126/session | Yes                      |
| **CoursHorse**         | Marketplace listing                                                | Aggregator, student reviews, category browsing               | No                       |

### 4b. Essential Features for Cooking Class Management

**Registration & Booking:**

- Online booking 24/7 from any device
- Class capacity limits (min/max attendees)
- Waitlist when class is full
- Multi-class series enrollment
- Class passes / punch cards for regulars
- Automatic confirmation emails

**Scheduling:**

- Recurring class templates (weekly pasta class, monthly wine dinner)
- Multi-day experience scheduling
- Multiple instructor management
- Room/kitchen station assignment
- Calendar sync (Google, Apple)
- Time zone handling for virtual classes

**Payment:**

- Upfront payment collection
- Class pass discounts (buy 5, save 10%)
- Refund/cancellation policy enforcement
- Group booking rates
- Gift certificate redemption

**Attendee Management:**

- Dietary restriction collection at registration
- Allergy tracking per attendee
- Skill level categorization
- Previous class history
- Contact info for marketing
- Attendance tracking

**Class Content:**

- Recipe/ingredient list per class
- Pre-class shopping list or kit details
- Ingredient sourcing (provided vs bring-your-own)
- Equipment requirements
- Post-class recipe sharing

**Location Management:**

- Home kitchen capacity
- Partner venue coordination
- Location-specific equipment inventory
- Health department requirements per venue

**Marketing:**

- Automatic reminders (email, SMS, WhatsApp)
- Class-type customizable messaging
- Waitlist notifications when spots open
- Review collection post-class
- Social media sharing

### 4c. Cooking School Schedule Management

**Key Software:** Omnify, Bookeo, Koalendar, Ubindi, SetTime, Sawyer, Roverd, TicketingHub

**Common Approach:**

- Unlimited booking pages with unique availability per class type
- Sync with Google/Apple Calendar for instructor availability
- Automatic reminders reduce no-shows
- Multi-instructor management with separate schedules
- Automation saves ~10 hours/week of admin time

**Class Types Managed:**

- Fixed-term series (6-week Italian cooking course)
- Drop-in workshops (single session)
- Private lessons (1-on-1 or small group)
- Multi-day intensives
- Recurring weekly/monthly classes
- Special event classes (holiday themed)

### 4d. Virtual Cooking Class Tools

**Zoom-Based:**

- Sur La Table: 90-120 min password-protected Zoom sessions
- Milk Street: Zoom-hosted events
- Fēst (Home Ec): Zoom cooking classes with ingredient kit delivery
- Most cooking class businesses use Zoom as the default platform

**Dedicated Platforms:**

- Scoolinary: online culinary training platform (cooking, pastry, mixology, sommelier, nutrition)
- Homemade: free live interactive cooking classes (no subscription)

**Key Virtual Features:**

- Real-time Q&A during class
- Chat functions for typed questions
- Recorded sessions for replay
- Ingredient kit delivery option (pre-portioned, eco-friendly packaging)
- Breakout rooms for group activities

**Pricing Models:**

- Per-class: $30-150 per person
- Subscription: monthly unlimited access
- Kit + class bundles: $50-200 (ingredients + instruction)
- Corporate packages: $75-200 per person (team building)

---

## 5. EXPERIENCE/PACKAGE BUILDING

### 5a. How Service Businesses Bundle Offerings

**Common Package Structures:**

- Tiered packages (Bronze/Silver/Gold or similar)
- Base service + add-on model
- Bundled multi-service discounts
- Seasonal/holiday-specific packages
- Group size-based pricing

### 5b. Private Chef Package Examples

| Package Type                  | Description                                    | Typical Pricing                         |
| ----------------------------- | ---------------------------------------------- | --------------------------------------- |
| **Canape/Cocktail Reception** | Passed appetizers for 10-50 guests             | $65/person                              |
| **3-Course Dinner Party**     | Starter, main, dessert for 4-12 guests         | $125-195/person                         |
| **5-Course Tasting Menu**     | Multi-course experience with wine pairings     | $200-300/person                         |
| **Weekly Meal Prep**          | 5-day meal prep, delivery included             | $300-600/week                           |
| **Monthly Dinner Party**      | Recurring monthly dinner for regulars          | Discount on per-event pricing           |
| **Cooking Class Series**      | 4-6 week themed series                         | $500-800 per series                     |
| **Holiday Package**           | Thanksgiving/Christmas complete dinner service | Premium pricing (20-50% above standard) |
| **Corporate Team Building**   | Group cooking class with team activities       | $75-200/person                          |
| **Date Night**                | Intimate dinner for 2 with instruction         | $300-500                                |
| **In-Villa Experience**       | Luxury vacation private chef (multi-day)       | $500-2000/day                           |

### 5c. HoneyBook Package/Service Creation

**Limitation:** HoneyBook does NOT support defining packages or plans within a service. You cannot create tiered packages within a single service listing. Workaround: create separate services for each package level, or use custom proposals.

**What HoneyBook Does Well:**

- Drag-and-drop proposals bundling multiple services
- Custom proposal templates
- Built-in scheduling attached to proposals
- Percentage-based service charges (new 2026 feature)
- Automated tax calculation on service charges

### 5d. Dynamic Pricing for Packages

**Factors:**

- Peak season (holidays, wedding season): 20-50% premium
- Group size: per-person rate often decreases with larger groups
- Menu complexity: more courses/specialized ingredients = higher price
- Location: travel distance surcharge
- Day of week: weekend premium common
- Time of day: evening events typically more expensive than lunch
- Last-minute booking premium
- Celebrity/high-profile chef premium

**Luxury Concierge Pricing:**

- Concierge market projected at $2.48B in 2025 (9.5% YoY growth)
- Factors: destination, group size, meals/day, menu complexity, chef experience level
- Large villas/holiday periods require weeks of advance booking
- Special celebrations (birthdays, weddings) need early coordination

---

## 6. GIFT CERTIFICATES

### 6a. Digital Gift Certificate Solutions

**Stripe-Integrated Solutions:**

| Solution        | Fee Model                        | Features                                                                             |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| **Cardivo**     | 5% per sale (no fixed fee)       | Branded gift card page, scheduled delivery, auto redemption, Stripe verified partner |
| **VoucherCart** | Platform fee + Stripe processing | 100+ payment methods via Stripe Payment Element, branded voucher design              |
| **Gift Up**     | Commission per sale              | Connects to Stripe, currency-backed gift cards usable as Stripe coupons              |
| **Giftpro**     | Stripe verified partner          | Restaurant-focused, physical + digital cards                                         |

**Key Implementation Features:**

- Customizable branding (logo, colors, imagery)
- Scheduled delivery (buy now, deliver on birthday)
- Multiple delivery methods: email, SMS, printable PDF
- Redemption tracking
- Partial redemption support
- Admin dashboard for gift card management
- No-code setup (minutes to launch)

### 6b. Legal Requirements (USA)

**Federal Law (CARD Act 2009):**

- Gift certificates cannot expire earlier than 5 years from date of issue (or last load date)
- Dormancy/inactivity fees only after 12 months of no activity
- Maximum one fee per month
- Fee terms must be clearly and conspicuously disclosed

**State Variations (stricter than federal):**

- **Minnesota:** Prohibits expiration dates AND all service fees (including dormancy)
- **New York:** Gift cards valid for 9 years (since Dec 10, 2022)
- **California:** Gift cards with value under $10 must be redeemable for cash
- Many states have their own enhanced consumer protections

**Escheatment (Unclaimed Property):**

- When gift cards expire with remaining balance, many states require the balance be turned over to the state as unclaimed property
- 37 states (including CA, IL, FL, OH, PA, TX) either exempt gift cards from escheatment or don't have applicable laws
- This is a complex compliance area that varies significantly by state

**Breakage Accounting:**

- Revenue from gift card sales is NOT income until redemption
- "Breakage" = estimated unredeemed portion
- Under ASC 606, breakage revenue can be recognized proportionally as other gift cards are redeemed, IF the entity expects to be entitled to the breakage and has historical data to support the estimate
- Until then, it's a liability on the balance sheet

**ChefFlow Implications:**

- Must set expiration to 5+ years minimum (or no expiration)
- Must disclose all fee terms prominently
- Should implement state-specific rules for key markets
- Accounting integration needs breakage/liability tracking

### 6c. Restaurant Gift Card Platforms

**Square Gift Cards:**

- eGift cards purchased/sent digitally
- 16-digit card number for redemption
- No expiration
- Integrated with Square POS

**Toast Gift Cards:**

- Physical cards + e-gift cards
- Email and text delivery for digital cards
- Usable in-store and for online ordering
- Custom branded physical cards via eCard Systems

---

## 7. ONLINE STORE FOR MEAL PREP

### 7a. How Meal Prep Businesses Sell Online

**Ordering Models:**

- **A la carte:** Individual meal purchases, no commitment. Flexible but harder to forecast
- **Subscription:** Weekly/monthly auto-renewal with optional meal changes between renewals. Predictable revenue, bulk-prep efficiency
- **Hybrid:** Both options available; subscriptions get a discount

**Ordering Windows:**

- Typical cutoff: Wednesday midnight or Wednesday 8AM for Sunday delivery
- 3-4 day lead time allows shopping, prep, cooking
- Some businesses: daily cutoff for next-day delivery (higher operational complexity)

**Menu Structure:**

- Weekly rotating menu (4-8 options per week)
- Categories: breakfast, lunch, dinner, snacks
- Filterable by: dietary restrictions (keto, vegan, gluten-free), protein type, calories
- Custom meal builders (choose protein + 2 sides)
- Add-ons: smoothies, juices, snacks, desserts

### 7b. Meal Prep Software Platforms

| Platform          | Pricing                                                           | Key Differentiator                                                          |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **GoPrep**        | Starter + Pro plans (transaction-based) + 2.9% + $0.30 Stripe fee | Recipe library, nutrition labels, batch cooking plans, subscriptions        |
| **Sprwt**         | $250/mo (Sprout) + 1.5% fee; $500/mo (Bloom)                      | Driver routing clusters, zone-based delivery, extensive customization       |
| **HappyMealPrep** | Not publicly listed                                               | Ultra-optimized checkout, zip-code delivery areas, pause/edit subscriptions |
| **OrderPrepped**  | SaaS model                                                        | Full subscription management, delivery scheduling                           |

**Common Features Across Platforms:**

- Order management dashboard
- Subscription management (pause, edit, cancel)
- Cooking/production reports (aggregate ingredient quantities)
- Label printing (nutrition, allergens)
- Delivery area management (by zip code or radius)
- Pickup location configuration
- Customer CRM and preference tracking
- Payment processing (Stripe integration)

### 7c. Castiron (Food Entrepreneur E-Commerce)

**What It Is:** Website builder and online store specifically for food entrepreneurs (bakers, meal prep, food artisans).

**Pricing:** Free to build; 10-15% transaction fee on sales (only pay when you sell).

**Features:**

- Custom website builder (no coding required)
- Order form management with custom questions
- Order scheduling calendar
- Local delivery + pickup fulfillment
- CRM (customer records + purchase history)
- Email marketing (3-click branded emails)
- Sales reporting and analytics
- Custom orders and invoicing
- Class ticket sales
- Mobile payments at markets/events
- Availability status management

**Relevance:** Castiron is the closest existing model to what a chef-specific online store would look like. Built for perishable, hyper-local food products from day one.

### 7d. Shopify/WooCommerce for Food Businesses

**Shopify:**

- Subscription apps: Bold Subscriptions, Recharge Subscriptions
- Nutritional info via apps (not native)
- Custom shipping rates for perishables

**Shopify Limitations for Food:**

- No expiry date tracking for ingredients
- No ingredient-level inventory (can't track spinach across multiple meals)
- No native order timing/scheduling for prep
- Shipping perishables requires manual coordination with couriers
- Additional apps needed for restaurant-style order management

**WooCommerce:**

- 100% ownership and control
- Unlimited menu items
- Highly extensible via plugins
- Better for custom food ordering flows
- But: requires more technical setup and maintenance

### 7e. Delivery Logistics for Small Meal Prep

**Delivery vs Pickup:**

- Most small-scale chefs start with pickup-only (from home or commercial kitchen)
- Delivery typically added after customer base reaches 20-30 regular clients
- Delivery often has minimum order value + per-mile or flat fee
- Some chefs use a hybrid: free pickup, paid delivery

**Legal Considerations:**

- **Cottage food laws:** All 50 states have some form, but vary wildly
  - Revenue caps: $25,000 to unlimited depending on state
  - Most restrict to non-hazardous foods (baked goods, jams, dry goods)
  - California uniquely allows home-cooked meals with meat via "microenterprise home kitchen" law
- **Commercial kitchen:** Required for potentially hazardous foods in most states
- **Food handler permits:** Most states require; typically $10-30 online, a few hours
- **Labeling:** Nearly universal requirements: name, address, ingredients, allergen warnings, "made in a home kitchen" disclaimer
- **Online/interstate sales:** Many states have specific requirements or prohibitions
- **Insurance:** Product liability insurance recommended for all food businesses

---

## 8. DELIVERY ROUTE PLANNING

### 8a. Vev

**What It Does:** Free delivery planning software for small businesses.

**Key Features:**

- Automatic route optimization (recalculates with each new order)
- Directions via Google Maps or Apple Maps
- Supports bike, car, or truck delivery
- Custom pricing: flat fee, price per km/mile, minimum order value, free-delivery threshold
- Work area control: set max travel time (e.g., 10-minute bike radius)
- Customer-facing online ordering page
- Continuous route optimization as orders come in

**Pricing:** Free.

**Best For:** Very small-scale delivery operations (few orders per day, local area).

### 8b. Google Maps Routes API

**Pricing (per 1,000 requests):**

- **Basic ($5/1K):** Origin-to-destination routing, up to 10 waypoints, basic travel times
- **Advanced ($10/1K):** 11-25 waypoints, real-time traffic, side-of-road/heading modifiers
- **Preferred ($15/1K):** Everything above + two-wheeled vehicle routing, toll calculation, traffic on polylines

**Free Credit:** $200/month free credit per billing account (covers significant usage for small operations).

**Features:**

- Multi-waypoint routing with ETAs
- Driving distances and turn-by-turn directions
- Real-time traffic conditions
- Multiple travel modes (driving, walking, bicycling, transit)

**Limitation:** Route optimization (TSP/VRP solving) is NOT native to the Routes API. You'd need the Route Optimization API or a third-party optimizer.

### 8c. Route Optimization APIs

| Solution            | Pricing                                                             | Free Tier                       | Key Features                                                                            |
| ------------------- | ------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| **Routific**        | $150/mo (small fleet); API: 15c/order up to 2K/mo, 3c/order at 20K+ | 100 free orders/month (ongoing) | VRP + pickup/delivery endpoints, long-running tasks for 60+ stops, clean developer docs |
| **OptimoRoute**     | $35/mo per vehicle (~700 orders); $44/mo for 1K orders              | 30-day trial (250 stops)        | Return-to-depot, breadcrumb fleet tracking, scalable tiers                              |
| **Circuit (Spoke)** | $125/mo (Starter, 1K stops); $200/mo (Premium, 2K stops)            | None                            | Proof of delivery (photos, signatures), customer notifications, driver app, ETA sharing |

### 8d. Manual vs Automated Route Planning

**Manual (Small Scale):**

- Works for 20-30 stops/day
- Google Maps multi-stop directions (manual ordering)
- Paper maps or spreadsheet planning
- Time-consuming (hours per week)
- No real-time traffic consideration
- Error-prone (suboptimal ordering)

**Automated (Scale):**

- Cuts planning time from hours to minutes
- Considers traffic, time windows, vehicle capacity, driver breaks
- 30%+ reduction in route planning time reported
- Frees staff for core operations (cooking, order processing)
- Scales with business growth

**Transition Point:** When delivery volume exceeds 20-30 stops/day or when route planning takes more than 30 minutes/day, automated routing pays for itself.

**Recommendation for ChefFlow:**

- For MVP: simple Google Maps link with pre-ordered stops
- For growth: Routific API (100 free orders/month, clean API, reasonable scaling pricing)
- Skip building route optimization from scratch; it's a solved problem

---

## 9. KEY TAKEAWAYS FOR CHEFFLOW

### Calendar Integration Priority

1. Google Calendar API (direct, free, covers 70%+ of users)
2. ICS file generation (universal compatibility, email attachments)
3. Microsoft Graph API (Outlook users, growing segment)
4. Apple Calendar via ICS subscription URL (no direct integration needed)
5. Consider Cronofy/Nylas only if multi-provider real-time sync becomes essential

### Cooking Class Feature Set

- Registration with dietary restriction collection
- Capacity limits + waitlist
- Recurring class templates
- Class series/passes at discounted rates
- Virtual class support (Zoom link integration)
- Ingredient/shopping list per class
- Post-class recipe sharing

### Package/Experience Builder

- Tiered package templates (base + add-ons)
- Per-person pricing with group discounts
- Seasonal/dynamic pricing rules
- Bundle multiple service types (dinner + class + meal prep)
- Package-specific terms and cancellation policies

### Gift Certificates

- Build on Stripe (Cardivo integration or custom implementation)
- 5-year minimum expiration (federal law)
- Email + SMS + printable PDF delivery
- Partial redemption tracking
- State-specific compliance for key markets

### Online Store / Meal Prep

- Subscription + a la carte ordering
- Weekly menu rotation with dietary filters
- Order cutoff windows (3-4 days before delivery)
- Delivery area management by zip code/radius
- Production reports for batch cooking
- Castiron as the closest existing model

### Delivery Routing

- Start with Google Maps links (free, adequate for small scale)
- Routific API for automated optimization when volume justifies it
- 100 free orders/month from Routific covers early growth

---

## Sources

### Calendar Integration

- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push)
- [Google Calendar Quota Management](https://developers.google.com/workspace/calendar/api/guides/quota)
- [Google Calendar API Pricing](https://www.oreateai.com/blog/demystifying-google-calendar-api-pricing-its-not-what-you-might-think/328ccee4d75c53f7030554b6977fb177)
- [Google Calendar Sync Implementation](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Google Calendar Webhooks with Node.js](https://stateful.com/blog/google-calendar-webhooks)
- [Calendar Webhook Developer Guide](https://calendhub.com/blog/calendar-webhook-integration-developer-guide-2025/)
- [Microsoft Graph Calendar Overview](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview)
- [Microsoft Graph API Calendar Pricing](https://learn.microsoft.com/en-us/answers/questions/1301924/pricing-for-graph-api-outlook-events)
- [Microsoft Graph Change Notifications](https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks)
- [Microsoft Graph Subscription Resource](https://learn.microsoft.com/en-us/graph/api/resources/subscription?view=graph-rest-1.0)
- [Apple Calendar CalDAV Integration](https://www.aurinko.io/blog/caldav-apple-calendar-integration/)
- [iCloud Calendar API Integration](https://www.onecal.io/blog/how-to-integrate-icloud-calendar-api-into-your-app)
- [iCalendar RFC 5545 Specification](https://icalendar.org/RFC-Specifications/iCalendar-RFC-5545/)
- [What is an ICS File](https://icalendar.dev/blog/what-is-icalendar/)

### Platform Calendar Sync

- [HoneyBook Calendar Integration](https://help.honeybook.com/en/articles/2286486-what-syncs-with-your-calendar-integration)
- [Dubsado + Cronofy Case Study](https://www.cronofy.com/case-studies/two-way-calendar-sync-dubsado)
- [Dubsado External Calendar Connection](https://help.dubsado.com/en/articles/2559449-connect-an-external-calendar)

### Unified Calendar APIs

- [Cronofy API Pricing](https://www.cronofy.com/api-pricing)
- [Cronofy Unified Calendar API](https://www-webflow.cronofy.com/one-calendar-api)
- [Nylas Calendar API](https://www.nylas.com/products/calendar-api/)
- [Nylas vs Cronofy Comparison](https://www.nylas.com/comparison/cronofy-alternative/)
- [Best Unified Calendar API 2026](https://truto.one/blog/the-best-unified-calendar-api-for-b2b-saas-and-ai-agents-2026/)

### Airbnb & Channel Management

- [Airbnb Experiences Calendar Sync](https://www.airbnb.com/help/article/2822)
- [Airbnb Calendar Export Guide](https://hosttools.com/blog/airbnb-rentals/export-airbnb-calendar/)
- [Airbnb API 2026 Guide](https://bnbmanagementlondon.co.uk/airbnb-api/)
- [Airbnb Calendar Sync with Booking Channels](https://hospitable.com/airbnb-calendar-sync)
- [Guesty Channel Manager](https://www.guesty.com/features/channel-manager/)

### Capacity Planning

- [Acuity Scheduling Availability Controls](https://acuityscheduling.com/features/availability-controls)
- [Wix Bookings Buffer Time](https://support.wix.com/en/article/wix-bookings-adding-a-time-buffer-after-appointments)
- [Microsoft Bookings Service Availability](https://learn.microsoft.com/en-us/microsoft-365/bookings/configure-service-availability?view=o365-worldwide)

### Cooking Classes

- [Airbnb Experiences Commission](https://hospitable.com/airbnb-experiences)
- [Airbnb Experiences Overview](https://www.xola.com/articles/what-are-airbnb-experiences/)
- [Cozymeal Platform](https://www.cozymeal.com/)
- [CocuSocial Cooking Classes](https://cocusocial.com/)
- [Omnify Cooking Class Software](https://www.getomnify.com/business/cooking-page)
- [Bookeo Class Booking Software](https://www.bookeo.com/classes/cooking-class-booking-software/)
- [Cooking Class Software Comparison](https://anolla.com/en/cooking-class-software)

### Virtual Cooking Classes

- [Sur La Table Online Classes](https://www.surlatable.com/cooking-classes/online-cooking-classes/)
- [Scoolinary Platform](https://www.scoolinary.com)
- [SMCo Virtual Cooking Classes](https://smcoaz.com/)
- [Milk Street Online School](https://www.177milkstreet.com/school/classes/online-classes)

### Packages & Pricing

- [HoneyBook Pricing 2026](https://www.agencyhandy.com/honeybook-pricing/)
- [HoneyBook Product Updates March 2026](https://www.honeybook.com/blog/product-updates-march-2026)
- [CHEFIN Private Chef Packages](https://chefin.com/private-chef/private-chefs-los-angeles/)
- [Denver Private Chef Services](https://denverprivatechef.com/)
- [Luxury Concierge Chef Services](https://www.travelwithaspect.com/concierge)
- [Concierge Service Pricing](https://parkmagazineny.com/concierge-service-cost/)

### Gift Certificates

- [Stripe Gift Card Guide](https://stripe.com/resources/more/accepting-gift-cards-101)
- [Cardivo Stripe Gift Cards](https://cardivo.com/stripe-gift-cards)
- [CFPB Gift Card Regulations](https://www.consumerfinance.gov/rules-policy/regulations/1005/20/)
- [Gift Card Laws by State](https://worldpopulationreview.com/state-rankings/gift-card-laws-by-state)
- [NCSL Gift Card Legislation](https://www.ncsl.org/financial-services/gift-cards-and-gift-certificates-statutes-and-legislation)
- [Gift Certificate Legal Guide](https://www.nolo.com/legal-encyclopedia/question-legal-gift-certificates-expire-27997.html)
- [Toast POS Gift Cards](https://pos.toasttab.com/products/gift-card)
- [Square eGift Cards](https://squareup.com/help/us/en/article/6355-send-an-egift-card)

### Meal Prep & Online Store

- [GoPrep Features](https://www.goprep.com/features/)
- [GoPrep Pricing](https://www.goprep.com/pricing/)
- [Sprwt Meal Prep Software](https://sprwt.io/)
- [Sprwt Pricing](https://sprwt.io/pricing/)
- [HappyMealPrep](https://happymealprep.com/)
- [Castiron Food E-Commerce](https://shopcastiron.com/seller/product)
- [Castiron Pricing](https://www.shopcastiron.com/seller/pricing)
- [Shopify Meal Prep Guide](https://www.shopify.com/blog/how-to-start-a-meal-prep-business)
- [WooCommerce Food Ordering](https://www.commercegurus.com/woocommerce-food-ordering/)
- [Cottage Food Laws by State](https://cottagefoodlaws.com/)
- [Meal Prep Legal Compliance Guide](https://www.bottle.com/blog/navigating-state-and-local-meal-prep-regulations-your-complete-legal-compliance-guide)

### Delivery Route Planning

- [Vev Delivery Software](https://vev.co/delivery-software)
- [Google Routes API Pricing](https://developers.google.com/maps/documentation/routes/usage-and-billing)
- [Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/)
- [Routific API Pricing](https://dev.routific.com/pricing)
- [Routific API Documentation](https://docs.routific.com/)
- [OptimoRoute vs Routific](https://www.getapp.com/transportation-logistics-software/a/optimoroute/compare/routific/)
- [Circuit (Spoke) Pricing](https://www.upperinc.com/blog/circuit-pricing/)
- [Manual vs Automated Route Planning](https://nuvizz.com/blog/manual-vs-automated-routing-software-for-deliveries/)
- [Route Optimization Guide](https://www.routific.com/blog/how-to-optimize-delivery-routes)
