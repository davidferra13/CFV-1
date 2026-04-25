# Spec: Remy Model Discovery

> Runtime layer. Queries local Ollama to discover which models are actually installed. Caches results. Bridges registry (what we know about) with reality (what's installed).

## Status: QUEUED

## Dependencies

- `docs/specs/remy-model-registry.md` must be built first (creates `lib/ai/model-registry.ts`)

## Context

The Model Registry (previous spec) defines what models exist and their capabilities. But not all models are installed. This spec adds runtime discovery: ask Ollama "what do you have?" and cross-reference with the registry.

The existing dispatch layer (`lib/ai/dispatch/routing-table.ts`) resolves models from env vars. This spec does NOT modify that file. It creates a parallel discovery system that the Smart Router spec (next spec) will wire in.

## Files to Create

### 1. `lib/ai/model-discovery.ts`

```typescript
'use server'

// Model Discovery - queries Ollama API to find installed models.
// Caches results for 5 minutes to avoid hammering the API.
// Cross-references with model-registry.ts for capability data.

import { getModelProfile, MODEL_REGISTRY, type ModelProfile } from './model-registry'

interface OllamaModelInfo {
  name: string
  size: number // bytes
  digest: string
  modified_at: string
}

interface OllamaTagsResponse {
  models: OllamaModelInfo[]
}

export interface InstalledModel {
  /** Ollama model ID */
  id: string
  /** Size on disk in bytes */
  sizeBytes: number
  /** Last modified date */
  modifiedAt: string
  /** Profile from registry (null if model is installed but not in our registry) */
  profile: ModelProfile | null
  /** Whether this model is in our registry */
  known: boolean
}

export interface DiscoveryResult {
  /** All installed models with their profiles */
  installed: InstalledModel[]
  /** Models in registry that are NOT installed (candidates to pull) */
  missing: ModelProfile[]
  /** Whether Ollama API was reachable */
  ollamaOnline: boolean
  /** Timestamp of this discovery */
  discoveredAt: string
  /** Whether this result came from cache */
  cached: boolean
}

// ── In-memory cache ────────────────────────────────────────────────

let cachedResult: DiscoveryResult | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedDiscovery(): DiscoveryResult | null {
  if (!cachedResult) return null
  if (Date.now() - cacheTimestamp > CACHE_TTL_MS) {
    cachedResult = null
    return null
  }
  return { ...cachedResult, cached: true }
}

// ── Discovery ──────────────────────────────────────────────────────

/**
 * Query Ollama API for installed models and cross-reference with registry.
 * Returns cached result if fresh (< 5 minutes old).
 *
 * @param forceRefresh - bypass cache and query Ollama directly
 */
export async function discoverModels(forceRefresh = false): Promise<DiscoveryResult> {
  if (!forceRefresh) {
    const cached = getCachedDiscovery()
    if (cached) return cached
  }

  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '')

  let ollamaModels: OllamaModelInfo[] = []
  let ollamaOnline = false

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (response.ok) {
      const data: OllamaTagsResponse = await response.json()
      ollamaModels = data.models || []
      ollamaOnline = true
    }
  } catch {
    // Ollama not reachable - return empty with ollamaOnline: false
  }

  // Cross-reference installed models with registry
  const installed: InstalledModel[] = ollamaModels.map((m) => {
    const profile = getModelProfile(m.name)
    return {
      id: m.name,
      sizeBytes: m.size,
      modifiedAt: m.modified_at,
      profile,
      known: profile !== null,
    }
  })

  // Find registry models that are not installed
  const installedIds = new Set(installed.map((m) => m.id))
  const missing = MODEL_REGISTRY.filter(
    (m) => !installedIds.has(m.id) && m.strengths[0] !== 'embedding' // skip embedding-only
  )

  const result: DiscoveryResult = {
    installed,
    missing,
    ollamaOnline,
    discoveredAt: new Date().toISOString(),
    cached: false,
  }

  // Cache the result
  cachedResult = result
  cacheTimestamp = Date.now()

  return result
}

/**
 * Check if a specific model is installed and ready.
 */
export async function isModelInstalled(modelId: string): Promise<boolean> {
  const discovery = await discoverModels()
  return discovery.installed.some((m) => m.id === modelId)
}

/**
 * Get the best installed model for a given capability.
 * Returns null if no suitable model is installed.
 * Prefers GPU-capable models, then sorts by estimated speed.
 */
export async function getBestInstalledModel(
  capability: import('./model-registry').ModelCapability,
  options?: { maxVramMb?: number; requireGpu?: boolean }
): Promise<ModelProfile | null> {
  const { rankModelsForTask } = await import('./model-registry')
  const discovery = await discoverModels()
  const installedIds = new Set(discovery.installed.map((m) => m.id))

  const ranked = rankModelsForTask(capability, options)
  const bestInstalled = ranked.find((m) => installedIds.has(m.id))

  return bestInstalled ?? null
}

/**
 * Clear the discovery cache. Call this after pulling or removing models.
 */
export function clearDiscoveryCache(): void {
  cachedResult = null
  cacheTimestamp = 0
}
```

## Files to Modify

**NONE.** This spec creates one new file only.

## Testing

```typescript
// Call from a server action or API route:
import { discoverModels, getBestInstalledModel } from '@/lib/ai/model-discovery'

// Should list all installed Ollama models with their registry profiles
const result = await discoverModels()
console.log(
  'Installed:',
  result.installed.map((m) => m.id)
)
console.log(
  'Missing:',
  result.missing.map((m) => m.id)
)
console.log('Ollama online:', result.ollamaOnline)

// Should return the fastest installed model that can classify
const classifier = await getBestInstalledModel('classification', { maxVramMb: 6000 })
console.log('Best classifier:', classifier?.id) // likely gemma4:e2b or gemma4:e4b
```

## DO NOT

- Do NOT modify any existing files
- Do NOT import from any ChefFlow file except `lib/ai/model-registry.ts`
- Do NOT use `ollama` npm package - use raw `fetch` against the REST API
- Do NOT pull or remove models - this is READ-ONLY discovery
- Do NOT throw errors if Ollama is offline - return `ollamaOnline: false` gracefully
- Do NOT use em dashes anywhere
- Do NOT add UI components - this is server-side only
