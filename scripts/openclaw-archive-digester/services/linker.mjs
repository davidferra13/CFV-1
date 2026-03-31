#!/usr/bin/env node
/**
 * Stage 3: Cross-reference and Linking
 * Groups extracted entities into clients and events.
 * Links files to client records via fuzzy name matching.
 * Creates archive_clients and archive_events records.
 */

import crypto from 'crypto'
import { openDb } from '../lib/db.mjs'
import { findBestMatch, groupNameVariants } from '../lib/fuzzy-match.mjs'

async function main() {
  const db = openDb()
  const startTime = Date.now()

  // Get all extracted files
  const files = db.prepare(`
    SELECT id, original_path, classification, extracted_entities, ocr_text
    FROM archive_files
    WHERE status = 'extracted'
  `).all()

  if (files.length === 0) {
    console.log('[linker] No extracted files to link')
    db.close()
    return
  }

  console.log(`[linker] Linking ${files.length} files`)

  // Collect all client names from all files
  const allNames = []
  const fileEntities = new Map()

  for (const file of files) {
    try {
      const entities = JSON.parse(file.extracted_entities || '{}')
      fileEntities.set(file.id, entities)
      if (entities.client_names) {
        for (const name of entities.client_names) {
          if (name && name.length > 1) allNames.push(name)
        }
      }
    } catch {
      // Skip malformed JSON
    }
  }

  // Group name variants into canonical clients
  const nameGroups = groupNameVariants(allNames, 0.75)
  console.log(`[linker] Found ${allNames.length} names, grouped into ${nameGroups.length} distinct clients`)

  // Get existing clients
  const existingClients = db.prepare('SELECT id, canonical_name, name_variants FROM archive_clients').all()
  const existingNames = existingClients.map(c => c.canonical_name)

  // Upsert clients
  const insertClient = db.prepare(`
    INSERT INTO archive_clients (id, canonical_name, name_variants, first_seen_date, created_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `)

  const clientNameToId = new Map()

  // Map existing clients
  for (const c of existingClients) {
    clientNameToId.set(c.canonical_name.toLowerCase(), c.id)
    const variants = JSON.parse(c.name_variants || '[]')
    for (const v of variants) clientNameToId.set(v.toLowerCase(), c.id)
  }

  // Create new clients from name groups
  let newClients = 0
  for (const group of nameGroups) {
    const canonicalName = group.sort((a, b) => b.length - a.length)[0] // longest variant as canonical
    const existing = findBestMatch(canonicalName, existingNames, 0.8)

    if (!existing) {
      const id = crypto.randomUUID()
      insertClient.run(id, canonicalName, JSON.stringify(group))
      for (const variant of group) clientNameToId.set(variant.toLowerCase(), id)
      newClients++
    } else {
      for (const variant of group) {
        clientNameToId.set(variant.toLowerCase(), existingClients[existing.index].id)
      }
    }
  }

  console.log(`[linker] Created ${newClients} new client records`)

  // Link files to clients
  const updateFileLink = db.prepare(`
    UPDATE archive_files
    SET linked_client_id = ?, status = 'linked', processed_at = datetime('now')
    WHERE id = ?
  `)

  const markLinked = db.prepare(`
    UPDATE archive_files
    SET status = 'linked', processed_at = datetime('now')
    WHERE id = ?
  `)

  let linked = 0, unlinked = 0

  for (const file of files) {
    const entities = fileEntities.get(file.id) || {}
    let linkedClientId = null

    if (entities.client_names && entities.client_names.length > 0) {
      for (const name of entities.client_names) {
        const id = clientNameToId.get((name || '').toLowerCase())
        if (id) {
          linkedClientId = id
          break
        }
      }
    }

    if (linkedClientId) {
      updateFileLink.run(linkedClientId, file.id)
      linked++
    } else {
      markLinked.run(file.id)
      unlinked++
    }
  }

  // Create events from files that have dates and dollar amounts
  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO archive_events (id, client_id, event_date, occasion, guest_count, location, revenue_cents, notes, confidence, source_file_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let eventsCreated = 0

  for (const file of files) {
    const entities = fileEntities.get(file.id) || {}
    if (!entities.dates || entities.dates.length === 0) continue
    if (!entities.dollar_amounts || entities.dollar_amounts.length === 0) continue

    // Only create events from receipts, invoices, financial records
    if (!['receipt', 'invoice', 'financial_record'].includes(file.classification)) continue

    const clientName = entities.client_names?.[0]
    const clientId = clientName ? clientNameToId.get(clientName.toLowerCase()) : null

    const totalCents = entities.dollar_amounts.reduce((sum, a) => {
      return sum + Math.round((parseFloat(a.amount) || 0) * 100)
    }, 0)

    insertEvent.run(
      crypto.randomUUID(),
      clientId || null,
      entities.dates[0],
      entities.occasion || null,
      entities.guest_count || null,
      entities.locations?.[0] || null,
      totalCents || null,
      entities.notes || null,
      'low',
      JSON.stringify([file.id])
    )
    eventsCreated++
  }

  // Create financial records
  const insertFinancial = db.prepare(`
    INSERT INTO archive_financials (id, type, amount_cents, description, vendor, date, source_file_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  let financialsCreated = 0

  for (const file of files) {
    const entities = fileEntities.get(file.id) || {}
    if (!entities.dollar_amounts || entities.dollar_amounts.length === 0) continue

    for (const amount of entities.dollar_amounts) {
      const cents = Math.round((parseFloat(amount.amount) || 0) * 100)
      if (cents === 0) continue

      const type = file.classification === 'invoice' ? 'revenue' : 'expense'
      insertFinancial.run(
        crypto.randomUUID(),
        type,
        cents,
        amount.context || null,
        null,
        entities.dates?.[0] || null,
        file.id
      )
      financialsCreated++
    }
  }

  const durationMs = Date.now() - startTime

  db.prepare(`
    INSERT INTO archive_processing_log (stage, files_processed, files_succeeded, files_failed, duration_ms, notes)
    VALUES ('linker', ?, ?, ?, ?, ?)
  `).run(files.length, linked, unlinked, durationMs, `${newClients} clients, ${eventsCreated} events, ${financialsCreated} financials`)

  db.close()

  console.log(`\n[linker] Complete:`)
  console.log(`  Files linked to clients: ${linked}`)
  console.log(`  Files unlinked: ${unlinked}`)
  console.log(`  New clients: ${newClients}`)
  console.log(`  Events created: ${eventsCreated}`)
  console.log(`  Financial records: ${financialsCreated}`)
  console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`)
}

main().catch(err => {
  console.error('[linker] Fatal:', err)
  process.exit(1)
})
