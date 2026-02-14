# Error Boundaries and Fail Closed (V1)

This document defines how errors are handled and the "fail closed" principle.

---

## 1) Fail Closed Principle

**When something is uncertain or fails, the system must deny access or freeze state** rather than proceeding optimistically.

**Examples:**

✅ **Fail Closed (Correct):**
- If role is unknown → deny access
- If webhook is delayed → show "processing" (don't assume success)
- If transition is invalid → reject (don't silently skip)

❌ **Fail Open (Wrong):**
- If role is unknown → default to 'client' and allow access
- If webhook fails → mark payment as succeeded anyway
- If validation fails → proceed without validation

---

## 2) React Error Boundaries

**Purpose:** Catch JavaScript errors in component tree and show fallback UI

**Implementation:**

```typescript
// app/error.tsx (route-level error boundary)
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Behavior:**
- Catches errors in child components
- Shows user-friendly error message
- Provides "Try again" option (calls reset)

---

## 3) Server Action Error Handling

**Pattern:**

```typescript
'use server';

export async function createEvent(input: unknown) {
  try {
    const validated = schema.parse(input);
    const user = await getUser();
    const roleData = await getUserRole(user.id);

    if (!roleData) {
      throw new Error('No role assigned');
    }

    const event = await db.events.create({ ... });
    return { success: true, event };
  } catch (error) {
    console.error('createEvent error:', error);
    return { success: false, error: error.message };
  }
}
```

**Client handles error:**

```typescript
'use client';

export function CreateEventButton() {
  const handleCreate = async () => {
    const result = await createEvent(data);

    if (!result.success) {
      toast.error(result.error); // Show error to user
      return;
    }

    toast.success('Event created');
  };
}
```

---

## 4) Authentication Errors

**If user is not authenticated:**

```typescript
const user = await getUser();
if (!user) redirect('/login'); // Fail closed
```

**If role is unknown:**

```typescript
const roleData = await getUserRole(user.id);
if (!roleData) redirect('/error?code=no_role'); // Fail closed
```

---

## 5) Authorization Errors

**If user doesn't have permission:**

```typescript
if (roleData.role !== 'chef') {
  throw new Error('Only chefs can perform this action');
}
```

**UI response:**

```typescript
try {
  await deleteEvent(eventId);
} catch (error) {
  if (error.message.includes('Only chefs')) {
    toast.error('You don't have permission');
  } else {
    toast.error('Something went wrong');
  }
}
```

---

## 6) Database Errors

**If query fails:**

```typescript
try {
  const events = await db.events.findMany({ ... });
  return events;
} catch (error) {
  console.error('Database error:', error);
  throw new Error('Failed to load events');
}
```

**Never expose raw database errors to users.**

---

## 7) Validation Errors

**If input is invalid:**

```typescript
try {
  const validated = schema.parse(input);
} catch (error) {
  if (error instanceof ZodError) {
    return {
      success: false,
      errors: error.flatten().fieldErrors,
    };
  }
}
```

**UI shows field-level errors:**

```typescript
if (!result.success && result.errors) {
  setErrors(result.errors);
}
```

---

## 8) Network Errors

**If API call fails:**

```typescript
try {
  const response = await fetch('/api/events');
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
} catch (error) {
  console.error('Network error:', error);
  toast.error('Network error. Please try again.');
}
```

---

## 9) Webhook Errors

**If webhook processing fails:**

```typescript
export async function POST(req: Request) {
  try {
    const event = await verifyWebhook(req);
    await processEvent(event);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 500 so Stripe retries
    return new Response('Error', { status: 500 });
  }
}
```

---

## 10) Error Logging

**All errors should be logged:**

```typescript
console.error('Context:', {
  userId: user?.id,
  action: 'createEvent',
  error: error.message,
  stack: error.stack,
});
```

**V1 uses console.error (logs to Vercel/hosting platform)**

**V2 will add structured logging (Sentry, LogRocket, etc.)**

---

## Summary

**The Chef Portal fails closed on all errors: authentication failures redirect to login, authorization failures show error messages, validation failures prevent submission, and database failures show user-friendly errors rather than proceeding with corrupted state.**
