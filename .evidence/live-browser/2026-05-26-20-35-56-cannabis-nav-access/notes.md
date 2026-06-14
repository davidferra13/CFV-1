# Live Browser Notes

## Intent Model

- User goal: Understand how the Cannabis Portal nav item appears when accessible.
- Audience/persona: ChefFlow builder/operator.
- Evaluation lens: Visible client nav plus source-code access gates.
- Success criteria: Identify visible label/route and the access condition.
- Output expected: Concise descriptive answer with proof paths.
- Run mode: chefflow
- Browser context: Local Playwright Chromium using `.auth/client.json`.

## Browser Context Decision

- Candidate contexts: Playwright MCP, local Playwright Chromium, code-only inspection.
- Selected context: Local Playwright Chromium because the MCP browser profile was locked.
- Reason: Needed repeatable screenshots without personal browser cookies.
- Confidence impact: High for the current test-client state; source code provides the general behavior.

## Timeline

| Time                | Step | URL                               | Action                                               | Observation                                                         | Screenshot                                        |
| ------------------- | ---- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 2026-05-26 16:39 ET | 1    | `http://localhost:3100/my-events` | Loaded with `.auth/client.json` at desktop viewport. | Route returned 200; sidebar rendered; no `/my-cannabis` link found. | `screenshots/01-client-sidebar-nav-links.png`     |
| 2026-05-26 16:40 ET | 2    | `http://localhost:3100/my-events` | Loaded mobile viewport and opened menu.              | Mobile menu rendered; no `/my-cannabis` link found.                 | `screenshots/02-client-mobile-menu-nav-links.png` |

## Raw Non-Private Observations

- Desktop extracted cannabis links: `[]`.
- Mobile extracted cannabis links: `[]`.
- No page errors.
- Several 401 console resource messages appeared, but the page and nav still rendered.
- Code path: `app/(client)/layout.tsx` passes `status.hasTierAccess` as `cannabisAccess`; `components/navigation/client-nav.tsx` appends the `Cannabis Portal` link only when that prop is truthy.
