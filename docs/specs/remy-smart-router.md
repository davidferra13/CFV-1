# Spec: Remy Smart Router

> Wires model registry + discovery into the existing dispatch layer. The system now picks the BEST installed model for each task instead of always using `gemma4`.

## Status: QUEUED

## Dependencies

- `docs/specs/remy-model-registry.md` must be built first (creates `lib/ai/model-registry.ts`)
- `docs/specs/remy-model-discovery.md` must be built first (creates `lib/ai/model-discovery.ts`)

## Context

The existing dispatch layer at `lib/ai/dispatch/` already has:

- `types.ts`: `DispatchModelTier = 'fast' | 'standard' | 'complex'`
- `routing-table.ts`: resolves models from env vars (always returns same model)
- `router.ts`: full dispatch decision engine
- `classifier.ts`: task classification
- `privacy-gate.ts`: privacy scanning

Currently `resolveOllamaModel()` in `routing-table.ts` does:

```typescript
function getModelFromEnv(location, tier) {
  return process.env[`${prefix}_MODEL_${tierKey}`] || process.env.OLLAMA_MODEL || 'gemma4'
}
```

This spec adds a PARALLEL function `resolveSmartModel()` that uses the registry and discovery to pick the best model. The existing `resolveOllamaModel()` stays as fallback. Zero breakage.

## Task-to-Capability Mapping

Map existing `taskType` strings (already used in dispatch) to model capabilities:

| taskType pattern                                    | ModelCapability  | Why                                        |
| --------------------------------------------------- | ---------------- | ------------------------------------------ |
| `remy.chat`, `remy.conversation`                    | `chat`           | General Remy conversation                  |
| `remy.classify`, `remy.intent`                      | `classification` | Intent classification (use fastest model)  |
| `structured.parse`, `receipt.parse`, `recipe.parse` | `extraction`     | Data extraction from text                  |
| `remy.draft`, `email.draft`, `social.caption`       | `creative`       | Content generation                         |
| `remy.command.*`                                    | `tool-use`       | Function calling / command execution       |
| `analysis.*`, `contingency.*`, `costing.*`          | `reasoning`      | Complex business logic                     |
| `code.*`                                            | `coding`         | Code-related (unlikely in Remy but exists) |

## Files to Create

### 1. `lib/ai/dispatch/smart-model-resolver.ts`

```typescript
// Smart Model Resolver - picks the best installed model for a given task.
// Falls back to env-var resolution if discovery fails or no match found.
// No 'use server' - called from within dispatch layer.

import type { ModelCapability } from '../model-registry'
import type { DispatchModelTier, AiExecutionLocation } from './types'

/**
 * Map taskType strings to ModelCapability for registry lookup.
 * Unrecognized task types default to 'chat'.
 */
export function taskTypeToCapability(taskType?: string): ModelCapability {
  if (!taskType) return 'chat'

  const t = taskType.toLowerCase()

  // Classification tasks - use fastest possible model
  if (t.includes('classify') || t.includes('intent') || t.includes('route')) {
    return 'classification'
  }

  // Extraction / parsing tasks
  if (t.includes('parse') || t.includes('extract') || t.includes('receipt') || t.includes('ocr')) {
    return 'extraction'
  }

  // Creative / drafting tasks
  if (
    t.includes('draft') ||
    t.includes('email') ||
    t.includes('caption') ||
    t.includes('bio') ||
    t.includes('creative') ||
    t.includes('contract')
  ) {
    return 'creative'
  }

  // Tool use / command execution
  if (
    t.includes('command') ||
    t.includes('action') ||
    t.includes('tool') ||
    t.includes('function')
  ) {
    return 'tool-use'
  }

  // Reasoning / analysis
  if (
    t.includes('analysis') ||
    t.includes('contingency') ||
    t.includes('costing') ||
    t.includes('reasoning') ||
    t.includes('consolidat')
  ) {
    return 'reasoning'
  }

  // Coding
  if (t.includes('code') || t.includes('coding')) {
    return 'coding'
  }

  // Default: general chat
  return 'chat'
}

/**
 * Map DispatchModelTier to VRAM budget.
 * 'fast' = must fit GPU (6GB), 'standard' = prefer GPU, 'complex' = allow CPU.
 */
export function tierToVramBudget(tier: DispatchModelTier): {
  maxVramMb: number
  requireGpu: boolean
} {
  switch (tier) {
    case 'fast':
      return { maxVramMb: 3000, requireGpu: true } // Only tiny models
    case 'standard':
      return { maxVramMb: 6000, requireGpu: false } // Fits GPU but CPU OK
    case 'complex':
      return { maxVramMb: 128000, requireGpu: false } // Anything goes
    default:
      return { maxVramMb: 6000, requireGpu: false }
  }
}

/**
 * Resolve the best model using registry + discovery.
 * Returns null if no suitable model found (caller should fall back to env vars).
 *
 * This function is async because it calls discoverModels().
 * The discovery result is cached (5 min TTL) so this is fast after first call.
 */
export async function resolveSmartModel(
  taskType?: string,
  tier: DispatchModelTier = 'standard',
  _location: AiExecutionLocation = 'local'
): Promise<string | null> {
  try {
    const { getBestInstalledModel } = await import('../model-discovery')
    const capability = taskTypeToCapability(taskType)
    const budget = tierToVramBudget(tier)

    const best = await getBestInstalledModel(capability, budget)
    return best?.id ?? null
  } catch {
    // Discovery failed (Ollama offline, import error, etc.)
    // Return null so caller falls back to env var resolution
    return null
  }
}
```

## Files to Modify

### 1. `lib/ai/dispatch/routing-table.ts`

**Add ONE new export** at the bottom of the file. Do NOT modify any existing functions.

```typescript
// Add this import at the top (with existing imports):
import { resolveSmartModel as resolveSmartModelImpl } from './smart-model-resolver'

// Add this export at the bottom of the file:
/**
 * Smart model resolution using registry + discovery.
 * Returns the best installed model for the given task, or falls back
 * to env-var resolution if smart routing fails.
 */
export async function resolveSmartOllamaModel(
  taskType?: string,
  tier: DispatchModelTier = 'standard',
  location: AiExecutionLocation = 'local'
): Promise<string> {
  const smart = await resolveSmartModelImpl(taskType, tier, location)
  if (smart) return smart
  // Fallback to existing env-var resolution
  return resolveOllamaModel(tier, location)
}
```

### 2. `lib/ai/parse-ollama.ts`

**One change only.** In the `parseWithOllama` function, after the dispatch resolution and before creating the Ollama client, add smart model resolution as an optional enhancement.

Find this block (around line 145-147):

```typescript
const baseUrl = options?.endpointUrl || dispatch.endpoint?.baseUrl || routedConfig.baseUrl
const model = options?.model || dispatch.model || routedConfig.model
```

Replace with:

```typescript
const baseUrl = options?.endpointUrl || dispatch.endpoint?.baseUrl || routedConfig.baseUrl

// Smart model resolution: if no explicit model override, try registry-aware routing
let model = options?.model || dispatch.model || routedConfig.model
if (!options?.model && !dispatch.model) {
  try {
    const { resolveSmartOllamaModel } = await import('./dispatch/routing-table')
    const smartModel = await resolveSmartOllamaModel(
      options?.dispatchHint?.taskType ?? 'structured.parse',
      options?.modelTier ?? 'standard',
      (dispatch.executionLocation ?? 'local') as import('./dispatch/types').AiExecutionLocation
    )
    if (smartModel) model = smartModel
  } catch {
    // Smart routing failed, keep default model
  }
}
```

## Testing

1. **No regression test:** Call any existing Remy function. It should work exactly as before because smart routing falls back to the existing model if anything goes wrong.

2. **Smart routing test:** Set `OLLAMA_MODEL` env var to empty string. Call `parseWithOllama` with `dispatchHint: { taskType: 'remy.classify' }`. It should pick `gemma4:e2b` (fastest classifier) if installed, otherwise fall back to `gemma4`.

3. **Log verification:** Check server logs for "AI dispatch resolved" entries. The `model` field should now vary based on task type instead of always being `gemma4`.

## DO NOT

- Do NOT remove or rename any existing functions in routing-table.ts
- Do NOT change the signature of `parseWithOllama` - the new code is internal only
- Do NOT change any env var names or defaults
- Do NOT make the smart routing mandatory - it must be a try/catch with fallback
- Do NOT change the existing `resolveOllamaModel` function
- Do NOT modify `router.ts`, `classifier.ts`, `privacy-gate.ts`, or `types.ts`
- Do NOT add new model tiers to `DispatchModelTier` - use the existing three
- Do NOT use em dashes anywhere
- Do NOT add console.log - use the existing `log.ai.info` pattern
