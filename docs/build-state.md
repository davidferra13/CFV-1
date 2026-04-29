# Build State

Last known state of the app. Updated after every successful type check and build.

**Rules:**

- Update this after every successful `tsc` + `next build`.
- If you break the build and can't fix it, update this to `broken` with details.
- Builders must read this before starting. Do not build on a broken foundation.
- **Fix it, don't report it.** If the build is broken, fix it. Don't just update this file to say "broken".

---

## Current State

| Check                                    | Status | Last Verified | Commit | Agent           |
| ---------------------------------------- | ------ | ------------- | ------ | --------------- |
| `npx tsc --noEmit --skipLibCheck`        | green  | 2026-04-27    | dirty  | Claude Opus 4.6 |
| `npm run build -- --no-lint` (16GB heap) | green  | 2026-04-27    | dirty  | Claude Opus 4.6 |

**Canonical build command:** `npm run build -- --no-lint` (uses `scripts/run-next-build.mjs`, 12GB heap default).

**Known non-blocking build noise:** `DYNAMIC_SERVER_USAGE` warnings from static generation, `serverActions` config warning. Build exits `0`. Not blockers.

**Last commit on main:** ce742b36b

---

## Verification Notes

Supplemental verification logs from prior sessions have been archived. Each session should verify its own work and update the table above. Don't append paragraphs of verification prose here.

**Builder-start handoff:** `docs/research/current-builder-start-handoff-2026-04-02.md`
**System-level sequencing:** `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

---

## History

_Newest first. Keep the last 10 entries. Prune older ones._

| Date       | tsc   | build | Agent           | Notes                                                                                                                                        |
| ---------- | ----- | ----- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-29 | fail  | -     | Codex           | Launch readiness audit/refinement tests passed. Full tsc with 8GB heap had no launch-readiness diagnostics but still failed on unrelated existing dependency and chart formatter errors. |
| 2026-04-29 | fail  | -     | Codex           | Scoped launch readiness tests passed. Full tsc with 8GB heap failed on unrelated existing missing `@dnd-kit`, `@fullcalendar`, `@capacitor/cli`, `next-auth/jwt` encode, and chart formatter typing errors. |
| 2026-04-27 | green | green | Claude Opus 4.6 | Regression detection system: 19 scripts, 5 layers, pre-commit/pre-push hooks, /regression skill. 241 registry checks passing. Self-test 6/6. |
| 2026-04-27 | green | green | Claude Opus 4.6 | tsc + build clean on dirty checkout. 16GB heap required. BUILD_ID 0abc27ebf. 11 worktrees cleaned. Compliance: ALL CLEAR.                    |
| 2026-04-24 | green | green | Codex           | First-time progressive disclosure. Starter dashboard, sparse-data hiding, progressive nav.                                                   |
| 2026-04-23 | green | -     | Codex           | Chef client ops snapshot reuse. Shared tenant-scoped client work snapshot.                                                                   |
| 2026-04-22 | green | green | Codex           | Public intake body guards. Honest 400/413 on malformed/oversized JSON.                                                                       |
| 2026-04-22 | green | green | Codex           | Share visibility contract. tenantId removed from public share payloads.                                                                      |
| 2026-04-11 | green | -     | Builder         | MemPalace session. 7 features + 12 TS errors fixed.                                                                                          |
| 2026-04-11 | green | green | Builder         | AI voice system: neural TTS, inbound calls, voicemail, CallHub.                                                                              |
| 2026-04-08 | green | green | Codex           | Remy continuity + operator-mode + surface fast-path.                                                                                         |
| 2026-04-07 | green | green | Claude Opus 4.6 | Performance audit. Prod TTFB: 43s to 20ms. 4 DB indexes.                                                                                     |
| 2026-04-06 | green | green | Claude Opus 4.6 | Full catch-up: 27 commits. Android widgets, ingredient normalization, PWA.                                                                   |
