#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  flightRecordsRoot,
  nowStamp,
  parseArgs,
  readJson,
  relative,
  reportsRoot,
  writeJson,
  writeText,
} from './agent-skill-utils.mjs'

function latestRecords(limit) {
  if (!fs.existsSync(flightRecordsRoot)) return []
  return fs
    .readdirSync(flightRecordsRoot)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .slice(-limit)
    .map((name) => {
      const file = path.join(flightRecordsRoot, name)
      return { file, record: readJson(file, null) }
    })
    .filter((entry) => entry.record)
}

function buildDigest(records) {
  const skills = new Set()
  const missed = []
  const validations = new Set()
  for (const { record } of records) {
    for (const skill of record.used_skills || []) skills.add(skill)
    for (const validation of record.validations_run || []) validations.add(validation)
    for (const miss of record.missed_skills || []) {
      missed.push({ record_id: record.id, ...miss })
    }
  }
  return {
    generated_at: new Date().toISOString(),
    record_count: records.length,
    records: records.map(({ file, record }) => ({
      file: relative(file),
      id: record.id,
      prompt: record.prompt,
      status: record.status,
      commit_hash: record.commit_hash,
      pushed: record.pushed,
      used_skills: record.used_skills || [],
      validations_run: record.validations_run || [],
      missed_skills: record.missed_skills || [],
    })),
    skills_used: [...skills].sort(),
    validations_run: [...validations].sort(),
    missed_skills: missed,
  }
}

function toMarkdown(digest) {
  const lines = ['# Agent Session Digest', '', `Generated: ${digest.generated_at}`, '']
  lines.push('## Summary', '')
  lines.push(`- Flight records: ${digest.record_count}`)
  lines.push(`- Skills used: ${digest.skills_used.join(', ') || 'none'}`)
  lines.push(`- Validations: ${digest.validations_run.join(', ') || 'none'}`)
  lines.push(`- Missed skills: ${digest.missed_skills.length}`)
  lines.push('')
  lines.push('## Records', '')
  for (const record of digest.records) {
    lines.push(`- ${record.id}: ${record.status}, commit ${record.commit_hash || 'none'}, prompt "${record.prompt}"`)
  }
  lines.push('')
  lines.push('## What Future Codex Should Do Differently', '')
  if (digest.missed_skills.length) {
    for (const miss of digest.missed_skills) {
      lines.push(`- Load ${miss.skill} when ${miss.reason} appears in record ${miss.record_id}.`)
    }
  } else {
    lines.push('- No missed-skill repairs were detected in these records.')
  }
  lines.push('')
  return `${lines.join('\n')}\n`
}

const args = parseArgs()
const limit = Number(args.limit || 10)
const digest = buildDigest(latestRecords(Number.isFinite(limit) && limit > 0 ? limit : 10))

if (args.stdout || args.json) {
  console.log(JSON.stringify(digest, null, 2))
} else {
  const jsonFile = path.join(reportsRoot, 'session-digests', `${nowStamp()}-agent-session-digest.json`)
  const mdFile = path.join(reportsRoot, 'session-digests', 'latest.md')
  writeJson(jsonFile, digest)
  writeText(mdFile, toMarkdown(digest))
  console.log(`Wrote session digest JSON: ${relative(jsonFile)}`)
  console.log(`Wrote session digest markdown: ${relative(mdFile)}`)
}
