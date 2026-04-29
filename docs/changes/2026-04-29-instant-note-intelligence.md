# Instant Note Intelligence

## What changed

ChefFlow now has a durable execution layer behind `/capture` Instant Note mode. A raw note is saved first, queued for background interpretation, then interpreted into components, routed layers, tracked actions, calendar entries, time intelligence, and review state.

## Why

The old brain-dump path parsed text for display but did not preserve raw input, create enforced follow-up, store interpretation lineage, or learn from correction. The new path makes capture reliable enough for distracted, real-world use.

## How it works

- Raw notes are stored in `chef_quick_notes` without rewriting the submitted text.
- Interpretations, components, actions, and corrections are stored in the new `chef_note_*` tables.
- `note.interpretation` is registered in `ai_task_queue` so capture can return immediately while the worker processes the note.
- High-confidence interpretations auto-route to workflow notes, ingredients, task actions, and calendar alert entries.
- Medium-confidence, low-confidence, failed, and still-processing interpretations stay in the Review Queue and create review follow-up.
- Action dedupe keys reduce duplicate follow-up work when a chef repeats the same captured instruction.
- Trace links connect the raw note to interpretations, components, actions, routed records, and correction learning.
- Correction records become reusable learning rules for future prompt context.
- Desktop chef pages now have an always-on Instant Note dock. Mobile quick capture includes Instant Note. Browser voice capture is available where speech recognition is supported.
