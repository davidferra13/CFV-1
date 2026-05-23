# Live Experience Research Pack

## Executive Takeaway

Authenticated `/dashboard` runtime verification succeeded functionally but did not prove the expected chef-layout chunk reduction.

The page returned `200`, rendered the chef sidebar, produced no browser console/page errors, and the command palette launcher opened from `Ctrl+K` in the second focused run. However, `.next-dev/static/chunks/app/(chef)/layout.js` remained `14.26 MB` after authenticated navigation, and bundle inspection shows the layout chunk still includes `chef-nav`, `chef-mobile-nav`, `components/search/global-search.tsx`, `lib/search/universal-search.ts`, and `lib/navigation/url-capability-registry.ts`.

This means the runtime proof supports "no obvious functional regression" but does not support the inherited expected chunk-size improvement in dev. The likely next engineering target is the remaining client-entry dependency graph, especially `GlobalSearch`, URL capability rail/palette imports, and whether Next dev eagerly includes SSR dynamic client components.

## Setup

- Task:
- Site/app/route: ChefFlow `/dashboard`
- Date/time: 2026-05-20T18:37:31.039Z
- Browser context used: Playwright Chromium with `.auth/chef.json`
- Confidence impact of browser context: Good for local authenticated runtime behavior and chunk requests; dev chunk sizes are not production bundle proof.
- Session/auth state: Authenticated chef test session. Private details not reproduced here.
- Viewport/device: Desktop, 1440x1000
- Location sensitivity: None
- Permissions used: Stored local test auth only
- Action boundary: Read-only route visit and keyboard shortcut
- Run mode: chefflow
- Evidence folder: .evidence\live-browser\2026-05-20-18-37-31-perf-runtime-dashboard-verification

## User Need Learned

- User goal:
- User goal: Verify inherited performance-remediation changes against the running app.
- Audience/persona: ChefFlow developer/operator
- Evaluation lens: Runtime render safety, console/network health, and dev chunk-size evidence
- Success criteria: `/dashboard` renders authenticated, sidebar remains visible, command palette still opens, no runtime errors, chunk sizes decrease or the blocker is identified.
- Output expected: descriptive verification with build-ready next target
- Assumptions: Stored `.auth/chef.json` is valid for local QA; no app code edits authorized.
- Questions asked: .evidence\live-browser\2026-05-20-18-37-31-perf-runtime-dashboard-verification\questions.md
- Clarifying answers:

## Method

- Steps planned:
- Visit authenticated `/dashboard`.
- Capture screenshot and console/network/runtime errors.
- Press `Ctrl+K` and verify command palette behavior.
- Recheck `.next-dev/static/chunks` and inspect chunk contents.
- Comparisons planned:
- Stopping point:
- Redaction approach:

## Step-by-Step Observations

| Step | Action                                                                                   | Screenshot                                          | Visible result                                                                  | User-need learning                                   |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1    | Open `/dashboard` with Playwright chef auth                                              | `screenshots/01-dashboard-desktop.png`              | Status `200`; chef sidebar visible; no console/page/request errors              | SSR-visible navigation survived runtime verification |
| 2    | Press `Ctrl+K` after hydration                                                           | `screenshots/02-command-palette-after-hotkey.png`   | First broad selector run did not conclusively find palette                      | Needed a narrower focused run                        |
| 3    | Reopen `/dashboard`, wait, press `Ctrl+K`, then dispatch `open-command-palette` fallback | `screenshots/03-command-palette-explicit-event.png` | `visibleAfterKeyboard: true`; `visibleAfterEvent: true`; no console/page errors | Launcher wiring works in browser                     |

## What Happened

Runtime:

- `/dashboard` returned `200`.
- Final URL was `http://localhost:3100/dashboard`.
- Page title was `Dashboard | ChefFlow`.
- First run `domcontentloaded`: `102701 ms`.
- Second run elapsed time: `80958 ms`.
- Browser console errors: none captured.
- Page errors: none captured.
- Failed requests: none captured.
- Bad HTTP responses: none captured.

Bundle/chunk state after authenticated navigation:

- `.next-dev/static/chunks/app/(chef)/layout.js`: `14.26 MB`
- `.next-dev/static/chunks/app/(chef)/dashboard/page.js`: `7.76 MB`
- `.next-dev/static/chunks/app/(public)/layout.js`: `7.86 MB`
- `_app-pages-browser_components_search_command-palette_tsx.js`: `0.0937 MB`

Important inspection result:

- `app/(chef)/layout.js` still includes `components/search/command-palette-launcher.tsx`.
- It also includes `components/search/global-search.tsx`, which imports `lib/search/universal-search.ts`.
- It includes `lib/navigation/url-capability-registry.ts`, partly because `UrlCapabilityRail` is currently mounted in `app/(chef)/layout.tsx`.
- It includes `chef-nav.tsx` and `chef-mobile-nav.tsx` in the Next client entry list, despite dynamic imports.

## Findings

### User Need Fit

Good for functional confidence; incomplete for the intended performance acceptance.

### Trust And Proof

Proof files:

- `runtime-dashboard-result.json`
- `runtime-command-palette-result.json`
- `screenshots/01-dashboard-desktop.png`
- `screenshots/02-command-palette-after-hotkey.png`
- `screenshots/03-command-palette-explicit-event.png`

### Friction And Failure Points

The local dev server is extremely slow on authenticated dashboard render. The measured values were about 103s and 81s for dashboard loads in Playwright. This is runtime evidence of the remaining server/client graph weight and/or cold dev compilation cost.

### Actionability

Next engineering target: isolate why the chef layout client entry still pulls search and nav-heavy code. The concrete suspects are:

- `components/search/global-search.tsx` still present in layout chunk and importing `universal-search`.
- `components/rail/url-capability-rail.tsx` mounted in chef layout and importing `url-capability-registry`.
- Next dev client-entry behavior for `dynamic()` SSR client components still listing `chef-nav.tsx` and `chef-mobile-nav.tsx`.

### Personalization Or Context Signals

### Missing Affordances

## Evaluation Scores

| Dimension            | Score | Evidence |
| -------------------- | ----- | -------- |
| Relevance            |       |          |
| Personalization      |       |          |
| Trust                |       |          |
| Friction             |       |          |
| Actionability        |       |          |
| Local/context fit    |       |          |
| Conversion pressure  |       |          |
| Missing affordances  |       |          |
| ChefFlow opportunity |       |          |
| Evidence confidence  |       |          |

## Product Lessons

- What to copy: The tiny launcher pattern is functionally viable; it opened the palette from `Ctrl+K`.
- What to avoid: Counting separate chunk files as proof when the parent layout still imports equivalent heavy dependencies.
- What to adapt: Move route capability and search-heavy imports behind the same interaction/deferred boundary if they are not needed at first paint.
- What to investigate next: Production build stats or a clean dev-dist run after isolating `GlobalSearch` and `UrlCapabilityRail`.

## ChefFlow Implications

- Relevant surface: Chef authenticated shell and dashboard.
- Build/spec candidate: Second perf pass to remove remaining search/nav/capability dependencies from the chef layout client entry.
- Queue candidate: Yes, if implementation is not explicitly fired.
- Acceptance signal: Authenticated `/dashboard` loads with sidebar visible, no console/page errors, `layout.js` materially below the old `14.33 MB` baseline, and command palette chunk requested only after `Ctrl+K`.
- Risks/dependencies: Next dev and production bundling may differ; the URL capability rail is unrelated dirty work mixed into the same layout.
- Verification idea: Use a clean dist dir, authenticated Playwright hit, chunk-size script, and source string scan for `universal-search`, `global-search`, and `url-capability-registry`.

## Evidence Pack

- Screenshots: .evidence\live-browser\2026-05-20-18-37-31-perf-runtime-dashboard-verification\screenshots
- Notes: .evidence\live-browser\2026-05-20-18-37-31-perf-runtime-dashboard-verification\notes.md
- URLs: `http://localhost:3100/dashboard`
- Console/network/server findings: Browser console/page/request errors were clean in both Playwright runs.
- Redactions: .evidence\live-browser\2026-05-20-18-37-31-perf-runtime-dashboard-verification\redactions.md

## Limitations

- Browser-context limits:
- Browser-context limits: Playwright Chromium, local dev server, dev chunks only.
- Personalization/session limits: Stored chef test auth, not a real user session.
- Location/time limits: Local machine at run time only.
- A/B test/ads variability: Not applicable.
- Tooling limits: Dev bundling may not match production; current workspace has 70+ unrelated dirty files.

## What Not To Conclude

- Do not generalize:
- Do not generalize: Do not claim production bundle reduction from this run.
- Do not infer: Do not attribute all chunk contents to the six-file perf patch; unrelated layout/search/rail changes are present.
- Needs another run: Clean production or clean dev-dist bundle verification after isolating remaining layout imports.

## Open Questions

1.
2.
3.

## Recommended Next Run

- Suggested mode:
- Suggested browser context:
- Suggested comparison:
