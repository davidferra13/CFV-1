# Public Layer - Static Cache Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Vercel CDN Caching

- **Static assets** (`/_next/static/*`): Cached for 1 year (immutable)
- **HTML pages** (SSG): Cached with `stale-while-revalidate`
- **API routes**: NOT cached (dynamic)

---

## Cache Headers

```
Cache-Control: public, max-age=31536000, immutable
```

---

**Status**: Vercel handles caching automatically for V1.
