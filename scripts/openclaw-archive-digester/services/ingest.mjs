#!/usr/bin/env node
/**
 * Stage 1: File Ingestion
 * Scans target directories, hashes files, deduplicates, extracts text via OCR.
 * Idempotent - skips already-ingested files based on SHA-256 hash.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { initDb, openDb } from '../lib/db.mjs'
import { readApprovedBytes, assertMediaApproved, sealDerivedText } from '../lib/media-privacy.mjs'
import { extractTextFromImage, extractTextFromPdf } from '../lib/ocr-pipeline.mjs'

// Directories to scan (configurable via env)
const SCAN_DIRS = (process.env.ARCHIVE_SCAN_DIRS || path.join(os.homedir(), 'chef-archive')).split(',')

const SUPPORTED_EXTENSIONS = new Set([
  // Documents
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.csv', '.xls', '.xlsx',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.tiff', '.bmp',
  // Email
  '.eml', '.mbox',
  // Misc
  '.html', '.htm', '.json'
])

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.tiff', '.bmp'])
const PDF_EXTENSIONS = new Set(['.pdf'])
const TEXT_EXTENSIONS = new Set(['.txt', '.rtf', '.csv', '.html', '.htm', '.json'])
const EMAIL_EXTENSIONS = new Set(['.eml', '.mbox'])

function sha256(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(readApprovedBytes(filePath))
  return hash.digest('hex')
}

function getFileType(ext) {
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (PDF_EXTENSIONS.has(ext)) return 'pdf'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  if (EMAIL_EXTENSIONS.has(ext)) return 'email'
  if (['.doc', '.docx'].includes(ext)) return 'document'
  if (['.xls', '.xlsx'].includes(ext)) return 'spreadsheet'
  return 'unknown'
}

function scanDirectory(dirPath, results = []) {
  if (!fs.existsSync(dirPath)) {
    console.warn('[ingest] Source directory unavailable')
    return results
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      // Skip hidden dirs and node_modules
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scanDirectory(fullPath, results)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        results.push({ path: fullPath, ext, name: entry.name })
      }
    }
  }
  return results
}

async function extractText(filePath, fileType) {
  assertMediaApproved(filePath)
  switch (fileType) {
    case 'image':
      return await extractTextFromImage(filePath)
    case 'pdf':
      return await extractTextFromPdf(filePath)
    case 'text':
      try {
        const text = readApprovedBytes(filePath).toString('utf8')
        return { text: text.substring(0, 50000), method: 'direct-read', confidence: 'high' }
      } catch { return { text: '', method: 'none', confidence: 'low' } }
    case 'email':
      try {
        const raw = readApprovedBytes(filePath).toString('utf8')
        // Basic email text extraction (full parsing in classify stage)
        const bodyMatch = raw.match(/\r?\n\r?\n([\s\S]+)/)
        return { text: bodyMatch ? bodyMatch[1].substring(0, 50000) : '', method: 'email-body', confidence: 'medium' }
      } catch { return { text: '', method: 'none', confidence: 'low' } }
    default:
      return { text: '', method: 'none', confidence: 'low' }
  }
}

async function main() {
  initDb()
  const db = openDb()
  const startTime = Date.now()

  const insertFile = db.prepare(`
    INSERT OR IGNORE INTO archive_files (id, file_hash, original_path, file_type, file_size_bytes, ocr_text, privacy_receipt, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ingested', datetime('now'))
  `)

  const checkHash = db.prepare('SELECT id FROM archive_files WHERE file_hash = ?')

  let scanned = 0, ingested = 0, duplicates = 0, errors = 0

  console.log('[ingest] Reviewing configured sources against local approvals')

  const files = []
  for (const dir of SCAN_DIRS) {
    scanDirectory(dir.trim(), files)
  }

  console.log(`[ingest] Found ${files.length} supported files`)

  for (const file of files) {
    scanned++
    try {
      const hash = sha256(file.path)
      const existing = checkHash.get(hash)
      if (existing) {
        duplicates++
        continue
      }

      const fileType = getFileType(file.ext)
      const stat = fs.statSync(file.path)
      const ocrResult = await extractText(file.path, fileType)
      const id = crypto.randomUUID()

      const receipt = sealDerivedText(file.path, ocrResult.text || '')
      if (sha256(file.path) !== hash) throw new Error('source_changed')
      insertFile.run(id, hash, file.path, fileType, stat.size, ocrResult.text || null, receipt)
      ingested++

      if (scanned % 50 === 0) {
        console.log(`[ingest] Progress: ${scanned}/${files.length} scanned, ${ingested} ingested`)
      }
    } catch (err) {
      errors++
      console.error('[ingest] File held: approval required or processing unavailable')
    }
  }

  const durationMs = Date.now() - startTime

  // Log the run
  db.prepare(`
    INSERT INTO archive_processing_log (stage, files_processed, files_succeeded, files_failed, duration_ms, notes)
    VALUES ('ingest', ?, ?, ?, ?, ?)
  `).run(scanned, ingested, errors, durationMs, `${duplicates} duplicates skipped`)

  db.close()

  console.log(`\n[ingest] Complete:`)
  console.log(`  Scanned: ${scanned}`)
  console.log(`  Ingested: ${ingested}`)
  console.log(`  Duplicates: ${duplicates}`)
  console.log(`  Errors: ${errors}`)
  console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`)
}

main().catch(err => {
  console.error('[ingest] Pipeline unavailable; sources unchanged')
  process.exit(1)
})
