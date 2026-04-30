# Spec: Mission Control Passive Dashboard Revamp

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none (Product Blueprint and Project Map already exist)
> **Estimated complexity:** large (1 file rewrite: `scripts/launcher/index.html`, minor server.mjs additions)

## Timeline

| Event         | Date       | Agent/Session                    | Commit |
| ------------- | ---------- | -------------------------------- | ------ |
| Created       | 2026-04-04 | General (infrastructure session) |        |
| Status: ready | 2026-04-04 | General (infrastructure session) |        |

---

## Developer Notes

### Raw Signal

"I haven't touched Mission Control in like two or three months. I never ended up pressing any of the buttons because I was afraid to press them. It became a glorified status symbol place for the website. It's extremely old and has a bunch of extremely old information on it."

"I would literally want it to look like somebody was using Google Calendar and Google Drive completely autonomously in front of me. And I could just see everything happening. But I also don't want things switching around. I would want everything to be stagnant on the screen."

"It should feel like a bunch of people doing work in Slack and literally posting what they're getting done and managing projects. But nothing technically headless. I want to see everything."

"I would want it to be like a calendar where every second of the day was mapped out, and I knew what was going on every second of the day."

"If I had a 24/7 status monitor of ChefFlow, because I'm specifically in development right now, it would be a straight up full feed of everything that has to do with development."

"There should be some sort of loading bar. That's the biggest problem right now, because there's no end goal, there's no loading bar. We don't know what percent of the project is done."

### Developer Intent

- **Core goal:** Transform Mission Control from an action-heavy, button-scary dashboard into a passive, always-on surveillance screen showing project state in real time.
- **Key constraints:** No scary action buttons on the main view. Everything stagnant (no screen-jumping). TV-friendly (4th monitor, viewed from across the room). Must show progress toward V1 finish line.
- **Motivation:** Developer has ADHD qualities and needs visual structure to understand the project. Can't see the project's state without an explicit display. Current MC is unused because it's overwhelming.
- **Success from the developer's perspective:** Open Mission Control on the TV, glance at it from bed or desk, and immediately know: how far V1 is, what just got done, what's actively happening, what's next. No clicking required.

---

## What This Does (Plain English)

Replaces the current 18-panel button-heavy Mission Control with a single-screen passive dashboard optimized for a TV monitor. The screen is divided into fixed zones that never rearrange. It shows: V1 progress bar (from Product Blueprint), recent completions, active work, the queue, live development activity feed, system health status, and OpenClaw status. Everything auto-updates via SSE. No user interaction needed. The existing action panels (Git, Build, Deploy, etc.) move to a secondary "Actions" tab that's hidden by default.

---

## Why It Matters

The developer has zero visibility into the project's state without digging through files. Mission Control was built to solve this but became too complex and scary. A passive dashboard that reads from the Product Blueprint and Project Map gives the developer the "loading bar" and "Google Drive being managed by a team" feeling they described.

---

## Files to Create

| File | Purpose                                            |
| ---- | -------------------------------------------------- |
| None | This is a rewrite of existing files, not new files |

---

## Files to Modify

| File                          | What to Change                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `scripts/launcher/index.html` | Full frontend rewrite. Replace 18-panel layout with single-screen passive dashboard + hidden Actions tab     |
| `scripts/launcher/server.mjs` | Add 3 new API endpoints: `/api/blueprint/progress`, `/api/project-map/status`, `/api/session-digests/recent` |

---

## Database Changes

None.

---

## UI / Component Spec

### Screen Layout (Single View, No Scrolling, TV-Optimized)

The entire dashboard fits on one screen. No scrolling. Large text readable from 8-10 feet away. Dark background. Fixed grid that never rearranges.

```
+------------------------------------------------------------------+
|  CHEFFLOW MISSION CONTROL           [Health Dots]    [Clock/Date] |
+------------------------------------------------------------------+
|                                                                    |
|  V1 PROGRESS  [================================-------]  68%      |
|  Features 91%  Security 80%  Polish 70%  Valid 10%  Launch 20%   |
|                                                                    |
+----------------------------+-------------------------------------+
|                            |                                       |
|  RECENTLY COMPLETED        |  ACTIVITY FEED                       |
|                            |                                       |
|  [x] Settings branding     |  14:32 - Builder: modified            |
|  [x] Security wave 2       |    chef-profile-form.tsx              |
|  [x] Product Blueprint     |  14:28 - tsc passed (0 errors)       |
|  [x] Project Map created   |  14:15 - Git: pushed to main         |
|  [x] Session digests       |  14:02 - Builder: started settings   |
|                            |    branding task                      |
|  (last 10 items)           |  13:45 - Research: completed         |
|                            |    competitive analysis               |
|                            |                                       |
+----------------------------+-------------------------------------+
|                            |                                       |
|  ACTIVE NOW                |  SYSTEM STATUS                       |
|                            |                                       |
|  > MC Passive Dashboard    |  Dev (3100)    [green]               |
|    spec being written      |  Prod (3000)   [green]               |
|                            |  Database      [green]               |
|  NEXT UP                   |  Ollama        [green]               |
|                            |  OpenClaw (Pi) [green]  CPU 2%      |
|  1. Fix Remy parsing       |  Build         [green]               |
|  2. SSE authentication     |  Git           clean, main           |
|  3. DB backup automation   |                                       |
|  4. 9 specs need verify    |  OPENCLAW                            |
|  5. Interface violations   |  Prices: 62K  Ingredients: 54K      |
|                            |  Last sync: 2h ago                   |
|                            |  Pi CPU: 2%  Mem: 18%               |
|                            |                                       |
+----------------------------+-------------------------------------+
```

### Zone Descriptions

**1. Header Bar (top strip)**

- "CHEFFLOW MISSION CONTROL" title (large, white)
- Health dots: colored circles for Dev, Prod, DB, Ollama, OpenClaw (green/yellow/red)
- Current date and time (updates every second)

**2. V1 Progress Bar (full width, below header)**

- Single large progress bar showing overall V1 progress percentage
- Below it: 5 sub-bars for Features, Security, Polish, Validation, Launch Readiness
- Data source: parse `docs/product-blueprint.md` for the percentages (regex the progress section)
- Auto-refreshes every 60 seconds (file watch or polling)

**3. Recently Completed (left column, top half)**

- Last 10 completed items with checkmarks
- Sources: git commits (last 10 with message parsing), session digest completions
- Each item: short description, when it was done
- Strikethrough styling to give the "crossed off" feeling

**4. Activity Feed (right column, top half)**

- Live scrolling feed of development activity
- Sources: existing `/api/livefeed` SSE endpoint (dev server, git, Ollama, system events)
- Each entry: timestamp, source badge, one-line description
- Auto-scrolls, newest at top
- Color-coded by source (blue=dev, green=git, purple=AI, gray=system)

**5. V1 Builder + Queue (Live view)**

- V1 Builder shows the active task, branch, claim age, and claim freshness from `GET /api/v1-builder/summary`
- Queue shows V1 blockers, current-lane support, research, blocked records, parked V2, and escalations
- Empty queue appears only after the queue files read and parse cleanly

**6. Receipts, Escalations, Intake, Pricing, and System (Live view)**

- Service health dots with labels (reuses existing `/api/status` endpoint)
- Git status (branch, clean/dirty)
- Receipts show latest validation, commit, and push state from V1 builder receipt files
- Escalations show open Founder Authority questions with recommended defaults
- Intake shows Sticky Notes and 3977 connection evidence when available
- Pricing readiness stays blocked or unknown unless file-backed evidence proves improvement

### Tab System (Hidden by Default)

The main screen has a tiny tab bar at the very top-right:

- **[Live]** (default, always shown) - the passive dashboard described above
- **[Actions]** (hidden until clicked) - all the existing action panels (Git, Build, Deploy, etc.) preserved exactly as they are today. Nothing is deleted. The developer can still access everything, it's just not the default view.
- **[Gustav]** (hidden until clicked) - the Gustav chat panel, preserved as-is

### States

- **Loading:** "Connecting to Mission Control..." centered on screen with spinning dot
- **Disconnected:** Red banner at top: "Connection lost - reconnecting..." (SSE dropped)
- **All green:** Normal display as described
- **Service down:** Affected health dot turns red, that service's name pulses gently

### Interactions

**None on the Live tab.** This is a pure read-only surveillance screen. No buttons, no clicks, no hover states (it's a TV, you can't hover). The only interaction is clicking tab names to switch to Actions or Gustav.

---

## New API Endpoints

### `GET /api/blueprint/progress`

Reads `docs/product-blueprint.md`, parses the progress section, returns:

```json
{
  "overall": 68,
  "features": 91,
  "security": 80,
  "polish": 70,
  "validation": 10,
  "launch": 20,
  "exitCriteria": {
    "mustHave": { "total": 7, "done": 0 },
    "shouldHave": { "total": 5, "done": 0 },
    "niceToHave": { "total": 5, "done": 0 }
  },
  "queue": [
    { "priority": "P0", "item": "Fix Remy parsing regression", "spec": null },
    { "priority": "P0", "item": "SSE authentication", "spec": null },
    {
      "priority": "P0",
      "item": "Database backup automation",
      "spec": "p1-automated-database-backup-system.md"
    }
  ],
  "knownIssues": [
    { "issue": "Remy parsing returns empty", "severity": "Critical", "since": "March 30" }
  ]
}
```

Implementation: Read the file, regex parse the progress bars (`[===...---] XX%`), parse the checkbox sections for exit criteria counts, parse the queue table, parse the known issues table.

### `GET /api/session-digests/recent`

Reads the 3 most recent files from `docs/session-digests/` (sorted by filename), returns:

```json
[
  {
    "filename": "2026-04-04-session-infrastructure-overhaul.md",
    "date": "2026-04-04",
    "topic": "Developer Infrastructure Overhaul",
    "agentType": "General",
    "summary": "Created Product Blueprint, Project Map, Session Digests..."
  }
]
```

### `GET /api/v1-builder/summary`

Reads `system/v1-builder/*` through the local V1 builder module and returns the cockpit summary used by the Live view. Missing or malformed files return `ok: false` with exact file errors.

Related read-only endpoints:

- `GET /api/v1-builder/queue`
- `GET /api/v1-builder/claims`
- `GET /api/v1-builder/receipts`
- `GET /api/v1-builder/escalations`

### `GET /api/project-map/status`

Reads all `.md` files in `project-map/` (recursively), extracts the `**Status:**` line from each, returns:

```json
[
  { "area": "chef-os/dashboard", "status": "DONE", "openItems": 0 },
  { "area": "chef-os/inquiries", "status": "92%", "openItems": 2 },
  { "area": "infrastructure/realtime", "status": "FUNCTIONAL", "openItems": 1 }
]
```

---

## Edge Cases and Error Handling

| Scenario                       | Correct Behavior                                                           |
| ------------------------------ | -------------------------------------------------------------------------- |
| Product Blueprint file missing | Show "Blueprint not found" in progress zone, rest of dashboard works       |
| SSE connection drops           | Red banner at top, auto-reconnect every 5 seconds                          |
| No session digests exist       | "No recent sessions" in the activity area                                  |
| Git not clean                  | Git status shows dirty file count in yellow                                |
| OpenClaw/Pi unreachable        | OpenClaw section shows "Offline" in red, last known values grayed out      |
| Screen is a TV (no mouse)      | Everything visible without hover or click. Tab switch via keyboard (1/2/3) |

---

## Verification Steps

1. Start Mission Control: `node scripts/launcher/server.mjs`
2. Open `http://localhost:41937` in browser
3. Verify: Live tab shows by default with the passive dashboard layout
4. Verify: V1 progress bar shows 68% (parsed from product-blueprint.md)
5. Verify: Recently Completed section shows recent git commits
6. Verify: Activity Feed shows live events (SSE streaming)
7. Verify: System Status dots are correct (check dev server, database)
8. Verify: Queue shows items from Product Blueprint
9. Click "Actions" tab - verify all existing panels still work
10. Click "Gustav" tab - verify chat still works
11. Return to "Live" tab - verify auto-refresh continues
12. Resize to TV resolution (1920x1080) - verify everything fits without scrolling
13. Screenshot the final result

---

## Out of Scope

- Google Drive integration (local files are sufficient, no API complexity needed)
- Tamagotchi character animation (the "pet" metaphor was about visibility, not literal graphics)
- Calendar view of scheduled work (no scheduling system exists yet; queue is sufficient)
- OpenClaw direct communication (that's the Operator at localhost:4000, not MC)
- Rebuilding the Gustav AI chat (preserved as-is on its own tab)
- Mobile responsiveness (this is a TV/desktop dashboard only)

---

## Notes for Builder Agent

1. **Do NOT delete any existing functionality.** Move it to the Actions tab. The 90+ API endpoints and Gustav chat are still valuable.
2. **The `index.html` file is 11,075 lines.** The rewrite replaces the navigation sidebar and default panel with the new Live dashboard. Existing panel code stays but is hidden behind the Actions tab.
3. **The existing SSE livefeed endpoint (`/api/livefeed`) already exists** and streams dev, Ollama, beta, tunnel, and system events. Use it for the Activity Feed zone.
4. **The existing `/api/status` endpoint already returns** all service health data. Use it for the System Status zone.
5. **TV optimization:** minimum font size 16px, high contrast (white on dark), no thin/light fonts. Health dots should be at least 12px diameter.
6. **File watching:** The server already has a file watcher (`initFileWatcher`). Extend it to watch `docs/product-blueprint.md` and `docs/session-digests/` for changes and push updates via SSE.
7. **Keyboard shortcuts for tabs:** `1` = Live, `2` = Actions, `3` = Gustav. Since this is a TV, the developer may use a wireless keyboard from across the room.
8. **The progress bar parsing is simple regex.** The format in product-blueprint.md is: `BUILD COMPLETENESS    [===========================-] 91%`. Parse the number after `]`.
9. **Recently Completed items:** Parse `git log --oneline -10` for commit messages. Also check session digests for "What Changed" sections.
10. **Auto-refresh intervals:** Progress bar: 60s. Service status: 30s. Activity feed: real-time SSE. Git status: 30s. Queue: 60s.
