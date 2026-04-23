#!/usr/bin/env node
/**
 * Stage 1b: Document Classification
 * Classifies ingested files using Ollama. Processes in batches.
 * Idempotent - only processes files with status 'ingested'.
 */

import { openDb } from '../lib/db.mjs'
import { mapWithConcurrency } from '../lib/async-pool.mjs'
import { classifyDocument } from '../lib/ollama-prompts.mjs'

const BATCH_SIZE = parseInt(process.env.CLASSIFY_BATCH_SIZE || '64', 10)
const CLASSIFY_CONCURRENCY = parseInt(process.env.CLASSIFY_CONCURRENCY || '8', 10)

async function main() {
  const db = openDb()
  const startTime = Date.now()

  const pending = db.prepare(`
    SELECT id, original_path, file_type, ocr_text
    FROM archive_files
    WHERE status = 'ingested'
    ORDER BY created_at ASC
    LIMIT ?
  `).all(BATCH_SIZE)

  if (pending.length === 0) {
    console.log('[classify] No files to classify')
    db.close()
    return
  }

  console.log(`[classify] Processing ${pending.length} files`)

  const updateClassification = db.prepare(`
    UPDATE archive_files
    SET classification = ?, classification_confidence = ?, status = 'classified', processed_at = datetime('now')
    WHERE id = ?
  `)

  const markFailed = db.prepare(`
    UPDATE archive_files
    SET status = 'classify_failed', error_message = ?, processed_at = datetime('now')
    WHERE id = ?
  `)

  let succeeded = 0, failed = 0

  await mapWithConcurrency(pending, CLASSIFY_CONCURRENCY, async (file) => {
    try {
      const filename = file.original_path.split(/[/\\]/).pop()
      const result = await classifyDocument(filename, file.file_type, file.ocr_text)

      if (result && result.classification) {
        updateClassification.run(result.classification, result.confidence || 0, file.id)
        console.log(`  [${result.classification}] ${filename} (${((result.confidence || 0) * 100).toFixed(0)}%)`)
        succeeded++
      } else {
        updateClassification.run('unknown', 0, file.id)
        console.log(`  [unknown] ${filename} (Gemma returned no classification)`)
        succeeded++
      }
    } catch (err) {
      markFailed.run(err.message, file.id)
      console.error(`  [FAIL] ${file.original_path}: ${err.message}`)
      failed++
    }
  })

  const durationMs = Date.now() - startTime

  db.prepare(`
    INSERT INTO archive_processing_log (stage, files_processed, files_succeeded, files_failed, duration_ms)
    VALUES ('classify', ?, ?, ?, ?)
  `).run(pending.length, succeeded, failed, durationMs)

  db.close()

  console.log(`\n[classify] Complete: ${succeeded} classified, ${failed} failed (${(durationMs / 1000).toFixed(1)}s)`)
}

main().catch(err => {
  console.error('[classify] Fatal:', err)
  process.exit(1)
})
