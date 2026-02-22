# Page Info System — Annotated Schematic Overlay

## What It Is

A site-wide contextual help system. Every page has a small info button in the bottom-left corner. When clicked, a transparent overlay covers the page and labels point at real UI elements explaining what each one does — like a teacher pointing at a diagram.

## Architecture

### Files

| File                             | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `components/ui/page-info.tsx`    | The `PageInfoButton` component — button + overlay + route matching |
| `lib/help/page-info-registry.ts` | Content registry mapping routes to help entries                    |
| `app/(chef)/layout.tsx`          | Renders `<PageInfoButton />` for all chef pages                    |
| `app/(client)/layout.tsx`        | Renders `<PageInfoButton />` for all client pages                  |
| `app/(public)/layout.tsx`        | Renders `<PageInfoButton />` for all public pages                  |
| `app/(admin)/layout.tsx`         | Renders `<PageInfoButton />` for all admin pages                   |

### Two Rendering Modes

1. **Schematic Mode** — when the registry entry has `annotations[]`, a transparent overlay covers the page and labels point at real elements using CSS selectors.

2. **Summary Mode** — when no annotations exist, a simple card shows the page title, description, and feature list.

## How to Add Help to a New Page

### Step 1: Add a registry entry

In `lib/help/page-info-registry.ts`, add an entry keyed by the route path:

```ts
'/my-new-page': {
  title: 'My New Page',
  description: 'What this page does in one sentence.',
  features: [
    'Feature one',
    'Feature two',
    'Feature three',
  ],
},
```

For dynamic routes, use `[id]`:

```ts
'/events/[id]/my-subpage': { ... }
```

### Step 2 (optional): Add annotations for schematic mode

Add `data-info` attributes to key elements on the page:

```tsx
<div data-info="my-section" className="...">
  {/* section content */}
</div>
```

Then add matching annotations to the registry entry:

```ts
'/my-new-page': {
  title: 'My New Page',
  description: '...',
  features: ['...'],
  annotations: [
    {
      selector: '[data-info="my-section"]',
      label: 'My Section',
      description: 'What this section does',
    },
    {
      selector: 'h1',
      label: 'Page Title',
      description: 'Shows which page you\'re on',
    },
  ],
},
```

### Selector options

- `[data-info="name"]` — custom attribute (preferred, most reliable)
- `h1` — tag name (good for unique elements)
- `#invite` — element ID (use existing IDs)
- `.my-class` — CSS class (avoid, fragile)

### Position hint

Annotations accept an optional `position` to control label placement:

```ts
{ selector: '...', label: '...', description: '...', position: 'top' }
```

Options: `'top'` | `'bottom'` | `'left'` | `'right'`. Omit for auto-detection.

## Design Details

- **Button**: 36px circle, `bg-stone-100/60`, stone-400 icon, bottom-left corner
- **z-index**: Button at z-30, overlay at z-40 (below modals at z-50)
- **Mobile**: Button positioned above the bottom tab bar (`bottom-20`)
- **Close**: Escape key, X button, or click the backdrop
- **Dark mode**: Full dark mode support via Tailwind `dark:` classes
- **No entry = no button**: Pages without registry entries don't show the button

## Current Coverage

All ~451 pages have registry entries with summary mode. Schematic annotations (with `data-info` attributes) are currently on:

- `/dashboard` — next action, week strip, priority queue, financial snapshot
- `/clients` — client table
- `/events` — view toggle, new event button

To add schematic annotations to more pages, follow the steps above.
