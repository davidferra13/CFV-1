#!/usr/bin/env node
/**
 * Stage 5: Gap Detection
 * Identifies missing data, incomplete timelines, and unlinked files.
 * Produces a gap report that helps the chef understand what's missing.
 */

import { openDb } from '../lib/db.mjs'

async function main() {
  const db = openDb(true) // readonly
  const startTime = Date.now()

  const report = {
    generated_at: new Date().toISOString(),
    summary: {},
    unlinked_files: [],
    clients_with_gaps: [],
    classification_failures: [],
    low_confidence_events: [],
    undated_records: [],
  }

  // 1. Overall stats
  const totalFiles = db.prepare('SELECT count(*) as c FROM archive_files').get().c
  const linkedFiles = db.prepare("SELECT count(*) as c FROM archive_files WHERE linked_client_id IS NOT NULL").get().c
  const unlinkedFiles = db.prepare("SELECT count(*) as c FROM archive_files WHERE linked_client_id IS NULL AND status = 'linked'").get().c
  const failedFiles = db.prepare("SELECT count(*) as c FROM archive_files WHERE status LIKE '%_failed'").get().c
  const totalClients = db.prepare('SELECT count(*) as c FROM archive_clients').get().c
  const totalEvents = db.prepare('SELECT count(*) as c FROM archive_events').get().c

  report.summary = {
    total_files: totalFiles,
    linked_files: linkedFiles,
    unlinked_files: unlinkedFiles,
    failed_files: failedFiles,
    total_clients: totalClients,
    total_events: totalEvents,
    link_rate: totalFiles > 0 ? Math.round((linkedFiles / totalFiles) * 100) : 0,
  }

  // 2. Unlinked files (files with no client association)
  report.unlinked_files = db.prepare(`
    SELECT original_path, classification, classification_confidence
    FROM archive_files
    WHERE linked_client_id IS NULL AND status = 'linked'
    ORDER BY classification_confidence ASC
    LIMIT 50
  `).all()

  // 3. Clients with potential gaps
  const clients = db.prepare('SELECT * FROM archive_clients ORDER BY total_events DESC').all()
  for (const client of clients) {
    const gaps = []
    const events = db.prepare('SELECT * FROM archive_events WHERE client_id = ? ORDER BY event_date ASC').all(client.id)

    // Check for events with no date
    const undated = events.filter(e => !e.event_date)
    if (undated.length > 0) gaps.push(`${undated.length} events with no date`)

    // Check for events with no revenue
    const noRevenue = events.filter(e => !e.revenue_cents)
    if (noRevenue.length > 0) gaps.push(`${noRevenue.length} events with no revenue data`)

    // Check for large time gaps between events (>6 months)
    for (let i = 1; i < events.length; i++) {
      if (events[i].event_date && events[i - 1].event_date) {
        const d1 = new Date(events[i - 1].event_date)
        const d2 = new Date(events[i].event_date)
        const monthsDiff = (d2 - d1) / (1000 * 60 * 60 * 24 * 30)
        if (monthsDiff > 6) {
          gaps.push(`${monthsDiff.toFixed(0)} month gap between ${events[i - 1].event_date} and ${events[i].event_date}`)
        }
      }
    }

    if (gaps.length > 0) {
      report.clients_with_gaps.push({
        client: client.canonical_name,
        total_events: events.length,
        gaps,
      })
    }
  }

  // 4. Classification failures
  report.classification_failures = db.prepare(`
    SELECT original_path, error_message
    FROM archive_files
    WHERE status = 'classify_failed'
    LIMIT 20
  `).all()

  // 5. Low confidence events
  report.low_confidence_events = db.prepare(`
    SELECT e.event_date, e.occasion, e.revenue_cents, c.canonical_name as client_name
    FROM archive_events e
    LEFT JOIN archive_clients c ON c.id = e.client_id
    WHERE e.confidence = 'low'
    ORDER BY e.event_date DESC
    LIMIT 30
  `).all()

  // 6. Undated records
  report.undated_records = db.prepare(`
    SELECT original_path, classification
    FROM archive_files
    WHERE extracted_entities IS NOT NULL
    AND status = 'linked'
    AND id NOT IN (
      SELECT DISTINCT json_each.value
      FROM archive_events, json_each(archive_events.source_file_ids)
    )
    AND classification IN ('receipt', 'invoice', 'financial_record')
    LIMIT 30
  `).all()

  db.close()

  const durationMs = Date.now() - startTime

  // Print report
  console.log('\n=== ARCHIVE GAP REPORT ===')
  console.log(`Generated: ${report.generated_at}`)
  console.log(`\nSummary:`)
  console.log(`  Total files: ${report.summary.total_files}`)
  console.log(`  Linked to clients: ${report.summary.linked_files} (${report.summary.link_rate}%)`)
  console.log(`  Unlinked: ${report.summary.unlinked_files}`)
  console.log(`  Failed processing: ${report.summary.failed_files}`)
  console.log(`  Clients discovered: ${report.summary.total_clients}`)
  console.log(`  Events reconstructed: ${report.summary.total_events}`)

  if (report.clients_with_gaps.length > 0) {
    console.log(`\nClients with data gaps:`)
    for (const c of report.clients_with_gaps) {
      console.log(`  ${c.client} (${c.total_events} events):`)
      for (const g of c.gaps) console.log(`    - ${g}`)
    }
  }

  if (report.unlinked_files.length > 0) {
    console.log(`\nTop unlinked files:`)
    for (const f of report.unlinked_files.slice(0, 10)) {
      console.log(`  [${f.classification}] ${f.original_path.split(/[/\\]/).pop()}`)
    }
  }

  console.log(`\nDuration: ${(durationMs / 1000).toFixed(1)}s`)

  // Output JSON for API consumption
  return report
}

main().catch(err => {
  console.error('[gap-report] Fatal:', err)
  process.exit(1)
})
