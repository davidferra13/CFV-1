# Guest Experience

**What:** The journey a guest goes through before, during, and after an event. RSVP, dietary, excitement, feedback.

**Routes:** `/hub/[chefSlug]/[eventId]`, `/hub/[chefSlug]/[eventId]/recap`, `/onboarding/[token]`, `/feedback/[token]`, `/kiosk/*`
**Status:** DONE

## What's Here

- RSVP portal: attending/maybe/decline, plus-one, dietary preferences
- Pre-event: countdown page, dietary confirmation requests (48-72hr before), day-before reminders, parking/dress code/arrival instructions
- Public share and viewer links: chef-controlled visibility contract for guest-facing event details, with Dinner Circle access resolved from an active share token instead of exposing tenant ids in the browser
- Guest excitement wall (moderated messages)
- Photo consent tracking (GDPR compliant)
- Post-event: ratings, testimonials, NPS collection
- Document sharing: recipe cards, wine pairings, event photos, thank-you notes
- Client onboarding: token-gated multi-step form (dietary, preferences, kitchen, access)
- Post-event survey: public no-auth endpoint, ratings, testimonial, photo upload consent
- Kiosk routes: tablet RSVP, dietary collection, feedback (full-screen tablet UI)

## Open Items

None. Fully functional.
