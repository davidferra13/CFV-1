# Tip Tracking and Gratitude Intelligence

> **Status:** SPEC-READY
> **Priority:** P2
> **Origin:** "Picky Client" persona stress test, edge case: client tipped $500 two years ago but system has no record (2026-05-16)
> **Depends On:** Event Total Recall, Returning Client Recognition

---

## Problem Statement

Client tipped $500 after a 20-person dinner. That's a massive signal: this client LOVES the chef. They're not price-sensitive. They value the experience. They're worth prioritizing.

But where does that tip live in the system? Nowhere. It's cash in an envelope, or a Venmo that's buried in transaction history. The chef can't query "who tipped me the most?" or "which events generated tips?" or "is this returning client a tipper?"

Tips are the strongest signal of client satisfaction and future booking likelihood. Track them.

---

## Solution

### 1. Tip Recording

After each event, chef can log the tip:

- Amount
- Method (cash, Venmo, Zelle, added to final payment, other)
- Date received (often same night, sometimes later)
- Notes (optional: "Client handed envelope at door" or "Added 20% to Venmo next day")

Quick entry: one field, one tap. Not a form. Most tips are straightforward.

### 2. Event Financial Summary (Enhanced)

Event archive financial section now includes:

- Quote amount
- Final invoice
- Payments received (with dates)
- **Tip amount**
- **Total compensation** (invoice + tip)
- **Effective rate** (total / guests / hours)
- Tip as percentage of invoice

### 3. Client Value Scoring

Tips feed into client value intelligence:

- **Tip history per client:** Total tips, average tip percentage, consistency (tips every time vs one-time)
- **Client tier signal:** Clients who tip 20%+ consistently are "premium" tier (VIP routing, 4h SLA)
- **Returning client banner enrichment:** "This client tipped $500 (25%) last time"
- **Lapsed client outreach priority:** High-tipping clients get outreach sooner (10 months vs 12 months)

### 4. Gratitude Intelligence

System recognizes gratitude patterns:

- "3 of your last 5 events received tips. You're doing something right."
- "Your average tip is $X (Y% of invoice). Above/below industry average."
- "Top 3 tipping clients: [Name], [Name], [Name]"
- "[Client] has tipped every time (4 events). Consider a loyalty gesture."

### 5. Privacy and Sensitivity

- Tips are chef-private data. NEVER visible to clients.
- Never mention tips in client communications
- Never use tip data to differentiate service quality (all clients get the same professional treatment)
- Tip data informs prioritization and outreach timing, not service level

---

## Files Likely Touched

- `lib/events/tip-actions.ts` (new, tip recording CRUD)
- `lib/clients/value-scoring.ts` (extend with tip history signals)
- `lib/analytics/tip-analytics.ts` (new, aggregates, trends, top tippers)
- `components/events/tip-entry.tsx` (new, quick-entry component)
- `components/events/event-financial-summary.tsx` (extend with tip row)
- `components/inquiries/returning-client-banner.tsx` (extend with tip history)
- `components/dashboard/gratitude-widget.tsx` (new, tip trends)
- `app/(chef)/events/[id]/billing/page.tsx` (add tip entry)
- Database: `event_tips` table (event_id, amount, method, date_received, notes)

---

## Verification

- [ ] Chef can log tip amount and method after event
- [ ] Event financial summary includes tip in total compensation
- [ ] Client value scoring incorporates tip history
- [ ] Returning client banner shows past tip data
- [ ] Lapsed client outreach prioritizes high tippers
- [ ] Tip data never visible to clients
- [ ] Tip analytics show trends and top clients
