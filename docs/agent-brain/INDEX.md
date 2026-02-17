# ChefFlow Agent Brain — Index

This directory contains the intelligence layer for ChefFlow's AI correspondence engine. These documents govern how the system drafts, validates, and gates all client-facing communication on behalf of Chef David Ferragamo.

## Authority Hierarchy

When documents conflict, higher rank wins:

1. **03-EMAIL_RULES.md** — Final Output Authority & Email Firewall (highest for client-facing output)
2. **04-PRICING.md** — Pricing policies, rate card, and presentation rules (highest for money)
3. **02-LIFECYCLE.md** — Lifecycle state controller (determines what stage governs behavior)
4. **01-BRAND_VOICE.md** — Voice, tone, and persona rules
5. **05-DISCOVERY.md** — Menu-first discovery and data collection
6. **06-BOOKING_PAYMENT.md** — Booking execution and legal terms
7. **07-EDGE_CASES.md** — Situational handling (guest count, dates, referrals)

## How These Documents Are Used

The AI correspondence engine (`lib/ai/correspondence.ts`) consumes these rules when drafting responses. The flow is:

1. **Email arrives** → Gmail sync classifies and parses it
2. **Lifecycle state is determined** → `02-LIFECYCLE.md` maps the engagement to a state
3. **Gatekeeper runs** → `03-EMAIL_RULES.md` decides if drafting is allowed
4. **Draft is generated** → Using `01-BRAND_VOICE.md` for voice, `05-DISCOVERY.md` for content strategy, `04-PRICING.md` for pricing eligibility
5. **Firewall validates** → `03-EMAIL_RULES.md` strips forbidden content
6. **Chef reviews and approves** → Nothing sends without explicit approval

## Relationship to Codebase

These documents inform the AI — they do not replace the codebase's state machines. The codebase has three separate FSMs:

- **Inquiry FSM**: `new → awaiting_client → awaiting_chef → quoted → confirmed → declined → expired`
- **Quote FSM**: `draft → sent → accepted → rejected → expired`
- **Event FSM**: `draft → proposed → accepted → paid → confirmed → in_progress → completed | cancelled`

The lifecycle states in `02-LIFECYCLE.md` map across all three FSMs to describe the full engagement arc from first contact to archive.

## Origin

These documents were consolidated from 40 operational documents created for David's previous AI workflow. They have been updated to reflect ChefFlow's current architecture (multi-tenant, ledger-first, priority queue, preparable work engine) and improved where the codebase has advanced beyond the original specs.
