---
name: show-me
description: Open and inspect the live ChefFlow website when David says "show me", "show me the site", "show me what is built", "open the website", "third monitor", "surveillance monitor", or asks to see the current app. Use browser or Playwright evidence first, screenshots, visible UI state, and monitor placement proof when placement is requested, without changing code, starting servers, running builds, deploying, or mutating data unless explicitly approved.
---

# Show Me

Treat "show me" as a visual proof request. The first action is always to open the actual ChefFlow website. Do not answer with instructions, summaries, code references, or trigger phrases before opening the website.

Healed 2026-04-30: David clarified that "show me" must always open the website, not merely route to a proof workflow.

Healed 2026-04-30: David clarified that "third monitor" means a visible signed-in browser window placed on the detected non-primary monitor, with window-coordinate proof. Do not treat a launched process, hidden browser, headless screenshot, or unauthenticated redirect as success.

## Procedure

1. Determine the target URL:
   - Use a URL named by the user first.
   - Otherwise prefer an already reachable ChefFlow environment: `http://localhost:3100`, then `https://beta.cheflowhq.com`, then `https://app.cheflowhq.com`.
   - Check reachability read-only. Do not start, restart, kill, build, deploy, or warm a server unless David explicitly asks.
2. Open the site in a browser or Playwright session immediately.
   - If browser tools are not already available in the session, use tool discovery for Playwright or browser tools first.
   - If `localhost:3100` is unreachable, try the next configured ChefFlow URL instead of stopping at explanation.
   - Only stop before opening a page when every configured ChefFlow URL fails or a required approval would be crossed.
   - If the user asks for the third monitor, detect monitor bounds first, place the window on that monitor, then verify the OS window handle reports coordinates inside that monitor.
   - When a saved local auth state exists, open a signed-in browser from that state before reporting success. Prefer Codex-owned state in this order: `.auth/codex-storage.json`, `.auth/codex.state.json`, then `.auth/codex.json` when it is a Playwright storage state. If no Codex-owned state exists, report that exact blocker instead of silently borrowing chef, admin, developer, or generic agent state.
   - If Codex credentials exist at `.auth/codex.json` but no storage state exists, mint `.auth/codex-storage.json` through the repo auth helper before visual proof. If the app or `/api/e2e/auth` is not responding, report that as the sign-in blocker.
3. Capture visible evidence:
   - Screenshot of the first relevant viewport.
   - Current URL, environment, and auth state if visible.
   - Window title, process id, and OS coordinates when the user requested monitor placement.
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
- Do not say a window is open on the third monitor unless OS window bounds prove it.
- Do not say a route is signed in when the URL or screenshot is a sign-in redirect.
- Do not hide broken states. A blank page, error overlay, failed auth, or dead button is the thing to show.
- If a login is needed, use the dedicated Codex login only. If `.auth/codex.json` or `.auth/codex-storage.json` is missing or stale, ask David before using another identity.

## Output

Lead with the visual result and concrete evidence. Keep the answer short:

- `Opened: <url>`
- `What is visible: <actual UI>`
- `Evidence: <screenshot path or browser observation>`
- `Blocked: <only if browser access failed>`
