#!/usr/bin/env node
/**
 * Stage 4: Per-Client Timeline Assembly
 * Builds a chronological timeline for each client by combining events,
 * financial records, and linked files.
 */

import { openDb } from '../lib/db.mjs'

async function main() {
  const db = openDb()
  const startTime = Date.now()

  const clients = db.prepare('SELECT * FROM archive_clients').all()

  if (clients.length === 0) {
    console.log('[timeline] No clients found')
    db.close()
    return
  }

  console.log(`[timeline] Building timelines for ${clients.length} clients`)

  const getEvents = db.prepare('SELECT * FROM archive_events WHERE client_id = ? ORDER BY event_date ASC')
  const getFiles = db.prepare('SELECT * FROM archive_files WHERE linked_client_id = ? ORDER BY created_at ASC')
  const getFinancials = db.prepare('SELECT * FROM archive_financials WHERE source_file_id IN (SELECT id FROM archive_files WHERE linked_client_id = ?) ORDER BY date ASC')

  const updateClient = db.prepare(`
    UPDATE archive_clients
    SET first_seen_date = ?, last_seen_date = ?, total_events = ?, total_revenue_cents = ?, notes = ?
    WHERE id = ?
  `)

  let updated = 0

  for (const client of clients) {
    const events = getEvents.all(client.id)
    const files = getFiles.all(client.id)
    const financials = getFinancials.all(client.id)

    // Compute stats
    const totalEvents = events.length
    const totalRevenueCents = financials
      .filter(f => f.type === 'revenue')
      .reduce((sum, f) => sum + (f.amount_cents || 0), 0)

    // Date range
    const allDates = [
      ...events.map(e => e.event_date).filter(Boolean),
      ...financials.map(f => f.date).filter(Boolean),
    ].sort()

    const firstSeen = allDates[0] || null
    const lastSeen = allDates[allDates.length - 1] || null

    // Timeline summary
    const timelineEntries = []

    for (const event of events) {
      timelineEntries.push({
        date: event.event_date,
        type: 'event',
        summary: [event.occasion, event.location, event.guest_count ? `${event.guest_count} guests` : null].filter(Boolean).join(', ') || 'Event',
        revenue: event.revenue_cents,
      })
    }

    for (const file of files) {
      if (!events.some(e => JSON.parse(e.source_file_ids || '[]').includes(file.id))) {
        timelineEntries.push({
          date: file.created_at?.split('T')[0] || null,
          type: file.classification || 'file',
          summary: file.original_path.split(/[/\\]/).pop(),
        })
      }
    }

    timelineEntries.sort((a, b) => (a.date || '').localeCompare(b.date || ''))

    const notes = JSON.stringify({
      timeline: timelineEntries,
      fileCount: files.length,
      financialCount: financials.length,
    })

    updateClient.run(firstSeen, lastSeen, totalEvents, totalRevenueCents, notes, client.id)
    updated++

    console.log(`  ${client.canonical_name}: ${totalEvents} events, ${files.length} files, $${(totalRevenueCents / 100).toFixed(2)} revenue`)
  }

  const durationMs = Date.now() - startTime

  db.prepare(`
    INSERT INTO archive_processing_log (stage, files_processed, files_succeeded, files_failed, duration_ms)
    VALUES ('timeline', ?, ?, 0, ?)
  `).run(clients.length, updated, durationMs)

  db.close()

  console.log(`\n[timeline] Complete: ${updated} client timelines built (${(durationMs / 1000).toFixed(1)}s)`)
}

main().catch(err => {
  console.error('[timeline] Fatal:', err)
  process.exit(1)
})
