# Public Layer - Inquire Page Layout

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Route

**Path**: `/inquire`
**File**: `app/(public)/inquire/page.tsx`
**Render**: Static Site Generation (SSG)

---

## Layout Structure

```tsx
<div className="container max-w-2xl mx-auto">
  <PageHeader />
  <InquiryForm />
  {success && <SuccessMessage />}
  {error && <ErrorMessage />}
</div>
```

---

## Page Header
- **Title**: "Contact Us"
- **Subtitle**: "Have questions? We'd love to hear from you."

---

## Form Placement
- Centered on page
- Max width: 600px (readable, not too wide)
- White background with subtle border/shadow

---

## Mobile Layout
- Full-width form on mobile
- Stack form fields vertically
- Large touch-friendly buttons

---

**Status**: LOCKED for V1.
