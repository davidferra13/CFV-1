# Server-Client Rules

**Document ID**: 007
**Version**: 1.0
**Status**: LOCKED
**Last Updated**: 2026-02-14

## Purpose

This document defines the deterministic rules governing what code runs on the server vs client, and how data flows between them.

## Fundamental Law

**Default Execution Location**: Server

ALL code executes on the server UNLESS:
1. Marked with `'use client'` directive
2. Imported by a client component
3. Uses browser-only APIs (triggers automatic client boundary)

## Server-Side Execution

### What Runs on Server

1. **All Components** (default)
   - Pages (`page.tsx`)
   - Layouts (`layout.tsx`)
   - Regular components (no `'use client'`)

2. **Server Actions**
   - Functions marked with `'use server'`
   - All exports in files with top-level `'use server'`

3. **API Routes**
   - `route.ts` files in `/app/api`

4. **Middleware**
   - `middleware.ts` (Edge runtime)

5. **Library Functions**
   - Functions in `/lib` (unless imported by client component)

### Server-Only Capabilities

**Database Access**:
```typescript
// Server component or server action
import { createServerClient } from '@/lib/supabase/server';

const supabase = createServerClient(); // Service role key (bypasses RLS)
const { data } = await supabase.from('events').select('*');
```

**Environment Variables** (ALL):
```typescript
// Server-side
const secretKey = process.env.STRIPE_SECRET_KEY; // Accessible
const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // Also accessible
```

**Node.js APIs**:
```typescript
import fs from 'fs';
import path from 'path';

// Only allowed server-side
const data = fs.readFileSync(path.join(process.cwd(), 'data.json'));
```

**Secrets** (Service Role Keys, API Keys):
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // Server-only
```

### Server-Side Rules

**RULE S-001**: NEVER expose service role key to client
- ✅ Use in server components, server actions, API routes
- ❌ NEVER import in client components
- ❌ NEVER send in response to client

**RULE S-002**: Validate ALL user input on server
- ✅ Use Zod schemas in server actions
- ❌ NEVER trust client-submitted data
- ❌ NEVER skip validation because "client already validated"

**RULE S-003**: Derive tenant_id from session, NEVER from request
```typescript
// ✅ CORRECT
const user = await getCurrentUser();
const tenantId = user.tenantId; // From database via session

// ❌ WRONG
const tenantId = formData.get('tenant_id'); // Client-controlled, NEVER trust
```

**RULE S-004**: Perform auth checks server-side
```typescript
// ✅ CORRECT (server component or action)
const user = await getCurrentUser();
if (user.role !== 'chef') {
  throw new Error('Unauthorized');
}

// ❌ WRONG (client component)
if (role !== 'chef') {
  return null; // Client-side check is NOT authoritative
}
```

---

## Client-Side Execution

### What Runs on Client

1. **Client Components**
   - Components marked with `'use client'`
   - Children of client components (implicit)

2. **Event Handlers**
   - `onClick`, `onChange`, `onSubmit`, etc.

3. **React Hooks**
   - `useState`, `useEffect`, `useRef`, etc.

4. **Browser APIs**
   - `window`, `document`, `localStorage`, `fetch`

### Client-Only Capabilities

**React Hooks**:
```typescript
'use client';

import { useState, useEffect } from 'react';

export function ClientComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <button onClick={() => setCount(count + 1)}>Increment</button>;
}
```

**Event Handlers**:
```typescript
'use client';

export function InteractiveButton() {
  const handleClick = () => {
    alert('Clicked!');
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

**Browser APIs**:
```typescript
'use client';

export function ClientOnlyComponent() {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    console.log('Window width:', window.innerWidth);
  }, []);

  return <div>Client Component</div>;
}
```

**Public Environment Variables** (ONLY):
```typescript
// Client-side (component or browser console)
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // Accessible
const secretKey = process.env.STRIPE_SECRET_KEY; // undefined (not accessible)
```

### Client-Side Rules

**RULE C-001**: NEVER include secrets in client bundles
- ✅ Use `NEXT_PUBLIC_*` for safe-to-expose values
- ❌ NEVER use non-prefixed env vars in client components
- ❌ NEVER hardcode API keys in client code

**RULE C-002**: NEVER query database directly from client
```typescript
// ❌ WRONG (client component)
'use client';
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();
const { data } = await supabase.from('events').select('*'); // Uses anon key, RLS enforced (OK)

// But: Client should use server actions instead
```

**Note**: While technically possible to query Supabase from client (with anon key + RLS), V1 prefers server actions for consistency and auditability.

**RULE C-003**: Client-side validation is UX-only, NOT security
```typescript
'use client';

export function EventForm() {
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Client-side validation (UX, fast feedback)
    if (title.length === 0) {
      setError('Title required');
      return;
    }

    // ✅ Call server action (server re-validates)
    await createEvent(formData);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**RULE C-004**: Minimize client components
- ✅ Use server components by default
- ❌ NEVER mark component `'use client'` unless necessary
- ✅ Extract interactive parts into small client components ("islands")

---

## Data Flow Rules

### Server → Client

**RULE D-001**: Pass data via props (server component → client component)
```typescript
// Server component
import { ClientComponent } from './client';

export async function ServerWrapper() {
  const data = await fetchDataFromDB(); // Server-side fetch

  return <ClientComponent data={data} />; // Pass via props
}

// Client component
'use client';

export function ClientComponent({ data }: { data: Data }) {
  // Use data (already fetched server-side)
  return <div>{data.title}</div>;
}
```

**RULE D-002**: NEVER serialize sensitive data in props
```typescript
// ❌ WRONG (server component)
export async function ServerWrapper() {
  const user = await getUserWithPassword(); // Includes password hash

  return <ClientComponent user={user} />; // Sends password hash to client!
}

// ✅ CORRECT (server component)
export async function ServerWrapper() {
  const user = await getUserWithPassword();
  const safeUser = { id: user.id, email: user.email }; // Omit sensitive fields

  return <ClientComponent user={safeUser} />;
}
```

### Client → Server

**RULE D-003**: Use server actions for mutations (client → server)
```typescript
// Server action
'use server';

export async function createEvent(formData: FormData) {
  // Server-side validation, mutation
}

// Client component
'use client';

import { createEvent } from '@/actions/event-actions';

export function CreateEventForm() {
  return (
    <form action={createEvent}>
      {/* Form fields */}
      <button type="submit">Create</button>
    </form>
  );
}
```

**RULE D-004**: NEVER pass functions from server → client
```typescript
// ❌ WRONG (server component)
export async function ServerWrapper() {
  const handleClick = () => {
    // Server-side function
  };

  return <ClientComponent onClick={handleClick} />; // Cannot serialize function!
}

// ✅ CORRECT (use server action instead)
// Server action
'use server';
export async function handleClick() {
  // Server logic
}

// Server component
export async function ServerWrapper() {
  return <ClientComponent />; // Client imports and calls server action
}

// Client component
'use client';
import { handleClick } from '@/actions';

export function ClientComponent() {
  return <button onClick={() => handleClick()}>Click</button>;
}
```

---

## Execution Context Boundaries

### Server Contexts

| Context | Runtime | Capabilities | Use Case |
|---------|---------|--------------|----------|
| Server Component | Node.js | Full (DB, secrets, Node APIs) | Data fetching, rendering |
| Server Action | Node.js | Full (DB, secrets, Node APIs) | Mutations |
| API Route | Node.js | Full (DB, secrets, Node APIs) | Webhooks, external APIs |
| Middleware | Edge | Limited (no Node.js APIs) | Auth, redirects |

### Client Contexts

| Context | Runtime | Capabilities | Use Case |
|---------|---------|--------------|----------|
| Client Component | Browser | Limited (no DB, no secrets) | Interactivity, forms |
| Event Handler | Browser | Limited (no DB, no secrets) | User actions |
| Browser Script | Browser | Limited (no DB, no secrets) | Third-party libs (Stripe) |

---

## Environment Variable Rules

### Naming Convention

**Server-Only**:
```bash
STRIPE_SECRET_KEY=sk_live_xxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**Client-Accessible** (prefix with `NEXT_PUBLIC_`):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

### Access Rules

**Server-Side** (can access ALL):
```typescript
const secretKey = process.env.STRIPE_SECRET_KEY; // ✅ Accessible
const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // ✅ Accessible
```

**Client-Side** (can access ONLY `NEXT_PUBLIC_*`):
```typescript
const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY; // ✅ Accessible
const secretKey = process.env.STRIPE_SECRET_KEY; // ❌ undefined
```

### Validation

**RULE E-001**: Validate environment variables at build time
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
});

export const env = envSchema.parse(process.env);
```

---

## Security Enforcement

### Secret Leakage Prevention

**RULE SEC-001**: Grep codebase for secrets in client code
```bash
# Check for service role key in client components
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/ | grep "'use client'"

# Expected result: Zero matches
```

**RULE SEC-002**: Never log secrets
```typescript
// ❌ WRONG
console.log('Secret key:', process.env.STRIPE_SECRET_KEY);

// ✅ CORRECT
console.log('Stripe configured:', !!process.env.STRIPE_SECRET_KEY);
```

### Bundle Analysis

**RULE SEC-003**: Check bundle for exposed secrets (pre-deployment)
```bash
# Build and analyze bundle
npm run build
npx @next/bundle-analyzer

# Manually inspect client bundles for secret keys
```

---

## Progressive Enhancement

### Forms Without JavaScript

**RULE PE-001**: Forms MUST work without JavaScript (using server actions)
```typescript
// Server action
'use server';
export async function createEvent(formData: FormData) {
  // Process form
  redirect('/events'); // Redirect after success
}

// Server component (NO 'use client')
export function CreateEventForm() {
  return (
    <form action={createEvent}>
      <input name="title" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Result**: Form submits to server action even if JavaScript is disabled.

### Enhanced with Client Components

**RULE PE-002**: Add client interactivity as enhancement (not requirement)
```typescript
// Client component (enhanced version)
'use client';

import { createEvent } from '@/actions/event-actions';
import { useState } from 'react';

export function CreateEventFormEnhanced() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default (JavaScript enabled)
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    await createEvent(formData);

    setLoading(false);
    // Show success message, etc.
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

**Result**:
- JavaScript enabled: Enhanced UX (loading state, no full page reload)
- JavaScript disabled: Still works (falls back to server action POST)

---

## TypeScript Integration

### Server-Client Type Safety

**RULE TS-001**: Server action types are inferred by client
```typescript
// Server action
'use server';

export async function createEvent(
  formData: FormData
): Promise<{ id: string; title: string }> {
  // ...
  return event;
}

// Client component (TypeScript knows return type)
'use client';

import { createEvent } from '@/actions/event-actions';

export function ClientComponent() {
  const handleClick = async () => {
    const event = await createEvent(formData);
    console.log(event.id); // ✅ TypeScript knows event has id property
  };

  return <button onClick={handleClick}>Create</button>;
}
```

### Props Serialization

**RULE TS-002**: Props passed to client components MUST be serializable
```typescript
// ❌ WRONG (function not serializable)
type Props = {
  onClick: () => void; // Function
};

// ❌ WRONG (Date not serializable)
type Props = {
  createdAt: Date; // Date object
};

// ✅ CORRECT (primitives, arrays, plain objects only)
type Props = {
  title: string;
  count: number;
  tags: string[];
  metadata: { key: string; value: string }[];
  createdAt: string; // ISO string, not Date object
};
```

---

## Debugging

### Identifying Execution Location

**RULE DEBUG-001**: Use console.log with location label
```typescript
// Server component or action
console.log('[SERVER]', 'User:', user);

// Client component or handler
console.log('[CLIENT]', 'User:', user);
```

**Result**:
- Server logs: Appear in terminal (Vercel logs, local console)
- Client logs: Appear in browser DevTools console

### Common Errors

**Error**: "You're importing a component that needs useState..."
**Cause**: Server component imports client component without `'use client'`
**Fix**: Add `'use client'` to imported component

**Error**: "Cannot access process.env.STRIPE_SECRET_KEY in client component"
**Cause**: Client component tries to access server-only env var
**Fix**: Move logic to server action

**Error**: "Cannot serialize function"
**Cause**: Passing function from server → client as prop
**Fix**: Use server action instead

---

**Authority**: These server-client rules are enforced by Next.js 14 App Router. Violations result in runtime or build errors.
