# Homepage and Booking

**What:** Public landing page and booking form. What anyone sees before logging in.

**Routes:** `/` (homepage), `/book` (booking form), `/for-operators` (operator proof page), `/marketplace-chefs` (marketplace-led operator page), `/compare` (operator comparison hub), `/for-operators/walkthrough` (operator walkthrough form)
**Status:** DONE

## What's Here

- Homepage: operator-first hero with a canonical proof CTA to `/for-operators`, secondary consumer marketplace branch, real operator proof reinforcement, and a direct walkthrough link for high-intent operators
- Book a Private Chef: shareable slug-based link, headline, bio, pricing model, deposit info, booking form (occasion, date, guests, dietary, budget), converts to inquiry
- Public booking boundary guard: `/api/book` now caps JSON body size and returns explicit `400` for malformed bodies plus `413` for oversized payloads instead of a generic `500`
- For Operators: operator proof page with real-product framing, walkthrough-first CTA hierarchy, and secondary routes for marketplace-led chefs or stack-switch evaluation
- Remy AI widget: embedded on homepage and booking page, natural language inquiry handling, lead capture
- Operator source attribution: homepage and operator-path links carry `source_page` / `source_cta` into downstream operator pages so page-view tracking reflects the real acquisition entry point

## Open Items

- No live nurture, outbound sequence, or partner-channel automation yet.
- Operator acquisition routing is now proof-first, but real channel validation is still missing.
