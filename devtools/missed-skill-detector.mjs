#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  ensureDir,
  learningInboxRoot,
  nowStamp,
  parseArgs,
  readJson,
  readStdin,
  relative,
  shortHash,
  slugify,
  splitCsv,
  writeJson,
} from './agent-skill-utils.mjs'

function usage() {
  console.log(`Usage:
  node devtools/missed-skill-detector.mjs --prompt "..." --used a,b [--touched path,path] [--write-learning]
  node devtools/missed-skill-detector.mjs --record system/agent-reports/flight-records/file.json [--write-learning]

Compares expected skills from router and touched files against skills actually used.`)
}

function routePrompt(prompt) {
  const output = execFileSync('node', ['devtools/skill-router.mjs', '--prompt', prompt], {
    encoding: 'utf8',
  })
  return JSON.parse(output)
}

function inferFromTouchedFiles(files) {
  const expected = new Set()
  for (const file of files) {
    const lower = file.toLowerCase().replace(/\\/g, '/')
    if (lower.includes('.claude/skills/') || lower.includes('devtools/skill')) {
      expected.add('skill-garden')
    }
    if (lower.includes('ledger') || lower.includes('/money/') || lower.includes('pricing')) {
      expected.add('ledger-safety')
    }
    if (lower.includes('stripe') || lower.includes('webhook') || lower.includes('checkout')) {
      expected.add('stripe-webhook-integrity')
    }
    if (lower.includes('billing') || lower.includes('feature-classification') || lower.includes('modules')) {
      expected.add('billing-monetization')
    }
    if (lower.includes('server') || lower.endsWith('actions.ts') || lower.endsWith('actions.tsx')) {
      expected.add('builder')
    }
  }
  return [...expected]
}

function loadInput(args) {
  if (args.record && args.record !== true) {
    const file = path.resolve(String(args.record))
    const record = readJson(file, null)
    if (!record) throw new Error(`Could not read flight record: ${args.record}`)
    return {
      prompt: record.prompt || '',
      used: record.used_skills || [],
      touched: record.files_touched || [],
      record_file: relative(file),
    }
  }
  return {
    prompt: String(args.prompt || args._.join(' ') || readStdin()).trim(),
    used: splitCsv(args.used),
    touched: splitCsv(args.touched || args.owned),
    record_file: null,
  }
}

function writeLearningItems(misses, source) {
  ensureDir(learningInboxRoot)
  const files = []
  for (const miss of misses) {
    const title = `Missed skill: ${miss.skill}`
    const details = [
      `Expected skill: ${miss.skill}`,
      `Reason: ${miss.reason}`,
      source.prompt ? `Prompt: ${source.prompt}` : null,
      source.record_file ? `Flight record: ${source.record_file}` : null,
      source.touched.length ? `Touched files: ${source.touched.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n')
    const id = `${nowStamp()}-${slugify(title)}-${shortHash(details)}`
    const file = path.join(learningInboxRoot, `${id}.json`)
    writeJson(file, {
      id,
      status: 'open',
      category: 'failure',
      title,
      source: 'missed-skill-detector',
      target_skill: miss.skill,
      created_at: new Date().toISOString(),
      details,
      decision: null,
      resolved_at: null,
      notes: null,
    })
    files.push(relative(file))
  }
  return files
}

try {
  const args = parseArgs()
  if (args.help) {
    usage()
    process.exit(0)
  }
  const input = loadInput(args)
  if (!input.prompt) throw new Error('Missing prompt or record prompt.')
  const router = routePrompt(input.prompt)
  const expected = new Map()
  for (const skill of [router.primary_skill, ...(router.sidecar_skills || [])].filter(Boolean)) {
    if (skill !== 'omninet') expected.set(skill, 'router')
  }
  for (const skill of inferFromTouchedFiles(input.touched)) {
    if (skill !== 'omninet') expected.set(skill, 'touched-files')
  }
  const used = new Set(input.used.filter(Boolean))
  const misses = [...expected.entries()]
    .filter(([skill]) => !used.has(skill))
    .map(([skill, reason]) => ({ skill, reason }))
  const learningFiles = args['write-learning'] ? writeLearningItems(misses, input) : []
  const result = {
    ok: misses.length === 0,
    prompt: input.prompt,
    record_file: input.record_file,
    expected_skills: [...expected.keys()],
    used_skills: [...used],
    touched_files: input.touched,
    missed_skills: misses,
    learning_files: learningFiles,
  }
  if (args.record && args.record !== true && misses.length) {
    const recordPath = path.resolve(String(args.record))
    const record = readJson(recordPath, null)
    if (record) {
      record.missed_skills = misses
      record.learning_files = [...new Set([...(record.learning_files || []), ...learningFiles])]
      fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`)
    }
  }
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  usage()
  process.exit(1)
}
