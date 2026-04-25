# Codex Task: Remy Mobile Activation + Session Message Persistence

## Objective

Two changes that make Remy usable on mobile and preserve conversation across page refreshes:

**Part A - Mobile Activation:** Remy is currently hidden by default on all mobile devices. Most clients are on phones. Change the mobile default from `'hidden'` to `'docked'` so the floating Remy button appears on mobile.

**Part B - Session Persistence:** All three non-drawer Remy chat surfaces lose every message on page refresh. Add sessionStorage persistence so messages survive within a browser tab session.

## Scope

Only modify these 3 files:

- `components/ai/remy-client-chat.tsx`
- `components/ai/remy-public-widget.tsx`
- `components/public/remy-concierge-widget.tsx`

Do NOT modify:

- database/migrations/ (no new migrations without human approval)
- lib/auth/ (no auth changes)
- app/(chef)/layout.tsx (no layout gates)
- `components/ai/remy-drawer.tsx` (chef drawer is NOT in scope)
- `lib/hooks/use-remy-display-mode.ts` (do NOT change the hook itself)
- Any file outside the 3 files listed above

## Part A: Mobile Activation

### Change in `components/ai/remy-client-chat.tsx`

Find (~line 37):

```tsx
mobileDefault: 'hidden',
```

Replace with:

```tsx
mobileDefault: 'docked',
```

### Change in `components/ai/remy-public-widget.tsx`

Find (~line 38):

```tsx
mobileDefault: 'hidden',
```

Replace with:

```tsx
mobileDefault: 'docked',
```

### Change in `components/public/remy-concierge-widget.tsx`

Find (~line 50):

```tsx
mobileDefault: 'hidden',
```

Replace with:

```tsx
mobileDefault: 'docked',
```

That is all for Part A. Three one-line changes. Do not change any other arguments to `useRemyDisplayMode`.

## Part B: Session Persistence

Add sessionStorage read/write for the `messages` state in each of the 3 files. The pattern is the same in all 3 files with different storage keys.

### Storage Keys

- Client chat: `'cf:remy:client-chat:messages'`
- Public widget: use a key that includes the tenantId prop: `'cf:remy:public-chat:' + tenantId + ':messages'`
- Concierge: `'cf:remy:concierge-chat:messages'`

### What to Add in Each File

Add TWO `useEffect` hooks after the existing effects (after the "Focus input when opened" effect).

**Effect 1: Load messages from sessionStorage on mount**

```tsx
// Restore messages from session storage on mount
useEffect(() => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed)
      }
    }
  } catch {
    // Ignore parse errors or blocked sessionStorage
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

Where `STORAGE_KEY` is the appropriate key for that file (see above).

For the public widget, use `tenantId` in the dependency array instead of `[]`:

```tsx
}, [tenantId])
```

**Effect 2: Save messages to sessionStorage when not streaming**

```tsx
// Persist messages to session storage (skip during streaming to avoid excess writes)
useEffect(() => {
  if (messages.length > 0 && !isStreaming) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)))
    } catch {
      // Ignore quota errors or blocked sessionStorage
    }
  }
}, [messages, isStreaming])
```

For the public widget, add `tenantId` to the dependency array:

```tsx
}, [messages, isStreaming, tenantId])
```

### Important Implementation Notes

- Use the string key directly inline. Do NOT create a constant or variable outside the component.
- The `.slice(-20)` caps storage at 20 messages to prevent sessionStorage bloat.
- The `!isStreaming` guard prevents writing on every streaming token (which would be hundreds of writes per response).
- Both effects must be wrapped in `try/catch` because sessionStorage can throw in incognito mode on some browsers.
- Do NOT change the `useState<Message[]>([])` initializer. Messages load via useEffect, not lazy init.
- Do NOT remove or modify any existing useEffect hooks.
- Do NOT add any new state variables.

### File-by-file summary

**`components/ai/remy-client-chat.tsx`:**

1. Change `mobileDefault: 'hidden'` to `mobileDefault: 'docked'`
2. Add load effect with key `'cf:remy:client-chat:messages'` and deps `[]`
3. Add save effect with key `'cf:remy:client-chat:messages'` and deps `[messages, isStreaming]`

**`components/ai/remy-public-widget.tsx`:**

1. Change `mobileDefault: 'hidden'` to `mobileDefault: 'docked'`
2. Add load effect with key using tenantId and deps `[tenantId]`
3. Add save effect with key using tenantId and deps `[messages, isStreaming, tenantId]`

**`components/public/remy-concierge-widget.tsx`:**

1. Change `mobileDefault: 'hidden'` to `mobileDefault: 'docked'`
2. Add load effect with key `'cf:remy:concierge-chat:messages'` and deps `[]`
3. Add save effect with key `'cf:remy:concierge-chat:messages'` and deps `[messages, isStreaming]`

## Branch

codex/remy-mobile-and-persistence

## Guardrails

These rules are mandatory. Violating any of them makes the task a failure.

- Only modify the 3 files listed in Scope. Nothing else.
- Do NOT add new imports. `useEffect` and `useState` are already imported in all 3 files.
- Do NOT add new state variables.
- Do NOT change message rendering, styling, or layout.
- Do NOT touch the SSE streaming logic.
- Do NOT modify `useRemyDisplayMode` hook or its file.
- Do NOT use localStorage. Use sessionStorage only.
- Do NOT change the useState initializer for messages. Use useEffect for loading.
- No em dashes anywhere.
- No @ts-nocheck.
- "OpenClaw" must never appear in UI text.
- All monetary amounts in integer cents, never floats.

## Acceptance Criteria

- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No files modified outside the 3 listed scope files
- [ ] All 3 files have `mobileDefault: 'docked'` (was `'hidden'`)
- [ ] All 3 files have a load-from-sessionStorage useEffect that runs on mount
- [ ] All 3 files have a save-to-sessionStorage useEffect gated on `!isStreaming`
- [ ] Messages are capped at 20 via `.slice(-20)` before saving
- [ ] Public widget storage key includes `tenantId`
- [ ] No new state variables added to any file
- [ ] No new imports added to any file

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.

These 3 components are all `'use client'` React components that render floating Remy chat widgets. They share a similar structure: useState for messages, useEffect for scroll/focus, SSE streaming for responses. The sessionStorage pattern adds persistence without any server-side changes.
