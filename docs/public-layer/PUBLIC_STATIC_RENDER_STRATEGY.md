# Public Layer - Static Render Strategy

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Static Site Generation (SSG)

ALL marketing pages MUST use SSG:
- `/`
- `/services`
- `/how-it-works`
- `/pricing`
- `/terms`
- `/privacy`

---

## Implementation

```tsx
// No data fetching = automatic SSG
export default function HomePage() {
  return <Hero />;
}
```

---

## Benefits

- Instant page load (pre-rendered at build time)
- No database queries on request
- Served from Vercel CDN (global edge network)
- Perfect Lighthouse scores

---

## Verification

```bash
npm run build
# Check .next/server/app/(public)/page.html exists
```

---

**Status**: LOCKED for V1.
