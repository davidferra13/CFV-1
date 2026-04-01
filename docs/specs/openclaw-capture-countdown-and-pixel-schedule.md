# Spec: OpenClaw Capture Countdown and Pixel Schedule

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `docs/specs/openclaw-total-capture.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session      | Commit   |
| --------------------- | ---------------- | ------------------ | -------- |
| Created               | 2026-04-01 00:42 | Planner + Research |          |
| Status: ready         | 2026-04-01 00:42 | Planner + Research | 6017b0b0 |
| Claimed (in-progress) |                  |                    |          |
| Spike completed       |                  |                    |          |
| Pre-flight passed     |                  |                    |          |
| Build completed       |                  |                    |          |
| Type check passed     |                  |                    |          |
| Build check passed    |                  |                    |          |
| Playwright verified   |                  |                    |          |
| Status: verified      |                  |                    |          |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

_The developer's actual words, cleaned up for readability but faithful to what they said. Remove filler and repetition, keep the passion and reasoning. This is the "why behind the why." If the developer was on a voice-to-text rant, capture the gold._

- "We need to make a countdown."
- "Now that we are not changing our method and that we are projected to have a full catalog and database set done, finally, I think it's finally time that we can make a timeline."
- "And a literally like a loading bar. I want it to feel like a tracker, like a timer going off for like vacation."
- "The perfect example right now, that actually is perfect, and there's no other example we can even think about right now, the perfect example is the Marvel movie Doomsday, how there's just a tracker going. I need that, but a little bit more."
- "I need the actual number and the loading bar."
- "And I need it to be practical. I don't want it to be like a hallucinogenic animation."
- "We need to add that to the pricing catalog page. We need to add it to the food catalog page and the store prices page specifically. And we need to add it to the pixel art."
- "I've noticed I keep waiting for a whole batch to go through, and we have a bunch of jobs that are scheduled, and I need a really easy representation of every single job that's scheduled, so I can tell what's about to go off, when it's gonna go off, what's on idle."
- "That one can, I guess, pretty much just be in the pixel art, because that doesn't need to be on the website, I guess."

### Developer Intent

_Translate the raw signal into clear system-level requirements. What were they actually trying to achieve beneath what they said? Preserve reasoning, not just outcomes._

- **Core goal:** Add one shared OpenClaw mission countdown across the three requested website surfaces plus the pixel-art dashboard, and upgrade the pixel-art dashboard into a true schedule board for every queued job.
- **Key constraints:** The countdown must be practical, readable, and truthful. It cannot pretend to be a scrape-refresh ETA. The loading bar must represent countdown-window progress, not fake catalog coverage. The pixel-art schedule must show every active cron line, not a short teaser list.
- **Motivation:** The developer now believes the OpenClaw capture strategy is stable enough to justify a visible mission tracker. They also need a fast operator view of the queue so they stop waiting blindly for batch windows to finish.
- **Success from the developer's perspective:** On `/admin/price-catalog`, `/culinary/price-catalog`, `/prices`, and the pixel-art board, they can immediately see how far the mission is from its projected milestone, how much of the timeline window has elapsed, and what jobs are scheduled next or idle.

---

## What This Does (Plain English)

This adds a shared OpenClaw mission countdown card to the admin price catalog, chef food catalog, and store prices pages. The card shows a projected target date, the remaining time until that target, and a practical loading bar that tracks progress through the configured mission window. It also upgrades the live OpenClaw dashboard with a pixel-art HQ view that shows the same countdown plus a full schedule board listing every scheduled job, when it runs next, and whether it is running, next up, idle, sleeping, or needs attention.

---

## Why It Matters

OpenClaw already shows activity, counts, and freshness, but it does not show mission progress or queue visibility in one glance. The developer wants the system to feel like a real operation with a visible finish line and a visible schedule, not a set of disconnected counters. `docs/specs/openclaw-total-capture.md:98-140`, `.openclaw-temp/game.html:209-266`

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                                | Purpose                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `config/openclaw-capture-milestone.json`            | Shared projected countdown config used by Next pages and dashboard     |
| `components/pricing/openclaw-capture-countdown.tsx` | Shared mission countdown card with remaining time and progress bar     |
| `scripts/openclaw-dashboard/game.html`              | Live pixel-art HQ board served from the real dashboard deployment path |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                                       | What to Change                                                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `app/(admin)/admin/price-catalog/price-catalog-client.tsx` | Render the shared countdown card above the tabs so it is visible on the pricing catalog page                               |
| `app/(chef)/culinary/price-catalog/page.tsx`               | Render the shared countdown card above the existing engine pulse row                                                       |
| `app/(chef)/prices/page.tsx`                               | Render the shared countdown card below the hero copy and above the stat cards                                              |
| `scripts/openclaw-dashboard/server.mjs`                    | Load milestone config, compute countdown payload, expand schedule model to one row per active cron line, and serve `/game` |
| `scripts/openclaw-dashboard/index.html`                    | Add a visible entry point to the pixel-art HQ view and keep the existing simple dashboard intact                           |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is required for this feature.
- The countdown and schedule views are derived from checked-in config plus existing dashboard runtime data.

---

## Data Model

_Describe the key entities and relationships. What fields matter? What are the constraints?_

### 1. Countdown config

Create `config/openclaw-capture-milestone.json` with this shape:

```json
{
  "label": "Projected OpenClaw Capture",
  "title": "Full Catalog and Database Window",
  "subtitle": "Projected from the current total-capture roadmap",
  "countdownStartedAt": "2026-04-01T00:00:00-04:00",
  "targetAt": "2026-06-24T23:59:00-04:00",
  "targetTimezone": "America/New_York",
  "progressLabel": "timeline elapsed",
  "status": "projected"
}
```

Rules:

- `countdownStartedAt` and `targetAt` are required ISO timestamps with timezone offsets.
- `status` must stay `projected` in v1 so the UI does not overstate certainty.
- `targetAt` is intentionally a config value, not derived from catalog counts or scrape health.
- The initial `targetAt` above is inferred from the 12-week roadmap starting on 2026-04-01. It is build-safe but not repo-verified by runtime code. `docs/specs/openclaw-total-capture.md:98-140`

### 2. Shared countdown view model

Both the website component and `scripts/openclaw-dashboard/server.mjs` should derive the same shape:

```ts
type OpenClawMissionCountdown = {
  label: string
  title: string
  subtitle: string
  status: 'projected'
  countdownStartedAt: string
  targetAt: string
  targetTimezone: string
  remainingMs: number
  progressPct: number
  targetDisplay: string
}
```

Derivation rules:

- `remainingMs = Math.max(0, targetAt - now)`
- `totalWindowMs = Math.max(1, targetAt - countdownStartedAt)`
- `elapsedMs = clamp(now - countdownStartedAt, 0, totalWindowMs)`
- `progressPct = Math.round((elapsedMs / totalWindowMs) * 100)`
- Website card shows days, hours, minutes.
- Pixel-art board can show days plus a shorter hours/minutes helper, but should not animate seconds.

### 3. Mission schedule row

Extend the live dashboard payload with one row per active cron line:

```ts
type MissionScheduleRow = {
  id: string
  name: string
  cronExpr: string
  command: string
  nextRun: string | null
  minutesUntil: number | null
  cadenceLabel: string
  state: 'running' | 'next' | 'idle' | 'sleeping' | 'attention'
  source: 'crontab'
}
```

Rules:

- `id` is a deterministic hash or stable string from the cron expression plus command.
- `cronExpr` stores the original five cron fields.
- `nextRun` must be computed far enough ahead to catch weekly jobs. The current 12-hour list is insufficient. `scripts/openclaw-dashboard/server.mjs:192-204`
- Compute across at least the next 8 days so weekly jobs always get a next run.
- `cadenceLabel` is human-friendly, such as `every 15m`, `daily 11:00 PM`, or `weekly Wed 3:00 PM`.
- State priority:
  1. `attention` if the matching scraper has a recent failing health signal or recent errors.
  2. `running` if an active process matches the row command.
  3. `next` if `minutesUntil` is not null and `minutesUntil <= 15`.
  4. `idle` if `minutesUntil` is not null and `minutesUntil <= 1440`.
  5. `sleeping` otherwise.

---

## Server Actions

_List every server action with its signature, auth requirement, and behavior._

There are no new Next server actions in this feature.

Existing data sources stay unchanged:

| Action                     | Auth                | Input | Output                                 | Side Effects |
| -------------------------- | ------------------- | ----- | -------------------------------------- | ------------ |
| `getStoreCatalogStats()`   | `requireChef()`     | none  | Local OpenClaw mirror stats            | None         |
| `getOpenClawStats()`       | `requireAdmin()`    | none  | Pi stats for admin page                | None         |
| `/api/status` in dashboard | none inside service | none  | JSON status payload for live dashboard | None         |

The new countdown card reads checked-in config. The new pixel-art board uses the existing dashboard JSON transport, extended with `missionCountdown` and `missionSchedule`. `lib/openclaw/store-catalog-actions.ts:79-138`, `lib/openclaw/sync.ts:94-112`, `scripts/openclaw-dashboard/server.mjs:270-281`

---

## UI / Component Spec

_Describe what the user sees. Be specific: layout, components, states._

### Page Layout

Website placements:

- `/prices`: render the countdown card directly below the hero copy and above the stat cards. `app/(chef)/prices/page.tsx:53-100`
- `/culinary/price-catalog`: render the countdown card directly below the title block and above the engine pulse row. `app/(chef)/culinary/price-catalog/page.tsx:28-66`
- `/admin/price-catalog`: render the countdown card directly below the page intro and above the tab strip so it stays visible regardless of active tab. `app/(admin)/admin/price-catalog/price-catalog-client.tsx:97-120`

Countdown card layout:

- Eyebrow: `Projected Mission Countdown`
- Title: from config `title`
- Large remaining number: `84 days left` style
- Secondary remaining line: hours/minutes remainder
- Progress bar with explicit label such as `54% of timeline elapsed`
- Footer chips: `Projected`, formatted target datetime, timezone

Pixel-art HQ layout:

- Serve `scripts/openclaw-dashboard/game.html` at `/game`.
- Keep the existing three-column HQ composition from the prototype: left roster, center scene, right activity/schedule. `.openclaw-temp/game.html:209-266`
- Add a compact mission-countdown HUD in the top-center or top-right of the HQ scene.
- Replace the right-side schedule list with a mission schedule board that can scroll through every scheduled job row.
- Keep the existing simple dashboard on `/`; add a visible "Open Pixel HQ" link or button to `/game`. `scripts/openclaw-dashboard/index.html:81-84`

### States

- **Loading:** Website card shows a neutral skeleton or `Loading mission countdown...`. Pixel-art shows `Loading countdown...` and `Loading schedule...`.
- **Empty:** Not applicable for the countdown. If config is present, the card always renders.
- **Error:** If config is missing or invalid, show `Countdown unavailable` and no fake numbers. If dashboard schedule parsing fails, show a schedule error message but keep the rest of the board live.
- **Populated:** Website shows remaining time, target date, and progress bar. Pixel-art shows the same countdown plus the full schedule board.

### Interactions

Website:

- No user input in v1.
- The countdown ticks on the client at minute granularity or better, but does not need second-level animation.

Pixel-art:

- Auto-refresh via the existing dashboard polling loop.
- Schedule rows may highlight the currently running job and the next-up job.
- Clicking the new `/game` link opens the pixel-art HQ view.

---

## Edge Cases and Error Handling

_List anything that could go wrong and what the correct behavior is._

| Scenario                                           | Correct Behavior                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Countdown config missing or invalid                | Render `Countdown unavailable`, log server error, do not show fake zeros                        |
| `targetAt <= countdownStartedAt`                   | Clamp progress to 100%, show config error copy, keep pages rendering                            |
| Countdown window has passed                        | Show `Projected window reached`, remaining time `0`, and a full bar                             |
| Dashboard cannot parse a cron line                 | Skip only that row, log it, keep remaining schedule rows                                        |
| Weekly jobs fall outside old 12h horizon           | Extend next-run computation to 8 days so every active cron line still renders a row             |
| Active process cannot be matched to a schedule row | Row still renders with `next`, `idle`, or `sleeping` based on time; only `running` is withheld  |
| Pi status API fails on admin page                  | Existing admin error behavior stays intact; countdown still renders because it is config-backed |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Start the Next app and the OpenClaw dashboard service locally or in the target environment.
2. Visit `/prices` and verify the mission countdown card appears between the hero copy and the stat cards.
3. Visit `/culinary/price-catalog` and verify the same countdown card appears above the engine pulse row.
4. Visit `/admin/price-catalog` and verify the same countdown card appears above the tabs and remains visible while switching tabs.
5. Confirm all three website placements display the same target date, the same remaining window, and the same progress percentage.
6. Visit the live dashboard root `/` and verify there is a visible link or button to `/game`.
7. Visit `/game` and verify the pixel-art HQ renders with the same mission countdown target and progress.
8. Verify the schedule board shows one row per active cron line from the live crontab. If testing against `.openclaw-deploy/crontab-v7.txt`, the expected active-row count is 45. `.openclaw-deploy/crontab-v7.txt:5-86`
9. Verify at least one row can show `running` when an active job exists, and verify near-term jobs switch to `next`.
10. Temporarily break the countdown config in local dev and verify the pages show `Countdown unavailable` rather than fake numbers.

---

## Out of Scope

_What does this spec explicitly NOT cover? Prevents scope creep._

- Not changing scrape cadence, cron timings, or queue order. `.openclaw-deploy/crontab-v7.txt:5-86`
- Not building a truthful page-refresh ETA surface. That is a different problem and the repo has already documented why it is not ready. `docs/research/openclaw-refresh-cadence-and-status-surface.md:20-27`, `docs/research/openclaw-refresh-status-operator-patterns.md:68-75`
- Not deriving progress from live catalog coverage percentages.
- Not rebuilding the existing store browser or food-catalog browser internals beyond inserting the shared countdown card. `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx:39-244`, `app/(chef)/culinary/price-catalog/catalog-browser.tsx:107-1253`
- Not promoting `.openclaw-temp` to production without porting it into `scripts/openclaw-dashboard/`.

---

## Notes for Builder Agent

_Anything else the builder needs to know: gotchas, patterns to follow, files to reference for similar implementations._

- Use `.openclaw-temp/game.html` as visual reference only. Ship from `scripts/openclaw-dashboard/` because the systemd service points there. `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`, `.openclaw-temp/game.html:209-266`
- Reuse the practical styling patterns from `components/sharing/event-countdown.tsx`, `app/(chef)/finance/goals/page.tsx`, and `components/scheduling/dop-view.tsx` instead of inventing a loud animation system. `components/sharing/event-countdown.tsx:10-68`, `app/(chef)/finance/goals/page.tsx:19-38`, `components/scheduling/dop-view.tsx:191-205`
- Keep the countdown clearly labeled as `Projected`. Do not let the UI read like `next scrape in X`.
- Keep the existing dashboard root functional. `/game` is an addition, not a replacement. `scripts/openclaw-dashboard/server.mjs:266-324`
- Do not add migrations, server actions, or auth changes for this feature.

---

## Spec Validation

### 1. What exists today that this touches?

- `/prices` is a chef-gated page that renders hero copy, stat cards, active-chain chips, and `PricesCatalogClient`. `app/(chef)/prices/page.tsx:46-135`
- `/culinary/price-catalog` is a chef-gated page that renders a compact engine pulse and `CatalogBrowser`. `app/(chef)/culinary/price-catalog/page.tsx:18-69`
- `/admin/price-catalog` is an admin client that renders Pi stats and tabs. `app/(admin)/admin/price-catalog/page.tsx:8-10`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:19-155`
- Store-prices stats come from local Postgres via `getStoreCatalogStats()`. `lib/openclaw/store-catalog-actions.ts:79-138`
- Food-catalog browsing comes from Pi-backed catalog actions. `lib/openclaw/catalog-actions.ts:309-445`
- Admin Pi status comes from `getOpenClawStats()`. `lib/openclaw/sync.ts:94-112`
- The current live dashboard only returns a short upcoming cron list and serves `/`, not `/game`. `scripts/openclaw-dashboard/server.mjs:170-204`, `scripts/openclaw-dashboard/server.mjs:266-324`
- The pixel-art HQ exists only as a prototype in `.openclaw-temp`. `.openclaw-temp/game.html:209-266`
- Relevant schema tables already exist and do not need changes: `openclaw.chains`, `openclaw.stores`, `openclaw.products`, `openclaw.store_products`, `openclaw.scrape_runs`, `openclaw.sync_runs`. `database/migrations/20260401000119_openclaw_inventory_schema.sql:8-20`, `database/migrations/20260401000119_openclaw_inventory_schema.sql:23-41`, `database/migrations/20260401000119_openclaw_inventory_schema.sql:63-77`, `database/migrations/20260401000119_openclaw_inventory_schema.sql:85-98`, `database/migrations/20260401000119_openclaw_inventory_schema.sql:106-121`, `database/migrations/20260401000119_openclaw_inventory_schema.sql:128-141`

### 2. What exactly changes?

- Add one checked-in milestone config file consumed by both Next and the live dashboard.
- Add one shared countdown component and place it on `/prices`, `/culinary/price-catalog`, and `/admin/price-catalog`.
- Extend `scripts/openclaw-dashboard/server.mjs` to expose `missionCountdown`, `missionSchedule`, and a `/game` route while preserving the current `/` route.
- Add `scripts/openclaw-dashboard/game.html` to host the live pixel-art HQ.
- Keep all DB tables, current actions, and cron timings unchanged. Evidence for current placement points and dashboard gaps: `app/(chef)/prices/page.tsx:53-100`, `app/(chef)/culinary/price-catalog/page.tsx:28-66`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:97-120`, `scripts/openclaw-dashboard/server.mjs:170-204`, `scripts/openclaw-dashboard/server.mjs:266-324`

### 3. What assumptions are you making?

- **Verified:** The three requested website pages exist as separate surfaces. `app/(chef)/prices/page.tsx:46-135`, `app/(chef)/culinary/price-catalog/page.tsx:18-69`, `app/(admin)/admin/price-catalog/page.tsx:8-10`
- **Verified:** The repo can import JSON config in Next. `tsconfig.json:2-18`
- **Verified:** The live dashboard deployment path is `scripts/openclaw-dashboard/`, not `.openclaw-temp/`. `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`
- **Verified:** The current live schedule logic is incomplete for the new requirement because it only emits entries within 12 hours. `scripts/openclaw-dashboard/server.mjs:192-204`, `scripts/openclaw-dashboard/index.html:81-84`
- **Unverified but isolated:** The initial target date `2026-06-24T23:59:00-04:00` is inferred from the 12-week roadmap starting on 2026-04-01, not from runtime code or an explicit developer-entered date. `docs/specs/openclaw-total-capture.md:98-140`

### 4. Where will this most likely break?

- The builder could ship the pixel-art board only in `.openclaw-temp`, which would not go live because the real service points at `scripts/openclaw-dashboard/`. `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`, `.openclaw-temp/game.html:209-266`
- The builder could preserve the current 12-hour next-run filter, which would still hide weekly jobs and violate the "every scheduled job" requirement. `scripts/openclaw-dashboard/server.mjs:192-204`, `.openclaw-deploy/crontab-v7.txt:5-86`
- The builder could label the loading bar as capture completeness instead of countdown-window progress, which would overstate truth because the repo does not provide a verified catalog-completion percentage contract. `docs/specs/openclaw-total-capture.md:130-140`, `docs/research/openclaw-refresh-status-operator-patterns.md:68-75`

### 5. What is underspecified?

- The exact target date is not verified anywhere in code. This spec resolves that by making it an explicit config value and labeling it `Projected`. `docs/specs/openclaw-total-capture.md:98-140`
- The live schedule row shape did not exist. This spec resolves it by defining `MissionScheduleRow` and state rules.
- The route split between the simple dashboard and the pixel-art board did not exist. This spec resolves it by keeping `/` and adding `/game`. `scripts/openclaw-dashboard/server.mjs:266-324`

### 6. What dependencies or prerequisites exist?

- This depends on the total-capture roadmap for the milestone framing. `docs/specs/openclaw-total-capture.md:98-140`
- The live dashboard must continue running through the existing systemd service path. `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`
- The schedule board depends on the live crontab or equivalent runtime source remaining available to the dashboard service. `scripts/openclaw-dashboard/server.mjs:170-204`
- No DB migration, schema change, or auth prerequisite is needed. `database/migrations/20260401000119_openclaw_inventory_schema.sql:8-141`

### 7. What existing logic could this conflict with?

- `/prices` already contains hero + stats density, so the countdown must not displace existing store-catalog stats. `app/(chef)/prices/page.tsx:53-100`
- `/culinary/price-catalog` already has a compact engine pulse, so the countdown should sit above it rather than replace it. `app/(chef)/culinary/price-catalog/page.tsx:37-66`
- `/admin/price-catalog` already handles Pi-online/offline states. The countdown must remain config-backed and independent of those errors. `app/(admin)/admin/price-catalog/price-catalog-client.tsx:36-65`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:122-155`
- The root dashboard `/` already exists. Adding `/game` must not break the current JSON API or simple monitor. `scripts/openclaw-dashboard/server.mjs:266-324`

### 8. What is the end-to-end data flow?

- Website countdown: page render -> import JSON milestone config -> pass props into shared countdown component -> client computes remaining time/progress -> UI updates. `app/(chef)/prices/page.tsx:46-135`, `app/(chef)/culinary/price-catalog/page.tsx:18-69`, `app/(admin)/admin/price-catalog/price-catalog-client.tsx:19-155`, `tsconfig.json:14`
- Pixel-art countdown: `/game` loads -> browser polls `/api/status` -> dashboard server reads milestone config and computes `missionCountdown` -> client renders HUD.
- Pixel-art schedule: browser polls `/api/status` -> dashboard server parses live cron entries plus active jobs/health -> computes one `missionSchedule` row per active cron line -> client renders scrollable schedule board. `scripts/openclaw-dashboard/server.mjs:170-204`, `scripts/openclaw-dashboard/server.mjs:270-281`, `.openclaw-deploy/crontab-v7.txt:5-86`

### 9. What is the correct implementation order?

1. Add `config/openclaw-capture-milestone.json`.
2. Build `components/pricing/openclaw-capture-countdown.tsx`.
3. Insert the shared countdown card into `/prices`, `/culinary/price-catalog`, and `/admin/price-catalog`.
4. Add `scripts/openclaw-dashboard/game.html`.
5. Extend `scripts/openclaw-dashboard/server.mjs` with countdown loading, full schedule modeling, and the `/game` route.
6. Add a link from `scripts/openclaw-dashboard/index.html` to `/game`.
7. Verify the same countdown target appears in all four surfaces and the schedule board renders one row per active cron line.

### 10. What are the exact success criteria?

- The same projected mission countdown appears on `/prices`, `/culinary/price-catalog`, and `/admin/price-catalog`.
- All three page placements show the same target date and progress percentage.
- The live dashboard serves a pixel-art HQ at `/game`.
- The pixel-art HQ shows the same projected countdown target as the website.
- The pixel-art schedule board renders one row per active cron line rather than a truncated teaser list.
- Weekly jobs still appear in the schedule with valid next-run times.
- Config failure produces explicit unavailable states instead of fake zeros.

### 11. What are the non-negotiable constraints?

- The countdown must be labeled and framed as `Projected`, not as verified scrape freshness.
- The loading bar must represent countdown-window progress, not fake coverage completeness.
- The website countdown must stay practical and restrained, with no flashy or psychedelic animation.
- The pixel-art schedule must show every active cron line and should not change actual cron timing. `.openclaw-deploy/crontab-v7.txt:5-86`
- No DB migrations, auth changes, or queue-order changes are allowed in this feature. `database/migrations/20260401000119_openclaw_inventory_schema.sql:8-141`

### 12. What should NOT be touched?

- Do not edit the cron timings or the job roster itself. `.openclaw-deploy/crontab-v7.txt:5-86`
- Do not refactor `CatalogBrowser` or `StoreInventoryBrowser` beyond adding the shared countdown at the page shell level. `app/(chef)/culinary/price-catalog/catalog-browser.tsx:107-1253`, `app/(chef)/prices/store/[storeId]/store-inventory-browser.tsx:39-244`
- Do not replace the existing root dashboard `/`; only add `/game`. `scripts/openclaw-dashboard/server.mjs:266-324`
- Do not turn this into a refresh-ETA feature. `docs/research/openclaw-refresh-cadence-and-status-surface.md:22-27`, `docs/research/openclaw-refresh-status-operator-patterns.md:68-75`

### 13. Is this the simplest complete version?

Yes. It uses one config file, one shared component, three page insertions, one live pixel-art HTML file, and one dashboard-server extension. It avoids migrations, new server actions, runtime write paths, and fake coverage math while still satisfying the user's requested countdown and full-schedule visibility. Existing reusable countdown/progress patterns support this scope directly. `components/sharing/event-countdown.tsx:10-68`, `app/(chef)/finance/goals/page.tsx:19-38`, `components/scheduling/dop-view.tsx:191-205`

### 14. If implemented exactly as written, what would still be wrong?

- The target date would still be projected rather than empirically proven from a live completion model. That is acceptable in v1 because the UI labels it as projected and isolates it to config, but it is still not a measurement of actual completion certainty. `docs/specs/openclaw-total-capture.md:98-140`
- The schedule states will still be best-effort mappings from cron lines plus active-job and health signals. They improve visibility a lot, but they are not a full workflow engine.

### Builder Trapdoors

What a builder would get wrong building this as written:

- Building only the website countdown and forgetting the pixel-art schedule board.
- Porting the prototype from `.openclaw-temp` without moving it into `scripts/openclaw-dashboard/`.
- Reusing the existing 12-hour schedule logic and assuming it already covers "every scheduled job."
- Showing the countdown as if it predicts scrape freshness instead of mission timing.
- Treating the loading bar as coverage completeness rather than elapsed countdown window.

### Unverified Items

Is anything assumed but not verified?

- Yes. The initial `targetAt` value is inferred from the 12-week roadmap and is not verified by any runtime source. It should live in config so the developer can adjust it without reopening the implementation. `docs/specs/openclaw-total-capture.md:98-140`
- No other correctness-critical assumption is left unresolved in code shape, data source, page placement, or dashboard path.

## Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?
> If uncertain: where specifically, and what would resolve it?

This spec is production-ready for implementation. The only explicit uncertainty is the initial projected target date, and that uncertainty is isolated to a checked-in config value rather than the implementation contract. The routes, dashboard path, existing data sources, and schedule source are all verified in code. `app/(chef)/prices/page.tsx:46-135`, `app/(chef)/culinary/price-catalog/page.tsx:18-69`, `app/(admin)/admin/price-catalog/page.tsx:8-10`, `scripts/openclaw-dashboard/openclaw-dashboard.service:5-12`, `scripts/openclaw-dashboard/server.mjs:170-204`
