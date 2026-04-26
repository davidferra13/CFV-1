# Spec: BYOAI Phase 2C - Privacy Narrative BYOAI Variants

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** byoai-browser-inference.md (Phase 1, already built)
> **Estimated complexity:** small (1 file modified)

## Timeline

| Event         | Date             | Agent/Session      | Commit |
| ------------- | ---------------- | ------------------ | ------ |
| Created       | 2026-04-26 18:00 | Planner (Opus 4.6) |        |
| Status: ready | 2026-04-26 18:00 | Planner (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

The privacy narrative file (`lib/ai/privacy-narrative.ts`) is the single source of truth for all user-facing AI privacy text. It currently only describes "ChefFlow's own private AI" (server-side Ollama). With BYOAI, there are now three AI locations: server, browser, and local Ollama. The privacy text needs variants for each so components can show the right message based on where inference is actually running.

### Developer Intent

- **Core goal:** Add BYOAI-aware privacy narrative exports so any component can show the correct privacy message based on the active provider.
- **Key constraints:** Must not modify any existing exports (they're used across 20+ surfaces). Add new exports only. Must follow the existing file's documentation style and naming conventions.
- **Motivation:** When a user sees "running in your browser" they need matching privacy text that says "your data never leaves this device," not "processed by ChefFlow's AI."

---

## What This Does (Plain English)

Adds new exports to the privacy narrative file for browser AI and local Ollama scenarios. A helper function returns the right narrative based on the active provider.

---

## Files to Create

None.

---

## Files to Modify

| File                          | What Changes                                     |
| ----------------------------- | ------------------------------------------------ |
| `lib/ai/privacy-narrative.ts` | Add BYOAI section with new exports at the bottom |

---

## Database Changes

None.

---

## Implementation

### `lib/ai/privacy-narrative.ts` (MODIFY)

**Add the following block at the very end of the file, after the last existing export (`AUTO_RESPONSE_AI_LABEL` on line 153).**

Do NOT modify any existing exports above this line. Only append.

```typescript
// ─── BYOAI (Bring Your Own AI) Privacy Variants ─────────────────────────────
// Used when inference runs on the user's own device instead of ChefFlow servers.

/** Browser AI: Chrome Built-in AI or WebLLM (runs entirely in the browser tab) */
export const BYOAI_BROWSER_ONELINER =
  'AI is running entirely in your browser. Your data never leaves this device.'

/** Browser AI: expanded explanation */
export const BYOAI_BROWSER_EXPLAINED =
  "This conversation is powered by AI running directly in your browser using your device's hardware. No data is sent to any server, not even ChefFlow's. Everything stays on this device."

/** Local Ollama: user's own machine */
export const BYOAI_LOCAL_ONELINER =
  'AI is running on your local machine. Your data never leaves your network.'

/** Local Ollama: expanded explanation */
export const BYOAI_LOCAL_EXPLAINED =
  'This conversation is powered by your own AI running on your local machine via Ollama. No data is sent to any external server. Everything stays on your hardware, under your control.'

/** Server fallback: same as existing narrative but explicitly labeled */
export const BYOAI_SERVER_ONELINER = PRIVACY_ONELINER

/** Speed + privacy for BYOAI surfaces */
export const BYOAI_BROWSER_SPEED = 'Running locally. Zero latency. Complete privacy.'
export const BYOAI_LOCAL_SPEED = 'Running on your machine. Fast and private.'

/** Self-knowledge injection for Remy system prompt when running on user's device */
export const REMY_BYOAI_SELF_KNOWLEDGE = `
ABOUT YOUR CURRENT SESSION (use when users ask about privacy or how you work):
- You are currently running on the user's own device, not on ChefFlow's servers.
- No conversation data is being sent to any external server.
- The user has full control over this AI instance.
- If asked about privacy: "Right now I'm running entirely on your device. Nothing leaves your machine."
`

/**
 * Returns the appropriate privacy one-liner based on the active AI provider.
 * Use this in UI components to show the right message dynamically.
 *
 * @param provider - The active provider: 'chrome_ai', 'webllm', 'ollama', 'server', or 'none'
 */
export function getPrivacyOneliner(
  provider: 'chrome_ai' | 'webllm' | 'ollama' | 'server' | 'none'
): string {
  switch (provider) {
    case 'chrome_ai':
    case 'webllm':
      return BYOAI_BROWSER_ONELINER
    case 'ollama':
      return BYOAI_LOCAL_ONELINER
    default:
      return PRIVACY_ONELINER
  }
}

/**
 * Returns the appropriate expanded privacy explanation based on the active AI provider.
 *
 * @param provider - The active provider: 'chrome_ai', 'webllm', 'ollama', 'server', or 'none'
 */
export function getPrivacyExplained(
  provider: 'chrome_ai' | 'webllm' | 'ollama' | 'server' | 'none'
): string {
  switch (provider) {
    case 'chrome_ai':
    case 'webllm':
      return BYOAI_BROWSER_EXPLAINED
    case 'ollama':
      return BYOAI_LOCAL_EXPLAINED
    default:
      return PRIVATE_AI_EXPLAINED
  }
}
```

---

## Edge Cases and Error Handling

| Scenario                                 | Correct Behavior                                       |
| ---------------------------------------- | ------------------------------------------------------ |
| Provider is 'none' or 'server'           | Falls back to existing server-side privacy text        |
| Component doesn't know the provider      | Uses existing exports (unchanged, backward compatible) |
| Provider switches mid-session (fallback) | UI should re-read the provider and update text         |

---

## Verification Steps

1. Run typecheck: `node scripts/run-typecheck.mjs -p tsconfig.ci.json`
2. Verify no existing imports broke (all 20+ surfaces importing from privacy-narrative.ts should still compile)
3. Verify new exports are accessible: `import { getPrivacyOneliner, BYOAI_BROWSER_ONELINER } from '@/lib/ai/privacy-narrative'`

---

## Out of Scope

- Wiring the new privacy functions into existing UI components (separate task)
- Updating the Trust Center page with BYOAI content (separate spec)
- EU AI Act transparency labels (separate spec per international readiness layer)

---

## Notes for Builder Agent

**CRITICAL: Do NOT modify any existing exports in `lib/ai/privacy-narrative.ts`.** Only APPEND new code after line 153 (after the `AUTO_RESPONSE_AI_LABEL` export).

**The file has no `'use server'` or `'use client'` directive.** It is a pure module importable anywhere. Keep it that way.

**The `PRIVACY_ONELINER` and `PRIVATE_AI_EXPLAINED` constants** referenced in the new code already exist earlier in the same file. They are in scope.

**After modifying the file, run `node scripts/run-typecheck.mjs -p tsconfig.ci.json` and fix any type errors. Do NOT fix errors in other files.**
