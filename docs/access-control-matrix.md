# ChefFlow Access Control Matrix

**Last updated:** 2026-03-08

This document defines **exactly** what each user type can and cannot see, access, or modify on the ChefFlow platform. Every rule is explicit. Nothing is implied. If something is not listed under "Can See," that user type cannot see it.

This document also serves as ChefFlow's privacy enforcement specification. Every data field that contains personally identifiable information (PII), health data, financial data, credentials, or behavioral intelligence is classified and assigned explicit access boundaries.

---

## The Eight User Types

Every entity that interacts with ChefFlow falls into exactly one of these categories. There are no exceptions.

| #   | Type          | Auth Required                 | Description                                                                                                                                                                                                                    |
| --- | ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Public**    | No                            | Anyone without an account: visitors, dinner circle guests, RSVP viewers, embed form submitters, bots, spammers, search crawlers, newsletter subscribers, open table browsers, experience share viewers, hub group participants |
| 2   | **Chef**      | Yes (chef role)               | The private chef business owner. One chef = one tenant. All business data belongs to the chef.                                                                                                                                 |
| 3   | **Client**    | Yes (client role)             | A person who hires a chef. Tied to exactly one tenant (one chef).                                                                                                                                                              |
| 4   | **Staff**     | Yes (staff role)              | A kitchen or service team member working for a chef. Tied to exactly one tenant.                                                                                                                                               |
| 5   | **Partner**   | Yes (partner role)            | A referral source (Airbnb host, venue owner, individual). Tied to exactly one tenant.                                                                                                                                          |
| 6   | **Admin**     | Yes (chef role + admin email) | Platform operator. Not a separate database role. A chef whose email is in the ADMIN_EMAILS list.                                                                                                                               |
| 7   | **System**    | Service role                  | Remy (AI concierge), Gustav (ops AI), cron jobs, webhooks (Stripe, Gmail, Wix, DocuSign, Twilio, Zapier, Resend), scheduled tasks. Not a person.                                                                               |
| 8   | **Developer** | Full access                   | Platform owner. Full access to code, database, infrastructure, all environments. Self-governed.                                                                                                                                |

---

## Data Sensitivity Classification

Every sensitive field in ChefFlow is assigned a tier. Higher tiers demand stricter access controls.

### Tier 1: Health and Safety Critical

These fields can cause **physical harm** if exposed to the wrong person or if inaccurate. Allergies can be life-threatening. This is the highest sensitivity tier.

| Field                            | Table       | What It Contains                                        |
| -------------------------------- | ----------- | ------------------------------------------------------- |
| `allergies`                      | `clients`   | Client allergy list (e.g., "tree nuts," "shellfish")    |
| `dietary_restrictions`           | `clients`   | Client dietary needs (e.g., "vegan," "kosher," "halal") |
| `allergies`                      | `events`    | Event-specific allergy list (immutable after creation)  |
| `dietary_restrictions`           | `events`    | Event-specific dietary needs (immutable after creation) |
| `confirmed_dietary_restrictions` | `inquiries` | Dietary needs extracted from initial inquiry            |
| `cannabis_preference`            | `events`    | Whether cannabis is part of the event                   |
| `spice_tolerance`                | `clients`   | Client spice tolerance level                            |
| `dislikes`                       | `clients`   | Foods the client refuses to eat                         |

**Who can see Tier 1 data:**

- The chef who owns the tenant
- The specific client the data belongs to (their own data only)
- Staff assigned to an event (only the dietary/allergy fields relevant to that event, not the client's full profile)
- Admin (via impersonation or cross-tenant read)
- System (for processing, never displayed to other users)

**Who cannot see Tier 1 data:**

- Other chefs (any chef outside the tenant)
- Other clients (any client besides the data subject)
- Partners (never)
- Public (never)
- Staff not assigned to the relevant event
- Hub group members (never, even if the client is in the same hub group)

---

### Tier 2: Personally Identifiable Information (PII)

Names, contact details, physical addresses, and anything that identifies a specific person.

| Field                                             | Table                | What It Contains                                        |
| ------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| `full_name`                                       | `clients`            | Client's legal name                                     |
| `email`                                           | `clients`            | Client's email address                                  |
| `phone`                                           | `clients`            | Client's phone number                                   |
| `address`                                         | `clients`            | Client's home address                                   |
| `partner_name`                                    | `clients`            | Client's spouse or partner name                         |
| `children`                                        | `clients`            | Array of children's names                               |
| `regular_guests`                                  | `clients`            | Names and relationships of frequent guests              |
| `personal_milestones`                             | `clients`            | Birthdays, anniversaries, dates                         |
| `access_instructions`                             | `clients`            | How to enter the client's home (e.g., "gate code 4521") |
| `parking_instructions`                            | `clients`            | Where to park at the client's home                      |
| `name`                                            | `staff_members`      | Staff member's name                                     |
| `email`                                           | `staff_members`      | Staff member's email                                    |
| `phone`                                           | `staff_members`      | Staff member's phone                                    |
| `contact_name`                                    | `referral_partners`  | Partner contact person's name                           |
| `email`                                           | `referral_partners`  | Partner's email                                         |
| `phone`                                           | `referral_partners`  | Partner's phone                                         |
| `location_address`                                | `events`             | Physical address where an event takes place             |
| `location_city`, `location_state`, `location_zip` | `events`             | Event location details                                  |
| `access_instructions`                             | `events`             | How to access the event venue                           |
| `full_name`                                       | `hub_guest_profiles` | Hub participant's display name                          |
| `connected_email`                                 | `google_connections` | Chef's connected Gmail address                          |
| `from_address`                                    | `gmail_sync_log`     | Sender email from synced emails                         |
| `address`, `city`, `state`, `zip`                 | `partner_locations`  | Partner venue addresses                                 |

**Who can see Tier 2 data:**

| Data                                        | Chef              | Client           | Staff                | Partner       | Admin       | Public             |
| ------------------------------------------- | ----------------- | ---------------- | -------------------- | ------------- | ----------- | ------------------ |
| Client name, email, phone                   | Own tenant only   | Own data only    | Never                | Never         | All tenants | Never              |
| Client address, access/parking instructions | Own tenant only   | Own data only    | Assigned events only | Never         | All tenants | Never              |
| Client spouse, children, guests, milestones | Own tenant only   | Own data only    | Never                | Never         | All tenants | Never              |
| Staff name, email, phone                    | Own staff only    | Never            | Own data only        | Never         | All tenants | Never              |
| Partner contact name, email, phone          | Own partners only | Never            | Never                | Own data only | All tenants | Never              |
| Event location address                      | Own tenant only   | Own events only  | Assigned events only | Never         | All tenants | Never              |
| Hub guest profile name                      | If in same group  | If in same group | Never                | Never         | All         | Group members only |
| Gmail connected email                       | Own only          | Never            | Never                | Never         | All tenants | Never              |

---

### Tier 3: Financial Data

Revenue, expenses, pricing, payment details, compensation, and anything involving money.

| Field                                          | Table                     | What It Contains                       |
| ---------------------------------------------- | ------------------------- | -------------------------------------- |
| `total_quoted_cents`                           | `quotes`                  | Price quoted to client                 |
| `price_per_person_cents`                       | `quotes`                  | Per-person pricing                     |
| `deposit_amount_cents`                         | `quotes`                  | Required deposit amount                |
| `pricing_notes`                                | `quotes`                  | Chef's pricing rationale               |
| `internal_notes`                               | `quotes`                  | Chef's private notes on the quote      |
| `pricing_snapshot`                             | `quotes`                  | Frozen pricing at time of acceptance   |
| `amount_cents`                                 | `ledger_entries`          | Payment amount received                |
| `payment_method`                               | `ledger_entries`          | How the payment was made               |
| `payment_card_used`                            | `ledger_entries`          | Last 4 digits of card                  |
| `transaction_reference`                        | `ledger_entries`          | Stripe/payment provider reference ID   |
| `amount_cents`                                 | `expenses`                | Expense amount                         |
| `vendor_name`                                  | `expenses`                | Where the chef shopped                 |
| `receipt_photo_url`                            | `expenses`                | Receipt image                          |
| `quoted_price_cents`                           | `events`                  | Event price                            |
| `deposit_amount_cents`                         | `events`                  | Event deposit                          |
| `tip_amount_cents`                             | `events`                  | Tip amount                             |
| `hourly_rate_cents`                            | `staff_members`           | Staff member's pay rate                |
| `pay_amount_cents`                             | `event_staff_assignments` | What staff was paid for an event       |
| `rate_override_cents`                          | `event_staff_assignments` | Custom rate for a specific event       |
| `actual_hours`, `scheduled_hours`              | `event_staff_assignments` | Staff labor hours                      |
| `lifetime_value_cents`                         | `clients`                 | Total revenue from this client         |
| `average_spend_cents`                          | `clients`                 | Client's average event spend           |
| `total_events_count`                           | `clients`                 | How many events this client has booked |
| `loyalty_points`, `loyalty_tier`               | `clients`                 | Loyalty program standing               |
| `average_price_cents`, `last_price_cents`      | `ingredients`             | Ingredient pricing data                |
| `commission_notes`                             | `referral_partners`       | Commission arrangements                |
| `mileage_miles`, `mileage_rate_per_mile_cents` | `expenses`                | Mileage reimbursement details          |

**Who can see Tier 3 data:**

| Data                                          | Chef         | Client                                              | Staff         | Partner | Admin       | Public |
| --------------------------------------------- | ------------ | --------------------------------------------------- | ------------- | ------- | ----------- | ------ |
| Quote total, deposit, per-person price        | Own tenant   | Own quotes only (the price, not the internal notes) | Never         | Never   | All tenants | Never  |
| Quote internal notes and pricing rationale    | Own tenant   | Never                                               | Never         | Never   | All tenants | Never  |
| Ledger entries (payments received)            | Own tenant   | Own events only                                     | Never         | Never   | All tenants | Never  |
| Payment method and card details               | Own tenant   | Own payments only                                   | Never         | Never   | All tenants | Never  |
| All expenses, receipts, vendor names          | Own tenant   | Never                                               | Never         | Never   | All tenants | Never  |
| Event pricing (quoted price, deposit, tip)    | Own tenant   | Own events only                                     | Never         | Never   | All tenants | Never  |
| Staff pay rates and labor costs               | Own staff    | Never                                               | Own rate only | Never   | All tenants | Never  |
| Client lifetime value, avg spend, event count | Own tenant   | Never                                               | Never         | Never   | All tenants | Never  |
| Client loyalty points and tier                | Own tenant   | Own data only                                       | Never         | Never   | All tenants | Never  |
| Ingredient pricing                            | Own tenant   | Never                                               | Never         | Never   | All tenants | Never  |
| Partner commission notes                      | Own partners | Never                                               | Never         | Never   | All tenants | Never  |

---

### Tier 4: Behavioral and Relationship Intelligence

Subjective observations, patterns, and notes a chef keeps about clients. This data is the chef's private business intelligence.

| Field                               | Table                  | What It Contains                                                      |
| ----------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `vibe_notes`                        | `clients`              | Chef's notes on client personality and tone                           |
| `payment_behavior`                  | `clients`              | How and when the client pays                                          |
| `tipping_pattern`                   | `clients`              | Whether the client tips well, average, or not at all                  |
| `farewell_style`                    | `clients`              | How the client ends events                                            |
| `what_they_care_about`              | `clients`              | Client's personal interests and values                                |
| `note_text`                         | `client_notes`         | Free-form notes about a client                                        |
| `category`                          | `client_notes`         | Note category (general, dietary, preference, logistics, relationship) |
| `content`                           | `remy_memories`        | AI-extracted facts about chef behavior and client preferences         |
| `could_have_done_earlier`           | `after_action_reviews` | Post-event self-critique                                              |
| `what_went_well`, `what_went_wrong` | `after_action_reviews` | Post-event analysis                                                   |
| `client_behavior_notes`             | `after_action_reviews` | Chef's observations about how the client acted                        |
| `source_message`                    | `inquiries`            | Verbatim original message from a prospective client                   |
| `body`                              | `messages`             | Full message content between chef and client                          |
| `body`                              | `chat_messages`        | Real-time chat message content                                        |

**Who can see Tier 4 data:**

| Data                                         | Chef       | Client                 | Staff | Partner | Admin       | Public |
| -------------------------------------------- | ---------- | ---------------------- | ----- | ------- | ----------- | ------ |
| Client vibe notes, payment behavior, tipping | Own tenant | Never                  | Never | Never   | All tenants | Never  |
| Client notes (all categories)                | Own tenant | Never                  | Never | Never   | All tenants | Never  |
| Remy AI memories                             | Own tenant | Never                  | Never | Never   | All tenants | Never  |
| After-action reviews                         | Own tenant | Never                  | Never | Never   | All tenants | Never  |
| Inquiry source message                       | Own tenant | Own inquiry only       | Never | Never   | All tenants | Never  |
| Messages (email, text, logged)               | Own tenant | Own conversations only | Never | Never   | All tenants | Never  |
| Chat messages                                | Own tenant | Own conversations only | Never | Never   | All tenants | Never  |

**Explicit rule:** A client must **never** see what a chef has written about them in vibe notes, payment behavior, tipping pattern, farewell style, what they care about, client behavior notes in AARs, or any client note. This is the chef's private business intelligence. Exposing it would destroy the client relationship.

---

### Tier 5: Credentials and Authentication Tokens

OAuth tokens, API keys, and anything that grants access to external services.

| Field                           | Table                         | What It Contains                                  |
| ------------------------------- | ----------------------------- | ------------------------------------------------- |
| `access_token`, `refresh_token` | `google_connections`          | Google OAuth tokens (Gmail, Calendar)             |
| `access_token`, `refresh_token` | `social_platform_credentials` | Social media OAuth tokens (AES-256-GCM encrypted) |
| `key_hash`                      | `chef_api_keys`               | SHA-256 hash of API key (actual key never stored) |
| `key_prefix`                    | `chef_api_keys`               | First 8 characters of API key for display         |
| `subscription_object`           | `push_subscriptions`          | Web Push subscription endpoint and keys           |

**Who can see Tier 5 data:**

- Chef: own credentials only (tokens are never displayed in UI; only connection status is shown)
- Everyone else: never
- System: service role accesses tokens for sync operations (Gmail, social media)
- Admin: can see connection status (connected/disconnected) but not the tokens themselves

**Explicit rule:** OAuth tokens and API keys are never rendered in any UI, never included in any API response, never logged, and never sent in any email or notification. The only visible artifacts are connection status booleans and key prefixes.

---

### Tier 6: Location and Physical Access

Addresses, access codes, gate codes, and any information that could enable physical access to a person's home or venue.

This tier overlaps with Tier 2 (PII) but is called out separately because the privacy risk is physical safety, not just identity exposure.

| Field                  | Table               | What It Contains                                  |
| ---------------------- | ------------------- | ------------------------------------------------- |
| `address`              | `clients`           | Client's home address                             |
| `access_instructions`  | `clients`           | Gate codes, door codes, "enter through side door" |
| `parking_instructions` | `clients`           | Where to park, garage codes                       |
| `house_rules`          | `clients`           | Rules for being in the client's home              |
| `location_address`     | `events`            | Event venue address                               |
| `access_instructions`  | `events`            | How to access the event venue                     |
| `site_notes`           | `events`            | Notes about the physical site                     |
| `address`              | `partner_locations` | Partner venue address                             |

**Who can see Tier 6 data:**

| Data                               | Chef         | Client          | Staff                | Partner            | Admin       | Public |
| ---------------------------------- | ------------ | --------------- | -------------------- | ------------------ | ----------- | ------ |
| Client home address                | Own tenant   | Own data only   | Assigned events only | Never              | All tenants | Never  |
| Client access/parking instructions | Own tenant   | Own data only   | Assigned events only | Never              | All tenants | Never  |
| Client house rules                 | Own tenant   | Own data only   | Assigned events only | Never              | All tenants | Never  |
| Event venue address                | Own tenant   | Own events only | Assigned events only | Never              | All tenants | Never  |
| Event access instructions          | Own tenant   | Own events only | Assigned events only | Never              | All tenants | Never  |
| Partner location address           | Own partners | Never           | Never                | Own locations only | All tenants | Never  |

**Explicit rule:** A staff member who is not assigned to a specific event must never see the address or access instructions for that event. Staff access to location data is scoped to their assignments, not to the entire tenant.

---

### Tier 7: Browser-Local Data (Never Leaves the Device)

Data stored exclusively in the user's browser. ChefFlow servers never receive, store, or process this data.

| Storage                | Location                    | What It Contains                               |
| ---------------------- | --------------------------- | ---------------------------------------------- |
| Remy conversations     | IndexedDB (`chefflow-remy`) | Full conversation history with AI concierge    |
| Remy messages          | IndexedDB (`chefflow-remy`) | Individual message content, bookmarks, tasks   |
| Remy projects          | IndexedDB (`chefflow-remy`) | Organizational folders for conversations       |
| Remy templates         | IndexedDB (`chefflow-remy`) | Saved message templates                        |
| Remy action log        | IndexedDB (`chefflow-remy`) | Audit trail of user actions in Remy            |
| Session ID             | sessionStorage              | Tab-specific session identifier                |
| Announcement dismissal | sessionStorage              | Whether user dismissed a platform announcement |

**Who can see Tier 7 data:**

- Only the person using that specific browser on that specific device
- Not the chef, not the admin, not the developer, not ChefFlow servers
- The user can voluntarily export Remy conversations (e.g., "Send to Support"), but this is an explicit user action

**Explicit rule:** Remy conversation data is never transmitted to ChefFlow servers. It exists only in the browser's IndexedDB. Clearing browser data deletes it permanently. There is no server-side backup of Remy conversations.

---

## Hard Access Rules by User Type

### 1. PUBLIC: Cannot See

A public user (anyone without an account) **cannot** see, access, or retrieve any of the following. No exceptions.

**Data they cannot see:**

- Any client's name, email, phone, address, dietary restrictions, allergies, or any field from the `clients` table
- Any event details (date, location, guest count, pricing, menu, dietary needs)
- Any quote (pricing, terms, status)
- Any ledger entry (payments, amounts, methods)
- Any expense (amounts, vendors, receipts)
- Any message or chat content between chef and client
- Any inquiry details (source message, budget, dietary needs)
- Any recipe content (name, method, ingredients, pricing). This is chef intellectual property
- Any menu content (dishes, courses, components)
- Any staff member data (names, phone, email, rates, schedules)
- Any partner data beyond what the partner has marked as publicly visible
- Any notification data
- Any activity log or audit trail
- Any after-action review content
- Any client notes or relationship intelligence
- Any loyalty program details (tiers, points, transactions)
- Any financial summary or analytics
- Any OAuth tokens, API keys, or credentials
- Any Remy AI memory or conversation context
- Any admin page or admin data
- Any chef's business settings or configuration
- Any document (invoices, contracts, packing lists)

**What public users CAN see (exhaustive list):**

- Public landing page, pricing page, FAQ, blog posts, legal pages (privacy, terms, trust)
- Chef public profiles (only if the chef has set `network_discoverable = true`): business name, tagline, slug, public profile image, public logo
- Chef social media images (public storage bucket)
- Hub group pages (only via a valid `group_token` URL): group name, messages, member display names
- Event RSVP pages (only via a valid secure token URL): event date, occasion, menu preview (if shared), RSVP form
- Open tables listing page: chef name, availability slots
- Embed inquiry form (on external websites): submits name, email, phone, event details to create an inquiry
- Contact form: submits a message to the platform
- Experience share pages (only via a valid share token URL): post-event recap content the chef has chosen to share
- Availability calendar (only via a valid token URL): chef's open/blocked dates

---

### 2. CHEF: Cannot See

A chef **cannot** see, access, or retrieve any of the following.

- Any other chef's clients, events, quotes, inquiries, recipes, menus, expenses, ledger entries, staff, documents, or any business data
- Any other chef's financial data (revenue, expenses, profit, food costs)
- Any other chef's staff details (names, rates, schedules)
- Any other chef's partner/referral data
- Any other chef's Remy AI memories or conversation context
- Any other chef's OAuth tokens or integrations
- Any other chef's settings or configuration
- Any other chef's after-action reviews or client notes
- Any other chef's network posts (unless they have an accepted chef network connection)
- Any admin-only pages (unless the chef is also an admin)
- Prospecting pages (admin-only, even for chefs)
- Any user's browser-local Remy conversation history (Tier 7, device-only)

**What a chef CAN see (within their own tenant only):**

- All of their own clients and every field on the client record
- All of their own events, quotes, inquiries, menus, recipes, ingredients, dishes, components
- All of their own ledger entries, expenses, financial summaries
- All of their own staff members and their details (including pay rates)
- All of their own referral partners and partner locations
- All of their own messages, chat conversations, and communication threads
- All of their own documents, contracts, invoices
- All of their own Remy AI memories
- All of their own notifications and preferences
- All of their own activity logs
- All of their own after-action reviews and client notes
- All of their own settings, integrations, OAuth connection status
- All of their own loyalty program configuration, transactions, and rewards
- Network posts from chefs they have an accepted connection with

---

### 3. CLIENT: Cannot See

A client **cannot** see, access, or retrieve any of the following. This is the most important boundary for privacy.

**Chef's business operations (never visible to any client):**

- Recipes (names, methods, ingredients, pricing). Recipes are the chef's intellectual property. Clients see menu descriptions and dish names, not the underlying recipes, methods, or ingredient costs.
- Food costs, ingredient prices, vendor names, vendor pricing
- Profit margins, revenue totals, expense totals
- Expense records (amounts, categories, receipts, vendors)
- Staff members (names, phone numbers, email, pay rates, schedules, assignments)
- After-action reviews (what went well, what went wrong, client behavior notes)
- Chef's internal notes on quotes (`internal_notes`, `pricing_notes`)
- Chef's automation rules, integrations, Gmail sync status
- Chef's social media queue, drafts, credentials
- Chef's calendar (except dates of their own events)
- Chef's documents (contracts, internal docs, packing lists) except documents explicitly shared with the client
- Chef's Remy AI memories or conversation history
- Chef's settings or business configuration
- Chef's network connections or network posts
- Chef's prospecting pipeline or lead scores
- Chef's loyalty program configuration (the client sees their own points/tier, not the config)

**Other clients' data (never visible):**

- Any other client's name, email, phone, address, dietary restrictions, allergies, or any other field
- Any other client's events, quotes, messages, or bookings
- Any other client's loyalty standing

**Chef's private observations about the client (never visible to the client they describe):**

- `vibe_notes` (what the chef thinks about their personality)
- `payment_behavior` (how the chef categorizes their payment habits)
- `tipping_pattern` (what the chef thinks about their tipping)
- `farewell_style` (how the chef describes their behavior at event end)
- `what_they_care_about` (the chef's notes on their values/interests)
- `client_notes` of all categories (any note the chef has written about them)
- `client_behavior_notes` in after-action reviews

**Platform areas (never accessible):**

- Admin pages
- Staff portal
- Partner portal
- Any data from a different tenant

**What a client CAN see (exhaustive list):**

- Their own profile: name, email, phone, address, dietary restrictions, allergies, preferences
- Their own inquiries: inquiry status, dates, their original message
- Their own events: event date, time, guest count, occasion, location, dietary needs, menu (if shared), status
- Their own quotes: total price, deposit, per-person price, status (not internal notes or pricing rationale)
- Their own messages: full message history in their conversations with the chef
- Their own chat messages: real-time chat content in their conversations
- Their own ledger entries: payments they have made, amounts, payment methods
- Their own loyalty data: points balance, tier, transaction history, available rewards
- Their own reviews: reviews they have written
- Their own notifications and notification preferences
- Menus and dishes for events they have booked (the menu content, not the recipe details or costs behind it)
- Hub groups they are members of: group messages, member names

---

### 4. STAFF: Cannot See

A staff member **cannot** see, access, or retrieve any of the following.

**Client data:**

- Client names, emails, phones, addresses (except for events they are assigned to, and even then only the event location, not the client's home address unless the event is at the client's home)
- Client relationship intelligence (vibe notes, payment behavior, tipping, milestones)
- Client financial data (lifetime value, average spend)
- Client notes
- Client loyalty data
- Client conversations or messages
- Client dietary data for events they are NOT assigned to

**Financial data:**

- Chef's revenue, expenses, profit margins, food costs
- Quote pricing, ledger entries, payment details
- Other staff members' pay rates or labor costs (can see their own rate only)
- Ingredient pricing
- Commission arrangements with partners

**Business operations:**

- Chef's inquiry pipeline, leads, prospecting
- Chef's client list or client profiles
- Chef's documents, contracts (except event-specific prep docs shared with them)
- Chef's calendar (except their own schedule)
- Chef's settings, integrations, automations
- Chef's network connections or posts
- Chef's Remy AI memories or conversations
- Chef's social media queue or marketing
- Chef's after-action reviews
- Chef's Gmail sync or email data
- Partner data

**Other staff:**

- Other staff members' personal details (phone, email)
- Other staff members' pay rates, hours, assignments (can see their own only)

**Platform areas:**

- Admin pages
- Client portal
- Partner portal
- Any data from a different tenant

**What a staff member CAN see (exhaustive list):**

- Their own profile: name, email, phone, their own hourly rate
- Tasks assigned to them: task description, status, due date
- Recipes relevant to their assigned events/stations: recipe name, method, ingredients (for prep/execution)
- Their own schedule: shifts, event assignments, dates, times
- Their own station assignments: station name, responsibilities
- Their own clock-in/clock-out records and hours
- Event details for their assigned events only: event date, time, guest count, location, dietary restrictions, allergies, menu, special requests

---

### 5. PARTNER: Cannot See

A partner **cannot** see, access, or retrieve any of the following.

- Any client data (names, emails, phones, addresses, dietary info, allergies, preferences, notes, financial data)
- Any event data (dates, locations, menus, guest counts, pricing, status)
- Any quote data (pricing, terms, status)
- Any financial data (revenue, expenses, ledger entries, food costs, margins)
- Any recipe or menu data
- Any staff data (names, rates, schedules)
- Any message or conversation content
- Any inquiry details beyond referral attribution
- Any after-action review
- Any client notes or relationship intelligence
- Any chef settings, integrations, automations
- Any chef network connections or posts
- Any Remy AI memories or conversations
- Any chef documents or contracts
- Any loyalty program data
- Other partners' data (including other partners' referral stats or commission arrangements)
- Admin pages
- Client portal
- Staff portal
- Any data from a different tenant

**What a partner CAN see (exhaustive list):**

- Their own profile: name, contact info, type, description
- Their own locations: location name, address, description, notes, max guest count
- Their own referral stats: number of referrals, conversion metrics (aggregate, not individual client data)
- Preview of the chef they refer to: chef's public profile information

---

### 6. ADMIN: Cannot See

An admin has **read access to all data across all tenants**. There is almost nothing an admin cannot see.

**What an admin cannot see:**

- Browser-local Remy conversations (Tier 7 data, never leaves the user's device)
- The actual value of OAuth tokens or API keys (only connection status and key prefixes)
- User passwords (hashed by Supabase Auth, not accessible)

**What an admin cannot do directly:**

- Modify any tenant's data without first impersonating that chef (admin views are read-only; writes require chef context)
- Delete data without impersonating the owning chef
- Access Supabase Auth internals (password hashes, MFA secrets) through the application

**What an admin CAN see:**

- All clients, events, quotes, inquiries, menus, recipes, staff, documents, expenses, ledger entries, activity logs, audit trails, loyalty data, notification logs, communication threads, Remy AI memories, integration status, onboarding progress, prospecting pipelines, social activity, hub groups, and system health across every tenant

---

### 7. SYSTEM: Cannot See

System actors (Remy, Gustav, cron jobs, webhooks) operate under the `service_role` database context, which bypasses RLS. Access is controlled by application logic, not database policies.

**What system actors cannot do:**

- Bypass immutability constraints: ledger entries, event state transitions, quote state transitions, inquiry state transitions, menu state transitions, and audit logs cannot be updated or deleted, even by service role
- Generate or fabricate recipes (Remy restriction, permanently enforced)
- Make event lifecycle transitions without chef confirmation
- Write ledger entries except through the append function (`lib/ledger/append.ts`)
- Send data to external AI services (all private data processed locally via Ollama only)
- Access browser-local data (Tier 7)

**What system actors are scoped to:**

- Remy: only sees the tenant context and conversation context passed to it for the current request. Does not have ambient cross-tenant access.
- Cron jobs: access only the tables relevant to their specific task (e.g., loyalty expiry cron only reads/writes loyalty tables)
- Webhooks: process only the payload they receive (e.g., Stripe webhook processes only the payment event in the payload)
- Gmail sync: accesses only the chef's own Gmail connection and writes only to that chef's tenant

---

### 8. DEVELOPER: Cannot See

The developer has unrestricted access to everything: code, database, infrastructure, all environments, all data.

**Self-imposed constraints (not technical restrictions):**

- Never push to main without explicit intent
- Never delete production data without backup
- Never access client data for non-business purposes
- Accountable for platform privacy compliance

---

## Cross-Tenant Data (Intentional Exceptions)

These are the only places where data crosses tenant boundaries by design. Everything else is strictly tenant-isolated.

| Feature              | What Crosses                                   | Who Sees It                                                    | Why                                                 |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| Chef Network         | Network posts from connected chefs             | Both chefs in an accepted connection                           | Peer collaboration between chefs                    |
| Hub Groups           | Hub messages, guest profiles, group membership | All group members (including unauthenticated guests via token) | Social event coordination is inherently multi-party |
| Admin Views          | All tenant data (read-only)                    | Admin users only                                               | Platform operation and support                      |
| Public Chef Profiles | Business name, tagline, slug, profile image    | Anyone (public)                                                | Chef marketing and discovery                        |
| Experience Shares    | Post-event recap content selected by chef      | Anyone with the share token                                    | Social sharing of completed events                  |

---

## Enforcement Layers

Access control is enforced at multiple layers. A failure at one layer does not compromise the system because other layers still block unauthorized access.

| Layer                         | What It Does                                                                                                                                  | Where                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Middleware**                | Checks role from signed HMAC cookie; redirects wrong roles before page loads                                                                  | `middleware.ts`                           |
| **Layout guards**             | Each route group layout calls `requireChef()`, `requireClient()`, `requireStaff()`, `requirePartner()`, or `requireAdmin()` as a second check | `app/(chef)/layout.tsx`, etc.             |
| **Server action guards**      | Every server action begins with a `require*()` call and derives `tenantId` from the session, never from the request                           | `lib/` server actions                     |
| **Row Level Security**        | Database-level policies on every table enforce tenant isolation even if application code has a bug                                            | Supabase RLS policies in migrations       |
| **Tenant ID derivation**      | `tenantId` always comes from `user_roles` table via authenticated session, never from request body or URL parameters                          | `lib/auth/get-user.ts`                    |
| **Module gating**             | Pro features blocked by `requirePro()` server-side and `<UpgradeGate>` client-side                                                            | `lib/billing/require-pro.ts`              |
| **Storage bucket RLS**        | File access scoped by tenant ID embedded in the storage path (first folder = tenant_id)                                                       | Storage migration                         |
| **Token-based public access** | Public pages use cryptographically random tokens in URLs; no enumeration possible                                                             | Share tokens, group tokens, secure tokens |
| **Rate limiting**             | Public-facing endpoints (embed form, kiosk) rate-limited by IP                                                                                | Cloudflare + application-level checks     |
| **CAPTCHA**                   | Embed inquiry form protected by Cloudflare Turnstile                                                                                          | `app/api/embed/inquiry/route.ts`          |
| **Signed cookies**            | Role cache cookie is HMAC-signed; tampering invalidates it and forces re-query                                                                | `lib/auth/signed-cookie.ts`               |

---

## Immutable Data (Cannot Be Changed by Anyone)

These records are append-only. Once created, they cannot be updated or deleted by any user, any role, or any system process. This is enforced at the database level.

| Table                       | Why Immutable                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| `ledger_entries`            | Financial audit trail. Corrections are made by appending a new reversal entry, never by editing. |
| `event_state_transitions`   | Event lifecycle audit trail. Every state change is recorded permanently.                         |
| `quote_state_transitions`   | Quote lifecycle audit trail.                                                                     |
| `inquiry_state_transitions` | Inquiry lifecycle audit trail.                                                                   |
| `menu_state_transitions`    | Menu approval audit trail.                                                                       |
| `audit_log`                 | System audit trail.                                                                              |
| `notification_delivery_log` | Notification delivery audit trail.                                                               |

---

## Resource Access Matrix (Operations)

### Events

| Action                               | Chef (own tenant)    | Chef (other tenant) | Client (own events) | Client (other) | Staff (assigned) | Partner | System       | Admin               |
| ------------------------------------ | -------------------- | ------------------- | ------------------- | -------------- | ---------------- | ------- | ------------ | ------------------- |
| Create event                         | Yes                  | No                  | No                  | No             | No               | No      | Yes          | Yes (impersonating) |
| View event                           | Yes                  | No                  | Yes                 | No             | Assigned only    | No      | Yes          | Yes                 |
| Update event                         | Yes                  | No                  | No                  | No             | No               | No      | Yes          | Yes (impersonating) |
| Delete event                         | Yes (if no payments) | No                  | No                  | No             | No               | No      | No           | Yes (impersonating) |
| Transition: draft to proposed        | Yes                  | No                  | No                  | No             | No               | No      | No           | No                  |
| Transition: proposed to accepted     | No                   | No                  | Yes                 | No             | No               | No      | No           | No                  |
| Transition: accepted to paid         | No                   | No                  | No                  | No             | No               | No      | Yes (Stripe) | No                  |
| Transition: paid to confirmed        | Yes                  | No                  | No                  | No             | No               | No      | No           | No                  |
| Transition: any to cancelled         | Yes                  | No                  | Yes (own)           | No             | No               | No      | Yes          | No                  |
| Transition: in_progress to completed | Yes                  | No                  | No                  | No             | No               | No      | No           | No                  |

### Clients

| Action                  | Chef (own tenant) | Client (own record)            | Staff | Partner | System | Admin               |
| ----------------------- | ----------------- | ------------------------------ | ----- | ------- | ------ | ------------------- |
| Create client           | Yes               | No                             | No    | No      | Yes    | Yes (impersonating) |
| View client list        | Yes               | No                             | No    | No      | Yes    | Yes                 |
| View own client record  | Yes               | Yes                            | No    | No      | Yes    | Yes                 |
| Update client           | Yes               | Yes (own info, limited fields) | No    | No      | Yes    | Yes (impersonating) |
| Delete client           | Yes (soft-delete) | No                             | No    | No      | No     | Yes (impersonating) |
| Invite client to portal | Yes               | No                             | No    | No      | No     | No                  |

### Ledger and Financial Records

| Action                | Chef (own tenant) | Client          | Staff | Partner | System        | Admin               |
| --------------------- | ----------------- | --------------- | ----- | ------- | ------------- | ------------------- |
| View ledger entries   | Yes               | Own events only | No    | No      | Yes           | Yes                 |
| Create ledger entry   | Yes               | No              | No    | No      | Yes (webhook) | Yes (impersonating) |
| Update ledger entry   | No (immutable)    | No              | No    | No      | No            | No                  |
| Delete ledger entry   | No (immutable)    | No              | No    | No      | No            | No                  |
| View expenses         | Yes               | No              | No    | No      | Yes           | Yes                 |
| Export financial data | Yes               | No              | No    | No      | No            | Yes                 |

### Messages and Chat

| Action            | Chef (own tenant) | Client (own conversations) | Staff | Partner | System            | Admin          |
| ----------------- | ----------------- | -------------------------- | ----- | ------- | ----------------- | -------------- |
| View conversation | Yes               | Yes                        | No    | No      | Yes               | Yes            |
| Send message      | Yes               | Yes                        | No    | No      | Yes (system msgs) | No             |
| Edit message      | Yes (own msgs)    | Yes (own msgs)             | No    | No      | No                | No             |
| Delete message    | No                | No                         | No    | No      | No                | No (immutable) |

### Inquiries and Quotes

| Action                   | Chef (own tenant) | Client                       | Staff | Partner | System                  | Admin |
| ------------------------ | ----------------- | ---------------------------- | ----- | ------- | ----------------------- | ----- |
| Submit inquiry           | No                | Yes (via public form)        | No    | No      | Yes (webhook ingestion) | No    |
| View inquiry             | Yes               | Yes (own)                    | No    | No      | Yes                     | Yes   |
| Create quote             | Yes               | No                           | No    | No      | No                      | No    |
| View quote               | Yes               | Yes (own, no internal notes) | No    | No      | Yes                     | Yes   |
| Accept/reject quote      | No                | Yes (own)                    | No    | No      | No                      | No    |
| Convert inquiry to event | Yes               | No                           | No    | No      | No                      | No    |

### Menus and Recipes

| Action              | Chef (own tenant) | Client                          | Staff                 | Partner | System | Admin |
| ------------------- | ----------------- | ------------------------------- | --------------------- | ------- | ------ | ----- |
| Create menu         | Yes               | No                              | No                    | No      | No     | No    |
| View menu           | Yes               | Yes (if shared for their event) | Yes (assigned events) | No      | Yes    | Yes   |
| Approve/reject menu | No                | Yes (own event)                 | No                    | No      | No     | No    |
| View recipes        | Yes               | No                              | Yes (assigned events) | No      | No     | Yes   |
| Create/edit recipes | Yes               | No                              | No                    | No      | No     | No    |

### Settings and Configuration

| Action                   | Chef (own) | Client | Staff | Partner | System | Admin               |
| ------------------------ | ---------- | ------ | ----- | ------- | ------ | ------------------- |
| Chef profile update      | Yes        | No     | No    | No      | No     | Yes (impersonating) |
| Contract templates       | Yes        | No     | No    | No      | No     | No                  |
| Automation rules         | Yes        | No     | No    | No      | No     | No                  |
| Feature flags (per-chef) | No         | No     | No    | No      | No     | Yes                 |
| Webhook endpoints        | Yes        | No     | No    | No      | No     | Yes                 |
| API keys (own)           | Yes        | No     | No    | No      | No     | Yes                 |

### Admin Panel

| Action                 | Chef | Client | Staff | Partner | System | Admin |
| ---------------------- | ---- | ------ | ----- | ------- | ------ | ----- |
| View all tenants       | No   | No     | No    | No      | No     | Yes   |
| Impersonate chef       | No   | No     | No    | No      | No     | Yes   |
| Impersonate client     | No   | No     | No    | No      | No     | Yes   |
| Toggle feature flags   | No   | No     | No    | No      | No     | Yes   |
| View audit log         | No   | No     | No    | No      | No     | Yes   |
| Cross-tenant analytics | No   | No     | No    | No      | No     | Yes   |

---

## Privacy Commitments

These are the platform's privacy guarantees, derived from the access rules above.

1. **A client's personal data is never visible to another client.** Two clients of the same chef cannot see each other's names, contact info, events, or any data.

2. **A client never sees what the chef privately thinks about them.** Vibe notes, payment behavior, tipping patterns, client behavior notes in AARs, and all client notes are permanently invisible to the client.

3. **A chef's recipes are never visible to clients, staff (outside assigned events), partners, or the public.** Recipes are the chef's intellectual property. Clients see menu descriptions and dish names, not the underlying recipes, methods, or ingredient costs.

4. **Financial data is compartmentalized.** Clients see only their own payment amounts. Staff see only their own pay rate. Partners see no financial data. No user sees another user's financial data.

5. **Location and access data is need-to-know.** Staff see event locations only for events they are assigned to. Partners never see event or client locations. Public users never see any location data.

6. **AI conversations stay on the device.** Remy chat history is stored in the browser's IndexedDB and is never transmitted to ChefFlow servers. No one (not the chef, not the admin, not the developer) can access another user's Remy conversations through the platform.

7. **Private data never leaves the local machine for AI processing.** All AI features that handle client PII, financial data, health data, or business intelligence use local Ollama, never cloud AI services. Data is processed on the chef's machine and never sent to external APIs.

8. **OAuth tokens are never displayed, logged, or transmitted.** Google and social media OAuth tokens are encrypted at rest (AES-256-GCM for social, Supabase encryption for Google) and are only accessed by system processes for sync operations. No UI ever renders a token value.

9. **Tenant isolation cannot be bypassed by client-side manipulation.** Even if a user forges a request with another tenant's ID, RLS policies at the database level will reject it. Tenant ID is always derived server-side from the authenticated session.

10. **Deleted accounts cascade.** When a user account is deleted, related records are handled through Supabase Auth cascade rules. Soft deletion (status changes) is preferred for data integrity.

---

## How to Use This Document

**When building a new feature:**

1. Identify which user types will interact with it
2. Check this document for what each type can and cannot see
3. Add the appropriate `require*()` guard to server actions
4. Add the appropriate RLS policy if creating a new table
5. Scope all queries by `tenantId` derived from the session
6. Update this document with the new feature's access rules

**When reviewing existing code:**

1. If a query does not filter by `tenantId` on a tenant-scoped table, that is a bug
2. If a server action does not start with a `require*()` call, that is a bug
3. If a client-facing page displays any data from Tier 4 (behavioral intelligence), that is a bug
4. If any financial data is visible to staff or partners, that is a bug
5. If any client's data is visible to another client, that is a bug

**When adding a new table:**

1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Add SELECT, INSERT, UPDATE policies scoped to the appropriate roles
3. Add tenant_id or chef_id column with FK to chefs(id)
4. Document the access rules in this file

---

## Testing Access Control

Automated tests for access control:

- `tests/e2e/17-tenant-isolation.spec.ts` - Cross-tenant isolation (Chef A vs Chef B)
- `tests/e2e/15-coverage-auth-boundaries.spec.ts` - Route protection tests (unauthenticated + wrong role)
- `tests/integration/ledger-idempotency.integration.test.ts` - Ledger immutability

To verify manually:

```bash
# As Chef A: try to access Chef B's event - should get 404 or redirect
curl -X GET https://cheflowhq.com/events/[chef-b-event-id] -H "Cookie: ..."

# Invalid API key:
curl /api/v1/events -H "Authorization: Bearer CF_LIVE_INVALID"
# Expected: 401

# Missing Authorization:
curl /api/v1/events
# Expected: 401
```

---

_Last updated: 2026-03-08_
_Maintained by: Claude Code (lead engineer)_
