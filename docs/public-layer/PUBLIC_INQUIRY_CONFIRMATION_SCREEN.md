# Public Layer - Inquiry Confirmation Screen

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Success Flow

After successful inquiry submission:

**Option 1: Redirect to Success Page**
```typescript
redirect('/inquire/success');
```

**Option 2: Inline Success Message**
```tsx
{success && (
  <div className="success-message">
    <h2>Thank you for your inquiry!</h2>
    <p>We'll be in touch soon.</p>
  </div>
)}
```

**V1 Decision**: Use Option 2 (inline message, simpler)

---

## Success Message Content

```tsx
<div className="bg-green-50 border border-green-200 p-6 rounded">
  <h2 className="text-2xl font-bold text-green-900">
    Thank you for your inquiry!
  </h2>
  <p className="text-green-700 mt-2">
    We've received your message and will respond within 24 hours.
  </p>
  <p className="text-sm text-green-600 mt-4">
    Check your email for a confirmation.
  </p>
</div>
```

---

## Post-Submit Actions

1. Show success message
2. Clear form fields (optional)
3. Scroll to top of page
4. Do NOT send confirmation email (V1 - not implemented)

---

**Status**: Confirmation screen is LOCKED for V1.
