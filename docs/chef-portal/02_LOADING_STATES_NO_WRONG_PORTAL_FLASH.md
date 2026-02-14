# Loading States and No Wrong-Portal Flash (V1)

This document defines how to handle loading states properly to prevent users from seeing the wrong portal UI during navigation or role resolution.

---

## 1) The Wrong-Portal Flash Problem

**Bad UX:**
```
User navigates to /chef/events
   ↓
Client Portal nav briefly renders
   ↓
Middleware/layout detects wrong role
   ↓
Redirects to /client
```

**User sees:** Brief flash of Chef Portal → redirect → Client Portal

**Problem:** Confusing, unprofessional, feels broken

---

## 2) Solution: Server-Side Gating

**Middleware and layouts check role BEFORE rendering any UI.**

**Because layouts are server components:**
```typescript
// app/(chef)/layout.tsx
export default async function ChefLayout({ children }) {
  const user = await getUser(); // Server-side
  const roleData = await getUserRole(user.id); // Server-side

  if (roleData.role !== 'chef' && roleData.role !== 'chef_subaccount') {
    redirect('/error'); // No UI rendered yet
  }

  return <ChefNavigation />; // Only renders if check passes
}
```

**Result:** User never sees Chef Portal UI unless they're a chef.

---

## 3) Loading Suspense

**For slow-loading pages, show loading UI:**

```typescript
// app/(chef)/events/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="spinner" />
      <p>Loading events...</p>
    </div>
  );
}
```

**Next.js automatically shows this while page loads.**

---

## 4) Skeleton Loaders

**For components that load data:**

```typescript
import { Suspense } from 'react';

export default function EventsPage() {
  return (
    <div>
      <h1>Events</h1>
      <Suspense fallback={<EventsSkeleton />}>
        <EventsList />
      </Suspense>
    </div>
  );
}

function EventsSkeleton() {
  return (
    <div className="space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="skeleton h-20 w-full" />
      ))}
    </div>
  );
}
```

---

## 5) Button Loading States

**Show loading state during async operations:**

```typescript
'use client';

export function TransitionButton({ eventId }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await transitionEvent(eventId, 'confirmed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button disabled={loading} onClick={handleClick}>
      {loading ? 'Transitioning...' : 'Mark as Confirmed'}
    </button>
  );
}
```

---

## 6) Form Submission Loading

**Disable form and show loading during submission:**

```typescript
'use client';

export function CreateEventForm() {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createEvent(formData);
      router.push('/chef/events');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input disabled={submitting} />
      <button disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Event'}
      </button>
    </form>
  );
}
```

---

## 7) Optimistic Updates (Rare in V1)

**For non-critical UI, show optimistic update:**

```typescript
'use client';

export function LikeButton({ eventId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = async () => {
    setLikes(likes + 1); // Optimistic

    try {
      const result = await likeEvent(eventId);
      setLikes(result.likes); // Server truth
    } catch (error) {
      setLikes(likes); // Revert on error
      toast.error('Failed to like');
    }
  };

  return <button onClick={handleLike}>👍 {likes}</button>;
}
```

**NOT used for:**
- Financial operations
- State transitions
- Critical data

---

## 8) Preventing Flash on Page Load

**Use server components for initial render:**

```typescript
// ✅ Server component - no flash
export default async function EventsPage() {
  const events = await getEvents(); // Server-side
  return <EventsList events={events} />; // Renders with data
}

// ❌ Client component - may flash empty state
'use client';
export default function EventsPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchEvents().then(setEvents); // Flash of empty state
  }, []);

  return <EventsList events={events} />;
}
```

---

## 9) Navigation Loading Indicator

**Show global loading indicator during navigation:**

```typescript
// app/layout.tsx
import { ProgressBar } from '@/components/ProgressBar';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ProgressBar /> {/* Shows during route transitions */}
        {children}
      </body>
    </html>
  );
}
```

---

## Summary

**The Chef Portal prevents wrong-portal flash by performing all role checks server-side before rendering any portal UI, uses loading states and skeletons for async operations, and leverages server components for initial page loads to avoid empty-state flashes.**
