# Take a Chef Inquiry Rail

> **Status:** SPEC-READY
> **Exit Scenario:** #29 (reclassified: Bridgeable -> Partially Reducible via Email Intelligence)
> **Source:** Developer stress-test evaluation + 10+ years platform expertise, 2026-05-25
> **Principle:** Email IS the API. ChefFlow is the brain. Take a Chef is the communication channel.
> **Critical constraint:** NEVER automate Take a Chef directly. 200+ review account. Ban = catastrophic.

---

## Problem

Chef has 6 Take a Chef accounts across different regions. Each generates inquiry notification emails to Gmail. Chef must:

1. Notice the email in a flooded inbox (screenshot shows dozens of "Private Chef Manager" emails mixed with everything else)
2. Log into Take a Chef (which times you out if idle)
3. Read the inquiry details (locked behind login)
4. Think about availability, pricing, travel, menu ideas from scratch
5. Respond on the platform (carefully, because anti-automation triggers are hair-trigger sensitive)
6. Repeat for every inquiry across 6 accounts

This is exhausting. The THINKING happens in the chef's head. ChefFlow should do the thinking.

## Platform constraints (NON-NEGOTIABLE)

1. **No browser automation.** No Playwright, no puppeteer, no session hijacking. Ban risk is real.
2. **No API.** Take a Chef offers none.
3. **No message automation.** Even copying a phone number into a message can trigger a strike. Chef has 2 strikes already.
4. **Email is the only safe passive intake.** Take a Chef sends inquiry notification emails. We parse those.
5. **Chef must physically log in to respond.** We prepare everything; chef executes on the platform.
6. **Confirmation emails with client info are the second integration point.** When a booking confirms, Take a Chef emails personal details.

## Design

### 1. Take a Chef Rail (Dedicated, Branded)

A first-class rail in ChefFlow specifically for Take a Chef. Uses their logo/branding so chef instantly recognizes the source.

**What the rail shows:**

- Unified inbox of ALL inquiries across ALL 6 accounts
- Account badge per inquiry (which region/account it came from)
- Status: New / Viewed / Responded / Booked / Declined / Expired
- Time since received (response speed matters for platform ranking)
- Client name (extracted from email)
- Quick-glance: date requested, party size, location (extracted from email body)

**Why a dedicated rail, not a generic inbox:**

- Take a Chef is the #1 lead source. It deserves its own view.
- The workflow is specific: read in ChefFlow, respond on Take a Chef.
- Platform-specific context matters (strike history, account health, response time pressure).
- Chef can see ALL 6 accounts' inquiries in one place instead of hunting through Gmail.

### 2. Email Parsing Engine

When a "Private Chef Manager" email arrives ("You just received a new request from [Name]!"):

**Auto-extracted fields:**

- Client name (from email subject/body)
- Which of the 6 accounts received it (from recipient email address)
- Date/time received
- Any details included in the notification email (party size, date, location, event type)

**Auto-created:**

- ChefFlow inquiry record linked to Take a Chef source
- Timestamped for response-time tracking
- Status set to "New"

**For confirmation emails (booking confirmed):**

- Extract client personal info (name, email, phone, address)
- Auto-create or link to ChefFlow client record
- Update inquiry status to "Booked"
- Flag: "Client info now available. Capture in ChefFlow?"

### 3. Response Preparation (The Brain)

When chef taps an inquiry on the rail, ChefFlow does the thinking:

**Automatic context assembly:**

- Calendar availability check for the requested date
- Travel time estimate from chef's home to event location
- PIE pricing context for the party size and event type
- Similar past events (what did you charge for a similar 8-person dinner?)
- Seasonal menu suggestions based on event date
- Weather forecast for event date (if available, compounds with #58)
- Any existing ChefFlow client record (repeat client from another channel?)

**Response draft (Remy-powered):**

- "Draft response" button generates a professional reply
- Follows chef communication rules (natural tone, no AI formatting, no bold headers)
- Chef reviews, adapts, then copies to Take a Chef platform
- Draft is a STARTING POINT, not auto-sent. Chef always has final word.

**Response templates by scenario:**

- Standard acceptance: available, interested, here's my approach
- Decline with grace: unavailable, suggest alternative dates
- Need more info: polite questions about dietary needs, kitchen access, etc.
- Pricing range: based on PIE + past events + party size

### 4. Multi-Account Management

**6 accounts, one view:**

- Each account has a label (e.g., "Boston 100mi", "Cape Cod 100mi", "NYC 100mi")
- Color-coded or badged per account
- Filter by account or see all unified
- Response time tracked per account (some platforms rank faster responders)

**Account health dashboard:**

- Strike count per account (chef manually updates)
- Review count per account
- Active inquiries per account
- "Last logged in" reminder (platform times you out)

### 5. The Handoff Moment

The critical UX: chef is PREPARED in ChefFlow, now needs to ACT on Take a Chef.

**"Go to Take a Chef" button:**

- Opens Take a Chef in browser (or app)
- Chef's drafted response is on clipboard (one tap to copy)
- ChefFlow shows a reminder: "Responding to [Name], [Date], [Party Size]"
- After chef returns: "Did you respond?" -> mark status update

**What the chef's workflow becomes:**

1. See inquiry on rail (instant, no Gmail hunting)
2. Tap it. Context already assembled (availability, pricing, draft response).
3. Copy draft. Tap "Go to Take a Chef."
4. Log in. Find the inquiry. Paste/adapt response.
5. Come back. Mark as responded.
6. When booking confirms: email parsed, client record auto-created.

**Before ChefFlow:** 10+ minutes of thinking per inquiry (check calendar, think about pricing, compose from scratch, find the right account).
**After ChefFlow:** 2 minutes per inquiry (review pre-built context, adapt draft, paste).

### 6. Intelligence Layer (Compounds Over Time)

**Conversion tracking:**

- Which accounts convert best?
- What response time correlates with booking?
- What party size/event type is most profitable?
- Which regions generate the most inquiries vs. bookings?

**Pattern detection:**

- "You're getting 3x more Cape Cod inquiries this month. Summer season starting."
- "Average response time has slipped to 4 hours. Platform may deprioritize."
- "This client name appeared on Account 2 last month. Same person?"

**Seasonal readiness:**

- Historical inquiry volume by month (10 years of data once captured)
- Predictive: "Based on last 3 Junes, expect 40+ inquiries next month. Block prep time."

### 7. Review Showcase Integration

Chef has 200+ reviews and wants to showcase them.

- Manual import: chef copies standout reviews into ChefFlow
- Reviews displayed on chef's ChefFlow profile/portfolio page
- "Best of" selection for client-facing surfaces
- Review count as a credibility badge ("200+ five-star reviews on Take a Chef")

## What we NEVER build

- Direct Take a Chef login/session management
- Auto-responses sent through Take a Chef
- Scraping Take a Chef for inquiry details beyond what email provides
- Any automation that touches the Take a Chef platform directly
- Anything that risks the 200+ review, 10-year account

## What remains as permanent exit

- **Responding to inquiries:** Must physically log in and type/paste on Take a Chef. Permanent.
- **Reading full inquiry details:** If email notification doesn't include all details, must log in. Permanent.
- **Managing platform profile:** Photos, bio, menu updates. Permanent.
- **WhatsApp with Take a Chef support:** Dedicated agent relationship. Permanent and valuable.

## Integration with other systems

- **Inquiry consolidation (planned):** Take a Chef rail is one source. Same pattern for Bark, Thumbtack, personal website, direct email. Unified inquiry hub.
- **Client records:** Confirmed bookings auto-create clients. Client history spans platforms.
- **Calendar:** Availability check is instant from ChefFlow calendar.
- **PIE:** Pricing context auto-populated per inquiry.
- **Weather (#58):** Event date weather shown on inquiry detail.
- **Venue access (#90):** If repeat venue, access notes pre-loaded.
- **Remy:** Drafts responses in chef's natural voice. Learns from past responses.
- **Dinner Circles:** Once booked, inquiry transitions to a Circle for the event.

## Expansion: Other platforms

This same email-parsing pattern works for:

- **Bark:** Sends email notifications for new leads
- **Thumbtack:** Sends email notifications
- **Personal website contact form:** Emails to chef's inbox
- **Direct email inquiries:** Already in email

Each gets its own rail or badge within a unified inquiry hub. Take a Chef gets the dedicated rail because it's the highest volume and most important.

## Chef-facing language

- "New request from [Name]" not "Inquiry parsed from email notification"
- "Ready to respond" not "Response draft generated"
- "Go to Take a Chef" not "Open external platform"
- "Booked!" not "Status transitioned to confirmed"

## Done when

1. Take a Chef rail shows all inquiries from all 6 accounts, unified
2. Email parsing auto-creates inquiry records from "Private Chef Manager" emails
3. Tapping an inquiry shows pre-assembled context (availability, pricing, similar events, draft)
4. "Copy response" puts draft on clipboard. "Go to Take a Chef" opens platform.
5. Confirmation emails auto-create client records
6. Response time tracked per inquiry
7. Account health visible (strike awareness)
8. Chef spends 2 minutes per inquiry instead of 10+
9. Zero Gmail hunting for "Private Chef Manager" emails
10. Zero risk to any of the 6 Take a Chef accounts
