#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { outputPaths, readJson, relativePath, stickyConfig, writeJson } from './config.mjs'

const require = createRequire(import.meta.url)

function parseArgs(argv = process.argv.slice(2)) {
  return {
    apply: argv.includes('--apply'),
  }
}

export function planColorUpdates(options = {}) {
  const state = options.statePayload || readJson(options.stateFile || outputPaths.stateLatest, null)
  if (!state?.items) throw new Error(`No Sticky Notes state index found: ${outputPaths.stateLatest}`)

  const updates = state.items
    .filter((item) => item.colorMismatch)
    .map((item) => ({
      noteRef: item.noteRef,
      sourceRowId: item.sourceRowId,
      noteId: item.noteId,
      title: item.title || '',
      pipelineState: item.pipelineState,
      fromColorName: item.sourceColorName,
      fromColorValue: item.sourceColorValue,
      toColorName: item.targetColorName,
      toColorValue: item.targetColorValue,
    }))

  return {
    generatedAt: new Date().toISOString(),
    dbPath: options.dbPath || stickyConfig.dbPath,
    updateCount: updates.length,
    updates,
  }
}

export function applyColorUpdates(options = {}) {
  const plan = options.plan || planColorUpdates(options)
  if (!options.apply) return { ...plan, applied: false, skipped: plan.updateCount }
  if (!fs.existsSync(plan.dbPath)) throw new Error(`Sticky Notes database not found: ${plan.dbPath}`)

  try {
    return applyWithBetterSqlite(plan)
  } catch (error) {
    if (!String(error?.message || error).includes('bindings file')) throw error
    return applyWithSqliteCli(plan)
  }
}

function applyWithBetterSqlite(plan) {
  const Database = require('better-sqlite3')
  let db
  try {
    db = new Database(plan.dbPath, { fileMustExist: true })
    const statement = db.prepare('UPDATE NOTES SET COLOR = ? WHERE rowid = ? AND COLOR = ?')
    const transaction = db.transaction((updates) => {
      let applied = 0
      for (const update of updates) {
        if (!Number.isFinite(Number(update.sourceRowId))) continue
        const result = statement.run(update.toColorValue, update.sourceRowId, update.fromColorValue)
        applied += result.changes
      }
      return applied
    })
    const applied = transaction(plan.updates)
    return { ...plan, applied: true, appliedCount: applied, skipped: plan.updateCount - applied }
  } finally {
    if (db) db.close()
  }
}

function applyWithSqliteCli(plan) {
  let applied = 0
  for (const update of plan.updates) {
    if (!Number.isFinite(Number(update.sourceRowId))) continue
    const sql = [
      'UPDATE NOTES',
      `SET COLOR = ${Number(update.toColorValue)}`,
      `WHERE rowid = ${Number(update.sourceRowId)}`,
      `AND COLOR = ${Number(update.fromColorValue)};`,
      'SELECT changes();',
    ].join(' ')
    const result = execFileSync('sqlite3', [plan.dbPath, sql], { encoding: 'utf8' }).trim()
    applied += Number(result || 0)
  }
  return { ...plan, applied: true, appliedCount: applied, skipped: plan.updateCount - applied }
}

function main() {
  const args = parseArgs()
  const result = applyColorUpdates(args)
  const outFile = path.join(outputPaths.state, `color-plan-${Date.now()}.json`)
  writeJson(outFile, result)
  console.log(`Color updates planned: ${result.updateCount}`)
  console.log(`Applied: ${result.applied ? result.appliedCount || 0 : 0}`)
  console.log(`Skipped: ${result.skipped}`)
  console.log(`Color plan: ${relativePath(outFile)}`)
  if (!result.applied) console.log('Dry run only. Re-run with --apply to update NOTES.COLOR.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
