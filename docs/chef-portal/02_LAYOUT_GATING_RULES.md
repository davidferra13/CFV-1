# Layout Gating Rules (V1)

Server layouts are the **second line of defense** after middleware. They re-check role before rendering any portal UI.

---

## 1) Purpose

Layout gating ensures:
- Wrong portal UI never renders (even if middleware fails)
- Role is confirmed before loading navigation
- No "flash" of wrong portal

---

## 2) Chef Portal Layout

**File:** `app/(chef)/layout.tsx`

**Implementation:**

```typescript
import { getUser, getUserRole } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ChefLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const roleData = await getUserRole(user.id);
  if (!roleData) redirect('/error?code=no_role');

  if (role !== 'chef' && role !== 'chef_subaccount') {
    redirect('/error?code=wrong_portal');
  }

  return (
    <div className="chef-portal">
      <ChefNavigation role={roleData.role} />
      {children}
    </div>
  );
}
```

---

## 3) Client Portal Layout

**File:** `app/(client)/layout.tsx`

```typescript
export default async function ClientLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const roleData = await getUserRole(user.id);
  if (!roleData) redirect('/error?code=no_role');

  if (roleData.role !== 'client') {
    redirect('/error?code=wrong_portal');
  }

  return (
    <div className="client-portal">
      <ClientNavigation />
      {children}
    </div>
  );
}
```

---

## Summary

**Layout gating re-checks role server-side before rendering portal UI, ensuring middleware bypass cannot cause wrong portal to render.**
