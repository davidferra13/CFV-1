# Menus And Intelligence Orphan Lanes

- Date: 2026-05-01
- Branch: `feature/v1-builder-runtime-scaffold`
- Scope: `components/menus/**`, `components/intelligence/**`
- Evidence: `node scripts/audit-reachability.mjs --json --limit=300`, exact-path `rg --fixed-strings` scans, symbol `rg` scans, canonical route inspection.

## Pruned

These files had no production imports, no test or script imports, no barrel exports, and duplicated signals already rendered by `components/intelligence/intelligence-hub.tsx` through `@/lib/intelligence`.

| File | Classification | Owner Proof |
| --- | --- | --- |
| `components/intelligence/geographic-bar.tsx` | duplicate prune-candidate | `IntelligenceHubContent` already loads and renders `getGeographicIntelligence`. Exact path was referenced only by `tsconfig.ci.expanded.json`. |
| `components/intelligence/inquiry-triage-bar.tsx` | duplicate prune-candidate | `IntelligenceHubContent` already loads and renders `getInquiryTriage` and `getCommunicationCadence`. Exact path was referenced only by `tsconfig.ci.expanded.json`. |
| `components/intelligence/prep-efficiency-bar.tsx` | duplicate prune-candidate | `IntelligenceHubContent` already loads and renders `getPrepTimeIntelligence`. Exact path was referenced only by `tsconfig.ci.expanded.json`. |
| `components/intelligence/proactive-alerts-bar.tsx` | duplicate prune-candidate | Dashboard intelligence sections and decision queue use `getProactiveAlerts` directly. Exact path was referenced only by `tsconfig.ci.expanded.json`. |
| `components/intelligence/untapped-markets-bar.tsx` | duplicate prune-candidate | `IntelligenceHubContent` already loads and renders `getUntappedMarkets`. Exact path was referenced only by `tsconfig.ci.expanded.json`. |

## Kept Or Deferred

These files are current reachability orphans, but are not safe deletion candidates under the module freeze because they have documented recover value, business ownership uncertainty, money or pricing risk, or canonical route relevance.

| File | Classification | Reason |
| --- | --- | --- |
| `components/intelligence/events-financial-bar.tsx` | uncertain | Displays revenue and margin values. Deferred under the no-delete rule for financial logic. |
| `components/intelligence/pipeline-summary-bar.tsx` | uncertain | Displays pipeline value and conversion money values. Deferred under the no-delete rule for financial logic. |
| `components/menus/clone-menu-button.tsx` | keep/recover | Menu detail docs describe duplicate/delete ownership, and menu cloning has source metadata concerns in specs. |
| `components/menus/dinner-circle-toggle.tsx` | keep/recover | Dinner circle visibility is documented as a menu-control build path and maps to an existing `visible_to_dinner_circle` field. |
| `components/menus/dish-frequency-chart.tsx` | keep/recover | `docs/specs/operational-workflow-interrogation.md` explicitly says it exists but is not wired, and recommends recovery into client profile. |
| `components/menus/menu-history-timeline.tsx` | uncertain | Overlaps client menu history but includes log and feedback mutation behavior, so ownership needs a product decision before pruning. |
| `components/menus/menu-pdf-button.tsx` | keep/recover | Menu PDF generation is a real document capability and canonical menu routes mention printable menu output. |
| `components/menus/quick-price-calculator.tsx` | uncertain | Pricing and money-adjacent UI. Deferred under the no-delete rule for pricing logic. |
| `components/menus/save-as-template-button.tsx` | keep/recover | Menu template behavior is a canonical menu workflow. Existing settings template surface is FOH-template specific, not proof this component is obsolete. |
| `components/menus/template-library.tsx` | keep/recover | Menu assembly docs describe template sourcing. Existing FOH settings owner is not equivalent enough to delete this seasonal menu-template browser. |
