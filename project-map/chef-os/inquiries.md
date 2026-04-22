# Inquiry Pipeline

**What:** Sales funnel from first contact to closed deal. Inquiries, quotes, leads, calls, partners, proposals, testimonials.

**Routes:** `/inquiries`, `/quotes`, `/leads`, `/calls`, `/partners`, `/proposals`, `/testimonials`, `/rate-card`, `/guest-leads`, `/guest-analytics`, `/prospecting` (admin only)
**Key files:** `app/(chef)/inquiries/`, `app/(chef)/quotes/`
**Status:** 94% (quote prefill contract unified; broader validation still pending)

## What's Here

- Inquiries: smart priority grouping, 8 status filters, funnel analytics, Smart Fill (AI parse), Gmail integration, Critical Path card, Service Lifecycle panel
- Quotes: 6 status tabs, pricing intelligence, AI per-guest suggestions, historical price ranges
- Quote draft prefill contract: `lib/quotes/quote-prefill.ts` now owns the canonical `/quotes/new` search-param schema for inquiry, event, change-order, and consulting entry points; `/quotes/new` composes explicit URL values with inquiry/event enrichment instead of reparsing ad hoc query strings per surface
- Rate Card: mobile-friendly pricing reference
- Leads: website form submissions, claim/dismiss
- Calls: upcoming/completed/no-show, agenda, outcome tracking
- Partners: referral stats, locations, service history
- Proposals: template builder, visual editor, selectable add-ons
- Testimonials: approval workflow (pending/approved/featured)
- Event-scoped quick proposal preview: proposal generation now accepts CP-Engine client profile guidance for preview only, exposing confidence, service depth, emotional state, hard vetoes, strong likes, novelty opportunities, and unresolved clarifications when profile persistence exists
- Prospecting (admin only): dossier, call queue, AI scrub, scripts, pipeline kanban, clusters, import

## Open Items

- Cross-surface action graph and intervention engine are still incomplete; quote prefill is now shared, but next-best-action routing is not yet unified across inquiries, events, and follow-up surfaces
- Repo-wide lint/typecheck and the shared Playwright harness are currently noisy from unrelated schema/runtime drift outside the inquiry pipeline slice

## Integration Notes

- **Why `lib/quotes/quote-prefill.ts` is a new file instead of another extension point:** the previous query parser lived inside `app/(chef)/quotes/new/page.tsx`, so client components such as the consulting calculator, menu detail CTA, and scope-drift banner could not reuse it without importing a server route or rebuilding the same search-param logic. The durable draft hook also solves persistence after the page loads, not cross-surface transport before the page loads. A small shared contract file was the minimum additive owner that both server and client surfaces could import without creating a second source of truth.
