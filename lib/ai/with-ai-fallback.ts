// AI Fallback Wrapper - deterministic floor with optional AI enhancement
// No 'use server' - imported by server action files that already have it.
//
// Pattern: formula version runs first (instant, always correct).
// If Ollama is online and the caller opts in, AI can enhance the result.
// If Ollama is offline, the formula result is returned - no error, no OllamaOfflineError.

import { OllamaOfflineError } from './ollama-errors'
import { isOllamaEnabled } from './providers'
import { log } from '@/lib/logger'
import { incrementAiMetric } from './ai-metrics'

export type FallbackResult<T> = {
  result: T
  source: 'formula' | 'ai'
}

/**
 * Runs the formula version first, then optionally enhances with AI.
 *
 * - Formula version ALWAYS runs (it's the foundation)
 * - AI version is attempted only if Ollama is online
 * - If AI fails for any reason, the formula result is returned silently
 * - The caller gets both the result and which source produced it
 *
 * Use this for features where the formula is sufficient but AI adds polish.
 * Do NOT use this for features where only AI makes sense (Remy, sentiment, etc.)
 */
export async function withAiFallback<T>(
  formulaVersion: () => T | Promise<T>,
  aiVersion: () => Promise<T>
): Promise<FallbackResult<T>> {
  // Formula runs first - it's always the foundation
  const formulaResult = await formulaVersion()

  // If Ollama isn't even configured, return formula immediately
  if (!isOllamaEnabled()) {
    return { result: formulaResult, source: 'formula' }
  }

  // Try AI enhancement - if it fails for any reason, formula stands
  try {
    const aiResult = await aiVersion()
    return { result: aiResult, source: 'ai' }
  } catch (err) {
    // OllamaOfflineError or any other error - formula is the floor
    if (err instanceof OllamaOfflineError) {
      log.ai.info(`Ollama offline (${err.code}), using formula result`)
    } else {
      log.ai.warn('AI enhancement failed, using formula result', { error: err })
    }
    incrementAiMetric('ai.fallback.to_formula')
    return { result: formulaResult, source: 'formula' }
  }
}

/**
 * For features where the formula IS the right answer (pure math, lookups).
 * AI is not attempted at all - the formula is objectively better.
 * This wrapper exists for consistency: all formula functions return FallbackResult.
 */
export function formulaOnly<T>(result: T): FallbackResult<T> {
  return { result, source: 'formula' }
}
