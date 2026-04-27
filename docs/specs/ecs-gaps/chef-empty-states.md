# ECS Gap: Chef Portal Empty States

> Source: ECS Scorecard 2026-04-27 | User Type: Chef (85/100) | Dimension: Polish (15/20)

## Problem
Only 9 files reference EmptyState components. Many list pages show blank when data is absent, which violates the Zero Hallucination rule (showing nothing when it should show an empty state).

## Spec
Audit every list/table page in the chef portal. For each that renders a table or grid without an empty state, add one.

## Pattern
Use existing empty state components (NoQuotesIllustration, NoClientsIllustration, etc.) or create simple ones:
```tsx
{items.length === 0 && (
  <div className="text-center py-12 text-stone-400">
    <IconComponent className="mx-auto h-12 w-12 mb-3" />
    <p className="text-lg font-medium">No [items] yet</p>
    <p className="text-sm mt-1">Create your first [item] to get started.</p>
    <Button href="/path/to/create" className="mt-4">Create [Item]</Button>
  </div>
)}
```

## Priority Sections
1. Culinary pages (recipes, menus, ingredients)
2. Finance pages (invoices, expenses, reports)
3. Operations pages (events, calendar)
4. Network pages (connections, collab spaces)

## Acceptance
- Every table/list page has a meaningful empty state
- Empty states include a CTA to create the first item
- No blank pages when data is absent
