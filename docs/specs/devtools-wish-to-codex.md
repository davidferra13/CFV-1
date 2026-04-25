# Wish-to-Codex Bridge

> One script that turns `system/wish.md` ideas into Codex-ready task files.

## Problem

Developer writes ideas in `system/wish.md`. Currently they feed into HOPE, which cannot write code. The ideas need to feed into Codex instead, which CAN write code autonomously.

## What to Build

One file: `devtools/wish-to-codex.mjs`

## What It Does

1. Reads `system/wish.md`, finds unchecked items (`- [ ]`)
2. For each item, infers which part of the codebase is involved
3. Generates a self-contained Codex task file in `system/codex-queue/`
4. Marks the wish.md item as `[>]` with timestamp
5. Prints a summary of what was generated

## Scope Inference

Reuse the keyword-to-path mapping from the existing `devtools/hope/wish.mjs` (the `FEATURE_SCOPES` array, lines 39-50). Copy it directly. When a wish item contains keywords like "pricing", "recipe", "event", etc., the script knows which directories are relevant.

If no keywords match, default scope is `["app", "components", "lib"]` with a flag `confidence: "low"`.

Add one extra step: for each inferred scope path that exists, list the actual files in it (up to 30 files) and include them in the generated task. This gives Codex a concrete file manifest instead of vague directory names.

## Generated Task Format

Each task file at `system/codex-queue/<slug>.md` should contain:

```markdown
# Codex Task: <title from wish item>

## Objective

<the wish item text, verbatim>

## Scope

Only modify files within:
<list of directories>

Key files in scope:
<actual file listing from those directories, up to 30 files>

Do NOT modify:

- database/migrations/ (no new migrations without human approval)
- lib/auth/ (no auth changes)
- app/(chef)/layout.tsx (no layout gates)
- Any file outside the scope directories above

## Branch

codex/<slugified-wish-title>

## Guardrails

These rules are mandatory. Violating any of them makes the task a failure.

- All monetary amounts in integer cents, never floats
- Every database query must be tenant-scoped (use session tenantId, never trust client input)
- No em dashes anywhere (use commas, semicolons, colons, or separate sentences)
- "OpenClaw" must never appear in UI text, error messages, or client-facing strings
- No @ts-nocheck in any new file
- No DROP TABLE, DROP COLUMN, DELETE, or TRUNCATE in migrations
- Wrap side effects (notifications, emails, logs) in try/catch; never let them fail the main operation
- Use only existing component variants: Button (primary/secondary/danger/ghost), Badge (default/success/warning/error/info)
- AI must never generate recipes. Recipes are chef intellectual property entered manually.
- No forced onboarding gates or redirects in layout.tsx

## Acceptance Criteria

- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No new @ts-nocheck files created
- [ ] No files modified outside the scope directories
- [ ] The feature works as described in the objective
- [ ] Failure states show errors, never silent zeros or empty arrays

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
```

## CLI Interface

```
node devtools/wish-to-codex.mjs                    # process all unchecked items
node devtools/wish-to-codex.mjs --limit 3           # process first 3 unchecked items
node devtools/wish-to-codex.mjs --dry-run            # show what would be generated, don't write files
```

## Wish.md Updates

When an item is processed, update its line in wish.md:

```
- [>] fix the root page 500 <!-- codex:queued 2026-04-25T01:00:00Z codex/fix-root-page-500 -->
```

When `--dry-run`, don't modify wish.md.

## Output

Print to stdout:

```
[wish-to-codex] 3 unchecked items found
[wish-to-codex] Generated: system/codex-queue/fix-root-page-500.md (scope: app/(public), confidence: high)
[wish-to-codex] Generated: system/codex-queue/finish-ticketed-checkout.md (scope: app/(chef)/events, confidence: high)
[wish-to-codex] Generated: system/codex-queue/add-receipt-upload-mobile.md (scope: lib/ai, confidence: medium)
[wish-to-codex] Done. 3 tasks queued in system/codex-queue/
```

## File Structure After Running

```
system/
  wish.md                          # items marked [>]
  codex-queue/
    fix-root-page-500.md           # ready to paste into Codex
    finish-ticketed-checkout.md
    add-receipt-upload-mobile.md
```

## What This Does NOT Do

- Does not submit to Codex (that's manual or a future enhancement)
- Does not replace WISH's checklist parsing (reuses the same format)
- Does not modify any product code
- Does not delete the existing HOPE/ARCH/EYES files (leave them alone)
- Does not use any AI/LLM to enrich the specs (pure keyword matching + file listing)

## Implementation Notes

- Import `FEATURE_SCOPES` logic from `devtools/hope/wish.mjs` (copy the array, don't import the file to avoid side effects)
- Use the same `normalize()` and `slugify()` helpers
- File listing: use `readdirSync` recursively with the same `IGNORED_DIRS` set from hope.mjs
- Guardrails text is hardcoded in the template (not read from CLAUDE.md at runtime; CLAUDE.md is too long for a Codex prompt)
- Create `system/codex-queue/` directory if it doesn't exist

## Validation

1. Add 3 test items to `system/wish.md`:
   ```
   - [ ] fix the root page 500 error
   - [ ] add missing loading states to event detail tabs
   - [ ] improve recipe search performance
   ```
2. Run `node devtools/wish-to-codex.mjs --dry-run` and verify output shows 3 items with correct scope inference
3. Run `node devtools/wish-to-codex.mjs` and verify:
   - 3 files created in `system/codex-queue/`
   - Each file contains all template sections (Objective, Scope, Branch, Guardrails, Acceptance Criteria, Context)
   - wish.md items are marked `[>]` with timestamps
4. Run again and verify 0 items processed (all already marked)
5. No product code modified
