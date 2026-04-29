#!/usr/bin/env node
import path from 'node:path'
import {
  loadSkills,
  nowStamp,
  parseArgs,
  projectSkillRoot,
  relative,
  reportsRoot,
  tokenize,
  writeJson,
} from './agent-skill-utils.mjs'

const taskClasses = [
  {
    id: 'migrations',
    label: 'Migrations',
    description: 'Additive database migration planning, timestamp selection, SQL review, and safety checks.',
    expectedOwners: ['builder', 'planner', 'compliance'],
    keywords: ['migration', 'database', 'schema', 'sql', 'additive', 'drizzle', 'timestamp'],
  },
  {
    id: 'server-actions',
    label: 'Server Actions',
    description: 'Server action auth, tenant scoping, validation, mutation feedback, and cache busting.',
    expectedOwners: ['builder', 'compliance', 'hallucination-scan'],
    keywords: ['server action', 'auth', 'tenant', 'scope', 'validate', 'revalidate', 'mutation'],
  },
  {
    id: 'ledger',
    label: 'Ledger',
    description: 'Ledger-first financial behavior, append-only entries, cents, and computed balances.',
    expectedOwners: ['builder', 'review', 'hallucination-scan'],
    keywords: ['ledger', 'append', 'balance', 'cents', 'financial', 'money', 'immutable'],
  },
  {
    id: 'ai-ollama',
    label: 'AI/Ollama',
    description: 'Single-provider Ollama gateway behavior, structured JSON, runtime failure, and recipe restrictions.',
    expectedOwners: ['builder', 'debug', 'compliance'],
    keywords: ['ollama', 'ai', 'recipe', 'parsewithollama', 'structured', 'runtime', 'fallback'],
  },
  {
    id: 'public-ui',
    label: 'Public UI',
    description: 'Visible app surfaces, component variants, public copy, no fake affordances, and no banned terms.',
    expectedOwners: ['builder', 'compliance', 'hallucination-scan'],
    keywords: ['ui', 'button', 'badge', 'public', 'surface', 'variant', 'onclick', 'display'],
  },
  {
    id: 'host-process',
    label: 'Host/Process',
    description: 'Windows host truth, ports, scheduled tasks, tunnels, watchdogs, and running process safety.',
    expectedOwners: ['host-integrity', 'health', 'warmup'],
    keywords: ['host', 'process', 'port', 'task scheduler', 'watchdog', 'tunnel', 'server'],
  },
  {
    id: 'persona-pipeline',
    label: 'Persona Pipeline',
    description: 'Persona import, inbox, stress tests, synthesis, saturation handling, and build routing.',
    expectedOwners: ['persona-dump', 'persona-inbox', 'persona-stress-test', 'persona-build'],
    keywords: ['persona', 'inbox', 'stress', 'synthesis', 'saturated', 'dump', 'pipeline'],
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Tier classification, paid/free module behavior, monetization rules, and upgrade prompt timing.',
    expectedOwners: ['builder', 'validation-gate', 'review'],
    keywords: ['billing', 'tier', 'paid', 'free', 'upgrade', 'module', 'monetization'],
  },
  {
    id: 'stripe-webhooks',
    label: 'Stripe/Webhooks',
    description: 'Stripe integration, webhook processing, tickets, idempotency, and external payment events.',
    expectedOwners: ['builder', 'debug', 'review'],
    keywords: ['stripe', 'webhook', 'payment', 'checkout', 'invoice', 'subscription', 'idempotency'],
  },
  {
    id: 'validation',
    label: 'Validation',
    description: 'User-validation evidence, launch readiness, feedback gates, and product surface restraint.',
    expectedOwners: ['validation-gate', 'research', 'audit'],
    keywords: ['validation', 'evidence', 'feedback', 'launch', 'survey', 'user', 'readiness'],
  },
  {
    id: 'docs',
    label: 'Docs',
    description: 'Living docs, user manual updates, audits, reports, and documentation drift.',
    expectedOwners: ['document', 'audit', 'research'],
    keywords: ['docs', 'documentation', 'manual', 'audit', 'report', 'drift', 'markdown'],
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Code review, findings-first output, risk ordering, test gaps, and shipping readiness.',
    expectedOwners: ['review', 'compliance', 'evidence-integrity'],
    keywords: ['review', 'findings', 'risk', 'regression', 'test', 'ship', 'quality'],
  },
  {
    id: 'closeout',
    label: 'Closeout',
    description: 'Commit, push, session close, changed-file ownership, validation evidence, and branch safety.',
    expectedOwners: ['close-session', 'ship', 'feature-closeout'],
    keywords: ['closeout', 'commit', 'push', 'stage', 'branch', 'session', 'finish'],
  },
]

function evidenceScore(skill, taskClass) {
  const haystack = `${skill.name}\n${skill.description}\n${skill.body.slice(0, 2200)}`.toLowerCase()
  const taskTokens = tokenize(`${taskClass.description}\n${taskClass.keywords.join(' ')}`)
  let tokenHits = 0
  for (const token of taskTokens) {
    if (haystack.includes(token)) tokenHits += 1
  }
  const keywordHits = taskClass.keywords.filter((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  ).length
  return tokenHits + keywordHits * 2
}

function classifyOwner(candidate, expectedOwners) {
  if (expectedOwners.includes(candidate.name)) return 'expected'
  if (candidate.score >= 6) return 'inferred'
  return 'weak'
}

function mapCoverage(skills) {
  const byName = new Map(skills.map((skill) => [skill.name, skill]))

  return taskClasses.map((taskClass) => {
    const expected = taskClass.expectedOwners
      .map((name) => byName.get(name))
      .filter(Boolean)
      .map((skill) => ({
        name: skill.name,
        file: relative(skill.file),
        score: evidenceScore(skill, taskClass),
      }))

    const inferred = skills
      .filter((skill) => !taskClass.expectedOwners.includes(skill.name))
      .map((skill) => ({
        name: skill.name,
        file: relative(skill.file),
        score: evidenceScore(skill, taskClass),
      }))
      .filter((candidate) => candidate.score >= 6)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 3)

    const owners = [...expected, ...inferred]
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((candidate) => ({
        ...candidate,
        ownership: classifyOwner(candidate, taskClass.expectedOwners),
      }))

    const missingExpectedOwners = taskClass.expectedOwners.filter((name) => !byName.has(name))
    const strongOwners = owners.filter(
      (owner) => owner.ownership === 'expected' && owner.score >= 3,
    )
    const status = strongOwners.length ? 'covered' : owners.length ? 'weak' : 'gap'
    const flags = []
    if (status === 'gap') flags.push('gap')
    if (status === 'weak') flags.push('weak-owner')
    if (missingExpectedOwners.length) flags.push('missing-expected-owner')

    return {
      id: taskClass.id,
      label: taskClass.label,
      description: taskClass.description,
      expected_owners: taskClass.expectedOwners,
      missing_expected_owners: missingExpectedOwners,
      status,
      flags,
      owners,
    }
  })
}

function printSummary(report) {
  console.log(`Skill coverage classes: ${report.class_count}`)
  console.log(`Covered: ${report.covered_count}`)
  console.log(`Weak: ${report.weak_count}`)
  console.log(`Gaps: ${report.gap_count}`)
  for (const row of report.classes) {
    const ownerList = row.owners.map((owner) => `${owner.name}:${owner.ownership}`).join(', ')
    const ownerText = ownerList || 'none'
    const flagText = row.flags.length ? ` flags=${row.flags.join(',')}` : ''
    console.log(`${row.status.toUpperCase()} ${row.id} owners=${ownerText}${flagText}`)
  }
}

const args = parseArgs()
const skills = loadSkills(projectSkillRoot)
const classes = mapCoverage(skills)
const report = {
  generated_at: new Date().toISOString(),
  skill_count: skills.length,
  class_count: classes.length,
  covered_count: classes.filter((row) => row.status === 'covered').length,
  weak_count: classes.filter((row) => row.status === 'weak').length,
  gap_count: classes.filter((row) => row.status === 'gap').length,
  classes,
}

if (args.stdout) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const outFile = path.join(reportsRoot, 'skill-coverage', `${nowStamp()}-skill-coverage.json`)
  writeJson(outFile, report)
  printSummary(report)
  console.log(`Wrote report: ${outFile.replace(/\\/g, '/')}`)
}
