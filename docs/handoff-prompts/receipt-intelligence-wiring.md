# Receipt Intelligence Wiring - Codex Handoff Prompts

## Status Summary

Migration applied. 5 files built. 2 wired (receipt-learning + receipt_line_items quantity/unit). 3 orphaned (recipe-scaling-engine, yield-inference, purchase-feedback). Price flag backend wired but no UI.

Two safe, additive tasks remain. One unsafe task (scaling engine reconciliation) is deferred to a senior session.

---

## Agent 1: Price Flag Resolution UI

```
Read and execute docs/specs/price-flag-resolution-ui.md

You are building a Price Flag Resolution UI for ChefFlow. The spec contains the EXACT code to write and the EXACT files to edit. Follow it precisely.

Key rules:
- Create exactly 2 new files: components/pricing/price-flag-banner.tsx and lib/pricing/get-flagged-prices.ts
- Edit exactly 1 file: app/(chef)/culinary/ingredients/page.tsx (add 2 imports, 1 data fetch call, 1 component render)
- Do NOT modify any other files. Do NOT modify lib/finance/expense-line-item-actions.ts or types/database.ts
- Use only existing UI components from components/ui/
- No em dashes anywhere
- After writing code, run: npx tsc --noEmit --skipLibCheck
- If tsc fails, fix the type errors. Do not add @ts-ignore or @ts-nocheck
- Do NOT run next build (it takes too long). Just tsc.
```

---

## Agent 2: Purchase Feedback Panel

```
Read and execute docs/specs/purchase-feedback-panel.md

You are building a Purchase Feedback Panel for ChefFlow recipe detail pages. The spec contains the EXACT code to write and the EXACT files to edit. Follow it precisely.

Key rules:
- Create exactly 1 new file: components/recipes/purchase-feedback-panel.tsx
- Edit exactly 1 file: app/(chef)/recipes/[id]/recipe-detail-client.tsx (add 1 import, 1 component render near bottom of JSX after other panels)
- Do NOT modify any other files. Do NOT modify lib/scaling/purchase-feedback.ts or types/database.ts
- Use only existing UI components from components/ui/
- The component is read-only. No mutation buttons. No toast. Just display.
- No em dashes anywhere
- After writing code, run: npx tsc --noEmit --skipLibCheck
- If tsc fails, fix the type errors. Do not add @ts-ignore or @ts-nocheck
- Do NOT run next build (it takes too long). Just tsc.
```

---

## NOT FOR CODEX (Deferred)

**Scaling Engine Reconciliation** - `lib/scaling/recipe-scaling-engine.ts`, `lib/scaling/yield-inference.ts`, and `ingredients.scaling_category` are orphaned. Wiring them requires reconciling two competing 4-category scaling models (old: bulk/flavor/structure/finishing with power curves vs new: linear/sublinear/fixed/by_pan with formula modifiers). This is an architect-level decision, not a mechanical task. Deferred to a senior Claude Code session.

**Dead import cleanup** - `lib/receipts/receipt-learning.ts` line 11 has unused `requireChef` import. Trivial but not worth an agent.
