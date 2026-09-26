#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SATURATION_FILE = join(ROOT, 'system', 'persona-batch-synthesis', 'saturation.json')
const COMPLETED_DIR = join(ROOT, 'Chef Flow Personas', 'Completed')
const STRESS_DIR = join(ROOT, 'docs', 'stress-tests')
const GATE_DIR = join(ROOT, 'system', 'persona-gates')
const LEDGER_FILE = join(GATE_DIR, 'coverage-ledger.jsonl')
const CODEX_QUEUE_DIR = join(ROOT, 'system', 'codex-queue')
const TYPES = ['Chef', 'Client', 'Guest', 'Vendor', 'Staff', 'Partner', 'Public']

const CATEGORY_RULES = {
  'event-lifecycle': /event|booking|service|timeline|run-of-show/,
  'access-control': /auth|permission|role|access|tenant|invite/,
  'ticketing-drops': /ticket|waitlist|drop|admission/,
  'audience-community': /community|guest|audience|circle|social/,
  'location-venue': /venue|location|travel|map|site/,
  'payment-financial': /payment|invoice|quote|ledger|finance|billing|deposit/,
  'compliance-legal': /compliance|contract|legal|license|insurance|audit/,
  'dosing-cannabis': /cannabis|dose|thc|cbd|infusion/,
  'dietary-medical': /dietary|allergen|allergy|medical|restriction/,
  'recipe-menu': /recipe|menu|dish|ingredient|culinary|prep/,
  'scheduling-calendar': /schedule|calendar|availability|booking|time/,
  'communication': /message|email|sms|notification|communication|inbox/,
  'staffing-team': /staff|team|employee|contractor|brigade|shift/,
  'sourcing-supply': /vendor|supplier|procurement|ingredient|inventory|market/,
  'costing-margin': /cost|margin|price|pricing|profit|waste/,
  'reporting-analytics': /report|analytics|metric|dashboard|telemetry|insight/,
  'onboarding-ux': /onboarding|navigation|nav|ux|ui|component|page|mobile/,
  'scaling-multi': /multi|organization|workspace|location|franchise|scale/,
  'delivery-logistics': /delivery|route|transport|packaging|logistics/,
  'documentation-records': /document|record|archive|history|receipt|proof/,
}

function parseArgs(argv) {
  const opts = { planOnly: false, json: false, maxPersonas: 3, threshold: 5, minScore: Number(process.env.PERSONA_GATE_MIN_SCORE || 60), model: process.env.PERSONA_MODEL || 'qwen3.5:4b', changedFiles: [] }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--plan-only' || argv[i] === '--plan') opts.planOnly = true
    else if (argv[i] === '--json') opts.json = true
    else if (argv[i] === '--max-personas') opts.maxPersonas = Math.max(1, Number(argv[++i]) || 3)
    else if (argv[i] === '--threshold') opts.threshold = Math.max(0, Number(argv[++i]) || 5)
    else if (argv[i] === '--min-score') opts.minScore = Math.max(1, Number(argv[++i]) || 60)
    else if (argv[i] === '--model') opts.model = argv[++i] || opts.model
    else if (argv[i] === '--changed-file') opts.changedFiles.push(argv[++i])
  }
  return opts
}
function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function getChangedFiles(explicit) {
  if (explicit.length) return [...new Set(explicit.map(String))]
  const current = [
    ...git(['diff', '--name-only', 'HEAD']).split(/\r?\n/),
    ...git(['diff', '--cached', '--name-only']).split(/\r?\n/),
  ].filter(Boolean)
  if (current.length) return [...new Set(current)]
  try {
    return git(['diff', '--name-only', 'HEAD^', 'HEAD']).split(/\r?\n/).filter(Boolean)
  } catch {
    return []
  }
}

function isSubstantive(file) {
  const p = file.replace(/\\/g, '/')
  if (/^(docs|tests|system|devtools)\//.test(p)) return false
  return /^(app|components|lib|database)\//.test(p)
}

function inferCategories(files) {
  const found = new Set()
  for (const file of files.filter(isSubstantive)) {
    const haystack = file.replace(/\\/g, '/').toLowerCase()
    for (const [category, pattern] of Object.entries(CATEGORY_RULES)) {
      pattern.lastIndex = 0
      if (pattern.test(haystack)) found.add(category)
    }
  }
  return [...found]
}

const CATEGORY_ROLES = {
  'dietary-medical': ['Chef', 'Client', 'Guest', 'Staff'],
  communication: ['Chef', 'Client', 'Guest', 'Staff', 'Vendor', 'Partner'],
  'payment-financial': ['Chef', 'Client', 'Vendor', 'Partner'],
  'staffing-team': ['Chef', 'Staff'],
  'sourcing-supply': ['Chef', 'Vendor', 'Staff'],
  'access-control': ['Chef', 'Client', 'Guest', 'Staff', 'Partner'],
}

export function classifyChangedFiles(files) {
  const relevantFiles = files.filter(isSubstantive)
  const categories = inferCategories(relevantFiles)
  if (relevantFiles.length && categories.length === 0) categories.push('general-workflow')
  const roles = new Set(categories.length ? [] : ['Chef', 'Client'])
  for (const category of categories) {
    for (const role of CATEGORY_ROLES[category] || ['Chef', 'Client']) roles.add(role)
  }
  return { relevantFiles, categories, roles: [...roles] }
}
function slugify(value) {
  return String(value || '').replace(/\.[^.]+$/, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function discoverSources() {
  const map = new Map()
  for (const type of TYPES) {
    const dir = join(COMPLETED_DIR, type)
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir)) {
      const ext = extname(file).toLowerCase()
      if (ext !== '.md' && ext !== '.txt') continue
      const slug = slugify(file)
      map.set(slug, { slug, type, path: join(dir, file) })
    }
  }
  return map
}

function buildFallbackSaturation() {
  const categorySets = Object.fromEntries(Object.keys(CATEGORY_RULES).map(category => [category, new Set()]))
  if (existsSync(STRESS_DIR)) {
    for (const file of readdirSync(STRESS_DIR)) {
      const match = /^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/i.exec(file)
      if (!match) continue
      const slug = match[1]
      const text = readFileSync(join(STRESS_DIR, file), 'utf8').toLowerCase()
      for (const [category, pattern] of Object.entries(CATEGORY_RULES)) {
        pattern.lastIndex = 0
        if (pattern.test(text)) categorySets[category].add(slug)
      }
    }
  }
  const categories = Object.fromEntries(
    Object.entries(categorySets).map(([category, slugs]) => [category, { personas: [...slugs], count: slugs.size }])
  )
  const priority_ranking = Object.entries(categories)
    .map(([category, data]) => ({ category, count: data.count, priority_score: data.count }))
    .sort((a, b) => b.count - a.count)
  return { generated_at: null, source: 'stress-report-fallback', categories, priority_ranking }
}

function loadSaturation() {
  if (existsSync(SATURATION_FILE)) return JSON.parse(readFileSync(SATURATION_FILE, 'utf8'))
  return buildFallbackSaturation()
}

function candidateSlugs(saturation, categories) {
  const score = new Map()
  const targeted = categories.filter(category => category !== 'general-workflow')
  const cats = targeted.length ? targeted : (saturation.priority_ranking || []).slice(0, 4).map(x => x.category)
  for (const category of cats) {
    for (const slug of saturation.categories?.[category]?.personas || []) {
      score.set(slug, (score.get(slug) || 0) + 1)
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug)
}
export function selectReports(reports, categories, roles, limit = 3) {
  const wantedCategories = new Set(categories)
  const wantedRoles = new Set(roles)
  const pool = reports.filter(report =>
    (!wantedRoles.size || wantedRoles.has(report.type)) &&
    (!wantedCategories.size || report.categories?.some(category => wantedCategories.has(category)))
  )
  const selected = []
  const coveredCategories = new Set()
  const coveredRoles = new Set()
  while (selected.length < limit && pool.length) {
    pool.sort((a, b) => {
      const gain = item => (item.categories || []).filter(c => wantedCategories.has(c) && !coveredCategories.has(c)).length * 10
        + (wantedRoles.has(item.type) && !coveredRoles.has(item.type) ? 5 : 0)
        + (100 - Number(item.score || 0)) / 100
      return gain(b) - gain(a)
    })
    const next = pool.shift()
    selected.push(next)
    coveredRoles.add(next.type)
    for (const category of next.categories || []) coveredCategories.add(category)
  }
  return selected
}

export function buildInteractionSet(selected) {
  const interactions = []
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      interactions.push({ status: 'selected-pair', personas: [selected[i].slug, selected[j].slug], roles: [selected[i].type, selected[j].type] })
    }
  }
  if (selected.length >= 3) interactions.push({
    status: 'selected-triad',
    personas: selected.slice(0, 3).map(item => item.slug),
    roles: selected.slice(0, 3).map(item => item.type),
  })
  return interactions
}

function selectPersonas(saturation, categories, roles, sources, limit) {
  const ranked = candidateSlugs(saturation, categories).map(slug => sources.get(slug)).filter(Boolean)
  const allCandidates = ranked.length ? ranked : [...sources.values()]
  const roleCandidates = roles?.length ? allCandidates.filter(item => roles.includes(item.type)) : allCandidates
  const candidates = roleCandidates.length ? roleCandidates : allCandidates
  const selected = []
  const usedTypes = new Set()
  for (const item of candidates) {
    if (selected.length >= limit) break
    if (!usedTypes.has(item.type)) {
      selected.push(item)
      usedTypes.add(item.type)
    }
  }
  for (const item of candidates) {
    if (selected.length >= limit) break
    if (!selected.some(x => x.slug === item.slug)) selected.push(item)
  }
  return selected
}

function latestScore(slug) {
  if (!existsSync(STRESS_DIR)) return null
  const prefix = `persona-${slug}-`
  const files = readdirSync(STRESS_DIR).filter(f => f.startsWith(prefix) && f.endsWith('.md')).sort().reverse()
  if (!files.length) return null
  const text = readFileSync(join(STRESS_DIR, files[0]), 'utf8')
  const m = text.match(/##\s*Score:\s*(\d+)\/100/i)
  return m ? Number(m[1]) : null
}

function parseReport(path) {
  const text = readFileSync(path, 'utf8')
  const score = Number(text.match(/##\s*Score:\s*(\d+)\/100/i)?.[1] || 0)
  const partial = /\*\*Partial:\*\*\s*true/i.test(text) || /Analyzer incomplete/i.test(text)
  return { score, partial }
}
function getPatchContext(files) {
  if (!files.length) return '[no patch content available]'
  try {
    let patch = git(['diff', '--unified=1', 'HEAD', '--', ...files])
    if (!patch) patch = git(['diff', '--unified=1', 'HEAD^', 'HEAD', '--', ...files])
    return patch.slice(0, 4500) || `Changed files: ${files.join(', ')}`
  } catch {
    return `Changed files: ${files.join(', ')}`
  }
}

async function runAnalyzer(source, model, context = {}) {
  const persona = String(source.content || readFileSync(source.path, 'utf8')).slice(0, 4500)
  const prompt = [
    'You are the ChefFlow persona completion gate.',
    'Evaluate ONLY the current product change against this persona. Do not complain about unrelated missing features.',
    'A blocking gap means this patch introduces, worsens, or directly exposes a failure that should stop completion.',
    'Every blocking gap MUST be causally tied to behavior visible in the supplied patch. Existing unrelated ChefFlow gaps are never blocking here.',
    'Score means confidence (0-100) that THIS PATCH is safe for this persona, not overall ChefFlow completeness.',
    'If there are no blocking gaps and the patch is safe, set pass=true and score at least 60. If evidence is insufficient to judge safety, set pass=false and score below 60.',
    'Non-blocking concerns belong in risks and do not by themselves require pass=false.',
    'Return only the requested JSON. blocking_gaps and risks must be arrays of short strings; reason must be one short sentence.',
    `Persona role: ${source.type}`,
    `Target categories: ${(context.categories || []).join(', ') || 'general workflow'}`,
    `Changed files: ${(context.changedFiles || []).join(', ')}`,
    'Patch:',
    String(context.patch || '').slice(0, 4500),
    'Persona:',
    persona,
  ].join('\n\n')
  let lastError = null
  for (const numPredict of [320, 520]) {
    try {
      const attemptPrompt = numPredict === 320
        ? prompt
        : `${prompt}\n\nRETRY: Keep every gap/risk under 12 words and reason under 20 words. Return complete JSON only.`
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model, prompt: attemptPrompt, stream: false, think: false, keep_alive: '10m',
          format: {
            type: 'object',
            properties: {
              pass: { type: 'boolean' },
              score: { type: 'integer' },
              blocking_gaps: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 220 } },
              risks: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 220 } },
              reason: { type: 'string', maxLength: 280 },
            },
            required: ['pass', 'score', 'blocking_gaps', 'risks', 'reason'],
          },
          options: { temperature: 0, num_predict: numPredict },
        }),
        signal: AbortSignal.timeout(90000),
      })
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`)
      const body = await response.json()
      const verdict = JSON.parse(body.response || '{}')
      const gaps = Array.isArray(verdict.blocking_gaps) ? verdict.blocking_gaps : []
      const score = Number(verdict.score) || 0
      return {
        slug: source.slug, type: source.type,
        ok: verdict.pass === true && gaps.length === 0 && score >= (context.minScore || 60),
        score,
        blocking_gaps: gaps,
        risks: Array.isArray(verdict.risks) ? verdict.risks : [],
        reason: String(verdict.reason || '').slice(0, 1000),
      }
    } catch (error) {
      lastError = error
    }
  }
  return {
    slug: source.slug, type: source.type, ok: false, score: 0,
    blocking_gaps: [], risks: [], error: lastError?.message || 'persona evaluator failed',
  }
}

function chooseInteraction(selected, sources, saturation, categories) {
  const chef = selected.find(x => x.type === 'Chef')
  const other = selected.find(x => x.type !== 'Chef')
  if (chef && other) return [chef, other]
  const candidates = candidateSlugs(saturation, categories).map(slug => sources.get(slug)).filter(Boolean)
  for (const a of candidates) for (const b of candidates) {
    if (a.type !== b.type) return [a, b]
  }
  return []
}
async function runInteraction(pair, model, context) {
  if (pair.length !== 2) return null
  const [a, b] = pair
  const compositeSlug = `interaction-${a.slug}--${b.slug}`
  const content = [
    `Cross-role ChefFlow handoff stress scenario between a ${a.type} and a ${b.type}.`,
    'Focus on shared state, permissions, communication, handoffs, stale data, safety, and responsibility boundaries.',
    `## ${a.type}: ${a.slug}`,
    readFileSync(a.path, 'utf8').slice(0, 2200),
    `## ${b.type}: ${b.slug}`,
    readFileSync(b.path, 'utf8').slice(0, 2200),
  ].join('\n\n')
  return runAnalyzer({ slug: compositeSlug, type: `${a.type}+${b.type}`, content }, model, context)
}

function queueBlockingGaps(payload) {
  mkdirSync(CODEX_QUEUE_DIR, { recursive: true })
  const queued = []
  for (const result of payload.results || []) {
    for (const gap of result.blocking_gaps || []) {
      const fingerprint = createHash('sha256')
        .update(JSON.stringify({ gap, persona: result.slug, categories: payload.categories, files: payload.substantive_files }))
        .digest('hex')
        .slice(0, 12)
      const file = `persona-gate-${fingerprint}.md`
      const path = join(CODEX_QUEUE_DIR, file)
      const relativePath = relative(ROOT, path).replace(/\\/g, '/')
      const existed = existsSync(path)
      if (!existed) {
        const changed = (payload.substantive_files || []).map(filePath => `- ${filePath}`).join('\n') || '- none'
        const categories = (payload.categories || []).join(', ') || 'general-workflow'
        const spec = `---
status: "pending"
priority: "high"
category: "${categories}"
source: "persona-gate:${result.slug}"
confidence: "high"
generated: "${payload.generated_at}"
---
# Close persona gate: ${gap}

## Blocking Gap
${gap}

## Persona Evidence
- persona: ${result.slug}
- role: ${result.type}
- gate score: ${result.score}
- categories: ${categories}

## Changed Files
${changed}

## Required Closure
Implement the smallest product change that directly closes this blocking gap. Preserve unrelated behavior and existing work.

## Acceptance Criteria
1. The blocking gap has direct code-level evidence of closure.
2. Relevant automated tests pass.
3. \`npm run personas:gate\` passes the affected persona and cross-role interaction.
4. Production/real-device proof is required for user-facing UI changes.
`
        writeFileSync(path, spec, 'utf8')
      }
      queued.push({ path: relativePath, status: existed ? 'existing' : 'queued', persona: result.slug, gap })
    }
  }
  return queued
}

function writeReceipt(payload) {
  mkdirSync(GATE_DIR, { recursive: true })
  const stamp = payload.generated_at.replace(/[:.]/g, '-')
  const receipt = join(GATE_DIR, `gate-${stamp}.json`)
  writeFileSync(receipt, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  writeFileSync(join(GATE_DIR, 'latest.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8')
  appendFileSync(LEDGER_FILE, JSON.stringify(payload) + '\n', 'utf8')
  return relative(ROOT, receipt).replace(/\\/g, '/')
}
async function main() {
  const opts = parseArgs(process.argv)
  const saturation = loadSaturation()
  const sources = discoverSources()
  const changedFiles = getChangedFiles(opts.changedFiles)
  const classification = classifyChangedFiles(changedFiles)
  const substantiveFiles = classification.relevantFiles
  const categories = classification.categories
  const selected = selectPersonas(saturation, categories, classification.roles, sources, opts.maxPersonas)
  const interaction = chooseInteraction(selected, sources, saturation, categories)
  const plan = {
    changed_files: changedFiles,
    substantive_files: substantiveFiles,
    categories,
    roles: classification.roles,
    selected: selected.map(({ slug, type }) => ({ slug, type })),
    interactions: buildInteractionSet(selected),
    executed_interaction: interaction.map(({ slug, type }) => ({ slug, type })),
  }

  if (opts.planOnly || substantiveFiles.length === 0) {
    if (opts.json) process.stdout.write(JSON.stringify(plan, null, 2) + '\n')
    else console.log('[persona-gate] plan', plan)
    return
  }

  if (selected.length === 0) throw new Error('No matching persona sources were available for this change.')
  const context = { categories, changedFiles: substantiveFiles, patch: getPatchContext(substantiveFiles), minScore: opts.minScore }
  const results = []
  for (const source of selected) results.push(await runAnalyzer(source, opts.model, context))
  const interactionResult = await runInteraction(interaction, opts.model, context)
  if (interactionResult) results.push(interactionResult)
  const failed = results.filter(result => !result.ok)
  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    commit: git(['rev-parse', '--short', 'HEAD']),
    model: opts.model,
    threshold: opts.threshold,
    min_score: opts.minScore,
    ...plan,
    results,
    status: failed.length ? 'FAIL' : 'PASS',
  }
  payload.queued_specs = failed.length ? queueBlockingGaps(payload) : []
  const receipt = writeReceipt(payload)
  if (opts.json) process.stdout.write(JSON.stringify({ ...payload, receipt }, null, 2) + '\n')
  else {
    console.log(`[persona-gate] ${payload.status}: ${results.length} scenario(s), categories=${categories.join(', ') || 'fallback'}`)
    for (const r of results) console.log(`[persona-gate] ${r.ok ? 'PASS' : 'FAIL'} ${r.type} ${r.slug}: score=${r.score ?? '--'} gaps=${r.blocking_gaps?.length || 0}`)
    if (payload.queued_specs.length) console.log(`[persona-gate] queued build specs: ${payload.queued_specs.length}`)
    console.log(`[persona-gate] receipt: ${receipt}`)
  }
  if (failed.length) process.exitCode = 1
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((error) => {
    console.error(`[persona-gate] ERROR: ${error.stack || error.message}`)
    process.exitCode = 1
  })
}
