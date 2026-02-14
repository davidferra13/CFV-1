# API Design Principles (V1)

## Server Actions > API Routes

V1 prefers **Next.js Server Actions** over traditional API routes.

```typescript
// ✅ Preferred: Server Action
'use server';

export async function createEvent(data: CreateEventInput) {
  const user = await getUser();
  // ... validation and creation
}

// ❌ Less preferred: API route (use only for webhooks, public endpoints)
// app/api/events/route.ts
```

---

## API Route Usage

API routes used **only** for:
1. Webhooks (Stripe)
2. Public endpoints (rare in V1)
3. Third-party integrations

---

## Response Format

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

---

## Error Handling

```typescript
try {
  const result = await dangerousOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return {
    success: false,
    error: {
      code: 'OPERATION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  };
}
```

---

**End of API Design Principles**
