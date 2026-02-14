# Public Layer - Header Component Specification

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Component Location

**File**: `components/public/Header.tsx`
**Type**: Server Component

---

## Structure

```tsx
export async function PublicHeader() {
  const session = await getSession();
  const role = session ? await getUserRole(session.user.id) : null;

  return (
    <header className="sticky top-0 bg-white shadow-sm z-50">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Logo />
          <DesktopNav />
          <MobileMenuButton />
          <AuthButton session={session} role={role} />
        </nav>
      </div>
    </header>
  );
}
```

---

## Navigation Links

- Home (`/`)
- Services (`/services`)
- How It Works (`/how-it-works`)
- Pricing (`/pricing`)
- Inquire (`/inquire`)

---

## Auth Button Logic

```typescript
if (!session) {
  return <Link href="/signin">Sign In</Link>;
}

if (role === 'chef') {
  return <Link href="/dashboard">Go to Dashboard</Link>;
}

if (role === 'client') {
  return <Link href="/my-events">Go to My Events</Link>;
}
```

---

## Mobile Behavior

- Hamburger menu (≤768px)
- Slide-in or dropdown menu
- Overlay backdrop

---

**Status**: LOCKED for V1.
