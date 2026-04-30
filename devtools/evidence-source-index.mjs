#!/usr/bin/env node
import path from 'node:path'
import {
  nowStamp,
  parseArgs,
  readJson,
  reportsRoot,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const index = readJson('system/research/evidence-source-index.json', { sources: [] })
const query = String(args.query || args.q || args._.join(' ') || '').toLowerCase()
const category = String(args.category || args.type || '').toLowerCase()

function matchesSource(source) {
  if (category && source.category !== category) return false
  if (!query) return true
  const text = [
    source.id,
    source.label,
    source.category,
    source.claim_power,
    source.caveat,
    ...(source.paths || []),
  ]
    .join(' ')
    .toLowerCase()
  return query
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .every((token) => text.includes(token))
}

const result = {
  generated_at: new Date().toISOString(),
  query: query || null,
  category: category || null,
  source_count: index.sources.length,
  matches: index.sources.filter(matchesSource),
}

if (args.write || args.report) {
  const outFile = path.join(
    reportsRoot,
    'evidence-source-index',
    `${nowStamp()}-${slugify(query || category || 'all')}.json`,
  )
  writeJson(outFile, result)
  result.report_path = outFile.replace(/\\/g, '/')
}

console.log(JSON.stringify(result, null, 2))
