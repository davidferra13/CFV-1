# Remy Fix 02: Markdown Rendering + Streaming Cursor on All Surfaces

> **Priority:** P1 - Remy responses show raw markdown syntax on 4 of 5 surfaces
> **Risk level:** LOW - rendering-only changes, no logic changes
> **Estimated scope:** 3 files modified

---

## Problem

Only the chef drawer (`remy-drawer.tsx`) renders Remy responses as markdown (using ReactMarkdown + remarkGfm). The other three chat surfaces render raw text, so responses with `**bold**`, `- bullets`, or `[links](url)` appear as literal characters.

Additionally, the public concierge widget shows bouncing dots before the first token, but once streaming starts there is no visual cue (no cursor) that more text is coming.

## Exact Changes Required

### Change 1: Add markdown to `remy-public-widget.tsx`

**File:** `components/ai/remy-public-widget.tsx`

**Step A:** Add import at top of file:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

**Step B:** Find the message content rendering (around line 236-239). The current code renders `{msg.content}` directly inside a div. Replace the raw content render with ReactMarkdown. Find this pattern:

```tsx
<div
  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
    msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-stone-800 text-stone-200'
  }`}
>
  {msg.content}
```

Replace `{msg.content}` with:

```tsx
{
  msg.role === 'remy' ? (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5"
    >
      {msg.content}
    </ReactMarkdown>
  ) : (
    msg.content
  )
}
```

Only Remy messages get markdown. User messages stay plain text.

### Change 2: Add markdown to `remy-concierge-widget.tsx`

**File:** `components/public/remy-concierge-widget.tsx`

**Step A:** Add import at top of file:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

**Step B:** Find the message content area (around lines 438-445). The current code is:

```tsx
{
  msg.content ||
    (isStreaming && msg.role === 'remy' ? (
      <div className="flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
      </div>
    ) : null)
}
```

Replace with:

```tsx
{
  msg.content ? (
    msg.role === 'remy' ? (
      <>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="prose prose-sm prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5"
        >
          {msg.content}
        </ReactMarkdown>
        {isStreaming && messages[messages.length - 1]?.id === msg.id && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-brand-400" />
        )}
      </>
    ) : (
      msg.content
    )
  ) : isStreaming && msg.role === 'remy' ? (
    <div className="flex items-center gap-1">
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:0ms]" />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:150ms]" />
      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 [animation-delay:300ms]" />
    </div>
  ) : null
}
```

This adds: (a) markdown rendering for Remy messages, (b) a blinking cursor during active streaming.

### Change 3: Add markdown to `remy-client-chat.tsx`

**File:** `components/ai/remy-client-chat.tsx`

**Step A:** Add import at top of file:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

**Step B:** Find wherever `{msg.content}` is rendered inside message bubbles. Replace the Remy message content render with:

```tsx
{
  msg.role === 'remy' ? (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5"
    >
      {msg.content}
    </ReactMarkdown>
  ) : (
    msg.content
  )
}
```

### Change 4: Add markdown to `remy-mascot-chat.tsx`

**File:** `components/ai/remy-mascot-chat.tsx`

**Step A:** Add import at top of file:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

**Step B:** Find wherever `{msg.content}` is rendered inside message bubbles (around line 260). Same replacement pattern:

```tsx
{
  msg.role === 'remy' ? (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5"
    >
      {msg.content}
    </ReactMarkdown>
  ) : (
    msg.content
  )
}
```

## IMPORTANT: Do NOT

- Do NOT modify `remy-drawer.tsx` - it already has markdown rendering
- Do NOT change any logic, state management, or API calls
- Do NOT add any new dependencies (react-markdown and remark-gfm are already installed in the project)
- Do NOT modify any server-side files
- Do NOT change the message bubble styling or layout, only the CONTENT rendering inside the bubbles

## Verification

1. `npx tsc --noEmit --skipLibCheck` must pass
2. Confirm `react-markdown` and `remark-gfm` are already in `package.json` (they should be, since the drawer uses them)
