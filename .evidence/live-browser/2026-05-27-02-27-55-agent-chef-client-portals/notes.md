# Live Browser Notes

## Intent Model

- User goal: Sign into ChefFlow as the agent chef, open the chef portal, then open the client portal.
- Audience/persona: Local ChefFlow operator/developer checking portal access.
- Evaluation lens: Access proof only; no workflow mutation.
- Success criteria: Chef dashboard and client My Events portal are both visibly open in the browser.
- Output expected: Short completion note with exact URLs.
- Run mode: chefflow
- Browser context: Playwright MCP controlled browser, desktop viewport.

## Browser Context Decision

- Candidate contexts: Playwright MCP browser; existing local browser session.
- Selected context: Playwright MCP browser.
- Reason: Repeatable local app access with screenshots and tab state.
- Confidence impact: High for route/auth proof in this browser session. Not a production auth assertion.

## Timeline

| Time   | Step | URL                                                   | Action                                             | Observation                                                                                    | Screenshot                                   |
| ------ | ---- | ----------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 02:28Z | 1    | http://localhost:3100/auth/signin?redirect=/dashboard | Opened default canonical host.                     | Hit the unrelated Wix rebuild listener on 127.0.0.1:3100 and saw the DF Private Chef fallback. | n/a                                          |
| 02:29Z | 2    | n/a                                                   | Restarted ChefFlow dev runtime.                    | ChefFlow listener bound to 0.0.0.0:3100; Wix listener still occupied 127.0.0.1:3100.           | n/a                                          |
| 02:31Z | 3    | http://127.0.0.2:3100/auth/signin?redirect=/dashboard | Opened ChefFlow auth using loopback alias.         | ChefFlow sign-in page loaded.                                                                  | n/a                                          |
| 02:33Z | 4    | http://127.0.0.2:3100/dashboard                       | Signed in as local agent chef.                     | Chef dashboard loaded as Agent Test Kitchen.                                                   | screenshots/chef-portal-agent-dashboard.png  |
| 02:34Z | 5    | http://127.0.0.3:3100/auth/signin?redirect=/my-events | Opened isolated loopback alias for client cookies. | Chef session stayed isolated on 127.0.0.2.                                                     | n/a                                          |
| 02:35Z | 6    | http://127.0.0.3:3100/my-events                       | Signed in as demo client.                          | Client My Events portal loaded for demo-client@chefflow.test.                                  | screenshots/client-portal-demo-my-events.png |

## Raw Non-Private Observations

- Final browser tabs left open:
- Tab 0: Dashboard | ChefFlow at http://127.0.0.2:3100/dashboard.
- Tab 1: My Events | ChefFlow at http://127.0.0.3:3100/my-events.
- Existing unrelated Wix rebuild owns 127.0.0.1:3100, so localhost requests do not reach ChefFlow in this session.
- ChefFlow remained on port 3100; only the loopback host alias changed.
