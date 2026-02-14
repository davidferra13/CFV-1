# Public Layer - Inquiry Idempotency Model

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Prevents duplicate inquiry submissions within a short time window (accidental double-clicks, browser back button, network retries).

---

## Implementation Strategy

### Hash-Based Idempotency

**Logic**:
1. Create hash of submission data (email + message)
2. Check if hash exists in recent submissions cache (5-minute window)
3. If duplicate, return cached response (don't insert again)
4. If unique, process normally and cache response

---

## Code Implementation

```typescript
import { createHash } from 'crypto';

const idempotencyCache = new Map<string, {
  timestamp: number;
  response: any;
}>();

export async function submitInquiryWithIdempotency(data: InquirySchemaType) {
  // Create unique hash
  const hash = createHash('sha256')
    .update(data.email + data.message)
    .digest('hex');

  // Check cache
  const cached = idempotencyCache.get(hash);
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  if (cached && cached.timestamp > fiveMinutesAgo) {
    console.log('Duplicate submission detected', { email: data.email });
    return cached.response; // Return cached response
  }

  // Process new submission
  const response = await insertInquiry(data);

  // Cache response for 5 minutes
  idempotencyCache.set(hash, {
    timestamp: Date.now(),
    response,
  });

  // Clean old cache entries (prevent memory leak)
  cleanupCache();

  return response;
}

function cleanupCache() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  for (const [hash, entry] of idempotencyCache.entries()) {
    if (entry.timestamp < fiveMinutesAgo) {
      idempotencyCache.delete(hash);
    }
  }
}
```

---

## Cache Window

**Duration**: 5 minutes
**Rationale**: Long enough to catch accidental double-submits, short enough to allow legitimate re-submissions after corrections.

---

## Cache Cleanup

**Trigger**: Every submission
**Method**: Remove entries older than 5 minutes
**Purpose**: Prevent memory leak in long-running server

---

## Alternative: Database-Based Idempotency

```sql
-- Add unique constraint on hash
ALTER TABLE inquiries ADD COLUMN submission_hash TEXT UNIQUE;

-- On insert, check for duplicate hash within 5 minutes
SELECT id FROM inquiries
WHERE submission_hash = $1
AND created_at > NOW() - INTERVAL '5 minutes';
```

**V1 Decision**: Use in-memory cache (simpler, faster)
**V1.1**: Consider database-based if multiple server instances

---

## Testing

```typescript
describe('Idempotency', () => {
  it('rejects duplicate submission within 5 minutes', async () => {
    const inquiry = {
      name: 'John',
      email: 'john@example.com',
      message: 'Test inquiry',
    };

    const response1 = await submitInquiry(inquiry);
    expect(response1.success).toBe(true);

    // Immediate re-submit (duplicate)
    const response2 = await submitInquiry(inquiry);
    expect(response2.success).toBe(true); // Returns cached
    expect(response2).toEqual(response1); // Same response
  });

  it('allows re-submission after 5 minutes', async () => {
    const inquiry = {
      name: 'John',
      email: 'john@example.com',
      message: 'Test inquiry',
    };

    await submitInquiry(inquiry);

    // Fast-forward 6 minutes
    jest.advanceTimersByTime(6 * 60 * 1000);

    // Re-submit (should be allowed)
    const response = await submitInquiry(inquiry);
    expect(response.success).toBe(true);
  });
});
```

---

**Status**: Idempotency model is LOCKED for V1.
