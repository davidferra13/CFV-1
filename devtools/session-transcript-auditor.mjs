#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  ensureDir,
  learningInboxRoot,
  loadSkills,
  nowStamp,
  parseArgs,
  readJson,
  readStdin,
  relative,
  reportsRoot,
  shortHash,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const closeoutDir = path.join(reportsRoot, 'skill-closeouts')

const triggerRules = [
  {
    skill: 'skill-garden',
    terms: [
      'codex should',
      'make codex smarter',
      'developer behavior',
      'durable behavior',
      'self-heal',
      'self healing',
      'from now on',
      'always',
      'knows when to',
      'external guidance',
      'hermes',
      'opencloy',
    ],
  },
  {
    skill: 'heal-skill',
    terms: ['skill failed', 'skill failure', 'missed behavior', 'self-heal', 'self healing'],
  },
  {
    skill: 'persona-dump',
    terms: [
      'persona dump',
      'pasted personas',
      'paste personas',
      'third-party chatgpt',
      'huge blurb',
      'bulk persona',
    ],
  },
  {
    skill: 'findings-triage',
    terms: ['autodocket', 'audit findings', 'regression report', 'build queue', 'mixed findings'],
  },
  {
    skill: 'host-integrity',
    terms: ['task scheduler', 'watchdog', 'cloudflare tunnel', 'ports 3100', 'port 3200', 'port 3300'],
  },
  {
    skill: 'evidence-integrity',
    terms: ['build health', 'green claim', 'stale test', 'dirty worktree', 'conflicting evidence'],
  },
  {
    skill: 'review',
    terms: ['review uncommitted', 'code review', 'before shipping'],
  },
]

const durableTerms = [
  'codex should',
  'always',
  'never',
  'from now on',
  'make codex smarter',
  'developer behavior',
  'durable behavior',
  'self-heal',
  'self healing',
  'use this behavior going forward',
  'knows when to',
  'hermes',
  'opencloy',
]

function usage() {
  console.log(`Usage:
  node devtools/session-transcript-auditor.mjs --file transcript.txt [--write]
  type transcript.txt | node devtools/session-transcript-auditor.mjs [--write]
  node devtools/session-transcript-auditor.mjs [--limit 10] [--write]

Without --file or stdin, audits recent JSON reports in system/agent-reports/skill-closeouts.`)
}

function jsonString(value) {
  return JSON.stringify(value, null, 2)
}

function lowerIncludesAny(text, terms) {
  const lower = text.toLowerCase()
  return terms.filter((term) => lower.includes(term))
}

function sortedJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(dir, name))
}

function parseInputFile(file) {
  const raw = fs.readFileSync(file, 'utf8')
  if (file.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(raw)
    return [normalizeRecord(parsed, relative(file), raw)]
  }
  return [normalizeRecord(null, relative(file), raw)]
}

function readRecentCloseouts(limit) {
  return sortedJsonFiles(closeoutDir)
    .slice(-limit)
    .map((file) => normalizeRecord(readJson(file, null), relative(file), null))
    .filter((record) => record.report || record.text)
}

function normalizeRecord(report, source, rawText) {
  const declaredSkills = new Set()
  if (report?.primary_skill) declaredSkills.add(report.primary_skill)
  for (const skill of report?.sidecar_skills || []) declaredSkills.add(skill)

  const text =
    rawText ||
    [
      report?.goal,
      report?.primary_skill,
      ...(report?.sidecar_skills || []),
      report?.skill_delta,
      report?.durable_behavior_seen,
      report?.skill_gap_seen,
      report?.notes,
      jsonString(report?.validation || {}),
    ]
      .filter(Boolean)
      .join('\n')

  return {
    source,
    report,
    text: String(text || ''),
    declaredSkills,
  }
}

function collectRecords(args) {
  if (args.help) {
    usage()
    process.exit(0)
  }
  if (args.file) return parseInputFile(args.file)

  const stdin = readStdin().trim()
  if (stdin) return [normalizeRecord(null, 'stdin', stdin)]

  const limit = Number.parseInt(args.limit || '10', 10)
  return readRecentCloseouts(Number.isFinite(limit) && limit > 0 ? limit : 10)
}

function hasCommitEvidence(record) {
  if (record.report) return Boolean(record.report.commit)
  return /\b(commit|committed|pushed commit)\b[\s:]+[0-9a-f]{7,40}\b/i.test(record.text)
}

function hasPushEvidence(record) {
  if (record.report) return Boolean(record.report.pushed)
  return /\b(git push|pushed|push succeeded|pushed to origin)\b/i.test(record.text)
}

function declaredSkillSet(record) {
  if (record.declaredSkills.size) return record.declaredSkills
  const names = new Set(loadSkills().map((skill) => skill.name).filter(Boolean))
  const declared = new Set()
  const lower = record.text.toLowerCase()
  for (const name of names) {
    if (lower.includes(`\`${name}\``) || lower.includes(` ${name} `)) declared.add(name)
  }
  return declared
}

function findMissedTriggers(record) {
  const declared = declaredSkillSet(record)
  const findings = []
  for (const rule of triggerRules) {
    const matches = lowerIncludesAny(record.text, rule.terms)
    if (matches.length && !declared.has(rule.skill)) {
      findings.push({
        type: 'missed-skill-trigger',
        severity: 'warning',
        title: `Missed ${rule.skill} trigger`,
        category: 'failure',
        target_skill: rule.skill,
        evidence: matches,
        details: `Source ${record.source} contains ${matches.join(', ')} but does not show ${rule.skill} as an active skill.`,
      })
    }
  }
  return findings
}

function findCommitPushFindings(record) {
  const findings = []
  if (!hasCommitEvidence(record)) {
    findings.push({
      type: 'missing-commit-evidence',
      severity: 'warning',
      title: 'Missing commit evidence',
      category: 'workflow',
      target_skill: 'ship',
      evidence: [],
      details: `Source ${record.source} does not include a commit hash or commit evidence.`,
    })
  }
  if (!hasPushEvidence(record)) {
    findings.push({
      type: 'missing-push-evidence',
      severity: 'warning',
      title: 'Missing push evidence',
      category: 'workflow',
      target_skill: 'ship',
      evidence: [],
      details: `Source ${record.source} does not include push evidence.`,
    })
  }
  return findings
}

function findDurableWithoutSkillDelta(record) {
  const matches = lowerIncludesAny(record.text, durableTerms)
  if (!matches.length) return []

  const delta = record.report?.skill_delta || null
  const explicitNoDelta = /\b(skill[_ -]?delta|delta)\b[^a-z0-9]+none\b/i.test(record.text)
  const lacksDelta = record.report ? !delta || delta === 'none' : explicitNoDelta
  if (!lacksDelta) return []

  return [
    {
      type: 'durable-behavior-without-skill-delta',
      severity: 'warning',
      title: 'Durable behavior without skill delta',
      category: 'behavior',
      target_skill: 'skill-garden',
      evidence: matches,
      details: `Source ${record.source} contains durable behavior signals (${matches.join(', ')}) but no skill change is recorded.`,
    },
  ]
}

function auditRecord(record) {
  return [
    ...findMissedTriggers(record),
    ...findCommitPushFindings(record),
    ...findDurableWithoutSkillDelta(record),
  ].map((finding) => ({
    ...finding,
    source: record.source,
  }))
}

function writeLearningItem(finding, index) {
  ensureDir(learningInboxRoot)
  const title = `${finding.title} in ${finding.source}`
  const id = `${nowStamp()}-${String(index + 1).padStart(2, '0')}-${slugify(title)}-${shortHash(finding.details)}`
  const item = {
    id,
    status: 'open',
    category: finding.category,
    title,
    source: 'session-transcript-auditor',
    target_skill: finding.target_skill,
    created_at: new Date().toISOString(),
    details: finding.details,
    decision: null,
    resolved_at: null,
    notes: `finding_type=${finding.type}; evidence=${finding.evidence.join(', ')}`,
  }
  const file = path.join(learningInboxRoot, `${id}.json`)
  writeJson(file, item)
  return file
}

const args = parseArgs()
const records = collectRecords(args)

if (!records.length) {
  console.log('No transcript or closeout records found to audit.')
  process.exit(0)
}

const findings = records.flatMap(auditRecord)
const written = args.write ? findings.map(writeLearningItem) : []

if (args.json) {
  console.log(
    jsonString({
      audited_records: records.map((record) => record.source),
      finding_count: findings.length,
      findings,
      written: written.map(relative),
    }),
  )
  process.exit(findings.length ? 1 : 0)
}

console.log(`Audited ${records.length} record(s).`)
console.log(`Findings: ${findings.length}`)
for (const finding of findings) {
  console.log(`- ${finding.type}: ${finding.title} (${finding.source})`)
  console.log(`  ${finding.details}`)
}
if (written.length) {
  console.log(`Wrote ${written.length} learning inbox item(s):`)
  for (const file of written) console.log(`- ${relative(file)}`)
} else if (findings.length) {
  console.log('Run with --write to add these findings to system/agent-learning-inbox.')
}

process.exit(findings.length ? 1 : 0)
