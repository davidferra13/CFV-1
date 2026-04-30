---
name: show-me
description: Open and inspect the live ChefFlow website when David says "show me", "show me the site", "show me what is built", "open the website", or asks to see the current app. Use browser or Playwright evidence first, screenshots and visible UI state, without changing code, starting servers, running builds, deploying, or mutating data unless explicitly approved.
---

# Show Me

Treat "show me" as a visual proof request. The default action is to open the actual ChefFlow website and show exactly what is currently built, not explain from memory and not begin fixing.

## Procedure

1. Determine the target URL:
   - Use a URL named by the user first.
   - Otherwise prefer an already reachable ChefFlow environment: `http://localhost:3100`, then `https://beta.cheflowhq.com`, then `https://app.cheflowhq.com`.
   - Check reachability read-only. Do not start, restart, kill, build, deploy, or warm a server unless David explicitly asks.
2. Open the site in a browser or Playwright session.
3. Capture visible evidence:
   - Screenshot of the first relevant viewport.
   - Current URL, environment, and auth state if visible.
   - Browser console or network errors when the page is broken.
   - Important visible UI surfaces, buttons, empty states, and disabled controls.
4. Report only what the live UI proves:
   - Say what is actually rendered.
   - Say what is missing, broken, disabled, blank, or behind auth.
   - Use screenshots and exact observations before code references.
5. If the site is not reachable, report the exact URLs checked and the observed failure. Ask before starting any server or running warmup.

## Guardrails

- Do not treat "show me" as permission to modify code.
- Do not run `npm run dev`, `next build`, `next start`, deploy scripts, migrations, or data mutations.
- Do not infer built functionality from source code alone when browser evidence is possible.
- Do not hide broken states. A blank page, error overlay, failed auth, or dead button is the thing to show.
- If a login is needed, use an existing saved browser/session when available. If credentials or test auth setup are needed, ask David.

## Output

Lead with the visual result and concrete evidence. Keep the answer short:

- `Opened: <url>`
- `What is visible: <actual UI>`
- `Evidence: <screenshot path or browser observation>`
- `Blocked: <only if browser access failed>`
