# Fix: Chat Empty State Shows Wrong Copy to Clients (JBUG-005)

## Problem

`components/chat/chat-inbox.tsx` line 59 says "start chatting with a client" and references a "+ New Conversation" button. This component is shared between chef and client portals. When a **client** sees the empty state, the copy is wrong: clients chat with their **chef**, not "a client."

## Exact Change

**File:** `components/chat/chat-inbox.tsx`

The component already receives a `basePath` prop. When `basePath === '/my-chat'`, the viewer is a client. When `basePath === '/chat'`, the viewer is a chef.

### Find this block (lines 53-62):

```tsx
if (conversations.length === 0) {
  return (
    <div className="text-center py-16">
      <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p className="text-stone-500 text-sm">No conversations yet</p>
      <p className="text-stone-400 text-xs mt-1">
        Click &quot;+ New Conversation&quot; above to start chatting with a client
      </p>
    </div>
  )
}
```

### Replace with:

```tsx
if (conversations.length === 0) {
  const isClient = basePath === '/my-chat'
  return (
    <div className="text-center py-16">
      <MessageCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p className="text-stone-500 text-sm">No conversations yet</p>
      <p className="text-stone-400 text-xs mt-1">
        {isClient
          ? 'Your chef will start a conversation when your booking is confirmed.'
          : 'Click \u201c+ New Conversation\u201d above to start chatting with a client'}
      </p>
    </div>
  )
}
```

## Rules

- Do NOT change any other part of this file.
- Do NOT add imports.
- Do NOT rename variables.
- The `basePath` prop already exists on this component. Do not add it.
- Use `\u201c` and `\u201d` for curly quotes in the chef branch (matching existing code).
- Run `npx tsc --noEmit --skipLibCheck` after the edit. It must pass.
