# Live Experience Research Pack

## Executive Takeaway

Chef and client portal access was proven in the live local app. The browser is left with two tabs open: agent chef dashboard on `127.0.0.2:3100` and client My Events on `127.0.0.3:3100`.

## Setup

- Task: Sign in with the agent chef and open the chef portal, then do the same for the client.
- Site/app/route: ChefFlow local dev app on port `3100`.
- Date/time: 2026-05-27T02:27:55.240Z
- Browser context used: Playwright MCP controlled browser, desktop viewport.
- Confidence impact of browser context: High for local route/auth proof in this browser session.
- Session/auth state: Signed into two loopback hostnames to isolate cookies by portal role.
- Viewport/device: Desktop browser.
- Location sensitivity: None.
- Permissions used: Local app access only.
- Action boundary: Login and open portals only; no data-changing portal actions.
- Run mode: chefflow
- Evidence folder: `.evidence/live-browser/2026-05-27-02-27-55-agent-chef-client-portals`

## User Need Learned

- User goal: Quickly reach both ChefFlow portals under test accounts.
- Success criteria: Both role-specific portals visibly load.
- Assumptions: "Client" means the repo's available demo client account because no separate agent-client account was found.
- Questions asked: None; ambiguity was low-risk and recoverable.

## Step-by-Step Observations

| Step | Action                                             | Screenshot                                     | Visible result                                                         | User-need learning                                       |
| ---- | -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | Checked `localhost:3100`.                          | n/a                                            | `localhost` reached the unrelated Wix rebuild, not ChefFlow.           | Do not stop Wix; use another loopback host for ChefFlow. |
| 2    | Restarted ChefFlow dev runtime.                    | n/a                                            | ChefFlow served from `0.0.0.0:3100`; Wix remained on `127.0.0.1:3100`. | Same port can be used with host aliases.                 |
| 3    | Signed in as local agent chef.                     | `screenshots/chef-portal-agent-dashboard.png`  | Dashboard loaded as Agent Test Kitchen.                                | Chef portal access works.                                |
| 4    | Signed in as demo client on another loopback host. | `screenshots/client-portal-demo-my-events.png` | My Events loaded for the demo client account.                          | Client portal access works independently.                |

## What Happened

- `http://localhost:3100` currently resolves to the Wix rebuild process on `127.0.0.1:3100`.
- ChefFlow is running on the same port via `0.0.0.0:3100`.
- I used `http://127.0.0.2:3100` for the chef session and `http://127.0.0.3:3100` for the client session so each role has separate cookies.
- Final tab 0: `http://127.0.0.2:3100/dashboard`.
- Final tab 1: `http://127.0.0.3:3100/my-events`.

## Evidence Pack

- Screenshots: `.evidence/live-browser/2026-05-27-02-27-55-agent-chef-client-portals/screenshots`
- Notes: `.evidence/live-browser/2026-05-27-02-27-55-agent-chef-client-portals/notes.md`
- Redactions: `.evidence/live-browser/2026-05-27-02-27-55-agent-chef-client-portals/redactions.md`

## Limitations

- This proves local dev access, not production access.
- The default `localhost:3100` URL is not usable for ChefFlow while the Wix rebuild listener owns `127.0.0.1:3100`.
- The repo's `agent:setup` and `demo:setup` scripts failed against the current code/schema, so existing local test accounts were used.

## What Not To Conclude

- Do not infer that the setup scripts are healthy.
- Do not infer that both sessions are isolated on the same hostname; isolation was achieved through loopback host aliases.
