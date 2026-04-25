# Agent Prompt: Event Operations Quality Bar Build

Copy everything below this line into a new Claude Code context window.

---

## TASK

You are building fixes and features from a completed audit of ChefFlow's event operations module. The full spec is at `docs/specs/event-ops-quality-bar-build.md`. Read it first. It contains every finding with exact file paths, line numbers, what is wrong, and what correct looks like.

**Read `CLAUDE.md` before doing anything.** It contains mandatory project rules including migration safety, zero hallucination, commit conventions, and anti-loop rules.

## CONTEXT

ChefFlow is a production app for private chefs. The event operations module handles the full lifecycle: booking through wrap-up. An audit scored 21/30 against a "culinary school quality bar" standard. This build closes the gaps.

## WHAT TO BUILD

Execute the build spec in the order specified (Tier 1 first, then Tier 2, etc.). Each tier is listed with exact files, line numbers, current code, and the fix.

**Tier 1 (Critical bugs - do these first):**

1. Fix Cartesian product in `event_financial_summary` DB view - write a NEW migration (never modify existing migrations). Glob `database/migrations/*.sql` first to pick a timestamp strictly higher than the highest existing one.
2. Fix tip double-counting in `lib/events/financial-summary-actions.ts` around line 505-510
3. Fix silent $0 for unset pricing in `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` around lines 204 and 210. Also fix `lib/events/financial-summary-actions.ts` where `foodCostPercent` and `grossMarginPercent` default to 0 instead of null when revenue is 0.

**Tier 2 (Functional gaps):** 4. Terminology: Replace "dinner" with "service" in 7+ chef-facing files (exact list in spec) 5. Pack list: Add serviceware section to `lib/documents/generate-packing-list.ts` based on service style 6. Pack list: Scale equipment quantities by guest count in same file 7. Pack list: Add custom item input to `components/events/packing-list-client.tsx` (follow pattern from `components/grocery/grocery-list-view.tsx` lines 424-463) 8. Pack list: Integrate Chef Gear Check from `lib/gear/defaults.ts` and `lib/gear/actions.ts` 9. Prep checklist: Add server persistence. Create table + server action in `lib/prep-timeline/actions.ts`. Update `app/(chef)/events/[id]/_components/event-detail-prep-tab.tsx` to load from server with localStorage as write-through cache. 10. BEO document: Create `lib/documents/generate-beo.ts` consolidating event, client, venue, menu, timeline, staff, dietary, equipment into one PDF. Add button to event detail page.

**Tier 3 (Cache/propagation):** 11. Bust grocery price quote cache on guest count change - add cache invalidation in `lib/guests/count-changes.ts` 12. Fix cron timezone - `app/api/cron/event-progression/route.ts` should use per-event timezone, not server time 13. Grocery list: Apply sublinear spice/herb scaling from `lib/scaling/recipe-scaling-engine.ts` in `lib/grocery/generate-grocery-list.ts` 14. Grocery list: Add staple/pantry exclusion toggle using `is_staple` flag

**Tier 4 (Operational upgrades):** 15. Multi-event turn time calculation in `lib/events/transitions.ts` conflict check 16. Post-booking editing: Allow editing for all non-terminal states (or allow inline field editing) 17. Contract gate: Add `signed_contract` as soft readiness gate in `lib/events/readiness.ts` 18. Time tracking labels: Change "Reset" to "Breakdown" in UI only (not DB columns) 19. Close-out wizard waste reason: Change "Made too much" to "Overproduction"

**Tier 5 (Cosmetic):** 20. Standardize "Guest Count" label across all forms 21. Add "(X covers)" to chef-facing operational docs (prep sheet, pack list, schedule, production report)

## RULES

- Read the full spec at `docs/specs/event-ops-quality-bar-build.md` before starting
- Read `CLAUDE.md` for project rules (especially migration safety, no em dashes, zero hallucination)
- **NEVER** modify existing migration files. Always create new migrations.
- **NEVER** run `drizzle-kit push` without explicit approval
- Glob `database/migrations/*.sql` before creating any migration to get the right timestamp
- All monetary amounts in cents (integers)
- Tenant ID from session, never from request body
- Wrap side effects in try/catch (non-blocking pattern)
- Run `npx tsc --noEmit --skipLibCheck` after each tier to verify no type errors
- Commit after each tier with: `fix(event-ops-quality): [description]`
- The spec has a verification checklist at the bottom. Use it.

## WHAT NOT TO DO

- Do not refactor code outside the scope of the spec
- Do not add comments, docstrings, or type annotations to unchanged code
- Do not create abstractions for one-time operations
- Do not add features beyond what the spec describes
- Do not change DB column names for the "Reset" -> "Breakdown" change (UI labels only)
- Do not change client-facing text like "My private chef dinner is officially booked" (only change chef-facing operational surfaces)
- Do not touch the FSM logic (it passed the audit with flying colors)

## VERIFICATION

After completing all tiers, run:

```bash
npx tsc --noEmit --skipLibCheck
npx next build --no-lint
```

Both must exit 0. Then check each item on the verification checklist in the spec.
