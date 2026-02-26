# Visual Polish Batch 2 - Component Color Standardization

**Date:** 2026-02-16
**Phase:** Visual Polish
**Scope:** 16 component files reviewed; 12 files updated, 4 files unchanged

## What Changed

Replaced all `gray-*` Tailwind color classes with `stone-*` and all `blue-*` accent/brand classes with `brand-*` across the component layer. This continues the design system migration started in Batch 1, extending the warm-neutral + branded palette into the feature-level components.

### Color Mapping Applied

| Original              | Replacement          | Usage                                 |
| --------------------- | -------------------- | ------------------------------------- |
| `gray-*` (all shades) | `stone-*`            | Neutral text, borders, backgrounds    |
| `blue-600/700`        | `brand-600/700`      | Primary action links, CTA backgrounds |
| `text-blue-600`       | `text-brand-600`     | Accent text, active tab indicators    |
| `bg-blue-50`          | `bg-brand-50`        | Info/highlight backgrounds            |
| `bg-blue-100`         | `bg-brand-100`       | Hover states                          |
| `border-blue-*`       | `border-brand-*`     | Accent borders, selected states       |
| `focus:ring-blue-*`   | `focus:ring-brand-*` | Focus ring on interactive elements    |

### Unchanged Colors (Semantic)

- `red-*` -- Errors, danger, allergy alerts, cancellation
- `green-*` -- Success states, checkmarks
- `amber-*` -- Warnings, fragile urgency
- `yellow-*` -- Inferred confidence indicators

## Files Updated (12)

1. **`components/events/event-transitions.tsx`** -- Terminal state text, help text
2. **`components/quotes/quote-form.tsx`** -- Pricing history card (bg, text, border), section headers, checkbox styling
3. **`components/quotes/quote-transitions.tsx`** -- Terminal state text, help text
4. **`components/inquiries/inquiry-form.tsx`** -- Smart Fill link, section headers, helper text
5. **`components/inquiries/inquiry-transitions.tsx`** -- Terminal state text, help text
6. **`components/stripe/payment-form.tsx`** -- Payment amount card (bg, text, border), footer text
7. **`components/dashboard/work-surface.tsx`** -- Summary bar, urgency styles, work item rows, empty state CTA
8. **`components/import/smart-import-hub.tsx`** -- Tab navigation, review cards, field rows, loading spinner, all sub-sections
9. **`components/import/smart-fill-modal.tsx`** -- Modal title, close button
10. **`components/aar/aar-form.tsx`** -- Rating selectors (selected/unselected), section headers, forgotten item checkboxes
11. **`components/documents/document-section.tsx`** -- Document rows, separators, help text

## Files Unchanged (5)

1. **`components/events/event-form.tsx`** -- Uses component abstractions (Input, Select, Button, Card, Alert) with no direct gray/blue Tailwind classes
2. **`components/events/event-status-badge.tsx`** -- Uses Badge component with variant props; no color classes to change
3. **`components/events/event-closure-actions.tsx`** -- Uses component abstractions only; no direct color classes
4. **`components/quotes/quote-status-badge.tsx`** -- Uses Badge component with variant props; no color classes to change
5. **`components/inquiries/inquiry-status-badge.tsx`** -- Uses Badge component with variant props; no color classes to change

## Why This Matters

- Establishes a warm, professional tone across the entire chef-facing interface
- `stone` provides a warmer neutral than `gray`, aligning with the culinary/hospitality brand identity
- `brand` token allows changing the primary accent color in one place (tailwind.config) without touching component files
- Semantic colors (red, green, amber) are intentionally preserved -- they carry safety/urgency meaning and should never change with branding

## Verification

A ripgrep scan confirmed zero remaining `gray-` or `blue-` Tailwind class references across all 12 updated files. The only remaining `blue-` references are in the Stripe theme configuration (`colorPrimary: '#2563eb'` in payment-form.tsx), which is a JavaScript value passed to the Stripe Elements SDK and is not a Tailwind class.

## Connects To

- Batch 1 covered base UI components (Button, Card, Input, Badge, etc.)
- The `brand` token is defined in `tailwind.config.ts` as part of the extended colors
- Next batch should target page-level layouts and remaining one-off files
