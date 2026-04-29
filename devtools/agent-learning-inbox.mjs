#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  ensureDir,
  learningInboxRoot,
  nowStamp,
  parseArgs,
  readJson,
  readStdin,
  shortHash,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const categories = new Set(['behavior', 'workflow', 'failure', 'preference', 'external-guidance'])

function usage() {
  console.log(`Usage:
  node devtools/agent-learning-inbox.mjs add --category behavior --title "..." [--source "..."] [--target-skill skill-name]
  node devtools/agent-learning-inbox.mjs list
  node devtools/agent-learning-inbox.mjs resolve --id file-stem --decision patch|new-skill|no-change --notes "..."

Add reads details from stdin when available.`)
}

function listItems() {
  ensureDir(learningInboxRoot)
  const files = fsSortedJsonFiles(learningInboxRoot)
  if (!files.length) {
    console.log('No learning inbox items.')
    return
  }
  for (const file of files) {
    const item = readJson(file, {})
    console.log(`${path.basename(file, '.json')} [${item.status || 'open'}] ${item.category}: ${item.title}`)
  }
}

function fsSortedJsonFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(dir, name))
}

const args = parseArgs()
const command = args._[0]

if (!command || args.help) {
  usage()
  process.exit(command ? 0 : 1)
}

ensureDir(learningInboxRoot)

if (command === 'list') {
  listItems()
  process.exit(0)
}

if (command === 'add') {
  const title = args.title || args._.slice(1).join(' ')
  const category = args.category || 'behavior'
  if (!title) throw new Error('Missing --title')
  if (!categories.has(category)) throw new Error(`Invalid category: ${category}`)
  const details = (args.details || readStdin()).trim()
  const id = `${nowStamp()}-${slugify(title)}-${shortHash(details || title)}`
  const item = {
    id,
    status: 'open',
    category,
    title,
    source: args.source || 'codex-session',
    target_skill: args['target-skill'] || null,
    created_at: new Date().toISOString(),
    details,
    decision: null,
    resolved_at: null,
    notes: null,
  }
  writeJson(path.join(learningInboxRoot, `${id}.json`), item)
  console.log(`Added learning inbox item: ${id}`)
  process.exit(0)
}

if (command === 'resolve') {
  const id = args.id || args._[1]
  if (!id) throw new Error('Missing --id')
  const file = path.join(learningInboxRoot, `${id}.json`)
  const item = readJson(file, null)
  if (!item) throw new Error(`Learning inbox item not found: ${id}`)
  item.status = 'resolved'
  item.decision = args.decision || 'no-change'
  item.resolved_at = new Date().toISOString()
  item.notes = args.notes || ''
  writeJson(file, item)
  console.log(`Resolved learning inbox item: ${id}`)
  process.exit(0)
}

usage()
process.exit(1)
