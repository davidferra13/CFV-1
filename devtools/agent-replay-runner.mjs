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
  reportsRoot,
  slugify,
  writeJson,
  writeText,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const riskRank = { low: 0, medium: 1, high: 2 }

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : []
}

function uniqueSorted(value) {
  return [...new Set(normalizeArray(value))].sort()
}

function runRouter(prompt) {
  const output = execFileSync('node', ['devtools/skill-router.mjs', '--prompt', prompt], {
    encoding: 'utf8',
    windowsHide: true,
  })
  return JSON.parse(output)
}

function extractCase(raw, file = null) {
  const prompt = String(raw.prompt || '').trim()
  if (!prompt) throw new Error(`${file || 'case'} is missing prompt.`)
  const expected = raw.expected || {
    primary_skill:
      raw.expected_primary_skill || raw.selected_primary_skill || raw.router_decision?.primary_skill || null,
    sidecar_skills:
      raw.expected_sidecar_skills || raw.selected_sidecar_skills || raw.router_decision?.sidecar_skills || [],
    risk_level: raw.expected_risk_level || raw.router_decision?.risk_level || null,
    hard_stops: raw.expected_hard_stops || raw.router_decision?.hard_stops || [],
    required_checks: raw.expected_required_checks || raw.router_decision?.required_checks || [],
  }
  return {
    id: raw.id || slugify(raw.name || prompt),
    name: raw.name || raw.id || slugify(prompt),
    source_file: file ? relative(file) : null,
    prompt,
    expected: {
      primary_skill: expected.primary_skill || null,
      sidecar_skills: uniqueSorted(expected.sidecar_skills),
      risk_level: expected.risk_level || null,
      hard_stops: uniqueSorted(expected.hard_stops),
      required_checks: uniqueSorted(expected.required_checks),
    },
  }
}

function readCases() {
  const files = []
  if (args.record && args.record !== true) files.push(path.resolve(String(args.record)))
  if (args.records && args.records !== true) {
    for (const item of String(args.records).split(',')) {
      if (item.trim()) files.push(path.resolve(item.trim()))
    }
  }
  if (args.corpus && args.corpus !== true) {
    const corpusTarget = path.resolve(String(args.corpus))
    if (fs.existsSync(corpusTarget) && fs.statSync(corpusTarget).isDirectory()) {
      for (const name of fs.readdirSync(corpusTarget).filter((item) => item.endsWith('.json')).sort()) {
        files.push(path.join(corpusTarget, name))
      }
    } else {
      files.push(corpusTarget)
    }
  } else if (args.corpus || args['corpus-dir']) {
    const dir =
      args['corpus-dir'] && args['corpus-dir'] !== true
        ? path.resolve(String(args['corpus-dir']))
        : replayCorpusRoot
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      for (const name of fs.readdirSync(dir).filter((item) => item.endsWith('.json')).sort()) {
        files.push(path.join(dir, name))
      }
    }
  }
  return [...new Set(files)].flatMap((file) => {
    const raw = readJson(file, null)
    if (Array.isArray(raw)) return raw.map((item) => extractCase(item, file))
    if (!raw) throw new Error(`Could not read replay case ${file}.`)
    return [extractCase(raw, file)]
  })
}

function diffSet(kind, expected, actual, missingSeverity) {
  const diffs = []
  const expectedSet = new Set(expected)
  const actualSet = new Set(actual)
  for (const item of expectedSet) {
    if (!actualSet.has(item)) {
      diffs.push({ severity: missingSeverity, kind: `${kind}_removed`, value: item })
    }
  }
  for (const item of actualSet) {
    if (!expectedSet.has(item)) {
      diffs.push({ severity: 'strengthening', kind: `${kind}_added`, value: item })
    }
  }
  return diffs
}

function compareCase(testCase) {
  const current = runRouter(testCase.prompt)
  const diffs = []
  const expected = testCase.expected

  if (expected.primary_skill && current.primary_skill !== expected.primary_skill) {
    diffs.push({
      severity: args['allow-primary-change'] ? 'strengthening' : 'suspicious',
      kind: 'primary_changed',
      expected: expected.primary_skill,
      actual: current.primary_skill,
    })
  }

  diffs.push(...diffSet('sidecar_skill', expected.sidecar_skills, current.sidecar_skills, 'suspicious'))
  diffs.push(...diffSet('hard_stop', expected.hard_stops, current.hard_stops, 'suspicious'))
  diffs.push(
    ...diffSet('required_check', expected.required_checks, current.required_checks, 'suspicious'),
  )

  if (expected.risk_level && current.risk_level !== expected.risk_level) {
    const expectedRank = riskRank[expected.risk_level] ?? 0
    const currentRank = riskRank[current.risk_level] ?? 0
    diffs.push({
      severity: currentRank < expectedRank ? 'suspicious' : 'strengthening',
      kind: 'risk_changed',
      expected: expected.risk_level,
      actual: current.risk_level,
    })
  }

  const suspicious = diffs.filter((diff) => diff.severity === 'suspicious')
  const strengthening = diffs.filter((diff) => diff.severity === 'strengthening')
  const status = suspicious.length ? 'suspicious' : strengthening.length ? 'strengthened' : 'same'

  return {
    id: testCase.id,
    name: testCase.name,
    source_file: testCase.source_file,
    status,
    suspicious_count: suspicious.length,
    strengthening_count: strengthening.length,
    expected,
    actual: {
      primary_skill: current.primary_skill,
      sidecar_skills: uniqueSorted(current.sidecar_skills),
      risk_level: current.risk_level,
      hard_stops: uniqueSorted(current.hard_stops),
      required_checks: uniqueSorted(current.required_checks),
    },
    diffs,
  }
}

function toMarkdown(report) {
  const lines = [
    '# Agent Replay Run',
    '',
    `Generated: ${report.generated_at}`,
    `Cases: ${report.case_count}`,
    `Suspicious: ${report.suspicious_count}`,
    `Strengthened: ${report.strengthened_count}`,
    '',
    '## Cases',
    '',
  ]
  for (const item of report.cases) {
    lines.push(`- ${item.status}: ${item.id}`)
    for (const diff of item.diffs) {
      lines.push(`  - ${diff.severity} ${diff.kind}: ${diff.value || `${diff.expected} -> ${diff.actual}`}`)
    }
  }
  return `${lines.join('\n')}\n`
}

try {
  const cases = readCases()
  if (!cases.length && !args['allow-empty']) {
    throw new Error('No replay cases found. Use --record path, --records a,b, or --corpus.')
  }
  const results = cases.map(compareCase)
  const suspiciousCount = results.filter((item) => item.status === 'suspicious').length
  const strengthenedCount = results.filter((item) => item.status === 'strengthened').length
  const report = {
    ok: suspiciousCount === 0,
    generated_at: new Date().toISOString(),
    case_count: results.length,
    suspicious_count: suspiciousCount,
    strengthened_count: strengthenedCount,
    same_count: results.filter((item) => item.status === 'same').length,
    cases: results,
  }

  if (args.stdout || args.json || args['dry-run']) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    const outDir = args['output-dir'] && args['output-dir'] !== true
      ? path.resolve(String(args['output-dir']))
      : path.join(reportsRoot, 'replay-runs')
    const jsonFile = path.join(outDir, `${nowStamp()}-agent-replay.json`)
    const mdFile = path.join(outDir, 'latest.md')
    ensureDir(outDir)
    writeJson(jsonFile, report)
    writeText(mdFile, toMarkdown(report))
    console.log(`Wrote replay JSON: ${relative(jsonFile)}`)
    console.log(`Wrote replay markdown: ${relative(mdFile)}`)
  }
  process.exit(report.ok || args['allow-drift'] ? 0 : 1)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
