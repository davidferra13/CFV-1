#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { ensureDir, nowStamp, outputPaths, readJson, relativePath, stickyConfig, writeJson } from './config.mjs'

const require = createRequire(import.meta.url)

const LAYOUT = {
  pinned: {
    x: -1880,
    y: 1728,
    columns: 4,
    width: 450,
    height: 84,
    gapX: 12,
    gapY: 8,
    minimized: 0,
  },
  queued: {
    x: -1880,
    y: 1840,
    columns: 3,
    width: 190,
    height: 105,
    gapX: 10,
    gapY: 10,
    minimized: 0,
  },
  in_progress: {
    x: -1280,
    y: 1840,
    columns: 4,
    width: 185,
    height: 95,
    gapX: 10,
    gapY: 8,
    minimized: 0,
  },
  blocked: {
    x: -600,
    y: 1840,
    columns: 3,
    width: 180,
    height: 82,
    gapX: 8,
    gapY: 6,
    minimized: 0,
  },
  complete: {
    x: -1880,
    y: 2670,
    columns: 12,
    width: 140,
    height: 36,
    gapX: 4,
    gapY: 4,
    minimized: 1,
  },
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes('--apply'),
  }
}

function backupDb(dbPath) {
  const backupDir = path.join(stickyConfig.outputRoot, 'db-backups')
  ensureDir(backupDir)
  const backupFile = path.join(backupDir, `${nowStamp()}-before-layout.db`)
  fs.copyFileSync(dbPath, backupFile)
  return backupFile
}

function positionFor(item, indexByState) {
  const layoutState = item.pinned && item.pipelineState !== 'complete' ? 'pinned' : item.pipelineState
  const template = LAYOUT[layoutState] || LAYOUT.blocked
  const index = indexByState[layoutState] || 0
  indexByState[layoutState] = index + 1
  const column = index % template.columns
  const row = Math.floor(index / template.columns)
  return {
    sourceRowId: item.sourceRowId,
    noteRef: item.noteRef,
    noteId: item.noteId,
    pipelineState: item.pipelineState,
    pinned: Boolean(item.pinned && item.pipelineState !== 'complete'),
    layoutState,
    left: template.x + column * (template.width + template.gapX),
    top: template.y + row * (template.height + template.gapY),
    width: template.width,
    height: template.height,
    minimize: template.minimized,
    zorder: index + 1,
  }
}

export function planStickyNoteLayout(options = {}) {
  const state = options.statePayload || readJson(options.stateFile || outputPaths.stateLatest, null)
  if (!state?.items) throw new Error(`No Sticky Notes state index found: ${outputPaths.stateLatest}`)

  const indexByState = {}
  const positions = [...state.items]
    .sort((a, b) => {
      const order = ['queued', 'in_progress', 'blocked', 'complete']
      const aLayoutState = a.pinned && a.pipelineState !== 'complete' ? 'pinned' : a.pipelineState
      const bLayoutState = b.pinned && b.pipelineState !== 'complete' ? 'pinned' : b.pipelineState
      const layoutOrder = ['pinned', ...order]
      const stateDiff = layoutOrder.indexOf(aLayoutState) - layoutOrder.indexOf(bLayoutState)
      if (stateDiff !== 0) return stateDiff
      return Number(a.noteId || 0) - Number(b.noteId || 0)
    })
    .map((item) => positionFor(item, indexByState))
    .filter((item) => Number.isFinite(Number(item.sourceRowId)))

  return {
    generatedAt: new Date().toISOString(),
    dbPath: options.dbPath || stickyConfig.dbPath,
    layout: LAYOUT,
    updateCount: positions.length,
    positions,
  }
}

export function applyStickyNoteLayout(options = {}) {
  const plan = options.plan || planStickyNoteLayout(options)
  if (!options.apply) return { ...plan, applied: false, skipped: plan.updateCount, backupFile: null }
  if (!fs.existsSync(plan.dbPath)) throw new Error(`Sticky Notes database not found: ${plan.dbPath}`)
  const backupFile = backupDb(plan.dbPath)

  try {
    return applyWithBetterSqlite(plan, backupFile)
  } catch (error) {
    if (!String(error?.message || error).includes('bindings file')) throw error
    return applyWithSqliteCli(plan, backupFile)
  }
}

function applyWithBetterSqlite(plan, backupFile) {
  const Database = require('better-sqlite3')
  let db
  try {
    db = new Database(plan.dbPath, { fileMustExist: true })
    const statement = db.prepare(`
      UPDATE NOTES
      SET LEFT = ?, TOP = ?, WIDTH = ?, HEIGHT = ?, MINIMIZE = ?, ZORDER = ?
      WHERE rowid = ?
    `)
    const transaction = db.transaction((positions) => {
      let applied = 0
      for (const item of positions) {
        const result = statement.run(
          item.left,
          item.top,
          item.width,
          item.height,
          item.minimize,
          item.zorder,
          item.sourceRowId,
        )
        applied += result.changes
      }
      return applied
    })
    const applied = transaction(plan.positions)
    return { ...plan, applied: true, appliedCount: applied, skipped: plan.updateCount - applied, backupFile }
  } finally {
    if (db) db.close()
  }
}

function applyWithSqliteCli(plan, backupFile) {
  let applied = 0
  for (const item of plan.positions) {
    const sql = [
      'UPDATE NOTES',
      `SET LEFT = ${Number(item.left)}, TOP = ${Number(item.top)},`,
      `WIDTH = ${Number(item.width)}, HEIGHT = ${Number(item.height)},`,
      `MINIMIZE = ${Number(item.minimize)}, ZORDER = ${Number(item.zorder)}`,
      `WHERE rowid = ${Number(item.sourceRowId)};`,
      'SELECT changes();',
    ].join(' ')
    const result = execFileSync('sqlite3', [plan.dbPath, sql], { encoding: 'utf8' }).trim()
    applied += Number(result || 0)
  }
  return { ...plan, applied: true, appliedCount: applied, skipped: plan.updateCount - applied, backupFile }
}

function main() {
  const args = parseArgs()
  const result = applyStickyNoteLayout(args)
  const outFile = path.join(outputPaths.state, `layout-plan-${Date.now()}.json`)
  writeJson(outFile, {
    ...result,
    backupFile: result.backupFile ? relativePath(result.backupFile) : null,
  })
  console.log(`Layout updates planned: ${result.updateCount}`)
  console.log(`Applied: ${result.applied ? result.appliedCount || 0 : 0}`)
  console.log(`Skipped: ${result.skipped}`)
  if (result.backupFile) console.log(`Backup: ${relativePath(result.backupFile)}`)
  console.log(`Layout plan: ${relativePath(outFile)}`)
  if (!result.applied) console.log('Dry run only. Re-run with --apply to update note layout.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
