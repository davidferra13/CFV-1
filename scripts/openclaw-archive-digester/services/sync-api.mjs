#!/usr/bin/env node
/**
 * Archive Digester HTTP API
 * Exposes archive data for ChefFlow sync and status monitoring.
 * Port 8086 (configurable via ARCHIVE_PORT env var).
 */

import express from 'express'
import { initDb, openDb } from '../lib/db.mjs'

const app = express()
const PORT = parseInt(process.env.ARCHIVE_PORT || '8086', 10)

app.use(express.json())

// --- Health ---

app.get('/health', (req, res) => {
  try {
    const db = openDb(true)
    const count = db.prepare('SELECT count(*) as c FROM archive_files').get().c
    db.close()
    res.json({ status: 'ok', files: count })
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message })
  }
})

// --- Status ---

app.get('/api/status', (req, res) => {
  try {
    const db = openDb(true)
    const files = db.prepare('SELECT count(*) as c FROM archive_files').get().c
    const clients = db.prepare('SELECT count(*) as c FROM archive_clients').get().c
    const events = db.prepare('SELECT count(*) as c FROM archive_events').get().c

    const byStatus = db.prepare(`
      SELECT status, count(*) as count
      FROM archive_files GROUP BY status ORDER BY count DESC
    `).all()

    const byClassification = db.prepare(`
      SELECT classification, count(*) as count
      FROM archive_files WHERE classification IS NOT NULL
      GROUP BY classification ORDER BY count DESC
    `).all()

    const recentLog = db.prepare(`
      SELECT * FROM archive_processing_log ORDER BY created_at DESC LIMIT 10
    `).all()

    db.close()
    res.json({ files, clients, events, byStatus, byClassification, recentLog })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Unsynced data (for ChefFlow pull) ---

app.get('/api/archive/unsynced', (req, res) => {
  try {
    const db = openDb(true)
    const limit = parseInt(req.query.limit || '100', 10)

    // Clients not yet synced to ChefFlow
    const clients = db.prepare(`
      SELECT * FROM archive_clients
      WHERE chefflow_client_id IS NULL
      ORDER BY total_events DESC
      LIMIT ?
    `).all(limit)

    // Events not yet synced
    const events = db.prepare(`
      SELECT e.*, c.canonical_name as client_name
      FROM archive_events e
      LEFT JOIN archive_clients c ON c.id = e.client_id
      WHERE e.chefflow_event_id IS NULL
      ORDER BY e.event_date DESC
      LIMIT ?
    `).all(limit)

    // Financial records from synced events
    const financials = db.prepare(`
      SELECT f.*, af.original_path as source_file
      FROM archive_financials f
      LEFT JOIN archive_files af ON af.id = f.source_file_id
      ORDER BY f.date DESC
      LIMIT ?
    `).all(limit)

    db.close()
    res.json({ clients, events, financials })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Mark as synced (ChefFlow callback) ---

app.post('/api/archive/mark-synced', (req, res) => {
  try {
    const db = openDb()
    const { type, archive_id, chefflow_id } = req.body

    if (!type || !archive_id || !chefflow_id) {
      res.status(400).json({ error: 'Missing type, archive_id, or chefflow_id' })
      return
    }

    switch (type) {
      case 'client':
        db.prepare('UPDATE archive_clients SET chefflow_client_id = ? WHERE id = ?').run(chefflow_id, archive_id)
        break
      case 'event':
        db.prepare('UPDATE archive_events SET chefflow_event_id = ? WHERE id = ?').run(chefflow_id, archive_id)
        break
      default:
        db.close()
        res.status(400).json({ error: `Unknown type: ${type}` })
        return
    }

    // Log the sync
    db.prepare(`
      INSERT INTO sync_log (sync_type, records_sent, records_accepted, records_rejected)
      VALUES (?, 1, 1, 0)
    `).run(type)

    db.close()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Gap report ---

app.get('/api/archive/gaps', (req, res) => {
  try {
    const db = openDb(true)

    const totalFiles = db.prepare('SELECT count(*) as c FROM archive_files').get().c
    const linkedFiles = db.prepare("SELECT count(*) as c FROM archive_files WHERE linked_client_id IS NOT NULL").get().c
    const failedFiles = db.prepare("SELECT count(*) as c FROM archive_files WHERE status LIKE '%_failed'").get().c

    const unlinkedSample = db.prepare(`
      SELECT original_path, classification
      FROM archive_files WHERE linked_client_id IS NULL AND status = 'linked'
      LIMIT 20
    `).all()

    db.close()
    res.json({
      total_files: totalFiles,
      linked_files: linkedFiles,
      failed_files: failedFiles,
      link_rate: totalFiles > 0 ? Math.round((linkedFiles / totalFiles) * 100) : 0,
      unlinked_sample: unlinkedSample,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Init and start ---

initDb()
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Archive Digester API running on http://0.0.0.0:${PORT}`)
})
