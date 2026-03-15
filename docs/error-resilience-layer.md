# Error Resilience Layer

**Date:** 2026-03-15
**Status:** Complete (foundation + first wave of page fixes)

## What Changed

ChefFlow has 15+ critical server-rendered pages using `Promise.all()` with zero error handling. Before this work:

- If any single Supabase query failed (timeout, connection drop, rate limit), the entire page crashed
- Users saw the Next.js error page instead of useful information
- No graceful degradation: one failed fetch took down all content on the page
- This violates Zero Hallucination Law 2: visible errors are always better than invisible crashes

## Architecture

```
lib/utils/safe-fetch.ts          (NEW - server-side fetch wrappers)
  safeFetch()                     single fetch → { data, error } tuple
  safeFetchAll()                  parallel fetches, all-or-nothing
  safeFetchPartial()              parallel fetches, independent results
        |
        v
components/ui/error-state.tsx    (EXISTS - inline error display with retry)
components/ui/error-boundary.tsx (NEW - React error boundary for client components)
        |
        v
5 critical pages wrapped with graceful error handling
```

## safeFetch Utility

Server-side wrapper that converts thrown exceptions into `{ data, error }` tuples. Pages can check for errors and show `<ErrorState>` instead of crashing.

### Three variants for different use cases

**`safeFetch(fn)`** - Single fetch

```tsx
const { data: menus, error } = await safeFetch(() => getMenus())
if (error) return <ErrorState title="Could not load menus" />
```

**`safeFetchAll({ ... })`** - All-or-nothing parallel fetches

When partial data is meaningless (page needs all datasets to render):

```tsx
const result = await safeFetchAll({
  menus: () => getMenus(),
  recipes: () => getRecipes(),
  components: () => getAllComponents(),
})
if (result.error) return <ErrorState title="Could not load page data" />
const { menus, recipes, components } = result.data
```

**`safeFetchPartial({ ... })`** - Independent parallel fetches

When some data is optional (weather can fail but events must load):

```tsx
const results = await safeFetchPartial({
  events: () => getEvents(), // required
  weather: () => getWeather(), // optional, may fail
})
if (results.events.error) return <ErrorState title="Could not load events" />
const weather = results.weather.data // null if failed
```

## ErrorBoundary Component

Client-side React error boundary for catching render-time crashes in client components.

```tsx
<ErrorBoundary fallback={<ErrorState title="Section failed to load" />}>
  <SomeClientComponent />
</ErrorBoundary>

// With retry callback:
<ErrorBoundary
  fallback={(reset) => (
    <ErrorState title="Something went wrong" onRetry={reset} />
  )}
>
  <SomeClientComponent />
</ErrorBoundary>
```

## Pages Fixed (First Wave)

| Page                                           | Problem                                             | Fix                           |
| ---------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| Menu Cost (`/culinary/costing/menu`)           | `Promise.all()` with 3 fetches, zero error handling | `safeFetchAll` + ErrorState   |
| Quote Detail (`/quotes/[id]`)                  | `Promise.all()` with 3 fetches, zero error handling | `safeFetchAll` + ErrorState   |
| Admin Command Center (`/admin/command-center`) | `Promise.all()` with 4 fetches, zero error handling | `safeFetchAll` + ErrorState   |
| Inquiries Pipeline (`/inquiries`)              | `getInquiries()` unprotected in `Promise.all`       | `safeFetch` on critical fetch |
| Clients List (`/clients`)                      | `getClientsWithStats()` unprotected in Suspense     | `safeFetch` on critical fetch |

## When to Use Which Pattern

**Use `safeFetchAll` when:**

- Page needs ALL data to be useful (e.g., menu cost needs menus + recipes + components)
- Partial rendering would be confusing or misleading

**Use `safeFetch` on the critical fetch when:**

- One fetch is essential but others are supplementary (e.g., inquiries page needs inquiries, but booking scores are bonus)
- Supplementary fetches already have `.catch()` fallbacks

**Use `safeFetchPartial` when:**

- Multiple independent sections on one page (e.g., dashboard widgets)
- Each section can show its own error state independently

## Remaining Pages to Fix (Prioritized)

These still have unprotected `Promise.all()` patterns:

1. **Event Detail** (`/events/[id]`) - 35+ parallel fetches, mixed protection
2. **Dashboard sections** (schedule-cards, alerts-cards, business-cards) - `Promise.all()` in Suspense children
3. **Inquiry Detail** (`/inquiries/[id]`) - 12 data sources, inconsistent error handling
4. **Recipe Book** (`/culinary/recipes`) - unprotected image placeholder fetch
5. **Cash Flow** (`/finance/cash-flow`) - `.catch(() => null)` without error UI

## Files Created

- `lib/utils/safe-fetch.ts` - safeFetch, safeFetchAll, safeFetchPartial
- `components/ui/error-boundary.tsx` - React ErrorBoundary class component
- `docs/error-resilience-layer.md` - This document

## Files Modified

- `app/(chef)/culinary/costing/menu/page.tsx` - safeFetchAll wrapper
- `app/(chef)/quotes/[id]/page.tsx` - safeFetchAll wrapper
- `app/(admin)/admin/command-center/page.tsx` - safeFetchAll wrapper
- `app/(chef)/inquiries/page.tsx` - safeFetch on critical getInquiries()
- `app/(chef)/clients/page.tsx` - safeFetch on critical getClientsWithStats()
