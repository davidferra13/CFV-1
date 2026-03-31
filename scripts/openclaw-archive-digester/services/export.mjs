#!/usr/bin/env node
/**
 * Stage 6: JSON Export
 * Exports the full archive database as structured JSON for ChefFlow sync.
 * Outputs: clients, events, financials, recipes, unlinked files.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { openDb } from '../lib/db.mjs'

const OUTPUT_DIR = path.join(os.homedir(), 'openclaw-archive-digester', 'exports')

async function main() {
  const db = openDb(true) // readonly

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  // Clients with full details
  const clients = db.prepare('SELECT * FROM archive_clients ORDER BY canonical_name').all()
  const clientsExport = clients.map(c => ({
    ...c,
    name_variants: JSON.parse(c.name_variants || '[]'),
    notes: tryParse(c.notes),
  }))

  // Events
  const events = db.prepare(`
    SELECT e.*, c.canonical_name as client_name
    FROM archive_events e
    LEFT JOIN archive_clients c ON c.id = e.client_id
    ORDER BY e.event_date ASC
  `).all()
  const eventsExport = events.map(e => ({
    ...e,
    source_file_ids: JSON.parse(e.source_file_ids || '[]'),
    revenue_dollars: e.revenue_cents ? (e.revenue_cents / 100).toFixed(2) : null,
    expense_dollars: e.expense_cents ? (e.expense_cents / 100).toFixed(2) : null,
    tip_dollars: e.tip_cents ? (e.tip_cents / 100).toFixed(2) : null,
  }))

  // Financials
  const financials = db.prepare(`
    SELECT f.*, af.original_path as source_file
    FROM archive_financials f
    LEFT JOIN archive_files af ON af.id = f.source_file_id
    ORDER BY f.date ASC
  `).all()
  const financialsExport = financials.map(f => ({
    ...f,
    amount_dollars: (f.amount_cents / 100).toFixed(2),
  }))

  // Recipes
  const recipes = db.prepare('SELECT * FROM archive_recipes ORDER BY title').all()
  const recipesExport = recipes.map(r => ({
    ...r,
    ingredients: tryParse(r.ingredients),
    instructions: tryParse(r.instructions),
  }))

  // Processing stats
  const processingLog = db.prepare('SELECT * FROM archive_processing_log ORDER BY created_at DESC LIMIT 20').all()

  // File classification breakdown
  const classBreakdown = db.prepare(`
    SELECT classification, count(*) as count
    FROM archive_files
    GROUP BY classification
    ORDER BY count DESC
  `).all()

  const exportData = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    stats: {
      total_clients: clients.length,
      total_events: events.length,
      total_financials: financials.length,
      total_recipes: recipes.length,
      classification_breakdown: classBreakdown,
    },
    clients: clientsExport,
    events: eventsExport,
    financials: financialsExport,
    recipes: recipesExport,
    processing_log: processingLog,
  }

  const outputPath = path.join(OUTPUT_DIR, `archive-export-${timestamp}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2))

  // Also write a latest symlink-style copy
  const latestPath = path.join(OUTPUT_DIR, 'archive-latest.json')
  fs.writeFileSync(latestPath, JSON.stringify(exportData, null, 2))

  db.close()

  console.log(`[export] Written to ${outputPath}`)
  console.log(`  Clients: ${clients.length}`)
  console.log(`  Events: ${events.length}`)
  console.log(`  Financials: ${financials.length}`)
  console.log(`  Recipes: ${recipes.length}`)
}

function tryParse(str) {
  if (!str) return null
  try { return JSON.parse(str) }
  catch { return str }
}

main().catch(err => {
  console.error('[export] Fatal:', err)
  process.exit(1)
})
