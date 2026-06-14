# Live Experience Research Pack

## Executive Takeaway

Tables is now in the intended bottom sidebar zone. In the expanded desktop sidebar it renders above the account chip, and in the collapsed rail it is pinned above the account chip instead of being buried in the scrollable nav. Circles is visible in the main portal nav.

## Setup

- Task: Verify Tables/Circles navigation placement after hotfix.
- Site/app/route: `http://localhost:3100/dashboard`
- Date/time: 2026-05-26T20:30:27.344Z
- Browser context used: Playwright Chromium, authenticated via local `/api/e2e/auth`.
- Session/auth state: local agent chef session.
- Viewport/device: desktop expanded 1440x1000, desktop collapsed 1440x1000, mobile 390x844.
- Action boundary: read-only route load and screenshots.
- Run mode: chefflow
- Evidence folder: `.evidence/live-browser/2026-05-26-20-30-27-tables-sidebar-nav`

## User Need Learned

- User goal: Tables should be the bottom sidebar entry to the social zone; Circles should remain a portal/work navigation item.
- Evaluation lens: visible placement, no overlap, no offscreen rail button, protected dashboard actually loaded.
- Success criteria: Tables visible in viewport, above account chip on desktop, and Circles visible in main nav.

## Step-by-Step Observations

| Step | Action                               | Screenshot                                    | Visible result                                                                       |
| ---- | ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1    | Load dashboard with expanded sidebar | `screenshots/desktop-expanded-dashboard.png`  | Tables at `y=876`, account chip at `y=946`; no overlap. Circles visible in main nav. |
| 2    | Load dashboard with collapsed rail   | `screenshots/desktop-collapsed-dashboard.png` | Tables icon at `y=902`, account chip at `y=954`; no overlap and no offscreen burial. |
| 3    | Load dashboard on mobile viewport    | `screenshots/mobile-dashboard.png`            | Tables visible in compact mobile tab row.                                            |

## Findings

- Expanded desktop: `hasTablesInViewport=true`, `hasCirclesInViewport=true`, `tablesAboveSettings=true`, `tablesOverlapsSettings=false`.
- Collapsed desktop: `hasTablesInViewport=true`, `hasCirclesInViewport=true`, `tablesAboveSettings=true`, `tablesOverlapsSettings=false`.
- Mobile: `hasTablesInViewport=true`.
- Browser page errors: 0.
- Console noise: two existing 401 resource responses on dashboard load; not tied to the nav placement change.

## Evidence Pack

- Placement JSON: `.evidence/live-browser/2026-05-26-20-30-27-tables-sidebar-nav/placement-check.json`
- Screenshots: `.evidence/live-browser/2026-05-26-20-30-27-tables-sidebar-nav/screenshots`

## Limitations

- This pass used the local e2e agent chef account. It proves the authenticated ChefFlow shell in the current checkout, not every production role/persona.
