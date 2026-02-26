# Mission Control — Home Panel & Quick Actions Upgrade

**Date:** 2026-02-26
**Branch:** `feature/risk-gap-closure`

## What Changed

Mission Control now opens to a **Home** panel with every common task available as a single button click. No coding knowledge required — all buttons have plain-English labels and descriptions.

## New Home Panel (default landing page)

### One-Click Pipelines

| Button                | What it does                                                         | Maps to                                                  |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| **Ship It**           | Save changes + back up to GitHub + deploy to beta — all in one click | `git add -A && git commit && git push && deploy-beta.sh` |
| **Close Out Feature** | Check for errors + build app + save changes + back up to GitHub      | `tsc --noEmit && next build && git commit && git push`   |

### Common Tasks

| Button                | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| **Save Changes**      | Stage and commit all modified files (prompts for description) |
| **Back Up to GitHub** | Push current branch to GitHub ($0, safe)                      |
| **Deploy to Beta**    | Build and push to beta.cheflowhq.com (8-10 min)               |
| **Check for Errors**  | Run TypeScript type check (fast, few seconds)                 |

### Maintenance

| Button                   | What it does                                         |
| ------------------------ | ---------------------------------------------------- |
| **Clear Build Cache**    | Delete .next/ folder — fixes most weird build errors |
| **Install Dependencies** | Run `npm install` to update packages                 |
| **Update DB Types**      | Regenerate `types/database.ts` from Supabase         |
| **Backup Database**      | Export database to a local SQL file                  |

### Quick Links (Open in Browser)

Dev App, Dashboard, Events, Clients, Recipes, Settings, Beta Site, Production, Vercel, Supabase, GitHub

### Prompt Queue

Shows pending prompts from `prompts/queue/` that Copilot wrote for Claude Code to pick up.

## New API Endpoints (server.mjs)

| Endpoint             | Method | Function                                                       |
| -------------------- | ------ | -------------------------------------------------------------- |
| `/api/ship-it`       | POST   | Full Ship It pipeline (commit + push + deploy)                 |
| `/api/close-out`     | POST   | Feature close-out pipeline (typecheck + build + commit + push) |
| `/api/cache/clear`   | POST   | Clear .next/ build cache                                       |
| `/api/npm/install`   | POST   | Run npm install                                                |
| `/api/db/gen-types`  | POST   | Regenerate types/database.ts from Supabase                     |
| `/api/prompts/queue` | GET    | List pending prompts from queue                                |

## UX Improvements

- **Loading states**: Mega buttons show animated progress bar while running, green flash on success
- **Better labels**: All buttons renamed for non-coders (e.g., "Push Branch" → "Back Up to GitHub")
- **Tooltips**: Every button has a `title` attribute explaining what it does in plain English
- **Home as default**: Dashboard opens to Home panel instead of Dev panel
- **Keyboard shortcuts**: Updated to 1-9 (was 1-8), Home is key `1`
- **"Started By" label**: Changed from "Managed" to "Started By" (clearer)

## Gustav Chat Tools (also added)

Gustav can now use these via chat commands:

- `ship-it:commit message` — run the Ship It pipeline
- `close-out:commit message` — run the Close-Out pipeline
- `cache/clear` — clear build cache
- `npm/install` — install dependencies
- `db/gen-types` — regenerate types
- `prompts/queue` — check the prompt queue

## Files Modified

- `scripts/launcher/server.mjs` — 6 new functions + 6 new API routes + 6 new chat tools
- `scripts/launcher/index.html` — New Home panel, CSS, JavaScript for mega buttons
