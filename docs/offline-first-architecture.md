# Offline-First Architecture

> **Date:** 2026-02-22
> **Status:** Implemented
> **Branch:** feature/risk-gap-closure

## Overview

ChefFlow now has a complete offline-first system. The app is fully aware of its connectivity state at all times, saves work locally when offline, and syncs everything back seamlessly when the connection returns. Nothing is ever lost.

## Architecture

### Layer 1: Network Detection (`lib/offline/use-network-status.ts`)

Goes beyond `navigator.onLine` (which only detects cable disconnect):

- **Browser events** — instant reaction to `online`/`offline` events
- **Heartbeat polling** — `HEAD /api/health` every 30s when online, every 5s when offline
- **Smart reconnection** — `wasOffline` flag stays true for 5 seconds after reconnecting so the UI can show a "Back online" confirmation

### Layer 2: IndexedDB Queue (`lib/offline/idb-queue.ts`)

Persistent action queue in IndexedDB (survives tab close, browser restart, device reboot):

- **Stores:** action name, serialized args, timestamp, retry count, status
- **FIFO ordering** — actions replay in the exact order they were created
- **Status tracking** — `pending → syncing → removed` (on success) or `→ failed` (after 3 retries)
- **No dependencies** — uses raw IndexedDB API, no idb/dexie/etc.

### Layer 3: Sync Engine (`lib/offline/sync-engine.ts`)

Replays queued actions when connectivity returns:

- **Action registry** — server actions register themselves for offline replay
- **Strict order** — processes queue chronologically (oldest first)
- **Progress events** — subscribers get real-time updates (total, completed, failed, current)
- **Max 3 retries** — permanently fails actions that can't sync after 3 attempts
- **Non-blocking** — sync runs in the background, UI remains responsive

### Layer 4: Offline Action Wrapper (`lib/offline/offline-action.ts`)

Wraps any server action to make it offline-capable:

```ts
const saveNote = createOfflineAction({
  name: 'notes/save',
  action: saveNoteAction,
  optimisticResult: { success: true },
})

// Online: executes normally
// Offline: saves to IndexedDB, returns optimisticResult
// Network error: detects fetch failure and queues automatically
const result = await saveNote(noteId, content)
```

### Layer 5: Form Draft Persistence (`lib/offline/use-offline-form.ts`)

Saves form data to localStorage as the user types:

- **Debounced saves** — writes to storage every 500ms (configurable)
- **Auto-restore** — on page reload, draft values are restored automatically
- **24-hour expiry** — old drafts are cleaned up automatically
- **Clear on submit** — `clearDraft()` removes the saved data after successful submission

### Layer 6: Service Worker (`public/sw.js`)

Production-grade service worker with multi-strategy caching:

| Request Type      | Strategy                             | Rationale                                          |
| ----------------- | ------------------------------------ | -------------------------------------------------- |
| HTML pages        | Network-first → cache → offline.html | Always show freshest content, fall back gracefully |
| `/_next/static/*` | Cache-first                          | Immutable hashed filenames — cache forever         |
| Fonts, images     | Cache-first                          | Static assets rarely change                        |
| API routes        | Network-only                         | Server actions must go through the online queue    |
| Dynamic JS/CSS    | Stale-while-revalidate               | Fast load + background update                      |

### Layer 7: UI Components

**OfflineProvider** (`components/offline/offline-provider.tsx`)

- React context wrapping the entire chef portal
- Provides: `isOnline`, `isOffline`, `justReconnected`, `pendingCount`, `syncProgress`
- Toasts on state changes (offline warning, reconnection, sync progress/result)

**OfflineStatusBar** (`components/offline/offline-status-bar.tsx`)

- Fixed top bar — only shows when offline, syncing, or just reconnected
- Shows queue count badge when actions are pending
- Shows progress bar during sync
- Shows green confirmation bar for 5s after reconnection
- Invisible when online (zero UI clutter)

**OfflineNavIndicator** (`components/offline/offline-nav-indicator.tsx`)

- Compact indicator in the sidebar/mobile nav
- Red dot + "Offline" label when disconnected
- Amber dot + pending count when queued actions exist
- Blue spinner when syncing
- Invisible when online (replaces old `LiveIndicator`)

**Offline Fallback Page** (`public/offline.html`)

- Shown when navigating to an uncached page while offline
- Warm brand styling (not dark/scary)
- "Your work is saved locally" reassurance message
- Auto-reloads when connectivity returns

## Data Flow

```
User action (offline)
    ↓
createOfflineAction wrapper
    ↓
enqueueAction → IndexedDB (persistent)
    ↓
Return optimistic result to UI
    ↓
[... time passes, user goes online ...]
    ↓
OfflineProvider detects reconnection
    ↓
replayPendingActions() — FIFO order
    ↓
Each action: pending → syncing → success (removed) or failed
    ↓
Toast: "All caught up" or "X failed to sync"
```

## Files Changed/Created

| File                                           | Change                                                     |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `lib/offline/idb-queue.ts`                     | **New** — IndexedDB queue                                  |
| `lib/offline/use-network-status.ts`            | **New** — Smart network detection hook                     |
| `lib/offline/sync-engine.ts`                   | **New** — Queue replay engine                              |
| `lib/offline/offline-action.ts`                | **New** — Server action wrapper                            |
| `lib/offline/use-offline-form.ts`              | **New** — Form draft persistence                           |
| `lib/offline/index.ts`                         | **New** — Barrel exports                                   |
| `components/offline/offline-provider.tsx`      | **New** — Central offline context                          |
| `components/offline/offline-status-bar.tsx`    | **New** — Top status bar                                   |
| `components/offline/offline-nav-indicator.tsx` | **New** — Nav/sidebar indicator                            |
| `public/sw.js`                                 | **Replaced** — Real caching SW (was self-destructing stub) |
| `public/offline.html`                          | **Updated** — Warm brand styling + "work is safe" message  |
| `components/pwa/sw-register.tsx`               | **Updated** — Registers SW (was unregistering)             |
| `components/navigation/chef-nav.tsx`           | **Updated** — Uses OfflineNavIndicator                     |
| `app/(chef)/layout.tsx`                        | **Updated** — Wrapped in OfflineProvider                   |
| `app/api/health/route.ts`                      | **Updated** — Added HEAD handler for connectivity checks   |

## How to Use Offline Actions in New Features

1. **Import** the wrapper:

   ```ts
   import { createOfflineAction } from '@/lib/offline'
   ```

2. **Wrap** your server action:

   ```ts
   const updateEvent = createOfflineAction({
     name: 'events/update',
     action: updateEventAction,
     optimisticResult: { success: true },
   })
   ```

3. **Use** it in your component — it handles online/offline automatically.

4. **For forms**, use `useOfflineForm` to persist draft data:
   ```ts
   const { values, updateField, clearDraft } = useOfflineForm({
     key: `event-edit-${eventId}`,
     defaultValues: { title: '', date: '' },
   })
   ```

## Testing

- **Simulate offline:** Chrome DevTools → Network tab → Offline checkbox
- **Verify queue:** Open DevTools → Application → IndexedDB → `chefflow-offline`
- **Verify caching:** DevTools → Application → Cache Storage
- **Verify SW:** DevTools → Application → Service Workers
