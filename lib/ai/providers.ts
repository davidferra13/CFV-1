// AI Provider Configuration
// No 'use server' — safe to import from any context (client, server, edge)
// Routing decisions and config for the privacy-first hybrid LLM system

export type AIProvider =
  | 'gemini'
  | 'ollama'
  | 'groq'
  | 'github_models'
  | 'workers_ai'
  | 'cerebras'
  | 'mistral'
  | 'sambanova'
  | 'openai'

/** Model tier for task-complexity routing. */
export type ModelTier = 'fast' | 'standard' | 'complex'

/**
 * Returns true if a local Ollama endpoint is configured.
 * Set OLLAMA_BASE_URL in .env.local to enable (e.g. http://localhost:11434).
 */
export function isOllamaEnabled(): boolean {
  return !!process.env.OLLAMA_BASE_URL
}

/**
 * Returns the primary Ollama connection config (PC).
 * Defaults to localhost:11434 / qwen3-coder:30b if env vars not set.
 */
export function getOllamaConfig(): { baseUrl: string; model: string } {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen3-coder:30b',
  }
}

/**
 * Returns the Ollama model for a given task-complexity tier.
 *
 * Env vars:
 *   OLLAMA_MODEL_FAST    — small, fast model for classification tasks (~4B, fits in 6GB VRAM)
 *   OLLAMA_MODEL         — default model for structured extraction (~30B MoE)
 *   OLLAMA_MODEL_COMPLEX — large model for conversational/creative tasks (defaults to qwen3:30b)
 *
 * Architecture rationale (RTX 3050, 6GB VRAM, 128GB RAM):
 *   fast    → qwen3:4b     — fits entirely in VRAM, 40-60 tok/s, for classification/intent parsing
 *   standard → qwen3-coder:30b — MoE (3.3B active), GPU+RAM split, 12-15 tok/s, structured JSON
 *   complex → qwen3:30b    — MoE (3.3B active), same speed, trained for prose/conversation
 */
export function getOllamaModel(tier: ModelTier = 'standard'): string {
  const defaultModel = process.env.OLLAMA_MODEL || 'qwen3-coder:30b'
  switch (tier) {
    case 'fast':
      return process.env.OLLAMA_MODEL_FAST || 'qwen3:4b'
    case 'standard':
      return defaultModel
    case 'complex':
      return process.env.OLLAMA_MODEL_COMPLEX || 'qwen3:30b'
  }
}

/** Stub: Pi is no longer part of the project. Always returns null. */
export function getOllamaPiUrl(): null {
  return null
}

/** Stub: Pi is no longer part of the project. Always returns false. */
export function isPiEndpointConfigured(): false {
  return false
}

/**
 * Returns the right model for a given tier.
 * Kept for backward compatibility with callers that pass an endpoint parameter.
 */
export function getModelForEndpoint(_endpoint: 'pc' | 'pi', tier: ModelTier = 'standard'): string {
  return getOllamaModel(tier)
}

// ─── Groq (Free Cloud — NON-PRIVATE tasks only) ─────────────────────────────

/**
 * Returns true if Groq API is configured.
 * Set GROQ_API_KEY in .env.local to enable.
 */
export function isGroqEnabled(): boolean {
  return !!process.env.GROQ_API_KEY
}

/**
 * Returns Groq connection config.
 * Groq uses the OpenAI-compatible API at api.groq.com.
 */
export function getGroqConfig(): { apiKey: string; baseUrl: string } {
  return {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  }
}

/**
 * Returns the Groq model for a given task-complexity tier.
 *
 * Env vars:
 *   GROQ_MODEL_FAST    — fastest model for simple tasks (default: llama-3.1-8b-instant)
 *   GROQ_MODEL         — default model for structured output (default: llama-3.3-70b-versatile)
 *   GROQ_MODEL_COMPLEX — largest model for reasoning (default: llama-3.3-70b-versatile)
 *
 * All models run on Groq's LPU hardware at ~800 tok/s. Free tier: ~30 req/min.
 */
export function getGroqModel(tier: ModelTier = 'fast'): string {
  switch (tier) {
    case 'fast':
      return process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant'
    case 'standard':
      return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    case 'complex':
      return process.env.GROQ_MODEL_COMPLEX || 'llama-3.3-70b-versatile'
  }
}

/**
 * Returns true if GitHub Models is configured.
 * Requires a GitHub token with models:read permission.
 */
export function isGitHubModelsEnabled(): boolean {
  return !!process.env.GITHUB_MODELS_TOKEN
}

/**
 * Returns GitHub Models connection config.
 */
export function getGitHubModelsConfig(): {
  token: string
  baseUrl: string
  apiVersion: string
  org: string | null
} {
  const org = process.env.GITHUB_MODELS_ORG?.trim()

  return {
    token: process.env.GITHUB_MODELS_TOKEN || '',
    baseUrl: process.env.GITHUB_MODELS_BASE_URL || 'https://models.github.ai',
    apiVersion: process.env.GITHUB_MODELS_API_VERSION || '2026-03-10',
    org: org ? org : null,
  }
}

/**
 * Returns the GitHub Models model for a given task-complexity tier.
 */
export function getGitHubModelsModel(tier: ModelTier = 'fast'): string {
  switch (tier) {
    case 'fast':
      return process.env.GITHUB_MODELS_MODEL_FAST || 'meta/Llama-3.1-8B-Instruct'
    case 'standard':
      return process.env.GITHUB_MODELS_MODEL || 'openai/gpt-4.1-mini'
    case 'complex':
      return process.env.GITHUB_MODELS_MODEL_COMPLEX || 'openai/gpt-4.1'
  }
}

/**
 * Returns true if Cloudflare Workers AI is configured.
 * Requires both an account ID and API token.
 */
export function isWorkersAiEnabled(): boolean {
  return !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_API_TOKEN
}

/**
 * Returns Cloudflare Workers AI connection config.
 */
export function getWorkersAiConfig(): {
  accountId: string
  apiToken: string
  baseUrl: string
} {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || ''

  return {
    accountId,
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    baseUrl:
      process.env.CLOUDFLARE_WORKERS_AI_BASE_URL ||
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
  }
}

/**
 * Returns the Workers AI model for a given task-complexity tier.
 */
export function getWorkersAiModel(tier: ModelTier = 'fast'): string {
  switch (tier) {
    case 'fast':
      return process.env.CLOUDFLARE_WORKERS_AI_MODEL_FAST || '@cf/meta/llama-3.1-8b-instruct'
    case 'standard':
      return process.env.CLOUDFLARE_WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
    case 'complex':
      return process.env.CLOUDFLARE_WORKERS_AI_MODEL_COMPLEX || '@cf/nvidia/nemotron-3-120b-a12b'
  }
}

// ─── Cerebras (Free Cloud — NON-PRIVATE tasks only) ──────────────────────────

/**
 * Returns true if Cerebras API is configured.
 * Set CEREBRAS_API_KEY in .env.local to enable.
 */
export function isCerebrasEnabled(): boolean {
  return !!process.env.CEREBRAS_API_KEY
}

/**
 * Returns Cerebras connection config.
 * OpenAI-compatible API at api.cerebras.ai.
 */
export function getCerebrasConfig(): { apiKey: string; baseUrl: string } {
  return {
    apiKey: process.env.CEREBRAS_API_KEY || '',
    baseUrl: process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1',
  }
}

/**
 * Returns the Cerebras model for a given task-complexity tier.
 *
 * Cerebras runs on custom wafer-scale chips at ~2000 tok/s.
 * Free tier available. Models: llama-4-scout-17b-16e, llama3.1-8b, llama3.3-70b.
 */
export function getCerebrasModel(tier: ModelTier = 'fast'): string {
  switch (tier) {
    case 'fast':
      return process.env.CEREBRAS_MODEL_FAST || 'llama3.1-8b'
    case 'standard':
      return process.env.CEREBRAS_MODEL || 'llama3.3-70b'
    case 'complex':
      return process.env.CEREBRAS_MODEL_COMPLEX || 'llama-4-scout-17b-16e'
  }
}

// ─── Mistral / Codestral (Free Cloud — NON-PRIVATE tasks only) ───────────────

/**
 * Returns true if Mistral API is configured.
 * Set MISTRAL_API_KEY in .env.local to enable.
 */
export function isMistralEnabled(): boolean {
  return !!process.env.MISTRAL_API_KEY
}

/**
 * Returns Mistral connection config.
 * Two endpoints: standard Mistral API and Codestral (code-specialized).
 */
export function getMistralConfig(): { apiKey: string; baseUrl: string; codestralBaseUrl: string } {
  return {
    apiKey: process.env.MISTRAL_API_KEY || '',
    baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
    codestralBaseUrl: process.env.CODESTRAL_BASE_URL || 'https://codestral.mistral.ai/v1',
  }
}

/**
 * Returns the Mistral model for a given task-complexity tier.
 * If useCodestral is true, returns Codestral models for code tasks.
 */
export function getMistralModel(tier: ModelTier = 'fast', useCodestral = false): string {
  if (useCodestral) {
    return process.env.CODESTRAL_MODEL || 'codestral-latest'
  }
  switch (tier) {
    case 'fast':
      return process.env.MISTRAL_MODEL_FAST || 'mistral-small-latest'
    case 'standard':
      return process.env.MISTRAL_MODEL || 'mistral-medium-latest'
    case 'complex':
      return process.env.MISTRAL_MODEL_COMPLEX || 'mistral-large-latest'
  }
}

// ─── SambaNova (Free Cloud — NON-PRIVATE tasks only) ─────────────────────────

/**
 * Returns true if SambaNova Cloud API is configured.
 * Set SAMBANOVA_API_KEY in .env.local to enable.
 */
export function isSambaNovaEnabled(): boolean {
  return !!process.env.SAMBANOVA_API_KEY
}

/**
 * Returns SambaNova connection config.
 * OpenAI-compatible API at api.sambanova.ai.
 */
export function getSambaNovaConfig(): { apiKey: string; baseUrl: string } {
  return {
    apiKey: process.env.SAMBANOVA_API_KEY || '',
    baseUrl: process.env.SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1',
  }
}

/**
 * Returns the SambaNova model for a given task-complexity tier.
 * Fast inference on Llama and DeepSeek models.
 */
export function getSambaNovaModel(tier: ModelTier = 'fast'): string {
  switch (tier) {
    case 'fast':
      return process.env.SAMBANOVA_MODEL_FAST || 'Meta-Llama-3.1-8B-Instruct'
    case 'standard':
      return process.env.SAMBANOVA_MODEL || 'Meta-Llama-3.3-70B-Instruct'
    case 'complex':
      return process.env.SAMBANOVA_MODEL_COMPLEX || 'DeepSeek-R1-Distill-Llama-70B'
  }
}

// ─── OpenAI (Paid Cloud — NON-PRIVATE tasks only) ────────────────────────────

/**
 * Returns true if OpenAI API is configured.
 * Set OPENAI_API_KEY in .env.local to enable.
 */
export function isOpenAiEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY
}

/**
 * Returns OpenAI connection config.
 */
export function getOpenAiConfig(): { apiKey: string; baseUrl: string } {
  return {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  }
}

/**
 * Returns the OpenAI model for a given task-complexity tier.
 * GPT-4.1-nano for fast/cheap, GPT-4.1-mini for standard, GPT-4.1 for complex.
 */
export function getOpenAiModel(tier: ModelTier = 'fast'): string {
  switch (tier) {
    case 'fast':
      return process.env.OPENAI_MODEL_FAST || 'gpt-4.1-nano'
    case 'standard':
      return process.env.OPENAI_MODEL || 'gpt-4.1-mini'
    case 'complex':
      return process.env.OPENAI_MODEL_COMPLEX || 'gpt-4.1'
  }
}

// NOTE: computeDynamicContext(), getContextSizeForEndpoint(), and getOllamaContextSize()
// were removed as part of the num_ctx purge (2026-03-01). Setting num_ctx on ollama.chat()
// calls caused a 170s KV cache reallocation hang on the RTX 3050 with GPU+RAM split models.
// All Remy routes now omit num_ctx, letting Ollama use the model's native default.
// See docs/remy-num-ctx-fix.md for full details.
