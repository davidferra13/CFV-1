# Build Pipeline

**Document ID**: 044
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines the build process for ChefFlow V1.

---

## Build Command

```bash
npm run build
```

**Equivalent**:
```bash
next build
```

---

## Build Steps

1. **TypeScript Compilation**: `tsc --noEmit` (type checking)
2. **Next.js Build**: Route generation, optimization
3. **Output**: `.next/` directory

---

## Build Verification

**Local**:
```bash
npm run build
npm run start  # Production mode locally
```

**Expected**: Application loads at `http://localhost:3000`

---

## Vercel Build

**Automatic**: On push to `main` branch

**Command**: Same as local (`npm run build`)

**Environment**: Uses Vercel environment variables

---

## References

- **Deployment Model**: `045-deployment-model.md`
- **Vercel Hosting Model**: `046-vercel-hosting-model.md`
