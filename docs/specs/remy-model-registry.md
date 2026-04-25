# Spec: Remy Model Registry

> Pure data layer. Defines all available local AI models, their capabilities, and task-to-model mappings. Zero side effects, zero existing file modifications.

## Status: QUEUED

## Context

ChefFlow uses Ollama for all AI inference. Currently, every call goes to a single model (`gemma4`) regardless of task complexity. The dispatch layer at `lib/ai/dispatch/` already supports tiers (`fast | standard | complex`) but all tiers resolve to the same model via env vars.

This spec adds a static model registry so the system knows WHAT models exist and WHAT each model is good at. This is the foundation for smart routing (separate spec).

## Hardware Context

- GPU: RTX 3050 (6GB VRAM) - fits models up to ~5GB quantized
- CPU: Ryzen 9 7900X, 128GB RAM - can run 70B+ models on CPU
- Ollama serves multiple models, hot-swaps on demand

## Files to Create

### 1. `lib/ai/model-registry.ts`

```typescript
// Model Registry - static catalog of AI models and their capabilities.
// No 'use server' - safe to import anywhere.
// This file is DATA ONLY. No side effects, no API calls, no database queries.

export type ModelCapability =
  | 'chat' // General conversation
  | 'reasoning' // Complex multi-step logic
  | 'coding' // Code generation/analysis
  | 'vision' // Image understanding
  | 'tool-use' // Function calling / structured output
  | 'creative' // Creative writing, email drafts
  | 'extraction' // Data extraction, parsing
  | 'classification' // Intent classification, categorization
  | 'embedding' // Text embeddings (not generative)

export type ModelSize = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge'

export type InferenceTarget = 'gpu' | 'cpu' | 'browser' | 'phone'

export interface ModelProfile {
  /** Ollama model ID (e.g. 'gemma4:e4b') */
  id: string
  /** Human-readable name */
  name: string
  /** Parameter count description (e.g. '4.5B effective / 8B total') */
  params: string
  /** Approximate VRAM needed for Q4 quantization in MB */
  vramMb: number
  /** Approximate RAM needed for CPU inference in MB */
  ramMb: number
  /** Size classification */
  size: ModelSize
  /** What this model excels at - ordered by strength */
  strengths: ModelCapability[]
  /** What this model is NOT good at */
  weaknesses: ModelCapability[]
  /** Where this model can run */
  targets: InferenceTarget[]
  /** Estimated tokens/sec on GPU (RTX 3050 6GB) - 0 if won't fit */
  estimatedTpsGpu: number
  /** Estimated tokens/sec on CPU (Ryzen 9 7900X) */
  estimatedTpsCpu: number
  /** Max context length in tokens */
  maxContext: number
  /** Is this model multimodal (accepts images)? */
  multimodal: boolean
  /** Brief description of what makes this model unique */
  description: string
}

/**
 * Static registry of all models the system knows about.
 * Models may or may not be installed - use model-discovery.ts to check.
 *
 * IMPORTANT: Only add models that are available on Ollama (ollama.com/library).
 * Do NOT add models from other providers.
 */
export const MODEL_REGISTRY: ModelProfile[] = [
  // ── GPU-friendly (fits in 6GB VRAM) ──────────────────────────────
  {
    id: 'gemma4:e2b',
    name: 'Gemma 4 E2B',
    params: '2.3B effective / 5.1B total',
    vramMb: 3000,
    ramMb: 4000,
    size: 'tiny',
    strengths: ['chat', 'classification', 'extraction'],
    weaknesses: ['reasoning', 'coding'],
    targets: ['gpu', 'cpu', 'browser', 'phone'],
    estimatedTpsGpu: 60,
    estimatedTpsCpu: 20,
    maxContext: 128000,
    multimodal: true,
    description: 'Ultra-fast, phone-grade. Best for simple classification and routing decisions.',
  },
  {
    id: 'gemma4:e4b',
    name: 'Gemma 4 E4B',
    params: '4.5B effective / 8B total',
    vramMb: 5000,
    ramMb: 6000,
    size: 'small',
    strengths: ['chat', 'extraction', 'tool-use', 'classification', 'creative'],
    weaknesses: ['reasoning'],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 35,
    estimatedTpsCpu: 12,
    maxContext: 128000,
    multimodal: true,
    description: 'Best quality-per-VRAM. Current ChefFlow daily driver.',
  },
  {
    id: 'qwen3.5:4b',
    name: 'Qwen 3.5 4B',
    params: '4B',
    vramMb: 2500,
    ramMb: 3500,
    size: 'small',
    strengths: ['reasoning', 'coding', 'tool-use'],
    weaknesses: ['creative'],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 35,
    estimatedTpsCpu: 15,
    maxContext: 128000,
    multimodal: false,
    description: 'Best pure-text reasoning per byte. Hybrid thinking mode.',
  },
  {
    id: 'phi4-mini',
    name: 'Phi-4 Mini',
    params: '3.8B',
    vramMb: 2200,
    ramMb: 3000,
    size: 'small',
    strengths: ['reasoning', 'coding', 'extraction'],
    weaknesses: ['creative', 'chat'],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 40,
    estimatedTpsCpu: 18,
    maxContext: 128000,
    multimodal: true,
    description: 'Microsoft reasoning model. Great for structured output and chain-of-thought.',
  },
  {
    id: 'qwen3:8b',
    name: 'Qwen 3 8B',
    params: '8B',
    vramMb: 4600,
    ramMb: 6000,
    size: 'medium',
    strengths: ['chat', 'coding', 'reasoning', 'tool-use'],
    weaknesses: [],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 20,
    estimatedTpsCpu: 8,
    maxContext: 128000,
    multimodal: false,
    description: 'Strong all-rounder. Tight fit on 6GB GPU.',
  },
  {
    id: 'hermes3:8b',
    name: 'Hermes 3 8B',
    params: '8B',
    vramMb: 5000,
    ramMb: 6000,
    size: 'medium',
    strengths: ['tool-use', 'chat', 'extraction'],
    weaknesses: ['reasoning'],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 18,
    estimatedTpsCpu: 7,
    maxContext: 128000,
    multimodal: false,
    description: 'Function calling specialist. Good for structured tool use.',
  },
  {
    id: 'deepseek-r1:8b',
    name: 'DeepSeek R1 8B',
    params: '8B (distill)',
    vramMb: 5000,
    ramMb: 6000,
    size: 'medium',
    strengths: ['reasoning'],
    weaknesses: ['chat', 'creative'],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 18,
    estimatedTpsCpu: 7,
    maxContext: 64000,
    multimodal: false,
    description: 'Pure reasoning chain model. Best for complex multi-step logic.',
  },

  // ── CPU-only (needs 128GB RAM) ───────────────────────────────────
  {
    id: 'gemma4',
    name: 'Gemma 4 27B MoE',
    params: '4B active / 27B total (MoE)',
    vramMb: 16000,
    ramMb: 16000,
    size: 'large',
    strengths: ['chat', 'creative', 'reasoning', 'extraction', 'tool-use', 'coding'],
    weaknesses: [],
    targets: ['cpu'],
    estimatedTpsGpu: 0,
    estimatedTpsCpu: 10,
    maxContext: 128000,
    multimodal: true,
    description:
      'Flagship Gemma. MoE means only 4B active per token despite 27B total. Faster than dense 27B on CPU.',
  },
  {
    id: 'qwen3.6',
    name: 'Qwen 3.6 27B',
    params: '27B',
    vramMb: 17000,
    ramMb: 17000,
    size: 'large',
    strengths: ['coding', 'reasoning', 'tool-use'],
    weaknesses: [],
    targets: ['cpu'],
    estimatedTpsGpu: 0,
    estimatedTpsCpu: 5,
    maxContext: 128000,
    multimodal: false,
    description: 'Released April 22 2026. Beats models 10x its size on coding benchmarks.',
  },
  {
    id: 'qwen3:30b',
    name: 'Qwen 3 30B',
    params: '30B',
    vramMb: 19000,
    ramMb: 19000,
    size: 'large',
    strengths: ['chat', 'coding', 'reasoning'],
    weaknesses: [],
    targets: ['cpu'],
    estimatedTpsGpu: 0,
    estimatedTpsCpu: 4,
    maxContext: 128000,
    multimodal: false,
    description: 'Strong general-purpose model. Slower than Qwen 3.6 for coding.',
  },
  {
    id: 'phi4',
    name: 'Phi-4 14B',
    params: '14B',
    vramMb: 9000,
    ramMb: 9000,
    size: 'medium',
    strengths: ['coding', 'reasoning'],
    weaknesses: ['creative'],
    targets: ['cpu'],
    estimatedTpsGpu: 0,
    estimatedTpsCpu: 8,
    maxContext: 128000,
    multimodal: false,
    description: 'Microsoft reasoning model. Compact, good CPU inference speed.',
  },
  {
    id: 'kimi-k2',
    name: 'Kimi K2',
    params: '32B active / 1T total (MoE)',
    vramMb: 100000,
    ramMb: 100000,
    size: 'xlarge',
    strengths: ['coding', 'reasoning', 'tool-use'],
    weaknesses: ['chat'],
    targets: ['cpu'],
    estimatedTpsGpu: 0,
    estimatedTpsCpu: 2,
    maxContext: 128000,
    multimodal: false,
    description:
      'Moonshot AI agentic coding model. Massive but powerful. Only for heavy-lift tasks.',
  },

  // ── Embedding (not generative) ───────────────────────────────────
  {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    params: '137M',
    vramMb: 300,
    ramMb: 500,
    size: 'tiny',
    strengths: ['embedding'],
    weaknesses: ['chat', 'reasoning', 'coding', 'creative', 'extraction'],
    targets: ['gpu', 'cpu'],
    estimatedTpsGpu: 0,
    estimatedTpsCpu: 0,
    maxContext: 8192,
    multimodal: false,
    description: 'Text embedding model for semantic search and intent routing. Not generative.',
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────

/** Find a model profile by its Ollama ID */
export function getModelProfile(modelId: string): ModelProfile | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId)
}

/** Get all models that list a given capability as a strength */
export function getModelsWithCapability(capability: ModelCapability): ModelProfile[] {
  return MODEL_REGISTRY.filter((m) => m.strengths.includes(capability))
}

/** Get all models that fit in the given VRAM budget (in MB) */
export function getModelsForVram(vramBudgetMb: number): ModelProfile[] {
  return MODEL_REGISTRY.filter((m) => m.vramMb <= vramBudgetMb)
}

/** Get models by size tier */
export function getModelsBySize(size: ModelSize): ModelProfile[] {
  return MODEL_REGISTRY.filter((m) => m.size === size)
}

/**
 * Rank models for a specific capability, filtered by what fits the hardware.
 * Returns models sorted by: (1) has the capability as strength, (2) speed.
 */
export function rankModelsForTask(
  capability: ModelCapability,
  options?: { maxVramMb?: number; requireGpu?: boolean }
): ModelProfile[] {
  let candidates = MODEL_REGISTRY.filter((m) => m.strengths.includes(capability))

  if (options?.maxVramMb) {
    candidates = candidates.filter((m) => m.vramMb <= options.maxVramMb!)
  }

  if (options?.requireGpu) {
    candidates = candidates.filter((m) => m.targets.includes('gpu'))
  }

  // Sort by estimated speed (GPU first, then CPU)
  return candidates.sort((a, b) => {
    const aSpeed = a.estimatedTpsGpu || a.estimatedTpsCpu
    const bSpeed = b.estimatedTpsGpu || b.estimatedTpsCpu
    return bSpeed - aSpeed
  })
}
```

## Files to Modify

**NONE.** This spec creates one new file only.

## Testing

```typescript
// Verify in Node REPL or a test file:
import { getModelsWithCapability, rankModelsForTask } from '@/lib/ai/model-registry'

// Should return gemma4:e2b, gemma4:e4b, qwen3:8b, hermes3:8b, gemma4
getModelsWithCapability('chat')

// Should return models that fit in 6GB, sorted by speed
rankModelsForTask('chat', { maxVramMb: 6000 })

// Should return gemma4:e2b first (fastest classifier)
rankModelsForTask('classification', { maxVramMb: 6000 })
```

## DO NOT

- Do NOT add `'use server'` to this file - it is pure data, importable from anywhere
- Do NOT import from any other ChefFlow file - this is standalone
- Do NOT make API calls, database queries, or any side effects
- Do NOT modify any existing files
- Do NOT use em dashes anywhere
- Do NOT add models that are not on Ollama's public library
