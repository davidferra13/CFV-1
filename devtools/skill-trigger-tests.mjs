#!/usr/bin/env node
import {
  loadSkills,
  parseArgs,
  projectSkillRoot,
  readJson,
  relative,
  tokenize,
} from './agent-skill-utils.mjs'

const defaultCases = [
  {
    name: 'bulk persona paste',
    prompt: 'Can I paste a huge third-party ChatGPT persona dump here?',
    expect: ['omninet', 'persona-dump'],
    evidence: {
      omninet: ['persona-dump', 'huge persona paste'],
      'persona-dump': ['whole blob', 'third-party ChatGPT persona output'],
    },
  },
  {
    name: 'durable operating guidance',
    prompt: 'Codex should always notice our developer behavior and make itself smarter.',
    expect: ['omninet', 'skill-garden'],
    evidence: {
      omninet: ['developer behavior', 'skill-garden'],
      'skill-garden': ['make Codex smarter', 'proactively'],
    },
  },
  {
    name: 'skill repair',
    prompt: 'This skill failed and needs to self-heal before future tasks.',
    expect: ['omninet', 'heal-skill', 'skill-garden'],
    evidence: {
      omninet: ['heal-skill', 'skill-garden'],
      'heal-skill': ['Self-repair a skill'],
      'skill-garden': ['Self-Healing Loop'],
    },
  },
  {
    name: 'review request',
    prompt: 'Review these uncommitted changes before we ship.',
    expect: ['omninet', 'review'],
    evidence: {
      omninet: ['Review code before shipping', 'review'],
      review: ['review', 'uncommitted'],
    },
  },
  {
    name: 'host process truth',
    prompt: 'Audit ports 3100, 3200, watchdogs, tunnels, and Windows scheduled tasks.',
    expect: ['omninet', 'host-integrity'],
    evidence: {
      omninet: ['Task Scheduler', 'ports', 'host-integrity'],
      'host-integrity': ['ports 3100/3200/3300', 'watchdogs'],
    },
  },
]

function loadCases(file) {
  if (!file) return defaultCases
  const data = readJson(file, null)
  if (!Array.isArray(data)) {
    throw new Error(`Trigger test file must be a JSON array: ${file}`)
  }
  return data
}

function scoreEvidence(skill, prompt, terms = []) {
  const text = `${skill.description}\n${skill.body}`.toLowerCase()
  const promptTokens = tokenize(prompt)
  const descriptionTokens = tokenize(skill.description || '')
  let tokenHits = 0
  for (const token of promptTokens) {
    if (descriptionTokens.has(token)) tokenHits += 1
  }
  const termHits = terms.filter((term) => text.includes(String(term).toLowerCase())).length
  return { tokenHits, termHits }
}

const args = parseArgs()
const cases = loadCases(args.file)
const skills = new Map(loadSkills(projectSkillRoot).map((skill) => [skill.name, skill]))
let failures = 0

for (const testCase of cases) {
  console.log(`CASE ${testCase.name}`)
  for (const expected of testCase.expect || []) {
    const skill = skills.get(expected)
    if (!skill) {
      failures += 1
      console.log(`  FAIL missing expected skill ${expected}`)
      continue
    }
    const evidenceTerms = testCase.evidence?.[expected] || []
    const score = scoreEvidence(skill, testCase.prompt, evidenceTerms)
    if (score.termHits < Math.min(1, evidenceTerms.length)) {
      failures += 1
      console.log(`  FAIL ${expected} lacks required evidence terms in ${relative(skill.file)}`)
      continue
    }
    console.log(
      `  OK ${expected} token_hits=${score.tokenHits} evidence_hits=${score.termHits}`,
    )
  }
}

console.log(`\nTrigger tests: ${cases.length} case(s), ${failures} failure(s)`)
process.exit(failures ? 1 : 0)

