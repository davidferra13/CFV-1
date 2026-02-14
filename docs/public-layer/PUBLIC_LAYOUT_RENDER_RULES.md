# Public Layer - Layout Render Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Layout File

**File**: `app/(public)/layout.tsx`

```tsx
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
```

---

## Render Rules

1. Header and Footer MUST render on ALL public pages
2. Layout MUST be a Server Component (no client-side state)
3. `<main>` MUST be semantic HTML element (not `<div>`)
4. Flex layout ensures footer stays at bottom

---

**Status**: LOCKED for V1.
