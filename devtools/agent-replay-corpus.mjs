#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  ensureDir,
  nowStamp,
  parseArgs,
  readJson,
  relative,
  replayCorpusRoot,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const command = args._[0] || args.command || 'list'
const outputDir = args['output-dir'] && args['output-dir'] !== true
  ? path.resolve(String(args['output-dir']))
  : replayCorpusRoot

function usage() {
  console.log(`Usage:
  node devtools/agent-replay-corpus.mjs list [--output-dir dir] [--json]
  node devtools/agent-replay-corpus.mjs promote --record path [--name name] [--output-dir dir]
  node devtools/agent-replay-corpus.mjs prune --id id [--output-dir dir]`)
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : []
}

function runRouter(prompt) {
  const output = execFileSync('node', ['devtools/skill-router.mjs', '--prompt', prompt], {
    encoding: 'utf8',
    windowsHide: true,
  })
  return JSON.parse(output)
}

function expectedFromRecord(record) {
  const prompt = String(record.prompt || '').trim()
  if (!prompt) throw new Error('Record is missing prompt.')
  const router = record.router_decision || runRouter(prompt)
  return {
    primary_skill: record.selected_primary_skill || router.primary_skill || null,
    sidecar_skills: normalizeArray(record.selected_sidecar_skills || router.sidecar_skills),
    risk_level: router.risk_level || null,
    hard_stops: normalizeArray(router.hard_stops),
    required_checks: normalizeArray(router.required_checks),
  }
}

function listCases() {
  if (!fs.existsSync(outputDir)) return []
  return fs
    .readdirSync(outputDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => readJson(path.join(outputDir, name), null))
    .filter(Boolean)
}

function promote() {
  if (!args.record || args.record === true) throw new Error('Missing --record.')
  const recordFile = path.resolve(String(args.record))
  const record = readJson(recordFile, null)
  if (!record) throw new Error(`Could not read record ${recordFile}.`)
  if (!args['allow-unfinished'] && record.status && record.status !== 'finished') {
    throw new Error('Only finished flight records can be promoted. Pass --allow-unfinished to override.')
  }
  if (!args['allow-missed'] && normalizeArray(record.missed_skills).length) {
    throw new Error('Flight records with missed skills cannot be promoted. Pass --allow-missed to override.')
  }
  const prompt = String(record.prompt || '').trim()
  if (!prompt) throw new Error('Record is missing prompt.')
  const name = String(args.name && args.name !== true ? args.name : record.id || prompt)
  const id = slugify(name)
  const promoted = {
    id,
    name,
    source_record: relative(recordFile),
    prompt,
    expected: expectedFromRecord(record),
    promoted_at: new Date().toISOString(),
    source_commit: record.commit_hash || null,
    notes: args.notes && args.notes !== true ? String(args.notes) : null,
  }
  ensureDir(outputDir)
  const file = path.join(outputDir, `${id}.json`)
  writeJson(file, promoted)
  console.log(JSON.stringify({ ok: true, file: relative(file), case: promoted }, null, 2))
}

function prune() {
  const id = args.id && args.id !== true ? slugify(args.id) : null
  if (!id) throw new Error('Missing --id.')
  const file = path.join(outputDir, `${id}.json`)
  const existed = fs.existsSync(file)
  if (existed) fs.rmSync(file, { force: true })
  console.log(JSON.stringify({ ok: true, removed: existed, file: relative(file) }, null, 2))
}

try {
  if (args.help || args.h) {
    usage()
    process.exit(0)
  }
  if (command === 'list') {
    const cases = listCases()
    const result = {
      ok: true,
      generated_at: new Date().toISOString(),
      corpus_dir: relative(outputDir),
      case_count: cases.length,
      cases: cases.map((entry) => ({
        id: entry.id,
        name: entry.name,
        source_record: entry.source_record,
        primary_skill: entry.expected?.primary_skill || null,
      })),
    }
    console.log(JSON.stringify(result, null, 2))
  } else if (command === 'promote') {
    promote()
  } else if (command === 'prune') {
    prune()
  } else {
    throw new Error(`Unknown command ${command}.`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
