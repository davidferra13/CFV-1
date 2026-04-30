---
name: sticky-notes-os
description: Use when David references Sticky Notes, Simple Sticky Notes, Notes.db, organizing notes, white notes, the third-monitor note board, visual dismissal, fully extracted notes, archived notes, or asks how to get the note board to zero current work.
---

# Sticky Notes OS

Turn Simple Sticky Notes into a governed input pipeline. The goal is not a pretty board. The goal is to drain raw capture into executed work, durable artifacts, verified archives, or explicit blockers until the board reflects current truth.

## Success State

The target steady state is:

- White raw notes: `0`.
- Yellow queued notes: only intentionally waiting work.
- Blue in-progress notes: only work currently accepted by a workflow.
- Red blocked notes: only true blockers with a concrete reason.
- Green complete notes: visually dismissed only after extraction and verification.

A good run can answer:

```text
What is unprocessed right now?
What is active right now?
What is blocked and why?
What has been fully extracted and verified?
```

If any answer is unclear, the pipeline is failing.

## Operating Loop

1. Run `npm run sticky:organize:visual` to sync, classify, attach, build state, apply colors, apply third-monitor layout, and write reports.
2. Read `system/sticky-notes/unprocessed/latest.json`. White means raw unresolved input. Resolve this first.
3. Read `system/sticky-notes/active/latest.json`. Treat yellow, blue, and red as live work.
4. Read `system/sticky-notes/pinned/latest.json`. Treat pinned as display mode, not completion.
5. Read `system/sticky-notes/finished/latest.json`. Green is ignored unless auditing extraction proof.
6. For each yellow item, route through its owner gate: `skill-garden`, `v1-governor`, `findings-triage`, `context-continuity`, planner, or builder.
7. For each red item, reduce ambiguity: identify the missing verification, missing decision, unsafe content, duplicate uncertainty, or evidence gap.
8. Promote or process actionable notes only through the existing commands: `sticky:review`, `sticky:promote`, `sticky:process`, then the destination skill.
9. Run `npm run sticky:organize:visual` again after changes so the board reflects the new state.

## Visual Dismissal Rule

Never dismiss a note because it looks handled. A note becomes green and minimized only when the state pipeline proves:

- It has a durable extracted artifact, such as an attachment, promotion packet, processed action, spec, skill patch, report, or committed work.
- It has verification metadata, such as confidence, reasons, route, non-mutating review boundary, validation output, or commit evidence.

If extraction or verification is missing, keep the note active as blocked with `missing_extraction_verification`.

## Permanent Notes

Permanent notes are pinned, not exempt from lifecycle.

- A pinned note must have an owner, reason, review cadence, and dismissal condition in `system/sticky-notes/pinned/latest.json`.
- Pinned notes stay visible only while their lifecycle state is queued, in progress, or blocked.
- Complete pinned notes are still green, minimized, and dismissed.
- If a note should stay visible forever, convert the durable truth into a skill, spec, monitor, or dashboard artifact, then keep only the operational display note pinned.

## Third-Monitor Board

The third monitor is the control surface.

- Pinned strip: durable visible operating truth, still governed by lifecycle.
- Yellow lane: queued and understood.
- Blue lane: accepted or actively moving.
- Red lane: blocked, ambiguous, unsafe, or missing evidence.
- Green lane: complete, minimized, and out of active attention.
- White notes: failure signal. They must be classified or escalated immediately.

Do not treat the board as the source of truth. The source of truth is the generated state files plus the preserved source note records.

## Guardrails

- Do not delete Sticky Notes as cleanup.
- Do not let raw notes mutate code, specs, queues, or skills directly.
- Personal, private, and recipe IP notes must stay out of ChefFlow action queues.
- AI must never generate or expand recipes from notes.
- If Simple Sticky Notes windows do not visually move after database layout changes, restart `ssn.exe` only when David explicitly asks to move the live app.
- Keep unrelated dirty work untouched.

## Closeout

Report:

- Current counts for white, yellow, blue, red, and green.
- Current pinned count and whether each pinned note has owner, reason, review cadence, and dismissal condition.
- Whether visual layout is applied to the third monitor.
- The latest backup path if `Notes.db` layout was written.
- Which active notes remain blocked and why, if any.
