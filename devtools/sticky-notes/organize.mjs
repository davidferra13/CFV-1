#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { outputPaths, relativePath, stickyConfig } from './config.mjs'
import { attachClassifications } from './attach.mjs'
import { classifyLatest } from './classify.mjs'
import { applyColorUpdates } from './colors.mjs'
import { generateStickyNotesReport } from './report.mjs'
import { syncStickyNotes } from './read-db.mjs'
import { buildStickyNoteState } from './state.mjs'

function parseArgs(argv = process.argv.slice(2)) {
  return {
    applyColors: argv.includes('--apply-colors'),
  }
}

function acquireLock() {
  try {
    fs.mkdirSync(stickyConfig.outputRoot, { recursive: true })
    const fd = fs.openSync(outputPaths.lockFile, 'wx')
    fs.writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`)
    fs.closeSync(fd)
    return () => {
      try {
        fs.unlinkSync(outputPaths.lockFile)
      } catch {}
    }
  } catch {
    throw new Error(`Sticky Notes organize is already running: ${outputPaths.lockFile}`)
  }
}

export function organizeStickyNotes(options = {}) {
  const release = acquireLock()
  const started = Date.now()
  try {
    console.log('Phase: sync')
    const sync = syncStickyNotes()
    console.log('Phase: classify')
    const classified = classifyLatest()
    console.log('Phase: attach')
    const attached = attachClassifications()
    console.log('Phase: state')
    let state = buildStickyNoteState()
    let colors = null
    let refreshedSync = null
    if (options.applyColors) {
      console.log('Phase: colors')
      colors = applyColorUpdates({ statePayload: state, apply: true })
      console.log('Phase: resync-colors')
      refreshedSync = syncStickyNotes()
      state = buildStickyNoteState()
    }
    console.log('Phase: report')
    const report = generateStickyNotesReport()
    const elapsedMs = Date.now() - started
    return { sync: refreshedSync || sync, classified, attached, state, colors, report, elapsedMs }
  } finally {
    release()
  }
}

function main() {
  const args = parseArgs()
  const result = organizeStickyNotes(args)
  const counts = result.report.counts
  const personalCount = Object.entries(counts)
    .filter(([key]) => key.startsWith('personal.'))
    .reduce((sum, [, count]) => sum + count, 0)
  const restrictedCount = Object.entries(counts)
    .filter(([key]) => key.startsWith('restricted.'))
    .reduce((sum, [, count]) => sum + count, 0)

  console.log(`Sticky Notes DB: ${result.sync.sourcePath}`)
  console.log(`Discovered notes: ${result.sync.records.length}`)
  console.log(
    `Changes: ${result.sync.changes.new} new, ${result.sync.changes.changed} changed, ${result.sync.changes.unchanged} unchanged`,
  )
  console.log(`Personal separated: ${personalCount}`)
  console.log(`Restricted: ${restrictedCount}`)
  console.log(`Attachments: ${result.attached.attachments.length}`)
  console.log(`Unprocessed: ${result.state.unprocessed.length}`)
  console.log(`Active: ${result.state.active.length}`)
  console.log(`Finished: ${result.state.finished.length}`)
  if (result.colors) {
    console.log(`Color updates applied: ${result.colors.appliedCount || 0}`)
    console.log(`Color updates skipped: ${result.colors.skipped || 0}`)
  }
  console.log(`Report: ${relativePath(result.report.mdFile)}`)
  console.log(`Elapsed: ${result.elapsedMs}ms`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
