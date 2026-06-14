# Live Experience Research Pack

## Executive Takeaway

The client portal nav only shows `Cannabis Portal` when `app/(client)/layout.tsx` passes `cannabisAccess={true}` into the client nav. That boolean is currently set from `getClientCannabisAccessStatus(user.id).hasTierAccess`, so an active `cannabis_tier_users` row is enough to make the nav link visible. The actual `/my-cannabis` page still requires age permission before showing portal content.

Live check against the canonical app at `http://localhost:3100` used the existing test client auth state. That session loaded `/my-events` successfully but did not show any `/my-cannabis` or `Cannabis Portal` nav link, so the current test client does not appear to have cannabis tier access.

## Setup

- Task: Show how the cannabis portal appears in the nav when accessible.
- Site/app/route: ChefFlow client portal, `/my-events`, canonical URL `http://localhost:3100`
- Date/time: 2026-05-26T20:35:56.692Z
- Browser context used: Local Playwright Chromium via repo auth state, because the MCP browser profile was locked.
- Confidence impact of browser context: High for the checked test-client session; code inspection is the source of truth for the gated behavior.
- Session/auth state: Existing `.auth/client.json` test session.
- Viewport/device: Desktop 1440x1000, mobile 390x844.
- Location sensitivity:
- Permissions used: Read-only page loads and screenshots.
- Action boundary: No form submission, no data mutation.
- Run mode: chefflow
- Evidence folder: .evidence\live-browser\2026-05-26-20-35-56-cannabis-nav-access

## User Need Learned

- User goal: Understand when and where the cannabis portal appears in navigation.
- Audience/persona: ChefFlow builder/operator.
- Evaluation lens: Existing implementation and visible nav evidence.
- Success criteria: Identify the nav label, route, access condition, and current live-session result.
- Output expected: Descriptive with code references and screenshot evidence.
- Assumptions: The request refers to the client `Cannabis Portal` link, not the chef-side `Cannabis Compliance` entry.
- Questions asked: .evidence\live-browser\2026-05-26-20-35-56-cannabis-nav-access\questions.md
- Clarifying answers:

## Method

- Steps planned: Inspect nav/access code, load client portal with test auth state, capture desktop and mobile nav evidence.
- Comparisons planned:
- Stopping point:
- Redaction approach:

## Step-by-Step Observations

| Step | Action                                     | Screenshot                                        | Visible result                                                                                                                                                 | User-need learning                                              |
| ---- | ------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Open `/my-events` with `.auth/client.json` | `screenshots/01-client-sidebar-nav-links.png`     | Client sidebar showed Book Now, Find a Chef, Bookings, Messages, Friends & Groups, Activity, Profile, Payments, Tax Summary, Rewards. No Cannabis Portal link. | Current test client does not have visible cannabis nav access.  |
| 2    | Open mobile menu with same session         | `screenshots/02-client-mobile-menu-nav-links.png` | Mobile menu did not include Cannabis Portal.                                                                                                                   | Mobile drawer follows the same access-driven resolved nav list. |

## What Happened

The live test-client session returned HTTP 200 for `/my-events` and rendered the client navigation. Programmatic link extraction found no link with `href="/my-cannabis"` and no text/title containing `Cannabis Portal` on desktop or mobile.

Code inspection shows the missing link is expected unless the access status has an active tier row:

- `app/(client)/layout.tsx`: calls `getClientCannabisAccessStatus(user.id)` and passes `status.hasTierAccess` as `cannabisAccess`.
- `components/navigation/client-nav.tsx`: appends `{ href: '/my-cannabis', label: 'Cannabis Portal', icon: Flower }` only when `cannabisAccess` is truthy.
- `app/(client)/my-cannabis/layout.tsx`: redirects users without tier access back to `/my-events`.
- `app/(client)/my-cannabis/page.tsx`: redirects tiered users without age permission to `/my-cannabis/age-required`.

## Findings

### User Need Fit

The implementation is understandable: users with active cannabis tier access get an explicit nav entry. Users without the tier do not see the entry.

### Trust And Proof

The route is protected separately from nav visibility. The nav link is not treated as the security boundary.

### Friction And Failure Points

There is a nuance: the nav appears with tier access, but full portal content requires age permission. That means a tiered client may see the nav link and land on age verification before reaching the dashboard.

### Actionability

To make the link appear for a client, the user needs an active `cannabis_tier_users` row for their auth user. To reach portal content, they also need approved, manually verified, or self-attested age permission that is not expired.

### Personalization Or Context Signals

### Missing Affordances

## Evaluation Scores

| Dimension            | Score | Evidence                                                                        |
| -------------------- | ----- | ------------------------------------------------------------------------------- |
| Relevance            | 4     | Directly traces the requested nav behavior.                                     |
| Personalization      | 3     | Verified against the existing test-client auth state only.                      |
| Trust                | 4     | Route guards exist beyond nav visibility.                                       |
| Friction             | 3     | Tier access and age permission are split, which can be surprising.              |
| Actionability        | 4     | The required records and code locations are clear.                              |
| Local/context fit    | 4     | Used canonical `http://localhost:3100`.                                         |
| Conversion pressure  | N/A   | Not a marketing/conversion flow.                                                |
| Missing affordances  | 2     | No visible Cannabis Portal in current test-client nav because access is absent. |
| ChefFlow opportunity | 3     | Could clarify the tier-vs-age state in admin/test fixtures if needed.           |
| Evidence confidence  | 4     | Live screenshot plus code trace; no accessible test user found in this run.     |

## Product Lessons

- What to copy:
- What to avoid:
- What to adapt:
- What to investigate next:

## ChefFlow Implications

- Relevant surface: Client portal nav and `/my-cannabis`.
- Build/spec candidate: None unless the desired behavior is to hide the link until `canAccessPortal` instead of `hasTierAccess`.
- Queue candidate: Not queued; this was read-only inspection.
- Acceptance signal: With tier access, nav contains `Cannabis Portal` linking to `/my-cannabis`; without tier access, it does not.
- Risks/dependencies: Admin tier grants and age permissions control downstream behavior.
- Verification idea: Add or use a seeded tiered client, then assert `a[href="/my-cannabis"]` is visible in desktop sidebar and mobile drawer.

## Evidence Pack

- Screenshots: .evidence\live-browser\2026-05-26-20-35-56-cannabis-nav-access\screenshots
- Notes: .evidence\live-browser\2026-05-26-20-35-56-cannabis-nav-access\notes.md
- URLs: `http://localhost:3100/my-events`
- Console/network/server findings: No page errors. Several 401 console resource messages were observed, but the route rendered and nav extraction succeeded.
- Redactions: .evidence\live-browser\2026-05-26-20-35-56-cannabis-nav-access\redactions.md

## Limitations

- Browser-context limits: Playwright MCP browser was locked; local Playwright Chromium was used instead.
- Personalization/session limits: The existing test-client session did not have cannabis tier nav access.
- Location/time limits:
- A/B test/ads variability:
- Tooling limits:

## What Not To Conclude

- Do not generalize: This screenshot only proves the current test-client state lacks the link.
- Do not infer: It does not prove no users have access.
- Needs another run: Use a known tiered client or grant tier access in a safe seeded environment to capture the positive state.

## Open Questions

1.
2.
3.

## Recommended Next Run

- Suggested mode:
- Suggested browser context:
- Suggested comparison:
