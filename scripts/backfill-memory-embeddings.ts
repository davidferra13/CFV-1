/**
 * Backfill script: embed all existing remy_memories rows where embedding IS NULL.
 * Processes in batches of 50 with a small delay between batches.
 *
 * Usage: npx tsx scripts/backfill-memory-embeddings.ts
 */

import postgres from 'postgres'

const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embed'
const MODEL = 'nomic-embed-text'
const BATCH_SIZE = 50
const DELAY_MS = 500

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const sql = postgres(connectionString)

async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(OLLAMA_EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: text.trim() }),
    })

    if (!res.ok) {
      console.warn(`Ollama returned ${res.status}`)
      return null
    }

    const body = await res.json()
    const embedding: number[] | undefined = body.embeddings?.[0]
    if (!embedding || !Array.isArray(embedding)) return null
    return embedding
  } catch (err) {
    console.error('Embedding request failed:', err)
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  // Count total rows needing embedding
  type CountRow = { count: string }
  const [countResult] = await sql<CountRow[]>`
    SELECT COUNT(*)::text AS count
    FROM remy_memories
    WHERE embedding IS NULL AND is_active = true
  `
  const total = parseInt(countResult.count, 10)
  console.log(`Found ${total} memories to embed`)

  if (total === 0) {
    console.log('Nothing to backfill.')
    await sql.end()
    return
  }

  let processed = 0
  let embedded = 0
  let failed = 0

  while (true) {
    type MemRow = { id: string; content: string }
    const batch = await sql<MemRow[]>`
      SELECT id, content
      FROM remy_memories
      WHERE embedding IS NULL AND is_active = true
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
    `

    if (batch.length === 0) break

    for (const row of batch) {
      const vec = await embedText(row.content)
      if (vec) {
        const vecStr = `[${vec.join(',')}]`
        await sql`
          UPDATE remy_memories
          SET embedding = ${vecStr}::vector
          WHERE id = ${row.id}
        `
        embedded++
      } else {
        failed++
      }
      processed++
    }

    console.log(`Progress: ${processed}/${total} (${embedded} embedded, ${failed} failed)`)

    // Small delay between batches to avoid overwhelming Ollama
    if (batch.length === BATCH_SIZE) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`Done. Embedded: ${embedded}, Failed: ${failed}, Total processed: ${processed}`)
  await sql.end()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
