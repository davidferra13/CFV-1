# Spec: BYOAI Phase 2B - Ollama Adapter for Browser AI Engine

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** byoai-browser-inference.md (Phase 1, already built)
> **Estimated complexity:** small (4 files: 1 new, 3 modified)

## Timeline

| Event         | Date             | Agent/Session      | Commit |
| ------------- | ---------------- | ------------------ | ------ |
| Created       | 2026-04-26 18:00 | Planner (Opus 4.6) |        |
| Status: ready | 2026-04-26 18:00 | Planner (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

Phase 1 built Chrome AI + WebLLM adapters for the BrowserAiEngine. But there's already a mature `OllamaLocalProvider` at `lib/ai/local-ai-provider.ts` with streaming, think-block filtering, and model resolution. These two systems are disconnected. The browser AI engine doesn't know about local Ollama, and the existing Ollama code doesn't participate in the cascade. This spec bridges them so the provider cascade becomes: Chrome AI -> WebLLM -> Local Ollama -> Server fallback.

### Developer Intent

- **Core goal:** Add an Ollama adapter to the BrowserAiEngine so local Ollama participates in the browser AI provider cascade.
- **Key constraints:** Must reuse the existing `OllamaLocalProvider` class from `lib/ai/local-ai-provider.ts`. Must not duplicate its streaming or think-block filtering logic. Must add Ollama URL configuration to the settings UI.
- **Motivation:** Users who run local Ollama (common among power users) get automatic detection and routing through the same engine that handles Chrome AI and WebLLM.
- **Success:** The settings page shows Ollama connectivity status. The engine cascade tries Ollama after WebLLM but before server fallback.

---

## What This Does (Plain English)

Adds a new adapter class that wraps the existing `OllamaLocalProvider` to fit the `BrowserAiAdapter` interface. The browser AI engine tries it after Chrome AI and WebLLM. The settings page gets an Ollama URL input field with a "Test Connection" button.

---

## Files to Create

| File                               | Purpose                                       |
| ---------------------------------- | --------------------------------------------- |
| `lib/ai/browser/ollama-adapter.ts` | BrowserAiAdapter wrapping OllamaLocalProvider |

---

## Files to Modify

| File                                           | What Changes                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `lib/ai/browser/types.ts`                      | Add `'ollama'` to `BrowserAiProvider` union, add `ollamaUrl` to preferences |
| `lib/ai/browser/engine.ts`                     | Add Ollama to the load cascade after WebLLM                                 |
| `components/settings/ai-provider-settings.tsx` | Add Ollama URL input field + test connection button                         |

---

## Database Changes

None.

---

## Implementation

### File 1: `lib/ai/browser/ollama-adapter.ts` (NEW)

```typescript
'use client'

import type { BrowserAiAdapter, BrowserAiGenerateOptions, BrowserAiResult } from './types'
import { OllamaLocalProvider } from '@/lib/ai/local-ai-provider'

/**
 * Ollama adapter for the BrowserAiEngine.
 * Wraps the existing OllamaLocalProvider to fit the BrowserAiAdapter interface.
 * Connects to a user's local Ollama instance (e.g., http://localhost:11434).
 */
export class OllamaAdapter implements BrowserAiAdapter {
  readonly provider = 'ollama' as const
  private ollamaProvider: OllamaLocalProvider
  private model: string

  constructor(url: string, model?: string) {
    this.ollamaProvider = new OllamaLocalProvider(url)
    this.model = model ?? 'gemma4'
  }

  async isAvailable(): Promise<boolean> {
    return this.ollamaProvider.detect()
  }

  async load(): Promise<void> {
    // Ollama doesn't need a load step - it's always ready if detect() passes
  }

  async generate(options: BrowserAiGenerateOptions): Promise<BrowserAiResult> {
    const start = performance.now()
    let fullText = ''
    let tokenCount = 0

    const messages = [{ role: 'user', content: options.userMessage }]

    await this.ollamaProvider.chat(
      options.systemPrompt,
      messages,
      this.model,
      (token) => {
        fullText += token
        tokenCount++
        if (options.onToken) options.onToken(token)
      },
      { num_predict: options.maxTokens ?? 1024 }
    )

    return {
      text: fullText,
      provider: 'ollama',
      latencyMs: Math.round(performance.now() - start),
      tokensGenerated: tokenCount,
    }
  }

  unload(): void {
    // Nothing to clean up - Ollama is a remote service
  }
}
```

### File 2: `lib/ai/browser/types.ts` (MODIFY)

**Change 1:** Update `BrowserAiProvider` type on line 3.

Replace:

```typescript
export type BrowserAiProvider = 'chrome_ai' | 'webllm' | 'none'
```

With:

```typescript
export type BrowserAiProvider = 'chrome_ai' | 'webllm' | 'ollama' | 'none'
```

**Change 2:** Add `ollamaUrl` and `ollamaModel` to `BrowserAiPreferences` interface (lines 18-23).

Replace:

```typescript
export interface BrowserAiPreferences {
  preferredProvider: 'auto' | 'browser' | 'server'
  webllmModelId: string | null
  allowModelDownload: boolean
  lastDetection: string | null
}
```

With:

```typescript
export interface BrowserAiPreferences {
  preferredProvider: 'auto' | 'browser' | 'server'
  webllmModelId: string | null
  allowModelDownload: boolean
  ollamaUrl: string | null
  ollamaModel: string | null
  lastDetection: string | null
}
```

### File 3: `lib/ai/browser/engine.ts` (MODIFY)

**Change 1:** Add import for OllamaAdapter after the WebLlmAdapter import (line 16).

After the line:

```typescript
import { WebLlmAdapter } from './webllm-adapter'
```

Add:

```typescript
import { OllamaAdapter } from './ollama-adapter'
```

**Change 2:** Add Ollama to the load cascade. In the `load()` method, after the WebLLM block (after line 105 `this.setStatus('unavailable')` and before `return 'none'`), add the Ollama attempt.

Replace this exact block:

```typescript
    this.setStatus('unavailable')
    return 'none'
  }
```

With:

```typescript
    // Try local Ollama
    const prefs2 = this.getPreferences()
    if (prefs2.ollamaUrl) {
      this.setStatus('loading')
      const adapter = new OllamaAdapter(prefs2.ollamaUrl, prefs2.ollamaModel ?? undefined)
      if (await adapter.isAvailable()) {
        await adapter.load()
        this.adapter = adapter
        this.setStatus('ready')
        return 'ollama'
      }
    }

    this.setStatus('unavailable')
    return 'none'
  }
```

**Change 3:** Update `getPreferences()` default to include new fields.

Replace:

```typescript
const defaults: BrowserAiPreferences = {
  preferredProvider: 'auto',
  webllmModelId: null,
  allowModelDownload: false,
  lastDetection: null,
}
```

With:

```typescript
const defaults: BrowserAiPreferences = {
  preferredProvider: 'auto',
  webllmModelId: null,
  allowModelDownload: false,
  ollamaUrl: null,
  ollamaModel: null,
  lastDetection: null,
}
```

### File 4: `components/settings/ai-provider-settings.tsx` (MODIFY)

**Change 1:** Add state and handler for Ollama URL. After the `saveAllowModelDownload` function (after line 75), add:

```typescript
const [ollamaUrl, setOllamaUrl] = useState('')
const [ollamaModel, setOllamaModel] = useState('')
const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
```

**Change 2:** Load Ollama values from preferences. In the existing `useEffect` (lines 62-66), update to also load Ollama settings.

Replace:

```typescript
useEffect(() => {
  const prefs = engine.getPreferences()
  setProviderPreference(prefs.preferredProvider)
  setAllowModelDownload(prefs.allowModelDownload)
}, [engine])
```

With:

```typescript
useEffect(() => {
  const prefs = engine.getPreferences()
  setProviderPreference(prefs.preferredProvider)
  setAllowModelDownload(prefs.allowModelDownload)
  setOllamaUrl(prefs.ollamaUrl ?? '')
  setOllamaModel(prefs.ollamaModel ?? '')
}, [engine])
```

**Change 3:** Add test connection and save functions. After the `saveAllowModelDownload` function and the new state declarations, add:

```typescript
const saveOllamaUrl = (value: string) => {
  setOllamaUrl(value)
  engine.setPreferences({ ollamaUrl: value || null })
  setOllamaStatus('idle')
}

const saveOllamaModel = (value: string) => {
  setOllamaModel(value)
  engine.setPreferences({ ollamaModel: value || null })
}

const testOllamaConnection = async () => {
  if (!ollamaUrl.trim()) return
  setOllamaStatus('testing')
  try {
    const { OllamaLocalProvider } = await import('@/lib/ai/local-ai-provider')
    const provider = new OllamaLocalProvider(ollamaUrl)
    const ok = await provider.detect()
    setOllamaStatus(ok ? 'ok' : 'fail')
  } catch {
    setOllamaStatus('fail')
  }
}
```

**Change 4:** Add the Ollama card to the JSX. After the Model Download `</Card>` (after line 158) and before the Inference Stats `<Card>` (line 160), add:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Local Ollama</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Ollama URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => saveOllamaUrl(e.target.value)}
            placeholder="http://localhost:11434"
            className="flex-1 rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
          <button
            onClick={testOllamaConnection}
            disabled={!ollamaUrl.trim() || ollamaStatus === 'testing'}
            className="shrink-0 rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700 disabled:opacity-40"
          >
            {ollamaStatus === 'testing' ? 'Testing...' : 'Test'}
          </button>
        </div>
        {ollamaStatus === 'ok' && (
          <p className="mt-1 text-xs text-emerald-400">Connected successfully</p>
        )}
        {ollamaStatus === 'fail' && (
          <p className="mt-1 text-xs text-red-400">
            Could not connect. Check the URL and make sure Ollama is running.
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1">Model</label>
        <input
          type="text"
          value={ollamaModel}
          onChange={(e) => saveOllamaModel(e.target.value)}
          placeholder="gemma4"
          className="w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder-stone-500 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
        <p className="mt-1 text-xs text-stone-500">
          The model name as shown by <code className="text-stone-400">ollama list</code>.
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## Edge Cases and Error Handling

| Scenario                           | Correct Behavior                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Ollama not running                 | `detect()` returns false, engine skips to next provider                               |
| Invalid URL                        | `detect()` fails gracefully, engine skips to next provider                            |
| Ollama running but model not found | `OllamaLocalProvider.chat()` throws, engine returns null, caller falls back to server |
| No URL configured                  | Engine skips Ollama entirely (prefs.ollamaUrl is null)                                |
| CORS blocked                       | `detect()` fails gracefully, engine skips to next provider                            |

---

## Verification Steps

1. Start dev server and sign in
2. Navigate to `/settings/ai`
3. Enter `http://localhost:11434` in the Ollama URL field
4. Click "Test" - should show "Connected successfully" (if Ollama running) or error
5. Set provider to "Browser Only"
6. Open a public page Remy widget - if no Chrome AI/WebLLM, should use Ollama
7. Check browser console for `[browser-ai]` logs confirming Ollama provider

---

## Out of Scope

- Wiring browser AI engine into the chef portal mascot chat (separate spec)
- Model auto-detection from Ollama `/api/tags` (future enhancement)
- Ollama model download/pull from settings (future enhancement)

---

## Notes for Builder Agent

**CRITICAL: Do NOT modify any files other than the 4 listed above.**

**Import paths are exact.** The new file at `lib/ai/browser/ollama-adapter.ts` imports from `@/lib/ai/local-ai-provider` (the existing `OllamaLocalProvider` class).

**The `OllamaLocalProvider` class** at `lib/ai/local-ai-provider.ts` has:

- Constructor: `new OllamaLocalProvider(url: string)`
- `detect(): Promise<boolean>` - pings `/api/tags`, returns true if reachable
- `chat(systemPrompt, messages, model, onToken, options?, signal?): Promise<void>` - streams tokens via callback

**The `BrowserAiAdapter` interface** requires: `provider` (readonly), `isAvailable()`, `load()`, `generate(options)`, `unload()`.

**In engine.ts, the Ollama block goes AFTER the WebLLM block and BEFORE the final `this.setStatus('unavailable')`.** The load method tries providers in order: Chrome AI -> WebLLM -> Ollama -> give up.

**After creating/modifying files, run `node scripts/run-typecheck.mjs -p tsconfig.ci.json` and fix any type errors in the files you touched. Do NOT fix errors in other files.**
