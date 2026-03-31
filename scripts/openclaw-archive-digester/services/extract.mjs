#!/usr/bin/env node
/**
 * Stage 2: Entity Extraction
 * Extracts structured entities (names, dates, amounts, etc.) from classified files.
 * Only processes files with status 'classified'.
 */

import { openDb } from '../lib/db.mjs'
import { extractEntities } from '../lib/ollama-prompts.mjs'

const BATCH_SIZE = parseInt(process.env.EXTRACT_BATCH_SIZE || '20', 10)

async function main() {
  const db = openDb()
  const startTime = Date.now()

  const pending = db.prepare(`
    SELECT id, original_path, classification, ocr_text
    FROM archive_files
    WHERE status = 'classified'
    ORDER BY created_at ASC
    LIMIT ?
  `).all(BATCH_SIZE)

  if (pending.length === 0) {
    console.log('[extract] No files to process')
    db.close()
    return
  }

  console.log(`[extract] Processing ${pending.length} files`)

  const updateEntities = db.prepare(`
    UPDATE archive_files
    SET extracted_entities = ?, status = 'extracted', processed_at = datetime('now')
    WHERE id = ?
  `)

  const markFailed = db.prepare(`
    UPDATE archive_files
    SET status = 'extract_failed', error_message = ?, processed_at = datetime('now')
    WHERE id = ?
  `)

  let succeeded = 0, failed = 0

  for (const file of pending) {
    try {
      const entities = await extractEntities(file.classification, file.ocr_text)

      if (entities) {
        updateEntities.run(JSON.stringify(entities), file.id)
        const names = entities.client_names?.length || 0
        const amounts = entities.dollar_amounts?.length || 0
        const dates = entities.dates?.length || 0
        console.log(`  [OK] ${file.original_path.split(/[/\\]/).pop()} - ${names} names, ${amounts} amounts, ${dates} dates`)
        succeeded++
      } else {
        updateEntities.run('{}', file.id)
        console.log(`  [empty] ${file.original_path.split(/[/\\]/).pop()} - no entities found`)
        succeeded++
      }
    } catch (err) {
      markFailed.run(err.message, file.id)
      console.error(`  [FAIL] ${file.original_path}: ${err.message}`)
      failed++
    }
  }

  const durationMs = Date.now() - startTime

  db.prepare(`
    INSERT INTO archive_processing_log (stage, files_processed, files_succeeded, files_failed, duration_ms)
    VALUES ('extract', ?, ?, ?, ?)
  `).run(pending.length, succeeded, failed, durationMs)

  db.close()

  console.log(`\n[extract] Complete: ${succeeded} extracted, ${failed} failed (${(durationMs / 1000).toFixed(1)}s)`)
}

main().catch(err => {
  console.error('[extract] Fatal:', err)
  process.exit(1)
})
