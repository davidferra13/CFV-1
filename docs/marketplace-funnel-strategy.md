# Marketplace Funnel Strategy

**Date:** 2026-03-06
**Status:** Active development
**Branch:** `feature/risk-gap-closure`

---

## The Problem

Private chef marketplace platforms (Take a Chef, Yhangry, Cozymeal, etc.) are tech companies that sell access to chefs. Their entire business model relies on one thing: capitalizing on the first meeting between a chef and a client. They take 20-30% commission on that first booking and assume it's a one-time transaction.

After the booking:

- No ops tools for the chef to manage the event
- No way for the chef to capture the client into their own system
- No follow-up, no rebooking flow, no loyalty tracking
- Chef and client are left texting, emailing, figuring it out alone
- The marketplace doesn't care because they already got paid

These platforms are not food companies. They don't care about the chef's quality of life, whether the menu got costed properly, whether the allergy notes from 6 text messages made it to the prep list, or whether the chef is losing money on the event. As long as the dinner happens, they're done.

---

## The Insight (from 10 years of using these platforms)

Every marketplace assumes their bookings are one-time deals. They know the chef and client will probably work together again, but they've already collected their commission on the first match. Everything after that first dinner is abandoned.

That abandoned space - the everything-after-the-match - is where ChefFlow lives.

ChefFlow is not competing with these marketplaces for the first match. ChefFlow is what happens after. The chef's own system that they bring to every marketplace they work on.

---

## The Strategy

**ChefFlow doesn't dethrone the marketplaces. ChefFlow befriends every chef ON those marketplaces.**

If every chef on Take a Chef, Yhangry, and Cozymeal had a ChefFlow account before they accepted their first dinner, they would:

1. Capture every marketplace booking into their own system instantly
2. Run every dinner through proper ops (menu, costing, dietary, prep, compliance)
3. Own the client relationship permanently (CRM, preferences, history)
4. Convert every one-time marketplace client into a direct repeat client
5. Never pay commission on that client again

The marketplaces become lead sources that feed INTO ChefFlow. The chef stops being dependent on any single platform because they own their client book, their ops, their repeat business.

---

## Target Platforms

### Tier 1 - Major marketplaces (highest chef volume)

| Platform                                   | Model                     | Approx. Commission | Market                          |
| ------------------------------------------ | ------------------------- | ------------------ | ------------------------------- |
| **Take a Chef** (aka Private Chef Manager) | Marketplace booking       | 20-30%             | Global (EU-heavy, expanding US) |
| **Yhangry**                                | Curated marketplace       | 20-30%             | UK, expanding                   |
| **Cozymeal**                               | Marketplace + experiences | 20-30%             | US major cities                 |

### Tier 2 - Lead generation platforms

| Platform      | Model        | Cost            | Market |
| ------------- | ------------ | --------------- | ------ |
| **Bark**      | Pay-per-lead | $5-30+ per lead | US, UK |
| **Thumbtack** | Pay-per-lead | Varies          | US     |

### Tier 3 - Niche / smaller

| Platform         | Notes                            |
| ---------------- | -------------------------------- |
| **Tinyspoon**    | Family/kid-focused meal prep     |
| **Hire a Chef**  | Directory, US + Australia        |
| **ChefXChange**  | Private chef marketplace         |
| **Eatwith**      | Dining experiences, supper clubs |
| **CuisinistApp** | Newer, private chef matching     |

---

## What We're Building

### 1. Quick Capture - ALREADY BUILT

- Take a Chef has TWO capture flows: manual form (`lib/inquiries/take-a-chef-capture-actions.ts`) and page capture (`lib/integrations/take-a-chef-page-capture-actions.ts`)
- General inquiry form has Smart Fill (paste text, AI parses it)
- Commission tracking built into TAC capture

### 2. Email Forwarding Capture - ALREADY BUILT

- GOLDMINE email parsing pipeline auto-extracts inquiry fields from forwarded emails
- Gmail sync recognizes Take a Chef emails specifically
- Core files: `lib/gmail/extract-inquiry-fields.ts`, `lib/gmail/sync.ts`

### 3. Marketplace Source Tracking - ALREADY BUILT

- Inquiry form channel dropdown includes: Take a Chef, Yhangry, Cozymeal, Bark, Thumbtack, GigSalad, The Knot, Google Business, Instagram, Website
- `referral_source` column on inquiries table
- `channel` field tracks origin platform

### 4. Pre-Dinner Client Worksheet - BUILT 2026-03-06

- Shareable public link: `/worksheet/[token]`
- Client fills out: name, email, phone, guest count, address, dietary restrictions, allergies, preferences, special requests
- Auto-syncs completed data back to client CRM record and linked event
- Chef creates from event detail page ("Send Client Worksheet" button)
- Migration: `20260330000061_client_worksheets.sql`
- Actions: `lib/marketplace/worksheet-actions.ts`
- UI: `app/(public)/worksheet/[token]/page.tsx`, `components/events/send-worksheet-button.tsx`

### 5. Post-Dinner Client Conversion - BUILT (generalized 2026-03-06)

- Convert banner shows on completed marketplace-sourced events (ANY platform, not just TAC)
- Pre-written message with direct booking link, copy-to-clipboard
- Generates URL: `/chef/[slug]/inquire`
- Components: `components/events/marketplace-convert-banner.tsx`
- Actions: `lib/marketplace/conversion-actions.ts`
- Platform registry: `lib/marketplace/platforms.ts`

### 6. Client Rebooking Portal - BUILT 2026-03-06

- Public inquiry form (`/chef/[slug]/inquire`) now auto-detects returning clients
- On email blur, looks up client in chef's CRM via `/api/public/client-lookup`
- Pre-fills: name, phone, allergies, dietary restrictions
- Shows "Welcome back!" message
- Client's preferences are remembered from their last booking

### 7. Marketplace ROI Dashboard - BUILT 2026-03-06

- Shows on the Marketplace Command Center page
- Metrics: total marketplace clients, converted to direct, direct rebooking count/revenue, estimated commission saved
- Per-platform breakdown (TAC, Yhangry, Cozymeal, etc.)
- Actions: `lib/marketplace/roi-actions.ts`

### 8. Generalized Marketplace Command Center - BUILT 2026-03-06

- Marketplace page now shows leads/bookings from ALL platforms (not just TAC)
- Platform breakdown badges
- TAC-specific financial tracking preserved (commission, payout watchlist)
- Other platforms show leads and upcoming bookings
- Actions: `lib/marketplace/command-center-actions.ts`

---

## Why This Works for Everyone

**For the chef:**

- Keeps the client forever after the first marketplace booking
- Never pays commission on repeat business
- Has real ops tools instead of texting and guessing
- Sees exactly which platforms are worth their time

**For the client:**

- Better experience (structured worksheet vs scattered texts)
- Easy rebooking (one link, preferences remembered)
- Direct relationship with their chef

**For the marketplaces (why they shouldn't fight this):**

- Chefs using ChefFlow deliver better dinners (better ops = better outcomes)
- Better dinners = better reviews = more bookings on the marketplace
- ChefFlow doesn't compete for the first match, only manages what comes after
- The marketplace still gets every NEW client. ChefFlow only keeps the repeats

---

## Success Metrics

- Number of inquiries created via Quick Capture or email forwarding
- Percentage of inquiries tagged with a marketplace source
- Client worksheet completion rate (sent vs filled out)
- Post-dinner conversion rate (prompted vs client rebooked direct)
- Repeat booking rate (marketplace clients who rebook without the marketplace)
- Total estimated commission saved (ROI dashboard)
