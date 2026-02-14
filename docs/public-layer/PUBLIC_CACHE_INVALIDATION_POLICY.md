# Public Layer - Cache Invalidation Policy

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Static Page Invalidation

When content changes, redeploy to invalidate:
```bash
npm run build
vercel --prod
```

New build = new cache (Vercel handles automatically)

---

## API Route Caching

API routes are NOT cached (no invalidation needed).

---

**Status**: LOCKED for V1.
