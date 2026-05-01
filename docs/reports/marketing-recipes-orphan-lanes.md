# Marketing and Recipes Orphan Lanes

- Date: 2026-05-01
- Branch: `feature/v1-builder-runtime-scaffold`
- Scope: `components/marketing/**`, `components/recipes/**`, `tsconfig.ci.expanded.json`
- Reachability source: `node scripts/audit-reachability.mjs --json --limit=500`

## Marketing

| File | Classification | Decision | Proof |
| --- | --- | --- | --- |
| `components/marketing/ab-test-config.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Marketing A/B actions remain owned by `app/api/v2/marketing/ab-tests/*`. |
| `components/marketing/behavioral-segment-builder.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Segment actions remain owned by `app/api/v2/marketing/segments/*`. |
| `components/marketing/campaign-performance.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Current marketing route already renders campaign summaries from real data. |
| `components/marketing/email-builder.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Current template ownership is `app/(chef)/marketing/templates/*`. |
| `components/marketing/home-dual-entry.tsx` | keep or recover | Left in place | Static reachability reported no production inbound refs, but the module is a full homepage candidate and `tests/unit/national-brand-audit.test.ts` still names it as a live-copy audit surface. Public route ownership is too sensitive for worker pruning. |
| `components/marketing/social-content-calendar.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Canonical social planning lives under `app/(chef)/social/*` and `components/social/*`. |
| `components/marketing/social-template-library.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Canonical social templates live at `app/(chef)/social/templates/page.tsx`. |
| `components/marketing/social-template-editor.tsx` | dependent prune-candidate | Deleted | Not in the initial seven because it was only imported by the pruned `social-template-library.tsx`. Exact scans found no other refs. |

## Recipes

| File | Classification | Decision | Proof |
| --- | --- | --- | --- |
| `components/recipes/ingredient-sourcing-toggle.tsx` | recover | Left in place | Static reachability reported no production inbound refs, but `docs/session-digests/2026-04-11-mempalace-execution-features-ts-cleanup.md` says it was intended for per-ingredient recipe detail pricing. This should be evaluated for canonical recipe detail recovery, not pruned by worker cleanup. |
| `components/recipes/nutrition-lookup-panel.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Current recipe detail uses `components/recipes/nutrition-panel.tsx`; recipe nutrition UI also exists under `components/nutrition/*`. |
| `components/recipes/recipe-photo-upload.tsx` | recover | Left in place | Static reachability reported no production inbound refs, but recipe photos have a canonical page at `app/(chef)/recipes/photos/page.tsx`, and docs reference this upload pattern. Recover wiring should be decided with recipe photo ownership. |
| `components/recipes/recipe-scaler.tsx` | duplicate prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. Current recipe detail uses `RecipeScalingCalculator`. |
| `components/recipes/recipe-slideshow.tsx` | prune-candidate | Deleted | Static reachability reported no production inbound refs. Exact path and symbol scans found only the file itself. No canonical route or docs referenced this slideshow module. |
| `components/recipes/scale-for-event-button.tsx` | recover | Left in place | Static reachability reported no production inbound refs, but `docs/specs/operational-workflow-interrogation.md` explicitly names it as existing and never rendered for event-context scaling. Recover wiring belongs with event or recipe flow ownership. |
| `components/recipes/step-photo-gallery.tsx` | recover | Left in place | Static reachability reported no production inbound refs, but `docs/archive/qol-implementation-phase1.md` names it as the optimistic delete and undo surface. Recipe photos have a canonical route, so this should be evaluated for recovery instead of pruning. |

## Validation Notes

The deleted files had their `tsconfig.ci.expanded.json` entries removed. Kept files remain listed for CI coverage.
