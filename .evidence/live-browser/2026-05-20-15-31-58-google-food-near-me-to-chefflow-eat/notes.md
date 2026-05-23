# Live Browser Notes

## Intent Model

- User goal: understand Google's `food near me` journey and convert it into ChefFlow `/eat` product/spec recommendations.
- Audience/persona: consumer who wants food nearby without repeatedly searching Google.
- Evaluation lens: local discovery, saved context, location inference, autocomplete, map/local pack, action surfaces, privacy.
- Success criteria: evidence-backed observations, screenshots, codebase-grounded `/eat` recommendations, no app edits, no queue items.
- Output expected: research Markdown plus build/spec candidates.
- Run mode: deep.
- Browser context: Playwright-controlled Chromium plus Playwright MCP browser.

## Browser Context Decision

- Candidate contexts: real Chrome/Edge profile, controlled Playwright, MCP browser.
- Selected context: controlled Playwright first for repeatable autocomplete screenshots; MCP browser second because Google blocked the scripted submit path.
- Reason: avoid exposing private Google account state while still capturing live Google UI.
- Confidence impact: strong for visible generic/logged-out UI; limited for account personalization, saved places, and real mobile.

## Timeline

| Time                | Step | URL                       | Action                          | Observation                                                                                                           | Screenshot                                                                                   |
| ------------------- | ---- | ------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 2026-05-20 15:32 ET | 1    | `https://www.google.com/` | Open start                      | Google home rendered, logged out.                                                                                     | `screenshots/01-desktop-google-start.png`                                                    |
| 2026-05-20 15:32 ET | 2    | Google home               | Focus input                     | Trending searches appeared.                                                                                           | `screenshots/02-desktop-input-focus.png`                                                     |
| 2026-05-20 15:32 ET | 3    | Google home               | Type `f`                        | `food near me` appeared early.                                                                                        | `screenshots/03-desktop-autocomplete-f.png`                                                  |
| 2026-05-20 15:32 ET | 4    | Google home               | Type `fo`                       | `food near me`, local/radius suggestion visible.                                                                      | `screenshots/04-desktop-autocomplete-fo.png`                                                 |
| 2026-05-20 15:32 ET | 5    | Google home               | Type `foo`                      | Local city/state, open-now, delivery suggestions visible.                                                             | `screenshots/05-desktop-autocomplete-foo.png`                                                |
| 2026-05-20 15:32 ET | 6    | Google home               | Type `food`                     | `food near me` stayed prominent.                                                                                      | `screenshots/06-desktop-autocomplete-food.png`                                               |
| 2026-05-20 15:32 ET | 7    | Google home               | Type `food near`                | Open-now and radius variants visible.                                                                                 | `screenshots/07-desktop-autocomplete-food-near.png`                                          |
| 2026-05-20 15:32 ET | 8    | Google home               | Type `food near me`             | Local, radius, open-now, delivery variants visible.                                                                   | `screenshots/08-desktop-autocomplete-food-near-me.png`                                       |
| 2026-05-20 15:33 ET | 9    | Google search             | Submit in script                | Google unusual-traffic page blocked scripted SERP.                                                                    | `screenshots/09-desktop-results-above-fold.png`                                              |
| 2026-05-20 15:34 ET | 10   | Google search             | Open via MCP browser            | SERP rendered with local pack, map, filters, precise location prompt.                                                 | `screenshots/16-mcp-desktop-results-above-fold.png`                                          |
| 2026-05-20 15:34 ET | 11   | Google search             | Dismiss precise-location prompt | Approximate local results remained usable.                                                                            | `screenshots/17-mcp-desktop-results-no-location-modal.png`                                   |
| 2026-05-20 15:34 ET | 12   | Places view               | Click More places               | Long local list plus sticky map rendered.                                                                             | `screenshots/18-mcp-desktop-more-places.png`                                                 |
| 2026-05-20 15:34 ET | 13   | Places view               | Open Cuisine filter             | Cuisine chip menu rendered.                                                                                           | `screenshots/19-mcp-cuisine-filter-expanded.png`                                             |
| 2026-05-20 15:35 ET | 14   | Google search             | Attempt mobile/resize           | Mobile-specific behavior inconclusive.                                                                                | `screenshots/20-mcp-mobile-results-above-fold.png`                                           |
| 2026-05-20 15:43 ET | 15   | Google search             | Open "How location is used"     | Dialog explained location was estimated from IP address and suggested including a location for specific-area results. | `screenshots/21-location-used-popover.png`                                                   |
| 2026-05-20 15:43 ET | 16   | Google search             | Apply Open now                  | Query/state changed to open-now local results.                                                                        | `screenshots/22-open-now-filter-results.png`                                                 |
| 2026-05-20 15:44 ET | 17   | Google search             | Open Price dropdown             | Price refinement menu shown.                                                                                          | `screenshots/23-price-filter-expanded.png`                                                   |
| 2026-05-20 15:44 ET | 18   | Google search             | Open Vibe dropdown              | Vibe/mood refinement menu shown.                                                                                      | `screenshots/24-vibe-filter-expanded.png`                                                    |
| 2026-05-20 15:45 ET | 19   | Google search             | Open local place detail         | Local detail state expanded in place.                                                                                 | `screenshots/25-place-detail-expanded.png`                                                   |
| 2026-05-20 15:45 ET | 20   | Google Maps               | Click Maps tab                  | Same intent handed off to map-first workspace.                                                                        | `screenshots/26-google-maps-handoff.png`                                                     |
| 2026-05-20 15:49 ET | 21   | Google search             | Click Update location           | Footer location control exposed an updating-location state/status.                                                    | `screenshots/27-update-location-dialog.png`, `screenshots/28-update-location-after-wait.png` |

## Raw Non-Private Observations

- Google inferred approximate local city/ZIP from IP.
- Google offered precise location as an optional improvement.
- Autocomplete shifted quickly from broad suggestions to local food refinements.
- SERP showed Places above web results.
- Results included place cards, map, web results, People also ask, images, and People also search for.
- Local filters included open now, top rated, cheap, upscale, reservations, recently opened, vibe, cuisine, and price.
- Places expansion exposed more local operators and a map-first browsing layout.
- Location explainer explicitly separated approximate IP-derived location from more specific user-entered location.
- Open-now refinement rewrote the query to an urgency-specific local search.
- Price and vibe were top-level menus, not hidden settings.
- Place detail expansion added a richer inspection layer without requiring a final action.
- Maps handoff preserved intent while changing workspace mode.
- Update location was available from the footer location label and showed status feedback.

## Completion Follow-Up Notes

| Time                | Step | URL                         | Action                   | Observation                                                                                                                       | Screenshot                                                   |
| ------------------- | ---- | --------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 2026-05-20 16:52 ET | 22   | `http://localhost:3100`     | Restart canonical server | Existing `3100` listener was this checkout's Next server but timed out; restart made canonical server healthy with no duplicates. | N/A                                                          |
| 2026-05-20 16:53 ET | 23   | `http://localhost:3100/eat` | Capture desktop baseline | `/eat` rendered; page is broad discovery/planning; local context asks user to add location; results are not localized by default. | `screenshots/29-chefflow-eat-desktop-baseline.png`           |
| 2026-05-20 16:54 ET | 24   | `http://localhost:3100/eat` | Capture mobile baseline  | Same core controls and broad results render on mobile; two directory image URLs returned 404.                                     | `screenshots/30-chefflow-eat-mobile-baseline.png`            |
| 2026-05-20 16:54 ET | 25   | `https://www.google.com/`   | Open mobile Google       | Mobile Google home/search layout appeared with trending searches.                                                                 | `screenshots/31-mobile-google-start.png`                     |
| 2026-05-20 16:54 ET | 26   | Google mobile               | Focus search input       | Search focus showed mobile suggestion/trending state.                                                                             | `screenshots/32-mobile-google-input-focus.png`               |
| 2026-05-20 16:54 ET | 27   | Google mobile               | Type `f`                 | `food near me` appeared as a mobile autocomplete suggestion.                                                                      | `screenshots/33-mobile-google-autocomplete-f.png`            |
| 2026-05-20 16:54 ET | 28   | Google mobile               | Type `food near me`      | Suggestions included nearby towns, open-now, radius, now, and delivery variants.                                                  | `screenshots/34-mobile-google-autocomplete-food-near-me.png` |
| 2026-05-20 16:54 ET | 29   | Google mobile               | Submit query             | Google returned unusual-traffic page, so mobile SERP/local pack remains unproven.                                                 | `screenshots/35-mobile-google-results-above-fold.png`        |
| 2026-05-20 16:54 ET | 30   | Google mobile               | Try safe expansion       | No safe expansion was available because the unusual-traffic page blocked results.                                                 | `screenshots/36-mobile-google-safe-expansion.png`            |
| 2026-05-20 16:54 ET | 31   | Google mobile               | Scroll one depth         | Still unusual-traffic page.                                                                                                       | `screenshots/37-mobile-google-one-scroll-depth.png`          |
