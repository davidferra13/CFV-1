# Public Layer - Footer Component Specification

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Component Location

**File**: `components/public/Footer.tsx`
**Type**: Server Component

---

## Structure

```tsx
export function PublicFooter() {
  return (
    <footer className="bg-gray-50 border-t mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <BrandSection />
          <QuickLinks />
          <LegalLinks />
        </div>
        <Copyright />
      </div>
    </footer>
  );
}
```

---

## Sections

### Brand Section
- Logo
- Tagline: "Private Chef Management Platform"

### Quick Links
- Home
- Services
- How It Works
- Pricing
- Inquire

### Legal Links
- Terms of Service (`/terms`)
- Privacy Policy (`/privacy`)

### Copyright
- "© 2026 ChefFlow. All rights reserved."

---

**Status**: LOCKED for V1.
