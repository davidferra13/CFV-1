---
name: show-me
description: Open and inspect the live ChefFlow website when David says "show me", "show me the site", "show me what is built", "open the website", or asks to see the current app. Use browser or Playwright evidence first, screenshots and visible UI state, without changing code, starting servers, running builds, deploying, or mutating data unless explicitly approved.
---

# Show Me

Treat "show me" as a visual proof request. The first action is always to open the actual ChefFlow website. Do not answer with instructions, summaries, code references, or trigger phrases before opening the website.

Healed 2026-04-30: David clarified that "show me" must always open the website, not merely route to a proof workflow.

## Procedure

1. Determine the target URL:
   - Use a URL named by the user first.
   - Otherwise prefer an already reachable ChefFlow environment: `http://localhost:3100`, then `https://beta.cheflowhq.com`, then `https://app.cheflowhq.com`.
   - Check reachability read-only. Do not start, restart, kill, build, deploy, or warm a server unless David explicitly asks.
2. Open the site in a browser or Playwright session immediately.
   - If browser tools are not already available in the session, use tool discovery for Playwright or browser tools first.
   - If `localhost:3100` is unreachable, try the next configured ChefFlow URL instead of stopping at explanation.
   - Only stop before opening a page when every configured ChefFlow URL fails or a required approval would be crossed.
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
- Do not answer "how to trigger it" or explain the workflow when David says "show me"; open the website.
- Do not infer built functionality from source code alone when browser evidence is possible.
- Do not hide broken states. A blank page, error overlay, failed auth, or dead button is the thing to show.
- If a login is needed, use an existing saved browser/session when available. If credentials or test auth setup are needed, ask David.

## Output

Lead with the visual result and concrete evidence. Keep the answer short:

- `Opened: <url>`
- `What is visible: <actual UI>`
- `Evidence: <screenshot path or browser observation>`
- `Blocked: <only if browser access failed>`
