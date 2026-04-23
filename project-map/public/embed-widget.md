# Embed Widget

**What:** Embeddable inquiry form that works on any website. Vanilla JS, no dependencies.

**Routes:** `/embed/inquiry/[chefId]` (form), `/api/embed/inquiry` (API)
**Key files:** `public/embed/chefflow-widget.js`, `components/embed/embed-inquiry-form.tsx`
**Settings:** `/settings/embed`
**Status:** DONE

## What's Here

- Self-contained vanilla JS widget script
- Inquiry submission form (embedded in iframe)
- Lead creation API endpoint
- Shared intake provenance: widget submissions now stamp the canonical `embed_inquiry` lane so admin reporting can distinguish embedded website captures from open booking
- Boundary guard: `/api/embed/inquiry` now caps JSON body size and fails closed with explicit `400` or `413` responses while preserving CORS headers for host sites
- Shared public intent guard: embed submissions now use the same backend abuse controls as chef-profile inquiries, including hashed IP and email throttles plus silent honeypot handling before any lead, inquiry, or event writes
- Chef configuration (headline, description, theme)
- Public (no auth), inline styles (no Tailwind), relaxed CSP (frame-ancestors \*)

## Open Items

None. Fully functional.
