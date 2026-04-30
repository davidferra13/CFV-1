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
const prompt = String(args.prompt || args.p || args._.join(' ')).trim()

if (!prompt) {
  console.error('Missing prompt. Pass --prompt "..."')
  process.exit(1)
}

const lowerPrompt = prompt.toLowerCase()
const audiencePanel = readJson('system/research/audience-panel.json', { lenses: [] })
const sourceIndex = readJson('system/research/evidence-source-index.json', { sources: [] })

function includesAny(terms) {
  return terms.some((term) => lowerPrompt.includes(term))
}

function includesPhrase(term) {
  const escaped = String(term).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(lowerPrompt)
}

function selectQuestionType() {
  if (includesAny(['market', 'buyer', 'customer', 'demand', 'want', 'need', 'vendor', 'chef', 'client', 'guest', 'staff'])) {
    return 'market'
  }
  if (includesAny(['validate', 'validation', 'launch', 'survey', 'evidence', 'ready'])) {
    return 'validation'
  }
  if (includesAny(['build', 'feature', 'improve', 'refine', 'adjust', 'prioritize', 'next'])) {
    return 'product'
  }
  if (includesAny(['code', 'architecture', 'route', 'component', 'server action', 'database'])) {
    return 'codebase'
  }
  if (includesAny(['codex', 'skill', 'agent', 'route', 'question'])) {
    return 'agent-behavior'
  }
  if (includesAny(['research', 'investigate', 'report'])) {
    return 'research'
  }
  return 'strategy'
}

function selectAudiences() {
  const selected = []
  for (const lens of audiencePanel.lenses || []) {
    const haystack = [
      lens.id,
      lens.label,
      ...(lens.use_for || []),
      ...(lens.examples || []),
    ]
      .join(' ')
      .toLowerCase()
    if (haystack.split(/\s+/).some((term) => term.length > 3 && includesPhrase(term))) {
      selected.push(lens.id)
    }
  }
  if (!selected.length && includesAny(['market', 'customer', 'user', 'buyer'])) {
    return ['chef', 'client', 'public']
  }
  if (!selected.length && includesAny(['codex', 'agent', 'skill', 'developer'])) {
    return ['developer-operator']
  }
  return [...new Set(selected)]
}

function selectSkills(type, audiences) {
  if (type === 'market') {
    return {
      primary: 'question-optimizer',
      sidecars: ['market-research-router', 'evidence-broker', 'validation-gate', 'answer-provenance'],
    }
  }
  if (type === 'validation') {
    return {
      primary: 'validation-gate',
      sidecars: ['evidence-broker', 'answer-provenance', 'evidence-integrity'],
    }
  }
  if (type === 'product') {
    return {
      primary: 'question-optimizer',
      sidecars: ['validation-gate', 'context-continuity', 'findings-triage', 'evidence-broker'],
    }
  }
  if (type === 'codebase') {
    return {
      primary: 'research',
      sidecars: ['context-continuity', 'evidence-broker', 'answer-provenance'],
    }
  }
  if (type === 'agent-behavior') {
    return {
      primary: 'skill-garden',
      sidecars: ['question-optimizer', 'research-brief-generator', 'answer-provenance'],
    }
  }
  return {
    primary: 'question-optimizer',
    sidecars: ['evidence-broker', audiences.length ? 'market-research-router' : 'first-principles', 'answer-provenance'],
  }
}

function evidenceThreshold(type) {
  if (type === 'market') return 'real-user preferred; persona and public research allowed only as labeled hypotheses'
  if (type === 'validation') return 'real-user, launched-survey, or dogfood evidence required unless developer overrides'
  if (type === 'codebase') return 'codebase verified with file references'
  if (type === 'agent-behavior') return 'durable developer intent plus existing skill and devtool evidence'
  return 'evidence-broker classification required before strong claims'
}

function requiredSources(type, audiences) {
  const sources = ['AGENTS.md rules from current session', 'relevant .claude/skills/*/SKILL.md']
  if (type === 'market' || audiences.length) {
    sources.push('system/research/audience-panel.json')
    sources.push('docs/stress-tests/REGISTRY.md when persona evidence is needed')
    sources.push('system/persona-batch-synthesis/ when persona synthesis is needed')
  }
  if (type === 'validation') {
    sources.push('docs/product-blueprint.md')
    sources.push('docs/autodocket.md')
    sources.push('recent session notes')
  }
  if (type === 'codebase') {
    sources.push('app, components, lib, tests, project-map, and docs relevant to the route')
  }
  const sourceCategories = new Set()
  if (type === 'market') {
    sourceCategories.add('real-user')
    sourceCategories.add('persona-simulation')
    sourceCategories.add('public-market')
  }
  if (type === 'validation') {
    sourceCategories.add('real-user')
    sourceCategories.add('launched-survey')
    sourceCategories.add('dogfood')
  }
  if (type === 'codebase') sourceCategories.add('codebase')
  if (type === 'agent-behavior') {
    sourceCategories.add('developer-intent')
    sourceCategories.add('agent-behavior')
  }
  for (const source of sourceIndex.sources || []) {
    if (sourceCategories.has(source.category)) {
      sources.push(`${source.label}: ${(source.paths || []).join(', ')}`)
    }
  }
  return sources
}

function outputFormat(type) {
  if (type === 'market') return 'market research route plus evidence map and provenance'
  if (type === 'validation') return 'validation gate decision'
  if (type === 'product') return 'decision memo with build, validate first, block, or plan recommendation'
  if (type === 'codebase') return 'research findings with file references'
  if (type === 'agent-behavior') return 'skill or devtool change plan with validation checks'
  return 'structured answer with provenance'
}

const type = selectQuestionType()
const audiences = selectAudiences()
const skills = selectSkills(type, audiences)
const optimizedQuestion = `Evaluate "${prompt}" as a ${type} question for ChefFlow, using the selected evidence threshold and audience lenses before making any recommendation.`

const brief = {
  original_question: prompt,
  optimized_question: optimizedQuestion,
  question_type: type,
  primary_skill: skills.primary,
  sidecar_skills: [...new Set(skills.sidecars)],
  audience_lenses: audiences,
  evidence_threshold: evidenceThreshold(type),
  required_sources: requiredSources(type, audiences),
  stop_conditions: [
    'Stop if required evidence is missing and the answer would otherwise sound validated.',
    'Stop before creating product surface from persona evidence alone unless developer explicitly overrides.',
    'Stop before touching schema, auth, tenant scoping, billing, ledger, or production operations without required approval.',
  ],
  output_format: outputFormat(type),
  provenance_labels: [
    'CODEBASE VERIFIED',
    'REAL USER EVIDENCE',
    'PERSONA SIMULATION',
    'PUBLIC MARKET RESEARCH',
    'DEVELOPER INTENT',
    'INFERENCE',
    'UNKNOWN',
  ],
  claim_limit:
    type === 'market'
      ? 'Do not claim real market validation unless real user evidence is present.'
      : 'Use evidence-broker labels for any claim that is not directly verified.',
}

if (args.write || args.persist || args.report) {
  const outFile = path.join(
    reportsRoot,
    'research-briefs',
    `${nowStamp()}-${slugify(prompt)}.json`,
  )
  writeJson(outFile, brief)
  brief.report_path = outFile.replace(/\\/g, '/')
}

console.log(JSON.stringify(brief, null, 2))
