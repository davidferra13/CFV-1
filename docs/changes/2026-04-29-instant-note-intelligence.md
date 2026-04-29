# Instant Note Intelligence

## What changed

ChefFlow now has a durable execution layer behind `/capture` Instant Note mode. A raw note is saved first, then interpreted into components, routed layers, tracked actions, time intelligence, and review state.

## Why

The old brain-dump path parsed text for display but did not preserve raw input, create enforced follow-up, store interpretation lineage, or learn from correction. The new path makes capture reliable enough for distracted, real-world use.

## How it works

- Raw notes are stored in `chef_quick_notes` without rewriting the submitted text.
- Interpretations, components, actions, and corrections are stored in the new `chef_note_*` tables.
- High-confidence interpretations auto-route to workflow notes, ingredients, and task actions.
- Medium-confidence and low-confidence interpretations stay in the Review Queue and create a review task.
- Correction records are fed back into future prompt context.
