// Embedding utilities for semantic memory (nomic-embed-text via Ollama)
// Graceful degradation: returns null when Ollama is offline so callers
// fall back to keyword search without disruption.

const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embed'
const MODEL = 'nomic-embed-text'
const REQUEST_TIMEOUT_MS = 10_000

// Simple request-level cache keyed by text content
const embedCache = new Map<string, number[]>()
const CACHE_MAX_SIZE = 200

function cacheKey(text: string): string {
  return text.trim().toLowerCase().slice(0, 500)
}

function cacheSet(text: string, embedding: number[]): void {
  const key = cacheKey(text)
  if (embedCache.size >= CACHE_MAX_SIZE) {
    // Evict oldest entry
    const first = embedCache.keys().next().value
    if (first !== undefined) embedCache.delete(first)
  }
  embedCache.set(key, embedding)
}

function cacheGet(text: string): number[] | undefined {
  return embedCache.get(cacheKey(text))
}

/**
 * Embed a single text string via Ollama's nomic-embed-text model.
 * Returns null if Ollama is offline or the request fails.
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null

  const cached = cacheGet(text)
  if (cached) return cached

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const res = await fetch(OLLAMA_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: text.trim() }),
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`[embeddings] Ollama returned ${res.status}`)
      return null
    }

    const body = await res.json()

    // Ollama returns { embeddings: [[...]] } for single input
    const embedding: number[] | undefined = body.embeddings?.[0]
    if (!embedding || !Array.isArray(embedding)) {
      console.warn('[embeddings] Unexpected response shape from Ollama')
      return null
    }

    cacheSet(text, embedding)
    return embedding
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('ECONNREFUSED')) {
      console.warn('[embeddings] Ollama offline, skipping embedding')
    } else {
      console.warn('[embeddings] Embedding failed:', msg)
    }
    return null
  }
}

/**
 * Embed multiple texts in sequence.
 * Returns an array of the same length; entries are null for any that failed.
 */
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = []
  for (const text of texts) {
    results.push(await embedText(text))
  }
  return results
}
