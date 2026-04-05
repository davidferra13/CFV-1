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
- Chef configuration (headline, description, theme)
- Public (no auth), inline styles (no Tailwind), relaxed CSP (frame-ancestors \*)

## Open Items

None. Fully functional.
