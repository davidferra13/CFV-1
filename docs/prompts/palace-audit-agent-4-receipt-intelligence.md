# Agent Handoff: Receipt Intelligence Migration

Read and execute `docs/palace-audit-build-spec.md`, section "AGENT 4: Receipt Intelligence Migration."

## Context

`docs/specs/receipt-intelligence-and-recipe-scaling.md` describes a feature that was fully built on 2026-04-18 with zero LLM dependency. The code exists. The migration was never applied. This is one of the lowest-effort highest-return items in the entire project.

## Your job

1. **Find the built code.** Search for receipt-intelligence or recipe-scaling related files:
   - `grep -r "receipt.intelligence\|recipe.scaling\|receipt_quantities\|recipe_scale" lib/ components/ database/migrations/`
   - Read the spec at `docs/specs/receipt-intelligence-and-recipe-scaling.md`

2. **Find the migration file.** It should be in `database/migrations/` with a 2026-04-18 timestamp. If it exists, read it and explain what it does in plain English.

3. **If the migration file is missing:** Read the spec for schema changes. Generate proper additive migration SQL. Use a timestamp higher than the latest in `database/migrations/`.

4. **Present the migration SQL to the developer.** Explain what it does. Wait for approval before applying. Remind them to back up the database first.

5. **After migration is applied (with approval):** Verify the feature works:
   - Test receipt upload flow
   - Test recipe scaling
   - Check that extracted quantities persist correctly

## Rules

- NEVER run `drizzle-kit push` or apply migrations without explicit developer approval
- All migrations must be additive
- Show full SQL before writing the migration file
- Remind user to back up database before applying
- `npx tsc --noEmit --skipLibCheck` must pass
