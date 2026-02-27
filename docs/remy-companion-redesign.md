# Remy Companion Redesign — Persistent Mascot + Separate Chat Window

**Date:** 2026-02-26
**Status:** Complete

## What Changed

Remy's mascot (the animated character) is now **separate from the chat drawer** and **always visible** on screen.

### Before

- Remy mascot sat at **bottom-right**
- Mascot **disappeared** when the chat drawer opened
- Talking animation was only visible as a tiny 40x40px avatar in the drawer header
- All state (lip-sync, open/close, mascot) was trapped inside the 2000+ line `RemyDrawer`

### After

- Remy mascot sits at **bottom-left** — persistent, always visible
- Chat drawer stays on the **right side** — no overlap
- Mascot shows **lip-sync talking animation** (80px) when Remy speaks, crossfading from the static mascot image
- Mascot shows **thinking bubbles** when Remy is processing
- Mascot can be **minimized** (only chef hat peeks out) via a hover button
- Click mascot → toggles chat drawer open/close
- `Ctrl+K` / `Cmd+K` still toggles the drawer (moved to shared context)

## Architecture

```
app/(chef)/layout.tsx
  └── <RemyWrapper />                    (client component)
        └── <RemyProvider>               (shared React Context)
              ├── <RemyMascotButton />   (bottom-left, always visible)
              └── <RemyDrawer />         (right-side panel, toggleable)
```

### Shared Context (`components/ai/remy-context.tsx`)

The `RemyProvider` hoists state that both components need:

| State                          | Producer                | Consumer                         |
| ------------------------------ | ----------------------- | -------------------------------- |
| `currentViseme` / `isSpeaking` | Drawer (SSE streaming)  | Mascot (lip-sync overlay)        |
| `isDrawerOpen`                 | Context (Ctrl+K, click) | Both                             |
| `mascotState`                  | Drawer (loading state)  | Mascot (thinking/idle animation) |
| `isLoading`                    | Drawer                  | Mascot                           |

The `useRemyLipSync()` hook is instantiated once in the provider. The drawer calls `feedText()` during streaming; the mascot reads `currentViseme` for animation.

## Files

| File                                    | Change                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `components/ai/remy-context.tsx`        | **NEW** — shared context provider                                            |
| `components/ai/remy-wrapper.tsx`        | **NEW** — combines mascot + drawer + provider                                |
| `components/ai/remy-mascot-button.tsx`  | **EDITED** — moved to bottom-left, added lip-sync overlay, minimize toggle   |
| `components/ai/remy-talking-avatar.tsx` | **EDITED** — added `xl` size (120px)                                         |
| `components/ai/remy-drawer.tsx`         | **EDITED** — consumes context instead of owning state, removed mascot render |
| `app/(chef)/layout.tsx`                 | **EDITED** — uses `RemyWrapper` instead of `RemyDrawer` directly             |

## Unchanged

- All 5 drawer views (Chat, Conversations, Search, Action Log, Templates)
- Chat log persistence (IndexedDB)
- Streaming, TTS, voice input
- Conversation management
- Public concierge widget (`remy-concierge-widget.tsx`)
- Lip-sync engine (`use-remy-lip-sync.ts`)

## Minimize Behavior

- Hover over mascot → small "−" button appears top-right
- Click "−" → mascot slides down, only chef hat peeks out (translate-y 80%)
- Click the peeking hat → restores full mascot
- Minimized state persisted to `localStorage` (`remy-minimized`)
- Remy never fully leaves the screen
