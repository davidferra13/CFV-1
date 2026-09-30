#!/usr/bin/env node
import os from 'os'
import { readFileSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import postgres from 'postgres'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(scriptDir, '..')
dotenv.config({ path: join(rootDir, '.env.local'), quiet: true })

const STATE_PATH = join(rootDir, 'data', 'openclaw-intelligence-cycle.json')
const MIN_FREE_GB = Number(process.env.CF_INTEL_MIN_FREE_GB || 8)
const WIKI_BATCH = Math.min(Math.max(Number(process.env.CF_INTEL_WIKI_BATCH || 10), 1), 25)
const CHILD_TIMEOUT_MS = Math.min(Math.max(Number(process.env.CF_INTEL_CHILD_TIMEOUT_MS || 120000), 30000), 300000)
const STALE_RUN_MS = 15 * 60 * 1000

function readState() {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')) } catch { return {} }
}

function writeState(next) {
  writeFileSync(STATE_PATH, JSON.stringify(next, null, 2))
}

function complete(previous, status, details = {}) {
  const next = {
    running: false,
    status,
    startedAt: previous.startedAt || null,
    pid: previous.pid || process.pid,
    completedAt: new Date().toISOString(),
    ...details,
  }
  writeState(next)
  console.log(JSON.stringify(next, null, 2))
  return status === 'error' ? 1 : 0
}

async function knowledgeCounts(sql) {
  const [row] = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM system_ingredients WHERE is_active = true) AS total,
      (SELECT COUNT(*)::int FROM ingredient_knowledge) AS known
  `
  return { total: row.total, known: row.known }
}

async function main() {
  const previous = readState()
  const now = Date.now()
  if (previous.running && previous.startedAt) {
    const age = now - new Date(previous.startedAt).getTime()
    if (Number.isFinite(age) && age < STALE_RUN_MS) {
      console.log(JSON.stringify({ status: 'skipped', reason: 'previous_cycle_running', ageMs: age }))
      return 0
    }
  }

  const started = {
    ...previous,
    running: true,
    status: 'running',
    startedAt: new Date().toISOString(),
    pid: process.pid,
  }
  writeState(started)

  const freeGb = os.freemem() / 1024 ** 3
  if (freeGb < MIN_FREE_GB) {
    return complete(started, 'skipped', {
      reason: 'low_memory',
      freeGb: Number(freeGb.toFixed(2)),
      minFreeGb: MIN_FREE_GB,
    })
  }

  let sql
  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL
    if (!databaseUrl) throw new Error('DATABASE_URL/DB_URL is not configured')
    sql = postgres(databaseUrl, { max: 2, connect_timeout: 5 })

    const before = await knowledgeCounts(sql)
    await sql.end()
    sql = null

    let knowledge = {
      before,
      after: before,
      delta: 0,
      status: before.total > 0 && before.known >= before.total ? 'complete' : 'idle',
      outputTail: '',
    }

    if (knowledge.status !== 'complete') {
      const child = spawnSync(process.execPath, [
        join(scriptDir, 'openclaw-wiki-enrichment.mjs'),
        '--resume',
        '--limit',
        String(WIKI_BATCH),
      ], {
        cwd: rootDir,
        env: process.env,
        encoding: 'utf8',
        timeout: CHILD_TIMEOUT_MS,
        maxBuffer: 2 * 1024 * 1024,
      })

      if (child.error || child.status !== 0) {
        return complete(started, 'error', {
          reason: child.error?.message || `enrichment_exit_${child.status}`,
          stdoutTail: (child.stdout || '').slice(-4000),
          stderrTail: (child.stderr || '').slice(-4000),
        })
      }

      sql = postgres(process.env.DATABASE_URL || process.env.DB_URL, { max: 2, connect_timeout: 5 })
      const after = await knowledgeCounts(sql)
      await sql.end()
      sql = null

      knowledge = {
        before,
        after,
        delta: after.known - before.known,
        status: after.known > before.known ? 'advanced' : 'idle',
        outputTail: (child.stdout || '').slice(-4000),
      }
    }

    const directoryChild = spawnSync(process.execPath, [
      join(scriptDir, 'openclaw-directory-recovery-cycle.mjs'),
    ], {
      cwd: rootDir,
      env: process.env,
      encoding: 'utf8',
      timeout: CHILD_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    })

    if (directoryChild.error || directoryChild.status !== 0) {
      return complete(started, 'error', {
        reason: directoryChild.error?.message || `directory_recovery_exit_${directoryChild.status}`,
        knowledge,
        stdoutTail: (directoryChild.stdout || '').slice(-4000),
        stderrTail: (directoryChild.stderr || '').slice(-4000),
      })
    }

    let directory = { status: 'unknown', outputTail: (directoryChild.stdout || '').slice(-4000) }
    try {
      directory = JSON.parse((directoryChild.stdout || '').trim())
    } catch {}

    const advanced = knowledge.delta > 0 || directory.status === 'advanced'
    return complete(started, advanced ? 'advanced' : 'idle', {
      reason: advanced ? 'intelligence_advanced' : 'no_new_work',
      freeGb: Number(freeGb.toFixed(2)),
      batchLimit: WIKI_BATCH,
      knowledge,
      directory,
    })
  } catch (error) {
    try { if (sql) await sql.end() } catch {}
    return complete(started, 'error', { reason: error instanceof Error ? error.message : String(error) })
  }
}

process.exitCode = await main()
