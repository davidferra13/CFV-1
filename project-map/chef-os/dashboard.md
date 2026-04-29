# Dashboard

**What:** Chef's command center. First screen after login. Configurable widget layout showing today's snapshot.

**Route:** `/dashboard`
**Key files:** `app/(chef)/dashboard/page.tsx`
**Status:** DONE

## What's Here

- Time-of-day greeting
- 20+ configurable widgets (schedule, priority queue, follow-ups, analytics, etc.)
- Real-time activity feed
- Business snapshot (revenue, events, inquiries)
- Price intelligence panels
- Relationship Next now uses the shared client action vocabulary and includes the winning primary signal in its context chips
- System health monitoring (admin only)
- Onboarding banner (dismissible, non-blocking)
- First-time progressive disclosure: new chefs with fewer than 3 populated feature areas see a focused Getting Started section and do not see empty Event Readiness, Network Activity, Dinner Circles, or Secondary Insights shells until relevant data exists. Admin and privileged users keep the full dashboard surface.
- Sidebar progressive disclosure: `ChefSidebar` uses tenant data presence to show starter navigation in Pipeline, Events, Clients, and Culinary order by default, reveals advanced groups after use, keeps active direct-route destinations visible, and keeps a persisted "Show all features" toggle for power users
- Platform shell command pattern: collapsed rail links now keep accessible labels, the global Create menu is grouped by Creative, Pipeline, Operational, and Upload work, and compact shell states preserve core routes while moving dense context into route-owned panels.
- Context command panel contract: event detail, client detail, and activity can render a right-side command panel on desktop and a drawer on smaller screens. Collapse state is persisted per route family only, never per client or event id.

## Open Items

None. Fully functional.
