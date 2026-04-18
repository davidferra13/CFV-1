// Core AI Parsing Types
// Type exports used across all AI parsing modules.
// The Gemini implementation was removed - all AI routes through Ollama (Gemma 4).

export type Confidence = 'high' | 'medium' | 'low'

export type ParseResult<T> = {
  parsed: T
  confidence: Confidence
  warnings: string[]
}

/**
 * Check if AI is configured (Ollama endpoint available).
 */
export async function isAIConfigured(): Promise<boolean> {
  return !!process.env.OLLAMA_BASE_URL
}
