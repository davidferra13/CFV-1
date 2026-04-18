# Spec: Opt-In Local AI Integration

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event         | Date       | Agent/Session | Commit |
| ------------- | ---------- | ------------- | ------ |
| Created       | 2026-04-18 | opus session  |        |
| Status: ready |            |               |        |

---

## Developer Notes

### Raw Signal

"People can opt into using it if they prefer. Right now, if people download Google AI Edge Gallery, they can literally download Gemma 4 onto their phone. Everyone in the world has this infrastructure right now, and there's no more excuses. We probably just need integrations for that. The whole thing is, people can opt into it. It's not an all-eggs-in-the-basket thing."

### Developer Intent

- **Core goal:** Let users who run their own AI (Ollama on desktop, future mobile bridges) opt into local inference for Remy, reducing server load and maximizing privacy.
- **Key constraints:** Opt-in only, never forced. Server AI remains default. No degradation for users without local AI. No new cloud dependencies.
- **Motivation:** Gemma 4 local performance makes user-hosted AI practical. ChefFlow should be ready for the distributed AI future, starting with what works today (Ollama on desktop).
- **Success from the developer's perspective:** A chef with Ollama installed can toggle "Use my own AI" in settings, and Remy chats route to their local machine. Everyone else sees zero change.

---

## What This Does (Plain English)

Users who run Ollama on their own computer can opt into having Remy chat powered by their local AI instead of ChefFlow's server. A toggle in AI & Privacy settings enables it. ChefFlow auto-detects local Ollama availability and shows connection status. If local AI is unreachable, it silently falls back to server AI. A small indicator in the Remy chat shows which mode is active.

---

## Why It Matters

Server AI costs compute. Local AI is free, faster (no network round-trip), and keeps conversation data entirely on the user's device. This also future-proofs ChefFlow for Chrome's built-in AI and mobile local inference when those bridges ship.

---

## Architecture

### The Core Challenge

ChefFlow's AI runs server-side (server actions, API routes). The server cannot reach a user's `localhost:11434`. But the user's **browser** can reach both the ChefFlow server AND their own localhost.

### Solution: Split Prompt Assembly from Inference

```
┌─────────────────────────────────────────────────┐
│                  CURRENT FLOW                    │
│  Browser → /api/remy/stream → Server Ollama      │
│            (prompt assembly + inference)          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               LOCAL AI FLOW                      │
│  Browser → /api/remy/context → system prompt     │
│  Browser → localhost:11434/api/chat → streaming  │
│            (assembly on server, inference local) │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                  FALLBACK                        │
│  Local unreachable? → /api/remy/stream (current) │
└─────────────────────────────────────────────────┘
```

### What Moves Client-Side

- Ollama streaming chat (direct `fetch` to `localhost:11434/api/chat`)
- Thinking block filtering (already has `ThinkingBlockFilter` class)
- SSE event construction for the Remy chat UI

### What Stays Server-Side

- System prompt assembly (needs DB: chef context, memories, culinary profile)
- Intent classification (needs action dispatch)
- Command execution (needs DB writes)
- Rate limiting, abuse detection, guardrails
- All structured AI tasks (`parseWithOllama` calls)

### Scope of Local AI

Local AI applies to **Remy conversational streaming only** (the "question" intent path). Commands, structured extraction, recipe parsing, and all other `parseWithOllama` calls remain server-side because they need DB context and write access.

---

## Files to Create

| File                                   | Purpose                                                             |
| -------------------------------------- | ------------------------------------------------------------------- |
| `app/api/remy/context/route.ts`        | Returns assembled system prompt + context for client-side inference |
| `lib/ai/local-ai-provider.ts`          | Client-side provider abstraction (Ollama local, future: Chrome AI)  |
| `components/ai/local-ai-settings.tsx`  | Settings UI: toggle, URL, model, test connection, status            |
| `components/ai/local-ai-indicator.tsx` | Small badge in Remy chat showing "Local" or "Cloud" mode            |

---

## Files to Modify

| File                                        | What to Change                                                   |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `lib/db/schema/schema.ts`                   | Add local AI columns to `ai_preferences` (after migration)       |
| `lib/ai/privacy-actions.ts`                 | Add getters/setters for local AI preferences                     |
| `app/(chef)/settings/ai-privacy/page.tsx`   | Add Local AI section to existing AI & Privacy page               |
| `components/ai/remy-concierge-widget.tsx`   | Add local AI routing logic to chat send flow                     |
| `app/api/remy/stream/route-prompt-utils.ts` | Export `buildRemySystemPrompt` dependencies for context endpoint |

---

## Database Changes

### New Columns on Existing Tables

```sql
ALTER TABLE ai_preferences
  ADD COLUMN local_ai_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN local_ai_url text NOT NULL DEFAULT 'http://localhost:11434',
  ADD COLUMN local_ai_model text NOT NULL DEFAULT 'gemma4',
  ADD COLUMN local_ai_verified_at timestamptz;
```

### Migration Notes

- Migration filename: `20260418000003_local_ai_preferences.sql`
- Strictly additive: 4 new columns, no drops, no renames
- `local_ai_url` defaults to standard Ollama port
- `local_ai_verified_at` tracks last successful connection test (null = never tested)

---

## Data Model

### Local AI Preferences (extends `ai_preferences`)

| Column                 | Type        | Default                  | Purpose                |
| ---------------------- | ----------- | ------------------------ | ---------------------- |
| `local_ai_enabled`     | boolean     | false                    | Master toggle          |
| `local_ai_url`         | text        | `http://localhost:11434` | User's Ollama endpoint |
| `local_ai_model`       | text        | `gemma4`                 | Model name for chat    |
| `local_ai_verified_at` | timestamptz | null                     | Last successful ping   |

---

## Server Actions

| Action                          | Auth            | Input                        | Output                                | Side Effects                        |
| ------------------------------- | --------------- | ---------------------------- | ------------------------------------- | ----------------------------------- |
| `getLocalAiPreferences()`       | `requireChef()` | none                         | `{ enabled, url, model, verifiedAt }` | none                                |
| `saveLocalAiPreferences(input)` | `requireChef()` | `{ enabled?, url?, model? }` | `{ success, error? }`                 | Updates `ai_preferences`            |
| `markLocalAiVerified()`         | `requireChef()` | none                         | `{ success }`                         | Sets `local_ai_verified_at = now()` |

### Context Endpoint

**`POST /api/remy/context`**

Auth: `requireChef()` (same as stream route)

Request body:

```json
{
  "message": "user's current message",
  "history": [{ "role": "user|assistant", "content": "..." }],
  "currentPage": "/events",
  "recentPages": [],
  "sessionMinutes": 5
}
```

Response:

```json
{
  "systemPrompt": "assembled system prompt string",
  "model": "gemma4",
  "blocked": false,
  "blockReason": null,
  "navSuggestions": null,
  "intent": "question",
  "commandResult": null
}
```

If intent is `command`, the server executes it and returns the result directly (commands can't run client-side). The client only uses local inference for `question` intent.

---

## UI / Component Spec

### Settings Section (in AI & Privacy page)

New collapsible section: **"Local AI (Optional)"**

**States:**

- **Collapsed (default):** One-line summary: "Run Remy on your own computer" with expand chevron
- **Expanded, disabled:** Toggle off. Explanation text: "If you run Ollama on your computer, you can have Remy use your local AI instead of our server. Your conversations stay entirely on your device."
- **Expanded, enabled:** Toggle on. URL field (default `http://localhost:11434`), model field (default `gemma4`), "Test Connection" button, status badge (untested / connected / unreachable)
- **Testing:** "Test Connection" button shows spinner, then result

**Setup guidance** (shown when enabled):

1. Install Ollama from ollama.com
2. Run `ollama pull gemma4` in terminal
3. Set `OLLAMA_ORIGINS=*` for cross-origin access
4. Click "Test Connection"

### Remy Chat Indicator

Small text below the Remy input or in the header:

- `"Local AI"` (green dot) when using local inference
- `"Cloud AI"` (blue dot) when using server
- `"Local AI unavailable, using cloud"` (yellow dot) when local was enabled but unreachable

No badge shown if local AI is not enabled (zero UI change for default users).

### Interactions

1. User enables toggle -> saves preference via `saveLocalAiPreferences`
2. User clicks "Test Connection" -> browser fetches `{url}/api/tags` directly -> shows result
3. On Remy chat open -> if local enabled, browser pings local Ollama -> sets active provider
4. User sends message -> if local active:
   a. POST to `/api/remy/context` for system prompt + intent classification
   b. If intent is `question`: stream from local Ollama directly
   c. If intent is `command`: server already executed it, show result
   d. If local fetch fails mid-stream: show error toast, retry via server
5. User sends message -> if local not active: current flow (unchanged)

---

## Client-Side Provider Abstraction

```typescript
// lib/ai/local-ai-provider.ts (client-side)

interface LocalAIProvider {
  name: string
  detect(): Promise<boolean>
  chat(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    model: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ): Promise<void>
}

// Implementation 1: Ollama Local
class OllamaLocalProvider implements LocalAIProvider {
  name = 'ollama'
  constructor(private url: string) {}

  async detect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tags`, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  }

  async chat(systemPrompt, messages, model, onToken, signal?) {
    const res = await fetch(`${this.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
      }),
      signal,
    })
    // Parse NDJSON stream, call onToken for each token
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value, { stream: true }).split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        const json = JSON.parse(line)
        if (json.message?.content) onToken(json.message.content)
      }
    }
  }
}

// Implementation 2: Chrome Prompt API (future stub)
class ChromeAIProvider implements LocalAIProvider {
  name = 'chrome-ai'
  async detect() {
    return typeof window !== 'undefined' && 'ai' in window && 'languageModel' in (window as any).ai
  }
  // ... implementation when API ships on mobile
}
```

---

## Edge Cases and Error Handling

| Scenario                                | Correct Behavior                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Local Ollama not running                | Detect fails silently, use server AI, show indicator                                       |
| Local Ollama crashes mid-stream         | Catch fetch error, show toast "Local AI disconnected, retrying via cloud", retry on server |
| CORS blocked                            | Detect fails (fetch throws), show "Connection failed" in settings with CORS setup hint     |
| User's model not found                  | Ollama returns 404, show toast with model name, fall back to server                        |
| Intent is `command`                     | Always server-side, never local (commands need DB)                                         |
| User disables local AI mid-conversation | Next message uses server, indicator updates                                                |
| Multiple tabs                           | Each tab detects independently, no shared state needed                                     |
| `local_ai_url` is not localhost         | Works (user might run Ollama on another machine on LAN)                                    |

---

## CORS Setup Note

Ollama requires `OLLAMA_ORIGINS` environment variable to allow cross-origin requests from the ChefFlow domain. Default Ollama config may block requests from `https://app.cheflowhq.com`.

**User setup:** Set `OLLAMA_ORIGINS=*` or `OLLAMA_ORIGINS=https://app.cheflowhq.com` before starting Ollama.

This is documented in the settings UI setup guidance, not buried in docs.

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/settings/ai-privacy`
3. Verify: "Local AI" section appears, collapsed by default
4. Expand section, enable toggle
5. Click "Test Connection" (with Ollama running locally)
6. Verify: status shows "Connected"
7. Open Remy chat
8. Verify: indicator shows "Local AI" (green dot)
9. Send a message
10. Verify: response streams (check network tab, no `/api/remy/stream` call, direct to localhost)
11. Stop local Ollama
12. Send another message
13. Verify: fallback to server, indicator changes, toast notification
14. Disable local AI in settings
15. Verify: indicator disappears, Remy works normally

---

## Out of Scope

- Mobile local AI (AI Edge Gallery has no API bridge yet; spec covers the provider abstraction for when it does)
- Chrome Prompt API integration (stub only; ships when API reaches Android Chrome stable)
- Local AI for structured tasks (`parseWithOllama` calls stay server-side)
- Local AI for non-Remy features (recipe parsing, brain dump, etc.)
- Offline mode (local AI still needs ChefFlow server for context assembly and commands)

---

## Notes for Builder Agent

- The context endpoint (`/api/remy/context`) reuses `buildRemySystemPrompt` from `route-prompt-utils.ts`. Extract shared logic; don't duplicate.
- The Remy widget is at `components/ai/remy-concierge-widget.tsx` (or `components/public/remy-concierge-widget.tsx`). The drag/resize corners are sacred (see CLAUDE.md rule 5).
- Client-side provider uses raw `fetch`, not the `ollama` npm package (that's server-only, uses Node APIs).
- The `ThinkingBlockFilter` class in `route-runtime-utils.ts` strips `<think>` blocks from Gemma 4 output. Port it to the client-side provider or extract to shared util.
- All monetary amounts in cents. This spec has no financial impact.
- CORS is the #1 setup friction point. Make the setup guidance prominent, not an afterthought.
- Provider abstraction is intentionally simple (one interface, two implementations). Don't over-engineer; this is the foundation that Chrome AI and mobile bridges plug into later.
