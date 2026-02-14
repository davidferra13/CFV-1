# Public Layer - Signin Flow

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines the detailed signin flow for both chefs and clients, including UI, validation, error handling, and post-signin routing.

---

## Signin Page Overview

**Route**: `/signin`
**File**: `app/(public)/signin/page.tsx`
**Authentication**: Public (unauthenticated users only)
**Redirect**: Authenticated users redirected to portal (middleware)

---

## UI Components

### Page Layout
```tsx
export default function SigninPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <h1 className="text-3xl font-bold">Sign In to ChefFlow</h1>
        <SigninForm />
        <div className="text-center">
          <Link href="/signup">Don't have an account? Sign up</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
```

---

### Form Fields

#### Email Input
```tsx
<input
  type="email"
  name="email"
  placeholder="you@example.com"
  required
  autoComplete="email"
  className="..."
/>
```

**Validation**:
- Required field
- HTML5 email format validation
- Trimmed whitespace

---

#### Password Input
```tsx
<input
  type="password"
  name="password"
  placeholder="••••••••"
  required
  autoComplete="current-password"
  minLength={8}
  className="..."
/>
```

**Validation**:
- Required field
- Minimum 8 characters (enforced by Supabase)

---

#### Submit Button
```tsx
<button type="submit" disabled={isPending}>
  {isPending ? 'Signing in...' : 'Sign In'}
</button>
```

---

## Client-Side Validation

### Zod Schema
```typescript
import { z } from 'zod';

export const signinSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SigninFormData = z.infer<typeof signinSchema>;
```

---

### Form Component (Client)
```tsx
'use client';
import { useState } from 'react';
import { signinAction } from './actions';

export function SigninForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);

    const result = await signinAction(formData);

    if (result.error) {
      setError(result.error);
      setIsPending(false);
    } else {
      // Success - middleware will redirect
    }
  }

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
```

---

## Server-Side Logic

### Server Action
```typescript
'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/get-user-role';
import { signinSchema } from './schema';

export async function signinAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // Validate input
  const validated = signinSchema.safeParse({ email, password });
  if (!validated.success) {
    return { error: 'Invalid email or password' };
  }

  // Authenticate with Supabase
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email.trim().toLowerCase(),
    password: validated.data.password,
  });

  if (error) {
    console.error('Signin failed', { email, error: error.message });
    return { error: 'Invalid email or password' };
  }

  // Get user role
  const role = await getUserRole(data.user.id);

  if (!role) {
    console.error('Orphaned account detected', { userId: data.user.id });
    redirect('/error?code=no_role');
  }

  // Redirect based on role
  if (role === 'chef') {
    redirect('/dashboard');
  } else {
    redirect('/my-events');
  }
}
```

---

## Flow Diagram

```
User visits /signin
  ↓
[Middleware Check]
  Is user already signed in?
    YES → Redirect to portal
    NO → Continue
  ↓
Render signin page
  ↓
User enters email + password
  ↓
[Client Validation]
  Valid? NO → Show inline errors
  Valid? YES → Continue
  ↓
Submit form (Server Action)
  ↓
[Server Validation]
  Valid? NO → Return error
  Valid? YES → Continue
  ↓
Call Supabase Auth signInWithPassword()
  ↓
[Authentication Check]
  Invalid credentials? → Return "Invalid email or password"
  Valid credentials? → Create session
  ↓
Query user_roles table
  ↓
[Role Check]
  role = NULL → Redirect to /error?code=no_role
  role = 'chef' → Redirect to /dashboard
  role = 'client' → Redirect to /my-events
```

---

## Error Handling

### Invalid Credentials
**Trigger**: Email or password is incorrect
**Message**: "Invalid email or password"
**Display**: Inline error below form
**Behavior**: Allow retry (no lockout until 5 attempts)

---

### Orphaned Account
**Trigger**: User exists in auth.users but NOT in user_roles
**Message**: "Your account is incomplete. Please contact support."
**Display**: Redirect to `/error?code=no_role`
**Behavior**: Block signin, require manual fix

---

### Network Error
**Trigger**: Network failure, Supabase unavailable
**Message**: "Unable to sign in. Please check your connection and try again."
**Display**: Inline error below form
**Behavior**: Allow retry

---

### Rate Limiting (Supabase)
**Trigger**: 5+ failed attempts in short period
**Message**: "Too many attempts. Please try again in 5 minutes."
**Display**: Inline error below form
**Behavior**: Temporary lockout (Supabase manages this)

---

## Success Flow

### After Successful Signin
1. Supabase creates session (cookie set automatically)
2. Server Action queries `user_roles` table
3. Server Action calls `redirect()` to appropriate portal
4. Next.js performs redirect (307 Temporary Redirect)
5. User lands on portal page (authenticated)

---

## Password Reset Link

### "Forgot Password?" Link
**Location**: Below signin form
**Route**: Handled by Supabase (hosted reset page)

**Flow**:
```tsx
<Link href="/forgot-password">Forgot password?</Link>
```

```tsx
// app/(public)/forgot-password/page.tsx
'use client';
export default function ForgotPasswordPage() {
  async function handleReset(formData: FormData) {
    const email = formData.get('email') as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (!error) {
      alert('Check your email for a password reset link');
    }
  }

  return (
    <form action={handleReset}>
      <input type="email" name="email" required />
      <button type="submit">Send Reset Link</button>
    </form>
  );
}
```

**V1**: Use Supabase default (minimal implementation)
**V1.1**: Branded password reset experience

---

## Signup Link

### "Don't have an account? Sign up"
**Location**: Below signin form
**Route**: `/signup`

```tsx
<Link href="/signup" className="text-blue-500">
  Don't have an account? Sign up
</Link>
```

---

## Accessibility

### Keyboard Navigation
- Tab through fields in logical order (email → password → submit)
- Enter key submits form

### Screen Reader Support
- Label elements for all inputs
- ARIA attributes for error messages
- Focus management (focus on error message when shown)

### Implementation
```tsx
<label htmlFor="email">Email</label>
<input id="email" name="email" type="email" aria-describedby="email-error" />
{emailError && <p id="email-error" role="alert">{emailError}</p>}
```

---

## Security Considerations

### CSRF Protection
- Server Actions automatically include CSRF tokens (Next.js built-in)

### Password Visibility Toggle (Optional)
```tsx
const [showPassword, setShowPassword] = useState(false);

<input type={showPassword ? 'text' : 'password'} />
<button type="button" onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? 'Hide' : 'Show'}
</button>
```

### No Email Enumeration
- Return same error message for "email not found" and "wrong password"
- Prevents attackers from discovering valid email addresses

---

## Performance

### Page Load
- Static page (SSG) - instant load
- Minimal JavaScript (form validation only)
- No external dependencies

### Signin Speed
- Target: <500ms from submit to redirect
- Supabase Auth is fast (<200ms typical)

---

## Testing Scenarios

### Test 1: Happy Path (Chef)
1. Visit /signin
2. Enter valid chef email + password
3. Submit form
4. Verify redirect to /dashboard
5. Verify session cookie is set

---

### Test 2: Happy Path (Client)
1. Visit /signin
2. Enter valid client email + password
3. Submit form
4. Verify redirect to /my-events
5. Verify session cookie is set

---

### Test 3: Invalid Password
1. Visit /signin
2. Enter valid email + wrong password
3. Submit form
4. Verify error: "Invalid email or password"
5. Verify NO redirect (stay on /signin)

---

### Test 4: Invalid Email
1. Visit /signin
2. Enter non-existent email + any password
3. Submit form
4. Verify error: "Invalid email or password" (same as wrong password)

---

### Test 5: Empty Fields
1. Visit /signin
2. Leave email or password empty
3. Submit form
4. Verify HTML5 validation error ("This field is required")

---

### Test 6: Already Signed In
1. Sign in as chef
2. Visit /signin (while signed in)
3. Verify middleware redirects to /dashboard (no signin page shown)

---

## Related Documents

- [PUBLIC_AUTH_OVERVIEW.md](./PUBLIC_AUTH_OVERVIEW.md) - High-level auth architecture
- [PUBLIC_SIGNUP_FLOW.md](./PUBLIC_SIGNUP_FLOW.md) - Signup implementation
- [PUBLIC_ROLE_RESOLUTION_FLOW.md](./PUBLIC_ROLE_RESOLUTION_FLOW.md) - Role resolution details
- [PUBLIC_AUTH_REDIRECT_RULES.md](./PUBLIC_AUTH_REDIRECT_RULES.md) - Post-auth routing

---

**Status**: This signin flow is LOCKED for V1.
