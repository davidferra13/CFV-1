#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { outputPaths, relativePath, stickyConfig } from './config.mjs'
import { attachClassifications } from './attach.mjs'
import { classifyLatest } from './classify.mjs'
import { generateStickyNotesReport } from './report.mjs'
import { syncStickyNotes } from './read-db.mjs'

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

export function organizeStickyNotes() {
  const release = acquireLock()
  const started = Date.now()
  try {
    console.log('Phase: sync')
    const sync = syncStickyNotes()
    console.log('Phase: classify')
    const classified = classifyLatest()
    console.log('Phase: attach')
    const attached = attachClassifications()
    console.log('Phase: report')
    const report = generateStickyNotesReport()
    const elapsedMs = Date.now() - started
    return { sync, classified, attached, report, elapsedMs }
  } finally {
    release()
  }
}

function main() {
  const result = organizeStickyNotes()
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
