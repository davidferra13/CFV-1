# Codex Task: Persona Gap Build - Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - Gap 5

## Objective

Build exactly one focused improvement from a completed persona analysis report.

This is stage 2 of the persona pipeline. Stage 1 already analyzed the persona and wrote the report. Do not re-run the analysis. Use the report as product requirements and make production code changes.

## Inputs

- Persona analysis report: `docs/stress-tests/persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md`
- Original persona task, if present: `system/codex-queue/persona-jordan-hale-cannabis-culinary-director-multi.md`
- Product blueprint: `docs/product-blueprint.md`
- App inventory: `docs/app-complete-audit.md`

## Assigned Gap

Gap 5: Director-level cross-event risk cockpit is incomplete for this persona

- Why it matters: Jordan needs one glance to see which event/chef/course combinations are dose-risky now.
  - Current state: strong dashboards exist, but no explicit cannabis-risk heatmap or multi-chef exception queue is documented.

## Quick Wins Context

1. **Add a “Dosing policy version” chip to cannabis event cards**
   - File target: `app/(chef)/cannabis/events` event-row/card component.
   - Change: render a small badge such as `Policy vX.Y` next to dosage info.
   - Value: immediate protocol traceability with minimal UI diff.

2. **Add a “Last compliance update” timestamp in cannabis compliance header**
   - File target: `/cannabis/compliance` header component.
   - Change: one-line timestamp text bound to existing updated-at metadata.
   - Value: quickly surfaces stale compliance records.

3. **Add a “Guest has prior cannabis history” badge in cannabis RSVPs table**
   - File target: `/cannabis/rsvps` row renderer.
   - Change: conditional boolean badge only.
   - Value: reduces re-profiling misses and improves dosing caution.

4. **Add “Assigned chef” column to cannabis events list**
   - File target: `/cannabis/events` table columns.
   - Change: one additional display column.
   - Value: increases accountability and easier director-level scanning.

5. **Add “Escalate dose decision” quick action button on cannabis event detail**
   - File target: cannabis event detail quick actions.
   - Change: one CTA linking to notes/approval flow.
   - Value: creates low-friction human-in-the-loop control while deeper engine work is pending.

## Build Policy

1. Build only this assigned gap.
2. Prefer real product behavior over copy-only changes.
3. If the full gap is too broad, build the smallest honest enabling layer that moves the app toward the gap.
4. Keep the change coherent and reviewable. Do not try to solve the other four gaps in this task.
5. Append a short "Build Follow-Up - Gap 5" note to `docs/stress-tests/persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md` that states what was built and what remains.

## Guardrails

- Preserve existing user changes. Do not revert unrelated work.
- Keep database access tenant-scoped.
- Store money in integer cents.
- Do not add fake real-time claims. If data is stale, estimated, or provider-limited, show that clearly.
- Do not create destructive migrations.
- Do not alter billing or auth unless the assigned gap absolutely requires it.
- No @ts-nocheck.
- No em dashes in new user-facing text.
- Run focused validation when practical.

## Expected Output

- Product code changes for the assigned gap.
- Focused validation, typecheck, or route/component verification when practical.
- A short build note appended to the persona analysis report.

## Branch

codex/persona-build-jordan-hale-cannabis-culinary-director-multi-gap-5
