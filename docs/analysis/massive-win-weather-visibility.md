## Massive Win Analysis - 2026-04-26

**Sources scanned:** docs/product-blueprint.md; docs/specs/api-integration-health-audit.md; system/persona-batch-synthesis/synthesis-2026-04-26.md; system/persona-batch-synthesis/priority-queue.json; docs/stress-tests/persona-kai-donovan-2026-04-25.md; docs/stress-tests/persona-ethan-calder-2026-04-26.md; docs/stress-tests/persona-tommy-thompson-2026-04-26.md; docs/session-digests latest 5; app, components, lib weather search; database/migrations and types weather search. Missing prescribed sources: memory/user_business_reality_april2026.md, memory/project_urgency_recalibration.md, memory/project_event_lifecycle_integrity.md, memory/project_first_time_experience.md, memory/project_money_flow_audit.md, memory/project_public_surface_cohesion.md, memory/project_mempalace_backlog.md, docs/persona-pipeline/batch-synthesis*.md.
**Pain points identified:** 6
**Scored candidates:** 5

---

### THE WIN: Event Weather Truth Card Across The Lifecycle

**Score: 32/50**

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Unblocks downstream | 5/5 | One shared lifecycle weather card would reuse existing weather infrastructure across booking, proposal review, chef event detail, public guest pages, dashboard schedule, packing, and day-of control views. |
| Business urgency | 4/5 | Product blueprint says public booking must be tested end-to-end and validation is only 10%. Weather uncertainty is a high-trust booking and event-readiness detail, especially for outdoor and venue-constrained events. |
| User-visible impact | 5/5 | Chef, client, and guests all gain the same answer: what weather is predicted for the actual event date, what it means, and whether the forecast is not yet available. |
| Effort (penalty) | -3/5 | Moderate. Existing weather APIs and risk scoring exist, but public event data must expose safe coordinates or a server-resolved weather summary, and multiple surfaces need consistent placement. No schema change required. |
| Risk (penalty) | -2/5 | Main risk is hallucinating certainty outside forecast windows or leaking hidden location data on public pages. Rollback is hiding the shared card by surface flag while keeping existing chef-only weather panels. |

**What changes:** Build one reusable event weather truth contract and card that renders forecast, actual weather, unavailable window, or error honestly for the event date and venue. Place it wherever the event date is already shown: booking after date/location selection, proposals, chef event detail, public event page, dashboard schedule, and packing/day-of views.

**Multiplier effect:**
- Public event pages already show event date/location in `app/(public)/e/[shareToken]/public-event-view.tsx:178-183` and `:558-559`, but no weather. A public-safe weather summary would help guests plan clothing, travel, and arrival expectations.
- Public proposal pages already show proposal date in `components/proposals/proposal-public-view.tsx:190-205`, but do not show venue/weather risk. This is where a client decides whether the outdoor plan needs a contingency.
- Chef event detail already renders `WeatherPanel` beside the map in `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx:156-183`, so the card can reuse a proven chef surface instead of inventing a new integration.
- Dashboard schedule already fetches inline weather from event coordinates in `app/(chef)/dashboard/_sections/schedule-cards.tsx:48-70` and shows it in the daily item at `:95`, so weekly/daily weather awareness can become consistent rather than a tiny temperature suffix.
- Packing/day-of already fetches event weather in `app/(chef)/events/[id]/pack/page.tsx:29-40`, and `components/events/packing-list-client.tsx:433-469` converts weather into packing suggestions. This can become the prominent control-packet/day-of weather block.
- The weather foundation is real: `lib/weather/open-meteo.ts` fetches forecasts and historical event weather, `lib/formulas/weather-risk.ts` scores rain, wind, heat, freezing, storms, and snow, and `lib/ai/remy-weather.ts` already looks for upcoming weather alerts.

**Cost:** 1.5 to 2.5 days. No schema changes. Create a shared server-side weather summary helper that takes event date, coordinates, visibility flags, and location text. Use existing `getEventWeather()`, `fetchForecast()`, and `assessWeatherRisk()`. Add card placements to public event view, proposal public view, booking form after date and location are known, dashboard schedule, event overview, and packing/control surfaces. Include an explicit "forecast not available yet" state for events outside the 16-day Open-Meteo event forecast range and a "could not check weather" state when the integration fails.

**Risk:** Public visibility must honor `show_location` and share settings. Do not expose lat/lng to the client if the host hides the venue. Booking-time weather must not pretend long-range forecasts are reliable, so it should show a planning note until the forecast window opens. Error handling must preserve the Zero Hallucination rule: failed weather lookup is not "clear weather." Rollback is to remove the new card placements and leave the existing chef-only `WeatherPanel`, dashboard suffix, and packing suggestions in place.

**Proof of success:** A participant looking at the booking flow, proposal, public `/e/[shareToken]` page, chef event overview, dashboard schedule, and packing/day-of page can answer four questions without asking the chef: event date, location visibility, forecast or unavailable window, and operational implication. Code proof should include one shared weather summary contract, public surfaces with no raw coordinate leak, and UI states for forecast, actual weather, not-yet-available, no location, and fetch failure.

**Why not yet:** Weather exists as a local chef utility, not as a lifecycle fact. The current implementation grew from operational surfaces: event map panel, dashboard inline weather, Remy alerts, and packing suggestions. The public share and proposal layers were built around ticketing, menu, date, and location visibility, but their public data contract in `lib/tickets/purchase-actions.ts:145-170` exposes `eventDate` and `locationText` only, not a weather summary. There is also historical caution from `docs/specs/api-integration-health-audit.md:264` and `:970-989` that weather failures were previously at risk of being hidden as empty results.

---

### Runner-up: Public Event Weather Card Only
**Score: 27/50**
Adding weather only to `/e/[shareToken]` is the sharpest guest-facing slice because that page already shows event date, calendar links, and location text. It loses because it does not help the booking decision, proposal approval, chef prep, or day-of packing. It should be the first visible placement inside the winner, not the whole win.

---

### Rejected candidates
| Pain point | Score | Why not massive |
|-----------|-------|-----------------|
| Fix weather API error honesty only | 25 | Necessary foundation, but user-visible value remains narrow unless the corrected weather state appears across lifecycle surfaces. |
| Add weather to chef event detail only | 18 | Already partially built through `WeatherPanel`; improving it helps chefs but leaves clients and guests blind. |
| Add outdoor event fields or schema | 14 | Schema already has several outdoor/weather-related fields and public weather snapshots. The immediate gap is surfacing existing truth, not adding more columns. |
| Add AI venue or contingency suggestions | 21 | Persona sources mention venue constraints, but AI suggestions would be speculative without first showing deterministic weather truth on the actual event date. |
| Build supplier weather feed integration | 19 | Ethan and Tommy personas mention weather affecting supply, but the prompt is participant event weather visibility. Supplier feeds are a separate sourcing problem. |

