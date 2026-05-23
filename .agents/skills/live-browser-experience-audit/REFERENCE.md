# Live Browser Experience Audit Reference

## What This Skill Is For

This skill turns "go look at it" into a disciplined research run. It is for:

- Third-party websites, apps, search results, marketplaces, maps, local discovery, and competitor UX.
- Logged-in or personalized experiences when the user explicitly authorizes that account/session context.
- ChefFlow's own running app, especially when the user wants route studies, screenshots, visible proof, UI audits, or research Markdown.
- Converting live observations into reusable product lessons, queue candidates, and build/spec implications.

## Clarifying Question Triggers

Ask before browsing when any answer would materially change the run:

- Personal outcome vs product research vs ChefFlow build learning.
- Descriptive report vs strategic analysis vs queue/spec output vs polished research Markdown.
- Generic user vs named persona, role, geography, device, budget, urgency, dietary need, or business context.
- Real Chrome/Edge profile vs Playwright vs VS Code embedded browser vs neutral web search.
- Logged-in, location, cookies, saved history, account personalization, or private workspace state is implied but not explicitly allowed.
- The flow may end in a consequential action such as purchase, reservation, message, review, settings change, or form submit.
- The user asks "best," "should I," "what matters," or "what do users want" without success criteria.
- ChefFlow route study could require auth role, seeded data, specific client/chef/event, or queue/build implications.

Default assumption when low-risk: observe only, do not take final actions, desktop viewport first, current visible session state, screenshots saved locally, final answer summarizes private signals without exposing them, and ChefFlow work remains read-only.

## Browser Context Guidance

Choose the browser context based on the user's goal:

- Real Chrome/Edge profile: best for "my logged-in Google account," local personalization, saved location, real consumer experience, extensions, and cookies. Highest realism, lower repeatability.
- Playwright controlled browser: best for ChefFlow QA, screenshots, console/network checks, mobile emulation, repeatable runs, and objective evidence packs. Higher repeatability, may lack user's personal sessions.
- VS Code embedded/simple browser: acceptable for quick local app visibility. Lower leverage for logged-in Google/search personalization, weaker DevTools fidelity, and may differ from a real user browser.
- Web search/browser fallback: acceptable only when live browser control is unavailable. Mark it as lower-confidence and do not pretend screenshots or personal session evidence exist.

Always disclose the context used and its confidence impact.

## ChefFlow Route Study Mode

For ChefFlow itself:

1. Use `http://localhost:3100` unless an explicitly approved alternate exists.
2. Inspect port `3100` before starting a server. Reuse the canonical app server if already serving this checkout.
3. Identify the target route, auth/session role, data assumptions, and intended user workflow.
4. Capture route load, key states, interactions, empty/error/loading states, and responsive views when relevant.
5. Check console/runtime/network/server logs for the changed or inspected surface.
6. Evaluate whether the page lets the target user complete the implied job.
7. Produce research/spec/queue candidates unless the user explicitly authorized implementation.
8. Do not move queue items or call work done unless the repo finish-gate rules are satisfied.

## Research Markdown Mode

Use when the user asks to intensely study, research, mark down, document, learn from, or productize the observed experience.

The Markdown should be readable as a standalone research artifact:

- Executive takeaway.
- Research question and method.
- Evidence inventory with screenshot references.
- User need model.
- Step-by-step walkthrough.
- Findings grouped by theme.
- Evaluation scores.
- Product lessons.
- ChefFlow implications.
- Build/spec candidates.
- What not to conclude.
- Open questions and next research runs.

Prefer concise evidence-backed claims over broad speculation. Label hypotheses as hypotheses.

## Redaction Protocol

- Redact before sharing screenshots or quoting screen content.
- Never quote account identifiers, addresses, phone numbers, emails, order IDs, tokens, payment details, private names, or hidden profile data.
- Summarize personalized signals as categories, such as "recent-location personalization appears present."
- Keep raw screenshots local unless the user authorizes attaching or sharing them.
- If redaction cannot be done safely, omit the screenshot from the final answer and describe the relevant non-private UI facts.

## Failure Handling

- Browser tooling unavailable: say so, then use web search or user-provided screenshots only if that still answers the task; mark confidence lower.
- Logged-out or session expired: do not request credentials; report that the logged-in observation is blocked.
- CAPTCHA, bot wall, paywall, geofence, or rate limit: stop at the barrier and document it.
- Location denied: record whether the site asked, what fallback it used, and whether typed-location testing is allowed.
- Results changed after reload: capture both states and mark variability.
- Screenshot failure: record URLs, visible text summaries, and lower confidence.
- Final action needed but not authorized: stop at the last reversible/non-final step and ask for exact permission.
- ChefFlow server unavailable: inspect canonical port, attempt approved canonical startup if appropriate, and report server/log blockers.

## Comparison Discipline

Use comparisons when they matter to the user need or when results are likely personalized:

- Logged-in vs logged-out/incognito only if authorized and technically available.
- Desktop vs mobile for consumer/search/local flows.
- Current location vs typed location for local discovery.
- First load vs after scroll/filter/map interaction.
- Ads/sponsored vs organic vs map/local pack.
- ChefFlow expected route/workflow vs what the live app actually shows.
- Competitor or alternative site only when the user asked for product learning or comparison.

Do not run comparisons that require extra private context or materially widen the task without permission.

## Scoring Rubric

Use 1-5 scores with one-sentence evidence for each relevant dimension:

- Relevance: how well results match the user's task.
- Personalization: how clearly session/location/history shape the output.
- Trust: ratings, proof, transparency, source clarity, and safety cues.
- Friction: steps, interruptions, ambiguity, latency, consent prompts, dead ends.
- Actionability: whether the page gives the next action the user naturally needs.
- Local/context fit: distance, open status, map clarity, availability, delivery/reservation fit.
- Conversion pressure: ads, urgency, ranking bias, promos, dark patterns, or pushy CTAs.
- Missing affordances: filters, compare, save, share, refine, undo, recover, contact, route.
- ChefFlow opportunity: what ChefFlow should copy, avoid, or build.
- Evidence confidence: whether screenshots, logs, repetition, and browser context support the claim.

## Live Experience Learning Pack

The report should answer:

- What did the user probably need?
- What did the live product actually do?
- What evidence supports that?
- Where did the experience fit or miss the need?
- What reusable product lesson came out of it?
- What should ChefFlow copy, avoid, queue, or investigate?
- What remains unknown?

## Google "food near me" Example

For "describe what happens on Google when you search food near me using my actually logged in Google account":

- Treat the user as authorizing logged-in Google context for this search only.
- Prefer real Chrome/Edge profile if available and authorized; otherwise state the lower-confidence browser context.
- Do not open private Google account pages or expose email/profile details.
- Infer the default goal as a real, personalized, local-discovery explanation.
- Ask first if the intended lens could materially differ: ChefFlow competitive learning, buyer-behavior analysis, local SEO diagnosis, restaurant choice, or mobile-specific behavior.
- Capture Google home/search box/autocomplete if visible, initial SERP, local/map pack, sponsored results, filters/chips, organic results, map expansion if non-final, and one scroll depth.
- Note current-location use, permission prompts, cuisine chips, ratings, distance, open-now status, delivery/reservation/order CTAs, ads, map interactions, personalization signals, and ranking/visibility.
- Avoid call/order/reserve/review/message actions unless separately authorized.
- Include "what not to conclude": results may vary by location, time, account history, ads auction, A/B test, language, device, and prior searches.
