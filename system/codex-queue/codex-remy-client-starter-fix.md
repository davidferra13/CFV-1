# Codex Task: Fix Client Chat Starter Buttons (Race Condition)

## Objective

The starter prompt buttons in the client portal Remy chat are completely broken. Clicking "When is my next event?" or any other starter sends nothing. This is a race condition: `setInput(q)` triggers a re-render but `setTimeout(() => sendMessage(), 50)` captures the OLD `sendMessage` closure where `input` is still `''`. The fix is already proven in `components/ai/remy-public-widget.tsx` line 55: accept an optional `overrideText` parameter.

## Scope

Only modify ONE file:

- `components/ai/remy-client-chat.tsx`

Do NOT modify:

- Any other file. Zero exceptions. This is a single-file surgical fix.
- database/migrations/
- lib/auth/
- app/(chef)/layout.tsx

## Exact Changes Required

### Change 1: Add overrideText parameter to sendMessage

Find this line (~line 71):

```tsx
const sendMessage = useCallback(async () => {
```

Replace with:

```tsx
const sendMessage = useCallback(async (overrideText?: string) => {
```

### Change 2: Use overrideText when available

Find this line (~line 72):

```tsx
const trimmed = input.trim()
```

Replace with:

```tsx
const trimmed = (overrideText ?? input).trim()
```

### Change 3: Fix starter button onClick handlers

Find this block (~lines 251-254):

```tsx
onClick={() => {
  setInput(q)
  setTimeout(() => sendMessage(), 50)
}}
```

Replace with:

```tsx
onClick={() => sendMessage(q)}
```

### Change 4: Prevent MouseEvent leaking into overrideText

The send button currently passes the click event as the first argument because `sendMessage` is used directly as an onClick handler.

Find this (~line 332):

```tsx
onClick = { sendMessage }
```

Replace with:

```tsx
onClick={() => sendMessage()}
```

## Why These Changes Are Safe

- The `overrideText` parameter is optional, so all existing callers (`handleKeyDown`, send button) continue to work with no arguments.
- The public widget (`components/ai/remy-public-widget.tsx`) already uses this exact pattern at line 55 and works correctly.
- No new imports, no new state, no new effects. Pure function signature change.

## Branch

codex/fix-remy-client-starter-buttons

## Guardrails

These rules are mandatory. Violating any of them makes the task a failure.

- Only modify `components/ai/remy-client-chat.tsx`. Nothing else.
- Do NOT add new imports.
- Do NOT add new state variables.
- Do NOT change the message rendering, styling, or layout.
- Do NOT touch the SSE streaming logic.
- Do NOT change the header, error display, or input area beyond the send button onClick.
- No em dashes anywhere.
- No @ts-nocheck.
- All monetary amounts in integer cents, never floats.
- "OpenClaw" must never appear in UI text.

## Acceptance Criteria

- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No files modified outside `components/ai/remy-client-chat.tsx`
- [ ] The `sendMessage` function accepts an optional `overrideText?: string` parameter
- [ ] Starter buttons pass the question text directly to `sendMessage(q)` instead of using `setInput` + `setTimeout`
- [ ] The send button uses `onClick={() => sendMessage()}` (arrow wrapper, not direct reference)
- [ ] No new state variables or effects added

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.

Reference implementation: `components/ai/remy-public-widget.tsx` line 55 uses this exact pattern correctly.
