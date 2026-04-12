#!/usr/bin/env node

/**
 * Directory Images HTTP API
 * Serves unsynced images to ChefFlow and accepts sync confirmations.
 * Port: 8085
 *
 * Endpoints:
 *   GET  /api/images/unsynced?limit=100  - List images ready for ChefFlow sync
 *   POST /api/images/mark-synced         - Mark images as synced { ids: [...] }
 *   GET  /api/images/photo/:listingId    - Serve the actual image file
 *   GET  /api/stats                      - Queue statistics
 *   GET  /health                         - Health check
 */

import express from 'express'
import { queries } from './db.mjs'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT) || 8085

const app = express()
app.use(express.json())

// ─── Health ────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  const stats = queries.getStats.get()
  res.json({ status: 'ok', cartridge: 'directory-images', port: PORT, ...stats })
})

// ─── Stats ─────────────────────────────────────────────────────────────────

app.get('/api/stats', (_req, res) => {
  const stats = queries.getStats.get()
  const byState = queries.getStatsByState.all()
  res.json({ ...stats, byState })
})

// ─── Unsynced images ───────────────────────────────────────────────────────

app.get('/api/images/unsynced', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000)
  const rows = queries.getUnsynced.all(limit)

  // Transform to the format ChefFlow handler expects
  const images = rows.map(row => ({
    listing_id: row.listing_id,
    // ChefFlow will download the image from this Pi URL
    photo_urls: [`http://${process.env.PI_HOST || '10.0.0.177'}:${PORT}/api/images/photo/${row.listing_id}`],
    source: row.source || 'og_image',
  }))

  res.json(images)
})

// ─── Serve image file ──────────────────────────────────────────────────────

app.get('/api/images/photo/:listingId', async (req, res) => {
  const dir = path.join(__dirname, 'storage', req.params.listingId)
  try {
    const files = await fs.readdir(dir)
    const photo = files.find(f => f.startsWith('photo.'))
    if (!photo) {
      res.status(404).json({ error: 'No photo found' })
      return
    }
    const ext = path.extname(photo).slice(1)
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const buffer = await fs.readFile(path.join(dir, photo))
    res.send(buffer)
  } catch {
    res.status(404).json({ error: 'Image not found' })
  }
})

// ─── Mark synced ───────────────────────────────────────────────────────────

app.post('/api/images/mark-synced', (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array required' })
    return
  }
  try {
    queries.markSyncedBatch(ids)
    res.json({ success: true, marked: ids.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  const stats = queries.getStats.get()
  console.log(`[directory-images] Listening on port ${PORT}`)
  console.log(`[directory-images] Queue: ${JSON.stringify(stats)}`)
})
