# Inquiry Pipeline

**What:** Sales funnel from first contact to closed deal. Inquiries, quotes, leads, calls, partners, proposals, testimonials.

**Routes:** `/inquiries`, `/quotes`, `/leads`, `/calls`, `/partners`, `/proposals`, `/testimonials`, `/rate-card`, `/guest-leads`, `/guest-analytics`, `/prospecting` (admin only)
**Key files:** `app/(chef)/inquiries/`, `app/(chef)/quotes/`
**Status:** 94% (quote prefill and public intake-lane contracts unified; broader validation still pending)

## What's Here

- Inquiries: smart priority grouping, 8 status filters, funnel analytics, Smart Fill (AI parse), Gmail integration, Critical Path card, Service Lifecycle panel
- Quotes: 6 status tabs, pricing intelligence, AI per-guest suggestions, historical price ranges
- Quote draft prefill contract: `lib/quotes/quote-prefill.ts` now owns the canonical `/quotes/new` search-param schema for inquiry, event, change-order, and consulting entry points; `/quotes/new` composes explicit URL values with inquiry/event enrichment instead of reparsing ad hoc query strings per surface
- Canonical public intake lanes: `lib/public/intake-lane-config.ts` defines open booking, direct chef inquiry, embed, kiosk, Wix, and instant-book ingress; all public writers now stamp shared `submission_source` values, and admin provenance reads the same contract instead of inferring from raw `channel` values
- Public intake body guard: open booking, embed inquiry, and kiosk inquiry now share explicit JSON body limits and honest malformed-body handling, so intake routes return `400` or `413` instead of generic `500`s on bad input
- Public intent hardening: public chef inquiry, open booking, embed inquiry, and instant booking now run through one backend guard for IP and email throttles, silent honeypot handling, safe request metadata, and anonymous checkout dedupe before any client, inquiry, event, or Stripe checkout mutation
- Instant-book duplicate suppression: repeated anonymous checkout attempts for the same chef, email, date, time, and booking intent now reuse a short-window cached checkout result plus Stripe idempotency instead of creating parallel draft records and sessions
- Rate Card: mobile-friendly pricing reference
- Leads: shared `/leads` workspace where generic website submissions stay claimable and founder-reviewed operator walkthrough requests stay in a separate evaluation lane
- Calls: upcoming/completed/no-show, agenda, outcome tracking
- Partners: referral stats, locations, service history
- Proposals: template builder, visual editor, selectable add-ons
- Event-scoped quick proposal preview: proposal generation now accepts CP-Engine client profile guidance for preview only, exposing confidence, service depth, emotional state, hard vetoes, strong likes, novelty opportunities, and unresolved clarifications when profile persistence exists
- Testimonials: approval workflow (pending/approved/featured)
- Prospecting (admin only): dossier, call queue, AI scrub, scripts, pipeline kanban, clusters, import

## Open Items

- Cross-surface action graph and intervention engine are still incomplete; quote prefill is now shared, but next-best-action routing is not yet unified across inquiries, events, and follow-up surfaces
- Route-aware reassurance is still only partially shared; the intake-lane contract is canonical now, but the full pre-submit and post-submit reassurance spine is still the next missing slice
- Shared end-to-end proof still relies on slice-specific runtime checks here; the direct browser verification is trustworthy, but the broader shared Playwright harness is still too noisy to treat as the authoritative proof path for this lane

## Integration Notes

- **Why `lib/quotes/quote-prefill.ts` is a new file instead of another extension point:** the previous query parser lived inside `app/(chef)/quotes/new/page.tsx`, so client components such as the consulting calculator, menu detail CTA, and scope-drift banner could not reuse it without importing a server route or rebuilding the same search-param logic. The durable draft hook also solves persistence after the page loads, not cross-surface transport before the page loads. A small shared contract file was the minimum additive owner that both server and client surfaces could import without creating a second source of truth.
