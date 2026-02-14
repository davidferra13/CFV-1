# Public Layer - Inquiry Spam Protection

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Spam Protection Strategies

### 1. Honeypot Field
**Method**: Hidden input field that bots fill but humans don't
**Implementation**:
```tsx
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  style={{ position: 'absolute', left: '-9999px' }}
/>
```

**Server-Side Check**:
```typescript
if (formData.get('website')) {
  // Bot detected - fail silently
  return { success: true }; // Fake success
}
```

---

### 2. Rate Limiting
**Method**: Max 3 submissions per IP per hour
**Purpose**: Prevent automated spam floods

---

### 3. Submission Time Check (Optional, V1.1)
**Method**: Measure time between page load and submit
**Logic**: If submit happens <2 seconds after load, likely bot
**Implementation**:
```typescript
const pageLoadTime = Date.now();

// On submit
const submitTime = Date.now();
const timeDiff = submitTime - pageLoadTime;

if (timeDiff < 2000) {
  // Suspiciously fast - possible bot
  return { error: 'Please slow down' };
}
```

**V1 Decision**: NOT implemented (honeypot + rate limit sufficient)

---

### 4. CAPTCHA (NOT in V1)
**Tools**: reCAPTCHA, hCaptcha, Turnstile
**Reason NOT Used**: Adds friction, reduces conversions
**V1.1**: Add if spam becomes issue

---

**Status**: Spam protection is LOCKED for V1 (honeypot + rate limit only).
