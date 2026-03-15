# Inquiry Consolidation Research: Multi-Platform Funnel for Private Chefs

**Date:** 2026-03-15
**Status:** Initial Research Complete
**Priority:** Core Product Vision

---

## 1. The Problem (Developer's #1 Pain Point)

Private chefs manage inquiries across 5-15+ third-party platforms simultaneously. Each platform sends 10-30+ email notifications daily. The current workflow:

- Open each email individually to extract useful info
- Context-switch between platform dashboards constantly
- Copy-paste conversations from gated platforms into personal tracking
- Manually search source platforms to find specific inquiry pages
- No intelligent parsing, no unified view, no single source of truth

**This is universally acknowledged as the most frustrating operational hurdle for private chefs.**

---

## 2. Platform Landscape

### 2a. Major Private Chef Platforms

| Platform                   | Model                           | Email Volume      | Gatekeeping Level                           | API Available             |
| -------------------------- | ------------------------------- | ----------------- | ------------------------------------------- | ------------------------- |
| **TakeAChef.com**          | Marketplace (commission)        | High (20+/day)    | HIGH - conversations locked to platform     | No public API             |
| **PrivateChefManager.com** | Directory/listing               | Medium (5-15/day) | MEDIUM - email forwards with partial data   | No public API             |
| **Thumbtack**              | Lead marketplace (pay-per-lead) | High (10-20+/day) | HIGH - messaging locked, lead details gated | Pro API (limited)         |
| **The Knot / WeddingWire** | Wedding marketplace             | Medium (5-10/day) | HIGH - all messaging on platform            | Vendor API (limited)      |
| **Bark**                   | Service marketplace             | Medium            | MEDIUM - forwards project details           | No public API             |
| **HireAChef.com**          | Directory                       | Low               | LOW - mostly email forwarding               | No API                    |
| **CuisineistChef**         | Luxury marketplace              | Low               | HIGH - concierge-mediated                   | No API                    |
| **Yelp**                   | Reviews + messaging             | Medium            | HIGH - messaging locked to app              | Fusion API (reviews only) |
| **Google Business**        | Local discovery                 | Medium            | MEDIUM - messaging in Google                | Business Profile API      |
| **Instagram DMs**          | Social                          | Variable          | HIGH - must respond in-app                  | Graph API (limited)       |
| **Facebook Messenger**     | Social                          | Variable          | HIGH - must respond in-app                  | Graph API                 |

### 2b. Platform Gatekeeping Patterns

**Tier 1: Full Gatekeeping (conversations locked to platform)**

- TakeAChef, Thumbtack, The Knot, CuisineistChef, Yelp
- Notifications contain just enough to tease (client name, event type, date)
- Full details, messaging, and actions require logging into platform dashboard
- Platforms actively discourage off-platform communication
- Some platforms penalize chefs who share contact info early

**Tier 2: Partial Gatekeeping (email forwards with limited data)**

- PrivateChefManager, Bark, HireAChef
- Notification emails contain more structured data (budget, guest count, location)
- Some allow email-based responses that route back through platform
- Still require platform login for full conversation history

**Tier 3: Open Channel (direct communication)**

- Google Business, direct email, website forms, referrals
- Full data available immediately
- No platform restrictions on communication
- Already well-handled by ChefFlow's GOLDMINE pipeline

### 2c. Email Notification Anatomy

**TakeAChef typical notification:**

```
Subject: New booking request from [Client Name]
Body:
- Client name (first only, last initial)
- Event date
- Number of guests
- City/region
- Service type (private dinner, cooking class, etc.)
- CTA button: "View request" (links to platform dashboard)
- NO: budget, dietary restrictions, full contact info, conversation
```

**Thumbtack typical notification:**

```
Subject: [Client Name] wants to hire you for Personal Chef
Body:
- Client first name
- Service requested
- Location (city)
- Project details (brief text from client)
- CTA: "Respond to [Name]" (links to Thumbtack messaging)
- NO: budget, timeline specifics, contact info
```

**PrivateChefManager typical notification:**

```
Subject: New inquiry from [Client Name]
Body:
- Client name
- Event date and time
- Guest count
- Location
- Occasion type
- Budget range (sometimes)
- Dietary notes (sometimes)
- CTA: "View full details" (links to dashboard)
```

**The Knot typical notification:**

```
Subject: [Client Name] is interested in your services
Body:
- Client name
- Wedding date
- Guest count (text, not always numeric)
- Venue/location
- Budget text (vague ranges)
- CTA: "Message [Name]" (links to The Knot messaging)
```

---

## 3. Cross-Industry Solutions (How Others Solved This)

### 3a. Real Estate: Lead Aggregation

**Problem:** Agents receive leads from Zillow, Realtor.com, Redfin, Homes.com, social media, open houses, referrals. Each platform has different formats, gatekeeping, and notification patterns.

**Solutions:**

- **CRMs (Follow Up Boss, kvCORE, Sierra Interactive):** Parse incoming lead emails from all platforms using regex/template matching. Each platform's email format is reverse-engineered and a parser is maintained.
- **Key insight:** They don't try to replace the platform. They extract what they can from notifications and create a "lead card" with a deep link back to the source platform for actions that require it.
- **Zapier/Make integrations:** Some platforms offer webhooks or Zapier triggers. Agents chain these into their CRM.
- **ISA (Inside Sales Agent) teams:** Some brokerages hire people whose sole job is to monitor all platforms and funnel leads into one system. ChefFlow replaces this role with automation.

**What works:** Email parsing + deep links + unified dashboard. Accept that some platforms will always require going back to them for messaging.

### 3b. Hotels: OTA Consolidation (Channel Managers)

**Problem:** Hotels list on Booking.com, Expedia, Airbnb, Hotels.com, direct website. Each OTA sends booking notifications with different formats. Overbooking is catastrophic.

**Solutions:**

- **Channel Managers (SiteMinder, Cloudbeds, ChannelManager.com):** Two-way API sync with OTAs. Pull bookings, push availability.
- **Key insight:** Hotels CANNOT rely on email parsing for availability sync (too slow, too error-prone). They need real-time API connections.
- **PMS (Property Management Systems):** Central hub that connects to channel managers. All bookings funnel into one calendar.

**What applies to ChefFlow:** The "channel manager" concept, but for private chefs the stakes are lower (double-booking is bad but not catastrophic like hotels). Email parsing is acceptable as the primary method since real-time sync isn't critical.

### 3c. Freelancers: Multi-Platform Inbox

**Problem:** Freelancers on Upwork, Fiverr, Freelancer.com, Toptal, direct clients. Each platform has locked messaging.

**Solutions:**

- **No good solution exists.** Freelancers manually check each platform.
- **Some use:** Notion/Airtable as a manual CRM, copying inquiry details by hand.
- **Key insight:** This is an unsolved problem in the freelance economy. Whoever solves it for private chefs could solve it for all service marketplaces.

### 3d. E-commerce: Multi-Channel Order Management

**Problem:** Sellers on Amazon, eBay, Etsy, Shopify, Walmart. Each marketplace has different order formats.

**Solutions:**

- **ChannelAdvisor, Sellbrite, Linnworks:** API integrations with each marketplace. Pull orders, push inventory.
- **Email parsing fallback:** When APIs aren't available, parse order confirmation emails.
- **Key insight:** Start with email parsing, upgrade to API when available. Don't wait for perfect integration.

---

## 4. ChefFlow's Existing Infrastructure (Codebase Analysis)

### 4a. Current Inquiry Creation Paths (4 total)

1. **Gmail sync** (`lib/gmail/sync.ts`) - Parses incoming emails, creates inquiries automatically
2. **Manual creation** (`lib/inquiries/actions.ts: createInquiry`) - Chef enters details by hand
3. **Public form** (`lib/inquiries/actions.ts: submitPublicInquiry`) - Website embed widget
4. **Wix integration** (`lib/wix/wix-inquiry-actions.ts`) - Wix webhook forwarding

### 4b. Platform Detection Already Exists

ChefFlow already has platform-specific parsers in the GOLDMINE pipeline:

- **Thumbtack parser** - Extracts client name, guest count, budget, location
- **The Knot parser** - Extracts client name, wedding date, guest count, budget text
- **Bark parser** - Extracts client name, project description
- **Generic marketplace handler** - Catches unrecognized platform emails

**Key files:**

- `scripts/email-references/deterministic-extractors.ts` - Regex-based extraction
- `lib/gmail/extract-inquiry-fields.ts` - Bridge to GOLDMINE
- `lib/inquiries/platform-identity.ts` - Platform identity key extraction
- `lib/inquiries/platform-dedup.ts` - Prevents duplicate inquiry creation

### 4c. Data Model

**Structured columns on `inquiries` table:**

- `channel` (TEXT) - 'email', 'website', 'thumbtack', 'theknot', 'bark', etc.
- `external_platform` (TEXT) - Platform name (only set for marketplace emails)
- `external_inquiry_id` (TEXT) - Platform's unique ID for the inquiry
- `external_link` (TEXT) - Deep link back to source platform

**Unstructured in `unknown_fields` JSONB:**

- `platform_identity_keys` - Array of platform-specific IDs
- `original_sender_name`, `original_sender_email`
- `lead_score`, `lead_tier`, `lead_score_factors`
- Legacy TakeAChef: `tac_cta_uri_token`, `tac_link`, `tac_order_id`

### 4d. Current Gaps (10 findings from codebase audit)

| #   | Finding                                                             | Severity   | Relevance to Consolidation       |
| --- | ------------------------------------------------------------------- | ---------- | -------------------------------- |
| 1   | `external_platform` only set for marketplace emails, not manual/web | MEDIUM     | Must tag ALL sources             |
| 2   | Platform identity keys in JSONB, not indexed columns                | MEDIUM     | Slows dedup queries              |
| 3   | Lead score factors not shown in UI                                  | LOW        | Chef can't see WHY a lead is hot |
| 4   | Platform parsers extract inconsistent fields                        | MEDIUM     | Breaks cross-platform comparison |
| 5   | `follow_up_due_at` never reset after chef responds                  | MEDIUM     | False stale-lead alerts          |
| 6   | `unknown_fields` JSONB used as catch-all for structured data        | MEDIUM     | Schema debt                      |
| 7   | Dedup multi-strategy fallback has no priority ordering              | LOW-MEDIUM | Could match wrong inquiry        |
| 8   | No distinction between direct-platform vs email-via-platform        | LOW        | Can't optimize response channel  |
| 9   | Status transitions duplicated in app code and DB trigger            | LOW-MEDIUM | Two sources of truth             |
| 10  | `external_link` not preserved during manual updates                 | LOW        | Deep link could be lost          |

---

## 5. Architecture Strategy

### 5a. The "Email-First, API-Later" Approach

**Phase 1 (email parsing - can start now):**
Most platforms communicate with chefs via email. The Gmail sync pipeline already captures these. Strategy:

1. **Expand platform parsers** - Add parsers for TakeAChef, PrivateChefManager, CuisineistChef, HireAChef, Yelp, Google Business, Instagram notification emails, Facebook notification emails
2. **Normalize extraction** - Every parser outputs the same structured fields (client name, date, guest count, location, occasion, budget, dietary notes, deep link)
3. **Deep link generation** - Extract or construct the URL back to the source platform's inquiry page from the notification email (most contain a CTA button with this URL)
4. **Source tagging** - Tag every inquiry with its origin platform, even manual ones
5. **Raw feed** - Show all unprocessed platform emails in a "raw" tab for verification

**Phase 2 (API integration where available):**
Some platforms offer APIs or webhooks:

- Thumbtack Pro API (limited lead data)
- Google Business Profile API (messaging)
- Facebook/Instagram Graph API (messaging)
- The Knot Vendor API (limited)

These are "nice to have" upgrades over email parsing, not blockers.

**Phase 3 (platform response routing):**
For gated platforms, provide one-click navigation:

- Chef sees inquiry from TakeAChef in ChefFlow
- Clicks "Reply on TakeAChef" button
- Opens the exact inquiry page on TakeAChef in a new tab
- Chef responds on TakeAChef, response flows back via email notification
- Gmail sync captures the response and updates the ChefFlow inquiry thread

This is the "intelligent navigation" approach: ChefFlow doesn't try to replace platform messaging (ToS violation risk), it makes navigating to the right place instant.

### 5b. Parser Architecture

```
Incoming Email (Gmail Sync)
    |
    v
Platform Detector (regex on sender, subject, body patterns)
    |
    +-- TakeAChef parser
    +-- Thumbtack parser (exists)
    +-- The Knot parser (exists)
    +-- Bark parser (exists)
    +-- PrivateChefManager parser
    +-- CuisineistChef parser
    +-- HireAChef parser
    +-- Yelp parser
    +-- Google Business parser
    +-- Generic parser (fallback)
    |
    v
Normalized Inquiry Fields
    |
    v
Platform Dedup (prevent duplicates)
    |
    v
Inquiry Creation + Lead Scoring + Source Tagging
    |
    v
Deep Link Extraction/Generation
    |
    v
Unified Inquiry List (with platform badges + deep links)
```

### 5c. Spam Filtering + Raw Feed

**Spam filtering layers:**

1. **Platform-level:** If email came from a recognized platform sender domain (e.g., `@takeachef.com`, `@thumbtack.com`), it's legitimate (platforms already filter spam before notifying chefs)
2. **GOLDMINE lead scoring:** Existing 0-100 scoring already separates hot/warm/cold
3. **Chef-defined rules:** Allow chefs to mute specific platforms, set minimum lead score thresholds

**Raw feed:**

- Separate tab/view showing ALL platform emails before parsing
- Each email shows: sender, subject, body preview, parsed vs unparsed status
- Chef can manually review any email the parser missed or misclassified
- Important for trust: chef can verify ChefFlow isn't hiding or misinterpreting anything

### 5d. Deep Link Strategy

Every platform notification email contains a CTA button/link. Strategy:

1. **Extract CTA URL** from email HTML during parsing (the "View Request", "Reply to Client", "See Details" buttons)
2. **Store as `external_link`** on the inquiry record
3. **Display prominently** in inquiry detail view: "View on [Platform Name]" button
4. **Construct fallback URLs** when CTA extraction fails:
   - TakeAChef: `https://www.takeachef.com/chef/dashboard/requests/{order_id}`
   - Thumbtack: `https://pro.thumbtack.com/leads/{lead_id}`
   - The Knot: `https://www.theknot.com/marketplace/inbox/{conversation_id}`
5. **Track link freshness:** Platform URLs can expire or change. Show warning if link is > 30 days old.

---

## 6. Gatekeeping Navigation Strategy

### 6a. What We CAN Do (ToS-Compliant)

- Parse notification emails (they're sent TO the chef, they're the chef's data)
- Extract and store deep links from notification CTAs
- Display platform data in ChefFlow's unified view
- Provide one-click navigation to source platform pages
- Track which platforms generate the most/best leads
- Alert chefs when platform inquiries need attention

### 6b. What We CANNOT Do (ToS Risk)

- Scrape platform dashboards (login automation, web scraping)
- Intercept or redirect platform messaging
- Auto-respond on behalf of chef on platforms
- Extract client contact info that platforms intentionally hide
- Bypass platform paywalls or lead-gating

### 6c. The "Best Available" Approach

For each platform, use the best available integration method:

| Platform           | Best Method                            | Fallback                   |
| ------------------ | -------------------------------------- | -------------------------- |
| TakeAChef          | Email parsing + deep link              | Manual entry               |
| Thumbtack          | Email parsing + Pro API (if available) | Email parsing only         |
| The Knot           | Email parsing + deep link              | Manual entry               |
| Bark               | Email parsing                          | Manual entry               |
| PrivateChefManager | Email parsing + deep link              | Manual entry               |
| Google Business    | Business Profile API                   | Email parsing              |
| Instagram          | Graph API (if business account)        | Email notification parsing |
| Facebook           | Graph API                              | Email notification parsing |
| Yelp               | Email parsing                          | Manual entry               |
| Direct email       | Gmail sync (already works)             | N/A                        |
| Website form       | Embed widget (already works)           | N/A                        |

---

## 7. UI Concept: Unified Inquiry Hub

### 7a. Inquiry List Enhancements

Current list shows: client name, date, status, lead score.

**Add:**

- **Platform badge** (icon + name) showing where the inquiry originated
- **"View on [Platform]" link** - one-click deep link to source
- **Platform filter** - show only Thumbtack leads, only TakeAChef leads, etc.
- **Raw feed tab** - unprocessed platform emails for verification
- **Response urgency** - "4h to respond on Thumbtack" (platform-specific SLAs)

### 7b. Inquiry Detail Enhancements

Current detail shows: full inquiry data, conversation thread, quote history.

**Add:**

- **Source platform card** at top: platform name, deep link, when received, platform-specific ID
- **Lead score breakdown** - show the factors, not just the number
- **Platform context** - "This lead came from Thumbtack. Thumbtack charges per lead. Average response time matters for your ranking."
- **Cross-platform indicator** - if same client inquired on multiple platforms, show all

### 7c. Platform Analytics Dashboard

New widget or page:

- **Inquiries by platform** (pie chart or bar)
- **Conversion rate by platform** (which platform's leads actually book?)
- **Average lead quality by platform** (lead score distribution)
- **Response time by platform**
- **Cost per lead by platform** (for paid platforms like Thumbtack)
- **ROI by platform** (revenue from converted leads vs. platform costs)

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Extend GOLDMINE) - 2-3 sessions

1. Add platform parsers for TakeAChef, PrivateChefManager, CuisineistChef, HireAChef
2. Normalize all parser outputs to common field structure
3. Fix codebase gaps (#1, #4, #5 from audit)
4. Deep link extraction from email CTAs
5. Platform badge in inquiry list UI

### Phase 2: Unified View - 1-2 sessions

6. Raw feed tab (all platform emails, parsed status)
7. Platform filter on inquiry list
8. Lead score factor display in detail view
9. "View on [Platform]" button in inquiry detail
10. Fix schema debt (#2, #6 from audit)

### Phase 3: Intelligence - 1-2 sessions

11. Platform analytics widget (inquiries/conversion/quality by platform)
12. Response urgency indicators (platform-specific SLAs)
13. Cross-platform client matching (same person, multiple platforms)
14. Cost-per-lead tracking for paid platforms
15. Platform performance comparison

### Phase 4: API Integrations (as available) - ongoing

16. Thumbtack Pro API integration
17. Google Business Profile API
18. Facebook/Instagram Graph API
19. Any new platform APIs that become available

---

## 9. Key Architectural Decisions

### Formula > AI (always)

Email parsing uses **deterministic regex**, not LLM inference:

- Platform detection: sender domain + subject line patterns
- Field extraction: HTML parsing + regex on known email templates
- Deep link extraction: anchor tag parsing from email HTML
- Lead scoring: existing GOLDMINE deterministic pipeline

AI (Ollama) only used for:

- Ambiguous text interpretation when regex can't parse (rare)
- Natural language fields that have no structure (client's freeform notes)

### Privacy Compliance

All parsing happens locally:

- Gmail sync already runs through Ollama for private data
- Platform email parsing uses the same local-only pipeline
- No platform data sent to cloud LLMs
- Platform credentials (if any API integration) stored in chef's env, not shared

### Platform ToS Compliance

- We only parse emails that platforms send TO the chef (chef's own data)
- We don't scrape, automate, or bypass any platform
- Deep links use the URLs platforms themselves provide in their emails
- We explicitly route chefs BACK to platforms for messaging (supporting their model)
- This approach makes ChefFlow a better platform citizen, not a circumventer

---

## 10. Competitive Advantage

**No one has solved this for private chefs.** The freelance multi-platform inbox problem is universally unsolved. Real estate has CRMs, hotels have channel managers, but service professionals (chefs, photographers, planners, DJs) have nothing.

ChefFlow solving this becomes:

1. **The #1 reason to sign up** - "See all your inquiries in one place"
2. **A moat** - Platform parsers are hard to build and maintain (email formats change)
3. **A data advantage** - Cross-platform analytics no individual platform provides
4. **A retention hook** - Once a chef's inquiry flow runs through ChefFlow, switching cost is high
5. **Expandable** - Same architecture works for any service marketplace (photographers, planners, etc.)

This isn't just a feature. This is the product.
