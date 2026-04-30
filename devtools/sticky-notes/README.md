# Sticky Notes Intake Layer

Local CLI pipeline for Simple Sticky Notes.

## Commands

```text
npm run sticky:sync
npm run sticky:classify
npm run sticky:attach
npm run sticky:organize
npm run sticky:report
npm run sticky:review
npm run sticky:promote
npm run sticky:scheduler
```

## Safety Rules

- Reads `Notes.db` in SQLite read-only mode.
- Writes outputs under `system/sticky-notes/`.
- Does not mutate project files from raw note content.
- Does not print full note bodies to the terminal.
- Routes personal, private, and recipe IP notes away from ChefFlow action queues.
- Review and promotion commands create local packets only. They do not mutate skills, specs, queues, or project rules.
- Scheduler registration is optional and only happens when `sticky:scheduler` is run.

Set `STICKY_NOTES_DB` to override the default database path.
