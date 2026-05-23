# Questions And Assumptions

## Asked Before Browsing

No questions asked. The prompt already specified the goal, privacy boundary, action boundary, run depth, and output shape.

## Assumptions Made

- Use a logged-out/controlled browser unless a real profile is necessary and safe.
- Do not grant precise browser location.
- Keep raw screenshots local in the evidence pack.
- Treat this as product/spec research only.
- Do not edit ChefFlow app code and do not queue work.

## New Questions Discovered During Browsing

- Should ChefFlow `/eat` store anonymous local food context before sign-in?
- Which source should be canonical for public local places?
- What is the intended relationship between nearby restaurants and ChefFlow private chefs on `/eat`?
- Should `/eat` become map-first for local intent or rail-first with map as a mode?
- Which availability/open-now signals are reliable enough to expose?

## Questions Closed By Proceed Pass

- MVP 1 should be rail-first, not map-first.
- MVP 1 should use existing ChefFlow data only.
- Open-now, live distance, reservation, delivery/pickup availability, busy times, and listing ratings should be omitted or disabled until a source of truth exists.
- Anonymous saved food context should be allowed, but account merge should be explicit rather than silent.

## Still Open

- Which external provider, if any, should eventually supply hours, distance, ratings, reservations, delivery, and photos?
- Should authenticated account default location replace anonymous saved location automatically, or require a visible confirmation every time they conflict?
- What retention limit should apply to anonymous saved food searches?
- Should saved searches create notifications/digests later, and only after what consent?
