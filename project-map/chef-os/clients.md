# Clients

**What:** Relationship management hub. Every client has a 30-panel profile covering demographics, financials, culinary preferences, logistics, and communication.

**Route:** `/clients`, `/clients/[id]`
**Key files:** `app/(chef)/clients/`
**Status:** DONE

## What's Here

- Client directory with search, bulk operations, CSV export
- 30-panel client detail: core profile, demographics, financial analytics, culinary profile, kitchen/access info, relationship intelligence, communication hub, AI analysis, and a canonical interaction ledger projection in the relationship timeline
- Main client detail now reuses a shared tenant-scoped client ops snapshot from the authenticated client work-graph path for action-required counts, balance and payment due, profile readiness, pending meal requests, signal-alert state, and next active RSVP or share status
- Client detail includes a Household panel for residency accounts, with chef-side add/edit/remove for household members plus per-person allergies, dietary restrictions, dislikes, favorites, and notes
- Relationship timeline now normalizes authoritative events, inquiries, messages, notes, quotes, payments, reviews, client portal activity, menu revisions, and document versions into one chronological feed without creating a second source of truth
- Next-best-action now follows one canonical path: interaction ledger -> interaction signals -> shared action vocabulary -> explainable projection -> client detail and relationship surfaces
- Relationship headings, labels, and action-layer copy now come from the shared client action vocabulary instead of route-local switches and duplicated unions
- Chef-side client ops snapshot fails closed with an explicit unavailable card when the shared authenticated snapshot does not load, instead of showing fake zero states
- Quick Add vs Full Profile creation modes
- Sub-sections: active, inactive, VIP, duplicates, segments, gift cards, communication, history, preferences, insights, loyalty, presence
- AI-powered duplicate detection
- Real-time portal presence monitoring (SSE)
- Engagement badges (HOT/WARM/COLD based on 14-day portal activity)
- Client command panel on `/clients/[id]`: right-side desktop panel and mobile drawer summarize client ops, upcoming/history counts, allergies and restrictions, payment/value status, contact follow-up, and recent activity from the existing client ops snapshot and loaded relationship data.

## Open Items

- No current blocker documented here. The earlier `/clients/[id]/relationship` local-dev crash note was cleared after isolated verification on the current checkout.
