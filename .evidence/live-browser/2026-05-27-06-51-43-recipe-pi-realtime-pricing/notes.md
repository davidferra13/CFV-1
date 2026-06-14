# Live Browser Notes

## Intent Model

- User goal: See what it looks like when a recipe is made and priced by PIE/Pi in real time.
- Audience/persona: ChefFlow product evaluator and chef workflow owner.
- Evaluation lens: Live intelligence, proof, trust, and friction.
- Success criteria: Create recipe, auto-price ingredients, show per-line source/confidence, expose failures clearly.
- Output expected: Evaluation-ready observations with screenshots and local URL.
- Run mode: chefflow
- Browser context: Playwright controlled browser, desktop 1440x1000, canonical localhost:3100.

## Browser Context Decision

- Candidate contexts: Playwright controlled browser, regular browser, terminal-only API probe.
- Selected context: Playwright controlled browser.
- Reason: Needed screenshots, console/network evidence, and live ChefFlow UI behavior.
- Confidence impact: High for this local session; no production/mobile generalization.

## Timeline

| Time  | Step | URL           | Action                                     | Observation                                                           | Screenshot                             |
| ----- | ---- | ------------- | ------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------- |
| 06:52 | 1    | /recipes/new  | Opened new recipe page                     | Smart Import page loaded in authenticated Agent Test Kitchen session. | screenshots/01-new-recipe.png          |
| 06:54 | 2    | /recipes/new  | Typed salmon bowl recipe into Smart Import | Parse Recipe enabled.                                                 | screenshots/02-typed-recipe.png        |
| 06:54 | 3    | /recipes/new  | Clicked Parse Recipe                       | UI stayed Parsing; later showed Ollama unavailable and 60s timeout.   | screenshots/03-after-parse-attempt.png |
| 06:56 | 4    | /recipes/new  | Switched to Manual Entry                   | Manual form opened with AI unavailable alert.                         | 05-manual-entry-snapshot.md            |
| 06:58 | 5    | /recipes/new  | Filled recipe details and 9 ingredients    | All pre-save ingredient price hints displayed No price data yet.      | screenshots/06-filled-manual.png       |
| 07:00 | 6    | /recipes/new  | Submitted recipe                           | Redirected to recipe detail ID 346853df-fb3a-45b2-afa7-458ec6d86819.  | screenshots/09-recipe-detail-full.png  |
| 07:01 | 7    | /recipes/[id] | Clicked Salmon Fillet PIE expander         | Expander stayed Loading and did not show proof details.               | screenshots/10-salmon-pie-click.png    |
| 07:05 | 8    | /recipes/[id] | Reloaded detail and extracted visible text | Cost summary persisted: $19.21 total, $2.40/portion, 7/9 priced.      | 13-detail-reload-snapshot.md           |

## Raw Non-Private Observations

- Recipe created: Pi Live Cost Test Miso Ginger Salmon Rice Bowls 20260527-0658.
- Recipe URL: http://localhost:3100/recipes/346853df-fb3a-45b2-afa7-458ec6d86819.
- Cost Summary: Moderate confidence, 7/9 ingredients priced, 3 estimated, 2 missing.
- Total Cost: $19.21.
- Cost per Portion: $2.40.
- Price Data badge: Approximate, priced 1w ago.
- Priced ingredients: Salmon Fillet $4.98 at Kroger (Dearborn, MI); Soy Sauce $1.06 at brookshires via Instacart; Fresh Ginger $2.56 at wegmans via Instacart; Honey $0.08 at Sam's Club via Flipp; Jasmine Rice $5.76 at Flipp Circulars (NV); Sesame Oil $3.21 at el-super via Instacart; Lime $0.30 at ruler-foods via Instacart.
- Missing ingredients: white miso, scallions.
- Pre-save hints showed No price data yet for all ingredients.
- Completion card said All ingredients priced, while Cost Summary said 7/9 priced, 2 missing.
- Smart Import failed due local Ollama unavailable/chat fallback timeout.
- PIE popover stayed Loading.
- Authenticated `/api/pricing/recipe` request was aborted after 15 seconds.
- Repeated realtime endpoint 403s occurred throughout the run.
