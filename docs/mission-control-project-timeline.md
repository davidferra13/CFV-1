# Mission Control - Project Timeline Panel

## Overview

The Project Timeline panel in Mission Control is the single place to track ChefFlow's full build history.
It combines:

- Git commit history (automatic)
- Lifetime hour estimates (from evidence + assumptions)
- Manual milestones you add from the UI

The goal is to keep a living timeline that reflects both the tracked period and pre-commit restart era.

## Source Of Truth

- `docs/project-timeline.json`

This file is read by Mission Control and can be updated in two ways:

1. From the Timeline panel "Add Timeline Milestone" form
2. Directly editing the JSON file

## API Endpoints

| Method | Path                               | Purpose                                                    |
| ------ | ---------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/project/timeline`            | Returns git timeline summary + lifetime model + milestones |
| POST   | `/api/project/timeline/milestones` | Appends one milestone to `docs/project-timeline.json`      |

## What The Panel Shows

- Git summary cards:
  - Project start / latest activity
  - Span, active days, longest streak
  - Commit-based hour model
- Entire app lifetime cards:
  - Low / mid / high
  - Hard upper bound
- Milestone list:
  - Manual notes and evidence events
  - Optional low/mid/high hour contribution per event
- Full linear project ledger:
  - Commits
  - Git reflog activity (branch creation/deletion, checkouts, merges, pushes)
  - File lifecycle events (created/deleted/renamed)
  - Saved timeline milestones
  - Filter controls: search, type, source, order, date range
- Visual timeline modes (filter-aware):
  - Illustrated Timeline (story cards with event icons)
  - Chronological Wall Chart (month lanes with event dots)
  - Historical Timeline Chart (monthly volume bars + cumulative line)
- Add milestone form:
  - Date, type, title, notes, optional hours

## Notes

- Commit hours and VS Code evidence overlap; Mission Control uses the stronger tracked estimate to avoid undercounting.
- Lifetime model = tracked estimate + pre-telemetry restart-era estimate.
- Keep refining `estimatedHours.preTelemetryRestartEra` in the JSON file as you recover better evidence.
- Archive evidence artifacts now include external graveyard inventories (including BillyBob1-14 census) so restart-era effort is tied to concrete filesystem records.
- ChatGPT evidence packets now include both timeline reconstruction and founder-build reconstruction captures, and both are mapped into timeline milestones.
