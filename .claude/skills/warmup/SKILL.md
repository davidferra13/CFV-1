---
name: warmup
description: Get a chef account warm and on standby. Use when the user asks for warmup, standby, authenticated chef session readiness, route precompile, Codex login readiness, or browser-ready account setup. Usage - /warmup [account] where account is codex (default), chef-bob, agent, or developer.
---

# Warmup - Get a Chef Account on Standby

Get an account warm and ready for real-time interaction. "Standby" means: server responding, session authenticated, key routes pre-compiled (no cold-start lag), browser open with live session.

## Hard Stop

Do not kill, restart, or start a server unless the developer explicitly asked for warmup behavior that includes server control. If the server is down and permission is unclear, stop and ask for approval.

## Arguments

- `account` (optional): Which `.auth/*.json` file to use. Default: `codex`. Options: `codex`, `chef-bob`, `agent`, `developer`.
- `port` (optional): Which port. Default: `3100`.

Parse from user input. Examples:

- `/warmup` -> codex on 3100
- `/warmup codex` -> Codex-owned login on 3100
- `/warmup agent` -> agent on 3100
- `/warmup developer 3000` -> developer on 3000
- `/warmup chef-bob 3100` -> chef-bob on 3100

## Procedure

Run the warmup script only when server control is explicitly allowed. It can start or manipulate services, so it is not safe as an implicit action.

```bash
bash scripts/warmup.sh <account> <port>
```

The script may:

1. **Server check/control** - verifies port is responding. If not, it may kill stuck processes and start `npm run dev`
2. **Auth** - hits `/api/e2e/auth` with credentials from `.auth/<account>.json`, captures session cookie. For Codex work, use `.auth/codex.json` and write Codex-owned storage state such as `.auth/codex-storage.json`; do not silently reuse chef, admin, developer, or generic agent sessions.
3. **Route warming** - curls 6 key routes with the session cookie so Next.js compiles them ahead of time
4. **Browser launch** - opens Playwright Chromium with injected session cookie, navigates to dashboard
5. **Screenshot** - saves `tmp-warmup/dashboard.png` as proof

## After Warmup

- Read the screenshot at `tmp-warmup/dashboard.png` and show it to the user
- Report which routes compiled successfully
- The browser stays open for the user to interact with in real time
- State file at `tmp-warmup/warmup-state.json` has session token for any follow-up requests

## If Something Fails

- **Server down or port occupied**: Use `host-integrity` read-only checks first. Do not kill or restart without explicit approval.
- **Auth fails 403**: `E2E_ALLOW_TEST_AUTH=true` must be in `.env.local`
- **Auth fails 401**: Account may not exist in DB. For Codex, create or repair the dedicated account with `npx tsx scripts/setup-codex-account.ts` only when account setup is approved.
- **Browser won't launch**: Playwright not installed. Run `npx playwright install chromium`

## Browser-Only Mode

If the server is already warm and you just need a browser with a saved session:

```bash
node scripts/warmup-browser.mjs tmp-warmup/warmup-state.json
```

This skips server check and route warming, just launches the browser with the last saved session token.

## Cleanup

Temp files created: `tmp-warmup/` directory. Not gitignored by default (add to .gitignore if desired). Cleaned up by `/close-session` or manually:

```bash
rm -rf tmp-warmup/
```
