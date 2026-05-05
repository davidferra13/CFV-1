/**
 * Hermes-Powered Ingredient Name Normalizer
 *
 * When the regex-based normalizer in name-normalizer.ts cannot confidently
 * match a product name to a canonical ingredient, this module calls Hermes 3 8B
 * (via Ollama) for fuzzy AI-powered matching.
 *
 * Hermes 3 8B is specifically chosen for its structured JSON output and
 * function-calling capabilities (per the Remy model registry).
 *
 * NOT a 'use server' file. Called by sync receiver and resolution engine.
 */

import { Ollama } from 'ollama'
import { getOllamaConfig } from '@/lib/ai/providers'
import { normalizeIngredientName } from './name-normalizer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NormalizationResult {
  canonicalName: string
  confidence: number
  method: 'regex' | 'hermes'
  alternateNames: string[]
}

export interface BatchNormalizationResult {
  results: Map<string, NormalizationResult>
  hermesCallCount: number
  regexMatchCount: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HERMES_MODEL = 'hermes3:8b'
const MAX_BATCH_SIZE = 20 // Hermes handles ~20 items per call well
const CONFIDENCE_THRESHOLD = 0.6 // Below this, fall back to Hermes

// ---------------------------------------------------------------------------
// Regex pre-filter: try simple normalization first
// ---------------------------------------------------------------------------

function tryRegexMatch(
  productName: string,
  canonicalNames: Set<string>
): NormalizationResult | null {
  const normalized = normalizeIngredientName(productName)
  if (canonicalNames.has(normalized)) {
    return {
      canonicalName: normalized,
      confidence: 0.9,
      method: 'regex',
      alternateNames: [],
    }
  }

  // Try partial match: canonical name is substring of normalized or vice versa
  for (const canonical of canonicalNames) {
    if (normalized.includes(canonical) || canonical.includes(normalized)) {
      return {
        canonicalName: canonical,
        confidence: 0.7,
        method: 'regex',
        alternateNames: [],
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Hermes AI normalization
// ---------------------------------------------------------------------------

function makeOllamaClient(): Ollama {
  const config = getOllamaConfig()
  return new Ollama({ host: config.baseUrl })
}

async function normalizeWithHermes(
  productNames: string[],
  candidateCanonicals: string[]
): Promise<Map<string, NormalizationResult>> {
  const results = new Map<string, NormalizationResult>()
  const client = makeOllamaClient()

  const systemPrompt = `You are a food ingredient normalizer. Given grocery product names, map each to the most likely canonical ingredient name from the provided list, or suggest the best canonical name if none match.

Rules:
- Strip brand names, sizes, pack counts, store-specific labels
- "Organic Valley 2% Milk 1 Gallon" -> "milk"
- "Kirkland Signature Extra Virgin Olive Oil" -> "olive oil"
- "Fresh Atlantic Salmon Fillet 8oz" -> "salmon"
- If no canonical matches, create a clean generic name (lowercase, no brands)
- Return valid JSON only, no markdown

Output format (JSON array):
[{"product": "original name", "canonical": "matched name", "confidence": 0.0-1.0, "alternates": ["alt1"]}]`

  const userPrompt = `Map these product names to canonical ingredients.

Products:
${productNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Available canonical ingredients (subset):
${candidateCanonicals.slice(0, 200).join(', ')}

Return JSON array only.`

  try {
    const response = await client.chat({
      model: HERMES_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      format: 'json',
      options: {
        temperature: 0.1,
        num_predict: 2048,
      },
    })

    const content = response.message.content.trim()
    const parsed = JSON.parse(content)

    // Handle both array and {results: [...]} formats
    const items = Array.isArray(parsed) ? parsed : parsed.results || parsed.mappings || []

    for (const item of items) {
      if (item?.product && item?.canonical) {
        results.set(item.product, {
          canonicalName: String(item.canonical).toLowerCase().trim(),
          confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.5)),
          method: 'hermes',
          alternateNames: Array.isArray(item.alternates) ? item.alternates.map(String) : [],
        })
      }
    }
  } catch (err) {
    console.error('[hermes-normalizer] Hermes call failed:', err)
    // Return empty; caller will use regex fallback
  }

  return results
}

// ---------------------------------------------------------------------------
// Public API: normalize a batch of product names
// ---------------------------------------------------------------------------

export async function normalizeIngredientNames(
  productNames: string[],
  canonicalNames: string[]
): Promise<BatchNormalizationResult> {
  const start = Date.now()
  const results = new Map<string, NormalizationResult>()
  const canonicalSet = new Set(canonicalNames.map((n) => n.toLowerCase().trim()))
  const needsHermes: string[] = []
  let regexMatchCount = 0
  let hermesCallCount = 0

  // Phase 1: Try regex for everything
  for (const name of productNames) {
    const regexResult = tryRegexMatch(name, canonicalSet)
    if (regexResult && regexResult.confidence >= CONFIDENCE_THRESHOLD) {
      results.set(name, regexResult)
      regexMatchCount++
    } else {
      needsHermes.push(name)
    }
  }

  // Phase 2: Batch remaining through Hermes
  if (needsHermes.length > 0) {
    // Process in chunks
    for (let i = 0; i < needsHermes.length; i += MAX_BATCH_SIZE) {
      const chunk = needsHermes.slice(i, i + MAX_BATCH_SIZE)
      hermesCallCount++

      const hermesResults = await normalizeWithHermes(chunk, canonicalNames)

      for (const name of chunk) {
        const hermesResult = hermesResults.get(name)
        if (hermesResult) {
          results.set(name, hermesResult)
        } else {
          // Hermes didn't return a match; use best-effort regex
          results.set(name, {
            canonicalName: normalizeIngredientName(name),
            confidence: 0.3,
            method: 'regex',
            alternateNames: [],
          })
        }
      }
    }
  }

  return {
    results,
    hermesCallCount,
    regexMatchCount,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Single-item convenience
// ---------------------------------------------------------------------------

export async function normalizeOneIngredient(
  productName: string,
  canonicalNames: string[]
): Promise<NormalizationResult> {
  const batch = await normalizeIngredientNames([productName], canonicalNames)
  return (
    batch.results.get(productName) || {
      canonicalName: normalizeIngredientName(productName),
      confidence: 0.2,
      method: 'regex',
      alternateNames: [],
    }
  )
}
