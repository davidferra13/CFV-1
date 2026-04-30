# Sticky Notes Intake Layer

Local CLI pipeline for Simple Sticky Notes.

## Commands

```text
npm run sticky:sync
npm run sticky:classify
npm run sticky:attach
npm run sticky:organize
npm run sticky:organize:colors
npm run sticky:organize:visual
npm run sticky:report
npm run sticky:state
npm run sticky:colors
npm run sticky:colors:apply
npm run sticky:layout
npm run sticky:layout:apply
npm run sticky:review
npm run sticky:promote
npm run sticky:process
npm run sticky:scheduler
```

## Safety Rules

- Reads `Notes.db` in SQLite read-only mode unless `sticky:colors:apply` or `sticky:organize:colors` is explicitly run.
- Color application only updates `NOTES.COLOR`; it does not edit note text, titles, notebooks, or deletion state.
- Visual layout application updates only `LEFT`, `TOP`, `WIDTH`, `HEIGHT`, `MINIMIZE`, and `ZORDER`. It writes a local database backup first.
- Writes outputs under `system/sticky-notes/`.
- Does not mutate project files from raw note content.
- Does not print full note bodies to the terminal.
- Routes personal, private, and recipe IP notes away from ChefFlow action queues.
- Review and promotion commands create local packets only. They do not mutate skills, specs, queues, or project rules.
- Processing promoted packets creates a local action manifest and safe markdown report. It does not include raw note bodies.
- Scheduler registration is optional and only happens when `sticky:scheduler` is run.
- The scheduler runs `sticky:organize:visual`, so repeated scans resolve raw notes into classified state indexes, apply lifecycle colors, and maintain the visual layout.

Set `STICKY_NOTES_DB` to override the default database path.

## Color State Contract

Color is lifecycle state, not category.

| State         | Color  | Value      | Meaning                                                                                             |
| ------------- | ------ | ---------- | --------------------------------------------------------------------------------------------------- |
| `unprocessed` | white  | `16777215` | Raw input. Any white note is unresolved until the pipeline classifies it and writes a target state. |
| `queued`      | yellow | `16776960` | Classified and waiting for the correct gate.                                                        |
| `in_progress` | blue   | `16764057` | Accepted by a downstream workflow and being worked.                                                 |
| `blocked`     | red    | `255`      | Ambiguous, unsafe, missing evidence, or escalated.                                                  |
| `complete`    | green  | `65280`    | Resolved and moved out of the active surface.                                                       |

`npm run sticky:state` writes:

- `system/sticky-notes/unprocessed/latest.json`
- `system/sticky-notes/active/latest.json`
- `system/sticky-notes/pinned/latest.json`
- `system/sticky-notes/finished/latest.json`

The unprocessed index is the source of truth for: "What is unprocessed right now?"

`npm run sticky:colors` previews color drift. `npm run sticky:colors:apply` applies the current state index to Simple Sticky Notes by updating only the `COLOR` column.

`npm run sticky:layout` previews the visual layout. `npm run sticky:layout:apply` arranges active notes into queued, in-progress, and blocked lanes, then minimizes complete notes into the finished layer.

Complete means visually dismissed only after extraction and verification. The state builder requires a durable attachment or processed action plus non-mutating review metadata before a note can become green, minimized, and moved into the finished layer.

Pinned is a display mode, not a lifecycle state. Starred notes or notes that explicitly ask to be pinned stay in a top strip on the third-monitor board with owner, reason, review cadence, and dismissal condition metadata. Complete pinned notes are still dismissed.
