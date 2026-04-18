// Simulation Ollama Client
//
// Previously used a custom node:http wrapper to bypass undici's 30-second
// headersTimeout, because older models on CPU took 20+ minutes per call.
// With Gemma 4, responses arrive in <2s. Standard Ollama client works fine.

import { Ollama } from 'ollama'
import { getOllamaConfig } from '@/lib/ai/providers'

/**
 * Creates an Ollama client for simulation use.
 * Uses the same endpoint as production (OLLAMA_BASE_URL).
 */
export function makeOllamaClient(): Ollama {
  const config = getOllamaConfig()
  return new Ollama({ host: config.baseUrl })
}
