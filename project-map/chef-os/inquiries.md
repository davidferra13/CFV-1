# Inquiry Pipeline

**What:** Sales funnel from first contact to closed deal. Inquiries, quotes, leads, calls, partners, proposals, testimonials.

**Routes:** `/inquiries`, `/quotes`, `/leads`, `/calls`, `/partners`, `/proposals`, `/testimonials`, `/rate-card`, `/guest-leads`, `/guest-analytics`, `/prospecting` (admin only)
**Key files:** `app/(chef)/inquiries/`, `app/(chef)/quotes/`
**Status:** 92% (Remy parsing broken)

## What's Here

- Inquiries: smart priority grouping, 8 status filters, funnel analytics, Smart Fill (AI parse), Gmail integration, Critical Path card, Service Lifecycle panel
- Quotes: 6 status tabs, pricing intelligence, AI per-guest suggestions, historical price ranges
- Rate Card: mobile-friendly pricing reference
- Leads: website form submissions, claim/dismiss
- Calls: upcoming/completed/no-show, agenda, outcome tracking
- Partners: referral stats, locations, service history
- Proposals: template builder, visual editor, selectable add-ons
- Testimonials: approval workflow (pending/approved/featured)
- Prospecting (admin only): dossier, call queue, AI scrub, scripts, pipeline kanban, clusters, import

## Open Items

- **CRITICAL:** Remy inquiry parsing returns empty since March 30 (0% parse rate)
- Quotes page has FK hint bug (found in UX audit)
