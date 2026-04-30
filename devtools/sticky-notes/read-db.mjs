#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  ensureOutputRoot,
  nowStamp,
  outputPaths,
  readJson,
  relativePath,
  stickyConfig,
  writeJson,
} from './config.mjs'
import { buildChangeSummary } from './hash.mjs'
import { normalizeNoteRows } from './normalize.mjs'

const NOTES_QUERY = `
  SELECT
    ID,
    STATE,
    CREATED,
    UPDATED,
    DELETED,
    STARRED,
    NOTEBOOK,
    TITLE,
    TYPE,
    length(DATA) AS DATA_LENGTH,
    TEXT
  FROM NOTES
  ORDER BY ID, UPDATED, rowid
`

const require = createRequire(import.meta.url)

export function readStickyNotesDb(dbPath = stickyConfig.dbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Sticky Notes database not found: ${dbPath}`)
  }

  try {
    return readWithBetterSqlite(dbPath)
  } catch (error) {
    if (!String(error?.message || error).includes('bindings file')) {
      throw error
    }
    return readWithSqliteCli(dbPath)
  }
}

function readWithBetterSqlite(dbPath) {
  const Database = require('better-sqlite3')
  let db
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true })
    db.pragma('query_only = ON')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('NOTES', 'NOTEBOOKS')")
      .all()
      .map((row) => row.name)
    if (!tables.includes('NOTES')) {
      throw new Error('Sticky Notes database is missing NOTES table')
    }
    return db.prepare(NOTES_QUERY).all()
  } finally {
    if (db) db.close()
  }
}

function readWithSqliteCli(dbPath) {
  const tableJson = execFileSync(
    'sqlite3',
    ['-json', dbPath, "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('NOTES', 'NOTEBOOKS')"],
    { encoding: 'utf8' },
  )
  const tables = JSON.parse(tableJson || '[]').map((row) => row.name)
  if (!tables.includes('NOTES')) {
    throw new Error('Sticky Notes database is missing NOTES table')
  }

  const rowsJson = execFileSync('sqlite3', ['-json', dbPath, NOTES_QUERY], { encoding: 'utf8' })
  return JSON.parse(rowsJson || '[]')
}

export function syncStickyNotes(options = {}) {
  const dbPath = options.dbPath || stickyConfig.dbPath
  const stamp = options.stamp || nowStamp()
  ensureOutputRoot()

  const previous = readJson(outputPaths.normalizedLatest, { records: [] })
  const rows = readStickyNotesDb(dbPath)
  const records = normalizeNoteRows(rows, {
    sourcePath: dbPath,
    ingestedAt: options.ingestedAt || new Date(),
  })
  const changes = buildChangeSummary(records, previous.records || [])
  const payload = {
    generatedAt: new Date().toISOString(),
    sourcePath: dbPath,
    records,
    changes,
  }

  const snapshotFile = path.join(outputPaths.snapshots, `${stamp}-records.json`)
  writeJson(snapshotFile, payload)
  writeJson(outputPaths.normalizedLatest, payload)

  return {
    ...payload,
    snapshotFile,
  }
}

function main() {
  const result = syncStickyNotes()
  console.log(`Sticky Notes DB: ${result.sourcePath}`)
  console.log(`Discovered notes: ${result.records.length}`)
  console.log(
    `Changes: ${result.changes.new} new, ${result.changes.changed} changed, ${result.changes.unchanged} unchanged`,
  )
  console.log(`Snapshot: ${relativePath(result.snapshotFile)}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
