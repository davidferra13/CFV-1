# Public Layer - Inquiry Rate Limiting

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Rate Limit Rules

**Limit**: 3 submissions per IP address per hour
**Window**: Rolling 1-hour window
**Response**: 429 Too Many Requests

---

## Implementation

```typescript
const submissionCache = new Map<string, number[]>();

export async function checkRateLimit(ip: string): Promise<boolean> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Get recent submissions for this IP
  const recentSubmissions = submissionCache.get(ip)?.filter(t => t > oneHourAgo) || [];

  if (recentSubmissions.length >= 3) {
    return false; // Rate limit exceeded
  }

  // Record this submission
  submissionCache.set(ip, [...recentSubmissions, now]);

  return true; // Allowed
}

// Usage
const ip = req.headers.get('x-forwarded-for') || 'unknown';
const allowed = await checkRateLimit(ip);

if (!allowed) {
  return { error: 'Too many submissions. Please try again in an hour.' };
}
```

---

## IP Address Extraction

```typescript
function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
```

---

**Status**: Rate limiting is LOCKED for V1.
