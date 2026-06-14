# Live Experience Research Pack

## Executive Takeaway

ChefFlow can create a recipe and auto-cost it on save, but the live experience is not yet the "Pi is visibly making and pricing this in real time" moment. In this run, Smart Import stalled because Ollama was unavailable, manual creation worked, and the saved recipe detail page showed a usable cost summary: $19.21 total, $2.40 per portion, 7/9 ingredients priced, 2 missing, and 3 estimated because of unit mismatches. The inline PIE drilldown then hung at Loading, and the authenticated pricing API did not return within 15 seconds.

## Setup

- Task: Simulate a recipe being made and priced by PIE/Pi in the running ChefFlow app.
- Site/app/route: http://localhost:3100/recipes/new -> http://localhost:3100/recipes/346853df-fb3a-45b2-afa7-458ec6d86819
- Date/time: 2026-05-27T06:51:43.324Z
- Browser context used: Playwright controlled browser against canonical local app server.
- Confidence impact of browser context: High for local ChefFlow UI behavior in this session; not a production or mobile proof.
- Session/auth state: Already authenticated as Agent Test Kitchen.
- Viewport/device: Desktop, 1440x1000.
- Location sensitivity:
- Permissions used: Local app only; no external purchases, messages, or irreversible third-party actions.
- Action boundary: Created one synthetic test recipe in the local app; no code edits.
- Run mode: chefflow
- Evidence folder: .evidence\live-browser\2026-05-27-06-51-43-recipe-pi-realtime-pricing

## User Need Learned

- User goal: See what it actually looks like when a recipe is captured and priced by PIE in real time.
- Audience/persona: ChefFlow builder/evaluator deciding whether this moment feels product-ready.
- Evaluation lens: visible live intelligence, trust/proof, friction, and what a chef would understand without backend context.
- Success criteria: recipe gets created, ingredients price automatically, confidence/provenance is visible, and failures are obvious/recoverable.
- Output expected: descriptive plus evaluation-ready findings.
- Assumptions: Synthetic test recipe was acceptable; desktop was sufficient for this pass.
- Questions asked: .evidence\live-browser\2026-05-27-06-51-43-recipe-pi-realtime-pricing\questions.md
- Clarifying answers: None; proceeded under low-risk test-data assumptions.

## Method

- Steps planned: open recipe creation, attempt Smart Import, fall back to manual if blocked, save recipe, inspect pricing result, probe PIE drilldown/API.
- Comparisons planned: None in this pass.
- Stopping point: Saved recipe detail page plus PIE/API behavior captured.
- Redaction approach: Keep raw local screenshots in evidence; summarize unrelated workspace/private chrome in final response.

## Step-by-Step Observations

| Step | Action                                                   | Screenshot                             | Visible result                                                             | User-need learning                                                                        |
| ---- | -------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1    | Opened `/recipes/new`                                    | screenshots/01-new-recipe.png          | Smart Import entry surface loaded.                                         | The intended first moment is recipe text capture, not pricing.                            |
| 2    | Entered synthetic salmon bowl recipe text                | screenshots/02-typed-recipe.png        | Parse Recipe became available.                                             | The capture affordance is clear.                                                          |
| 3    | Clicked Parse Recipe                                     | screenshots/03-after-parse-attempt.png | UI remained at Parsing; server action later returned 500.                  | Smart Import path is brittle when local AI/Ollama is down.                                |
| 4    | Switched to Manual Entry and filled recipe + ingredients | screenshots/06-filled-manual.png       | Nine ingredient rows filled; pre-save price dots showed No price data yet. | The real-time pre-save pricing signal under-promises and is confusing.                    |
| 5    | Submitted the recipe                                     | screenshots/09-recipe-detail-full.png  | Recipe saved and redirected to detail page.                                | Auto-costing runs after save and gives the first useful result.                           |
| 6    | Inspected detail page costing                            | screenshots/09-recipe-detail-full.png  | Cost Summary: $19.21 total, $2.40/portion, Approximate, 7/9 priced.        | The system can price, but the status is split between optimistic and cautionary messages. |
| 7    | Clicked first PIE drilldown                              | screenshots/10-salmon-pie-click.png    | Salmon PIE expander stayed at Loading.                                     | The proof layer is currently the weakest part of the moment.                              |

## What Happened

Created `Pi Live Cost Test Miso Ginger Salmon Rice Bowls 20260527-0658`, recipe ID `346853df-fb3a-45b2-afa7-458ec6d86819`.

Visible result after save:

- Total Cost: $19.21
- Cost per Portion: $2.40
- Price Data: Approximate, priced 1w ago
- Summary: 7/9 ingredients priced, 3 estimated, 2 missing
- Priced lines: salmon fillet $4.98 at Kroger, soy sauce $1.06 via Instacart, fresh ginger $2.56 via Instacart, honey $0.08 via Flipp, jasmine rice $5.76 via Flipp, sesame oil $3.21 via Instacart, lime $0.30 via Instacart
- Missing lines: white miso, scallions

Pre-save ingredient hints said No price data yet for all ingredients, even though several priced after save.

Smart Import failed because local Ollama was unavailable. The visible error was: AI processing is temporarily unavailable, Ollama chat-fallback timed out after 60s.

The PIE drilldown for Salmon Fillet did not resolve; it stayed at Loading. The authenticated `/api/pricing/recipe` request was aborted after 15 seconds without a response.

## Findings

### User Need Fit

Moderate. The saved detail page answers "what did this recipe cost?" but the process does not yet feel live or observable while the recipe is being made.

### Trust And Proof

Mixed. Store/source labels are visible for priced ingredients, but the PIE popover proof path hangs, the pre-save dots contradict the post-save result, and the Cost Summary simultaneously says "All ingredients priced" in Completion while later saying 7/9 priced.

### Friction And Failure Points

Smart Import failure, Remy launcher intercepting the Save button, all pre-save price hints saying no data, PIE drilldown stuck at Loading, repeated realtime 403s, and pricing API timeout.

### Actionability

The saved page gives a chef enough to continue: approximate total, per-portion cost, missing price count, and unit mismatch warning. It does not yet give an obvious "fix these two missing prices now" path in the recipe context beyond generic review/update links.

### Personalization Or Context Signals

The route ran in the authenticated Agent Test Kitchen workspace. Store/source labels appeared, but the locality basis was unclear because sources spanned named retailers and regions without a concise explanation.

### Missing Affordances

Missing: visible pricing progress during creation, consistent pre/post price availability, timeout/retry on PIE drilldown, inline repair for missing prices, and a clear explanation of region/source selection.

## Evaluation Scores

| Dimension            | Score | Evidence                                                                                    |
| -------------------- | ----- | ------------------------------------------------------------------------------------------- |
| Relevance            | 7/10  | Recipe detail gives cost, portion cost, sources, and missing-price warnings.                |
| Personalization      | 5/10  | Uses the authenticated chef workspace, but store geography feels mixed without explanation. |
| Trust                | 4/10  | Source labels exist; PIE proof drawer/API hangs and status messages conflict.               |
| Friction             | 4/10  | Manual path works; Smart Import and drilldown fail.                                         |
| Actionability        | 6/10  | Missing and unit-mismatch counts are visible, but repair actions are indirect.              |
| Local/context fit    | 5/10  | Store/source labels appear, but local region basis is not clear.                            |
| Conversion pressure  | n/a   | Internal workflow, not a marketing or sales surface.                                        |
| Missing affordances  | 4/10  | Needs live progress, retry/fallback, and direct missing-price resolution.                   |
| ChefFlow opportunity | 9/10  | This can become a compelling "recipe becomes priced business object" moment.                |
| Evidence confidence  | 8/10  | Direct local browser run, screenshots, network, and page text captured.                     |

## Product Lessons

- What to copy: The detail page's per-ingredient line cost, source/store label, total cost, per-portion cost, and missing/estimated warnings.
- What to avoid: Silent or endless Loading states in proof drawers.
- What to adapt: Turn pricing into a staged live pipeline: captured -> ingredients normalized -> prices checked -> costs computed -> issues queued.
- What to investigate next: Why pre-save price hints all said no data; why PIE detail hangs; why `/api/pricing/recipe` exceeds 15 seconds; why Completion says all ingredients priced while Cost Summary says 7/9.

## ChefFlow Implications

- Relevant surface: `/recipes/new`, `/recipes/[id]`, `IngredientPiePopover`, recipe costing summary, pricing API.
- Build/spec candidate: "Recipe live pricing cockpit" state model and proof drawer reliability fix.
- Queue candidate: Yes, if the next step is productizing the moment rather than just discussing it.
- Acceptance signal: A synthetic recipe shows live ingredient normalization, per-line pricing, total cost, source confidence, missing price repair links, and no hung loading state.
- Risks/dependencies: Ollama availability, realtime auth noise, PIE query latency, source confidence semantics, unit conversion data.
- Verification idea: Playwright flow creates a disposable recipe and asserts visible total, priced/missing counts, non-stuck PIE drawer, and pricing API response under 5 seconds.

## Evidence Pack

- Screenshots: .evidence\live-browser\2026-05-27-06-51-43-recipe-pi-realtime-pricing\screenshots
- Notes: .evidence\live-browser\2026-05-27-06-51-43-recipe-pi-realtime-pricing\notes.md
- URLs: http://localhost:3100/recipes/new, http://localhost:3100/recipes/346853df-fb3a-45b2-afa7-458ec6d86819
- Console/network/server findings: Smart Import POST returned 500 after Ollama timeout; repeated `/api/realtime/chef-...` 403s; PIE detail stayed Loading; `/api/pricing/recipe` aborted after 15s; transient `ERR_CONNECTION_REFUSED` observed during PIE/API probing before server recovered.
- Redactions: .evidence\live-browser\2026-05-27-06-51-43-recipe-pi-realtime-pricing\redactions.md

## Limitations

- Browser-context limits: Playwright desktop only; no mobile run.
- Personalization/session limits: Agent Test Kitchen session only.
- Location/time limits: Store/local pricing basis was not independently verified.
- A/B test/ads variability: Not applicable.
- Tooling limits: Browser could not directly display screenshots in chat; screenshots saved locally.

## What Not To Conclude

- Do not generalize: This is not proof that production pricing behaves the same way for every chef.
- Do not infer: Store prices are accurate enough for purchasing without validating source freshness and unit conversion.
- Needs another run: Repeat with Ollama healthy and with a recipe whose units match PIE units better.

## Open Questions

1. Should recipe creation show a live pipeline timeline instead of waiting until the detail page?
2. Should missing prices become inline fix tasks directly under each ingredient?
3. Should PIE block save, warn only, or create a "priced draft" state when confidence is low?

## Recommended Next Run

- Suggested mode: Standard ChefFlow route study after the PIE drawer/API bug is fixed.
- Suggested browser context: Playwright desktop plus one mobile viewport.
- Suggested comparison: Same recipe with manual entry, Smart Import, and recipe dump.
