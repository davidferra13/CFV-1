// Vercel AI SDK provider configuration for local Ollama.
// Zero cloud dependency; all calls go to local Ollama-compatible endpoint.
// Used by streamText (Remy routes) and generateObject (parseWithOllama).

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

/**
 * Creates an Ollama-compatible AI SDK provider instance.
 * Accepts an optional baseURL override for dispatch routing.
 */
export function createOllamaProvider(baseURL?: string) {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  })
}

/** Default provider using env-configured endpoint */
export const ollama = createOllamaProvider()

/** Model helpers matching existing tier system */
export const models = {
  fast: ollama('gemma3:4b'),
  standard: ollama('gemma4:e4b'),
  thinking: ollama('gemma4:e4b'),
} as const
