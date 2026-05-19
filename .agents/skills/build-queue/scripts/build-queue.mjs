#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { basename, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import {
  appendMobileQueueCriteria,
  isUiQueueItem,
} from '../../../../scripts/lib/mobile-pass-core.mjs'

const ROOT = process.cwd()
const QUEUE_ROOT = join(ROOT, '.agents', 'build-queue')
const STATUS_DIRS = ['active', 'in-flight', 'blocked', 'done']
const RUNS_DIR = join(QUEUE_ROOT, 'runs')
const PROOF_DIR = join(QUEUE_ROOT, 'proof-packs')
const EVENT_LOG = join(QUEUE_ROOT, 'events.jsonl')
const LOCK_DIR = join(QUEUE_ROOT, '.lifecycle.lock')
const TAXONOMY_PATH = join(QUEUE_ROOT, 'codebase-category-taxonomy-a-z.md')
const LOCK_STALE_MS = 5 * 60 * 1000
const LOCK_WAIT_MS = 30 * 1000
const execFileAsync = promisify(execFile)
const AMBIGUOUS_CATEGORY = 'Ambiguous Intake / Needs Classification'
const AMBIGUOUS_HOME = 'Queue Governance / Run Control'

function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z')
}

function slugify(value) {
  return String(value || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

async function ensureQueue() {
  await mkdir(QUEUE_ROOT, { recursive: true })
  await mkdir(RUNS_DIR, { recursive: true })
  await mkdir(PROOF_DIR, { recursive: true })
  for (const dir of STATUS_DIRS) {
    await mkdir(join(QUEUE_ROOT, dir), { recursive: true })
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function withLifecycleLock(command, fn) {
  const token = `${process.pid}-${randomUUID()}`
  const started = Date.now()
  while (true) {
    try {
      await mkdir(LOCK_DIR)
      await writeFile(
        join(LOCK_DIR, 'owner.json'),
        JSON.stringify(
          {
            command,
            pid: process.pid,
            token,
            createdAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf8'
      )
      break
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      let lockStat = null
      try {
        lockStat = await stat(LOCK_DIR)
      } catch {
        continue
      }
      if (Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
        await rm(LOCK_DIR, { recursive: true, force: true })
        continue
      }
      if (Date.now() - started > LOCK_WAIT_MS) {
        throw new Error(`Lifecycle lock is busy after ${LOCK_WAIT_MS / 1000}s: ${LOCK_DIR}`)
      }
      await sleep(250)
    }
  }

  try {
    return await fn()
  } finally {
    let owner = null
    try {
      owner = JSON.parse(await readFile(join(LOCK_DIR, 'owner.json'), 'utf8'))
    } catch {
      owner = null
    }
    if (!owner || owner.token === token) {
      await rm(LOCK_DIR, { recursive: true, force: true })
    }
  }
}

async function appendEvent(event) {
  await appendFile(
    EVENT_LOG,
    `${JSON.stringify({
      at: new Date().toISOString(),
      ...event,
    })}\n`,
    'utf8'
  )
}

function contentHash(value) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[`*_()[\]{}]/g, ' ')
    .replace(/[^a-z0-9/+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function aliasMatches(haystack, alias) {
  const normalizedAlias = normalizeText(alias)
  if (!normalizedAlias) return false
  if (normalizedAlias.length <= 3) {
    return new RegExp(`(^|\\s)${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(haystack)
  }
  return haystack.includes(normalizedAlias)
}

function parseTaxonomy(text) {
  const categories = []
  const blocks = text.split(/\n(?=### )/g)
  for (const block of blocks) {
    const heading = block.match(/^### (.+)$/m)?.[1]?.trim()
    if (!heading) continue
    const home = block.match(/^- Home:\s*(.+)$/m)?.[1]?.trim() || AMBIGUOUS_HOME
    const aliasesLine = block.match(/^- Aliases:\s*(.+)$/m)?.[1]?.trim() || ''
    const aliases = aliasesLine
      .split(',')
      .map((value) => value.replace(/`/g, '').trim())
      .filter(Boolean)
    categories.push({ category: heading, home, aliases })
  }
  categories.push({
    category: AMBIGUOUS_CATEGORY,
    home: AMBIGUOUS_HOME,
    aliases: ['ambiguous', 'needs classification', 'uncategorized'],
  })
  return categories
}

async function loadTaxonomy() {
  if (!existsSync(TAXONOMY_PATH)) {
    return [
      {
        category: AMBIGUOUS_CATEGORY,
        home: AMBIGUOUS_HOME,
        aliases: ['ambiguous', 'needs classification', 'uncategorized'],
      },
    ]
  }
  return parseTaxonomy(await readFile(TAXONOMY_PATH, 'utf8'))
}

function findCategory(taxonomy, value) {
  const normalized = normalizeText(value)
  return taxonomy.find((entry) => normalizeText(entry.category) === normalized)
}

async function classifyQueueItem(args) {
  const taxonomy = await loadTaxonomy()
  const explicitCategory = args.category
  const explicitHome = args.home
  if (explicitCategory) {
    const match = findCategory(taxonomy, explicitCategory)
    if (!match) {
      const examples = taxonomy.slice(0, 12).map((entry) => entry.category).join('; ')
      throw new Error(
        `Unknown queue category: ${explicitCategory}. Use a category from ${TAXONOMY_PATH}. Examples: ${examples}`
      )
    }
    return {
      category: match.category,
      home: explicitHome || match.home,
      secondaryCategories: [],
      confidence: explicitHome ? 'explicit' : 'explicit-category',
      reason: explicitHome
        ? 'Explicit category and home provided at intake.'
        : `Explicit category provided at intake; home derived from taxonomy: ${match.home}.`,
      readiness: 4,
    }
  }

  const haystack = normalizeText([args.title, args.raw, args.goal, args.scope, args.acceptance, args.domain].filter(Boolean).join(' '))
  const scored = taxonomy
    .filter((entry) => entry.category !== AMBIGUOUS_CATEGORY)
    .map((entry) => {
      let score = aliasMatches(haystack, entry.category) ? 3 : 0
      const matchedAliases = []
      for (const alias of entry.aliases) {
        if (!aliasMatches(haystack, alias)) continue
        matchedAliases.push(alias)
        score += normalizeText(alias).length > 10 ? 3 : 2
      }
      return { ...entry, score, matchedAliases }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.matchedAliases.length - a.matchedAliases.length)

  if (scored.length === 0) {
    return {
      category: AMBIGUOUS_CATEGORY,
      home: explicitHome || AMBIGUOUS_HOME,
      secondaryCategories: [],
      confidence: 'needs-review',
      reason: 'No taxonomy alias matched the intake text; requires explicit category/home before firing.',
      readiness: 2,
    }
  }

  const best = scored[0]
  const tied = scored.filter((entry) => entry.score === best.score)
  if (tied.length > 1) {
    return {
      category: AMBIGUOUS_CATEGORY,
      home: explicitHome || AMBIGUOUS_HOME,
      secondaryCategories: tied.map((entry) => entry.category),
      confidence: 'needs-review',
      reason: `Multiple taxonomy categories tied: ${tied.map((entry) => entry.category).join('; ')}.`,
      readiness: 2,
    }
  }

  return {
    category: best.category,
    home: explicitHome || best.home,
    secondaryCategories: scored.slice(1, 4).map((entry) => entry.category),
    confidence: 'inferred',
    reason: `Matched taxonomy aliases: ${best.matchedAliases.join(', ') || best.category}.`,
    readiness: 4,
  }
}

async function listItems(status = 'active') {
  const statuses = status === 'all' ? STATUS_DIRS : [status]
  const items = []
  for (const currentStatus of statuses) {
    const dir = join(QUEUE_ROOT, currentStatus)
    if (!existsSync(dir)) continue
    const files = (await readdir(dir)).filter((file) => file.endsWith('.md')).sort()
    for (const file of files) {
      const fullPath = join(dir, file)
      const text = await readFile(fullPath, 'utf8')
      items.push({
        id: basename(file, '.md'),
        status: currentStatus,
        file,
        path: fullPath,
        text,
        title: readField(text, 'Title') || basename(file, '.md'),
        domain: readField(text, 'Product Domain / Module') || 'Unassigned',
        category: readField(text, 'Category') || '',
        home: readField(text, 'Home') || '',
        priority: readField(text, 'Priority') || 'P2',
        readiness: Number(readField(text, 'Readiness Score') || 0),
        dependencies: readField(text, 'Dependencies') || '',
        related: readField(text, 'Related') || parseFrontmatter(text).related || '',
        runId: readField(text, 'Run ID') || '',
      })
    }
  }
  return items
}

function readField(text, label) {
  const frontmatter = parseFrontmatter(text)
  const frontmatterKey = {
    ID: 'id',
    Title: 'title',
    Status: 'status',
    Priority: 'priority',
    'Product Domain / Module': 'domain',
    Category: 'category',
    Home: 'home',
    'Secondary Categories': 'secondary_categories',
    'Classification Confidence': 'classification_confidence',
    'Classification Reason': 'classification_reason',
    'Readiness Score': 'readiness',
    Dependencies: 'depends_on',
    Related: 'related',
    'Run ID': 'run_id',
  }[label]
  if (frontmatterKey && frontmatter[frontmatterKey] !== undefined) {
    const value = frontmatter[frontmatterKey]
    return Array.isArray(value) ? value.join(', ') : String(value).trim()
  }
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.*)$`, 'm'))
  return match?.[1]?.trim() || ''
}

function readSection(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=\\n## |\\s*$)`, 'm'))
  return match?.[1]?.trim() || ''
}

function replaceField(text, label, value) {
  const frontmatterKey = {
    ID: 'id',
    Title: 'title',
    Status: 'status',
    Priority: 'priority',
    'Product Domain / Module': 'domain',
    Category: 'category',
    Home: 'home',
    'Secondary Categories': 'secondary_categories',
    'Classification Confidence': 'classification_confidence',
    'Classification Reason': 'classification_reason',
    'Readiness Score': 'readiness',
    Dependencies: 'depends_on',
    Related: 'related',
    'Run ID': 'run_id',
  }[label]
  if (frontmatterKey && text.startsWith('---\n')) {
    return replaceFrontmatterField(text, frontmatterKey, value)
  }
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const line = `- **${label}:** ${value}`
  const pattern = new RegExp(`^- \\*\\*${escaped}:\\*\\*.*$`, 'm')
  if (pattern.test(text)) return text.replace(pattern, line)
  return text.replace(/^## Queue Metadata\n/m, `## Queue Metadata\n\n${line}\n`)
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return {}
  const end = content.indexOf('\n---\n', 4)
  if (end === -1) return {}
  const raw = content.slice(4, end).split(/\r?\n/)
  const data = {}
  for (const line of raw) {
    const index = line.indexOf(':')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        value = JSON.parse(value)
      } catch {
        value = []
      }
    } else if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value)
      } catch {
        value = value.slice(1, -1)
      }
    }
    data[key] = value
  }
  return data
}

function yamlValue(value) {
  if (Array.isArray(value)) return JSON.stringify(value)
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/^[a-zA-Z0-9_.:/, -]+$/.test(text)) return text
  return JSON.stringify(text)
}

function replaceFrontmatterField(content, key, value) {
  const line = `${key}: ${yamlValue(value)}`
  const pattern = new RegExp(`^${key}:.*$`, 'm')
  if (pattern.test(content)) return content.replace(pattern, line)
  const end = content.indexOf('\n---\n', 4)
  if (end === -1) return content
  return `${content.slice(0, end)}\n${line}${content.slice(end)}`
}

function appendLog(text, entry) {
  const marker = '## Progress Log\n'
  if (!text.includes(marker)) {
    return `${text.trim()}\n\n${marker}\n- ${entry}\n`
  }
  return text.replace(marker, `${marker}\n- ${entry}`)
}

function renderItem({
  id,
  title,
  raw,
  goal,
  domain,
  priority,
  scope,
  acceptance,
  risks,
  dependencies,
  verification,
  classification,
  readiness,
}) {
  const created = new Date().toISOString()
  const resolvedDomain = domain || classification?.home || 'Platform / Build Queue'
  const resolvedReadiness = readiness || classification?.readiness || 4
  const deps = dependencies && dependencies !== 'None' ? String(dependencies).split(',').map((v) => v.trim()).filter(Boolean) : []
  const criteria = isUiQueueItem({ title, domain: resolvedDomain, scope, acceptance })
    ? appendMobileQueueCriteria({ acceptance, verification })
    : { acceptance, verification }
  return `---
id: ${id}
title: ${yamlValue(title)}
status: active
priority: ${priority || 'P1'}
created: ${created}
updated: ${created}
source: ${raw ? 'research' : 'user'}
domain: ${yamlValue(resolvedDomain)}
category: ${yamlValue(classification?.category || AMBIGUOUS_CATEGORY)}
home: ${yamlValue(classification?.home || resolvedDomain)}
secondary_categories: ${yamlValue(classification?.secondaryCategories || [])}
classification_confidence: ${yamlValue(classification?.confidence || 'needs-review')}
classification_reason: ${yamlValue(classification?.reason || 'No classification reason recorded.')}
readiness: ${resolvedReadiness}
depends_on: ${yamlValue(deps)}
unlocks: []
related: []
merged_into:
run_id: unassigned
---

# ${title}

## Raw Request / Research Source

${raw || 'Not provided.'}

## Goal

${goal || 'Not provided.'}

## Build Goal

${goal || 'Not provided.'}

## Product Domain / Module

- Owning domain/module: ${resolvedDomain}
- New domain/module needed: No by default; explain only if yes.
- Related domain language: body-system improvement, growth organ, queue governance.

## Queue Classification

- Category: ${classification?.category || AMBIGUOUS_CATEGORY}
- Home: ${classification?.home || resolvedDomain}
- Secondary categories: ${(classification?.secondaryCategories || []).join(', ') || 'None'}
- Classification confidence: ${classification?.confidence || 'needs-review'}
- Classification reason: ${classification?.reason || 'No classification reason recorded.'}
- Taxonomy source: .agents/build-queue/codebase-category-taxonomy-a-z.md

## Queue Reconciliation

- Reconciliation decision: new standalone.
- Related queue items: none recorded.
- Notes: Generated from current human-body build extraction.

## Scope

${scope || 'Not provided.'}

## Out Of Scope

- Unrelated app-code changes.
- Reverting existing dirty workspace changes.

## Acceptance Criteria

${bulletize(criteria.acceptance || 'Acceptance criteria must be filled before firing.')}

## Role / Privacy Matrix

- Can see: Developer/build agents.
- Can create: Developer/build agents.
- Can edit: Developer/build agents with explicit queue/growth work.
- Can delete/archive: Lead orchestrator after proof.
- Data owner: Repository build process.
- Must never leak: Tenant data, secrets, unrelated dirty workspace state.
- Server-side enforcement: Not applicable unless item touches app routes/actions/APIs.

## Implementation Prep

- Inspect current files before editing.
- Preserve unrelated dirty workspace changes.
- Use existing ChefFlow modules and route/security patterns.
- Assign non-overlapping file ownership if fired with agents.

## Implementation Readiness

- Score: ${resolvedReadiness}/5
- Missing: live code inspection at fire time.
- Ready to fire: ${resolvedReadiness >= 4 ? 'Yes, unless dependencies are listed.' : 'No; classify category/home explicitly before firing.'}

## Risks

${bulletize(risks || 'Risks must be reviewed before firing.')}

## Verification Steps

${bulletize(criteria.verification || 'Focused verification must be selected before marking done.')}

## Verification

${bulletize(criteria.verification || 'Focused verification must be selected before marking done.')}

## Proof Required Before Done

- Acceptance evidence.
- Wiring proof.
- Runtime proof when the item touches a route, API, server action, background job, or user-visible behavior.
- Verification output.
- Partial-work notes.
- \`finish-check\` passes for this item.

## Progress Log

- Created by build-queue at ${new Date().toISOString()}.

## Status Note - ${created}

Created as active.
`
}

function bulletize(value) {
  const lines = String(value)
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.map((line) => (line.startsWith('- ') ? line : `- ${line}`)).join('\n')
}

function idsFromArgs(args) {
  const raw = args.ids || args.id || args._
  if (Array.isArray(raw)) return raw.flatMap((value) => String(value).split(',')).filter(Boolean)
  return String(raw || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function tokenSet(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  return new Set(
    raw
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean)
  )
}

function extractLikelyPaths(text) {
  const matches = text.match(/(?:^|[\s`])(?:app|components|lib|scripts|tests|docs|\.agents)\/[A-Za-z0-9_./()[\]-]+/gm) || []
  return new Set(matches.map((match) => match.trim().replace(/^`|`$/g, '')))
}

function intersect(a, b) {
  return [...a].filter((value) => b.has(value))
}

async function warnActiveInFlightOverlaps(contextIds = []) {
  const activeItems = await listItems('active')
  const inFlightItems = await listItems('in-flight')
  if (activeItems.length === 0 || inFlightItems.length === 0) return

  const focused = contextIds.length > 0 ? new Set(contextIds) : null
  const warnings = []
  for (const active of activeItems) {
    const activeDeps = tokenSet(active.dependencies)
    const activeRelated = tokenSet(active.related)
    const activePaths = extractLikelyPaths(active.text)
    for (const inFlight of inFlightItems) {
      if (focused && !focused.has(inFlight.id)) continue
      const reasons = []
      if (
        active.domain &&
        inFlight.domain &&
        active.domain !== 'Unassigned' &&
        active.domain === inFlight.domain
      ) {
        reasons.push(`domain ${active.domain}`)
      }
      const dependencyOverlap = intersect(activeDeps, tokenSet(inFlight.dependencies))
      if (dependencyOverlap.length > 0) reasons.push(`dependencies ${dependencyOverlap.join(', ')}`)
      if (activeDeps.has(inFlight.id) || tokenSet(inFlight.dependencies).has(active.id)) {
        reasons.push('direct dependency ID')
      }
      const relatedOverlap = intersect(activeRelated, tokenSet(inFlight.related))
      if (relatedOverlap.length > 0) reasons.push(`related IDs ${relatedOverlap.join(', ')}`)
      if (activeRelated.has(inFlight.id) || tokenSet(inFlight.related).has(active.id)) {
        reasons.push('direct related ID')
      }
      const pathOverlap = intersect(activePaths, extractLikelyPaths(inFlight.text))
      if (pathOverlap.length > 0) reasons.push(`likely files ${pathOverlap.slice(0, 3).join(', ')}`)
      if (reasons.length > 0) {
        warnings.push(`${active.id} overlaps in-flight ${inFlight.id}: ${reasons.join('; ')}`)
      }
    }
  }

  for (const warning of warnings.slice(0, 20)) {
    console.warn(`WARNING active/in-flight overlap: ${warning}`)
  }
  if (warnings.length > 20) {
    console.warn(`WARNING active/in-flight overlap: ${warnings.length - 20} additional overlaps omitted`)
  }
}

async function findItemPath(id, statuses = STATUS_DIRS) {
  for (const status of statuses) {
    const path = join(QUEUE_ROOT, status, `${id}.md`)
    if (existsSync(path)) return { path, status }
  }
  return null
}

async function cmdAdd(args) {
  if (args.help || !args.title) {
    console.log(`Usage: build-queue.mjs add --title "Title" [--category "..."] [--home "..."] [--domain "..."] [--raw "..."] [--goal "..."] [--scope "..."] [--acceptance "..."] [--risks "..."] [--dependencies "..."] [--verification "..."] [--dry-run]`)
    return
  }
  const classification = await classifyQueueItem(args)
  const id = args.id || `BQ-${nowStamp()}-${slugify(args.title)}`
  const path = join(QUEUE_ROOT, 'active', `${id}.md`)
  if (existsSync(path)) throw new Error(`Queue item already exists: ${id}`)
  const text = renderItem({ ...args, id, classification })
  if (args['dry-run']) {
    console.log(text)
    return
  }
  await writeFile(path, text, 'utf8')
  await appendEvent({
    command: 'add',
    id,
    toStatus: 'active',
    domain: args.domain || classification.home || 'Platform / Build Queue',
    category: classification.category,
    home: classification.home,
    classificationConfidence: classification.confidence,
    path,
  })
  console.log(`Added ${id} [${classification.category} -> ${classification.home}] -> ${path}`)
}

async function cmdStatus() {
  const rows = []
  for (const status of STATUS_DIRS) {
    rows.push({ status, count: (await listItems(status)).length })
  }
  for (const row of rows) console.log(`${row.status}: ${row.count}`)
}

async function cmdIndex(args) {
  const items = await listItems(args.status || 'active')
  for (const item of items) {
    console.log(`${item.id}\t${item.status}\t${item.priority}\t${item.domain}\t${item.category || 'Unclassified'}\t${item.home || 'No home'}\t${item.title}`)
  }
}

async function cmdShow(args) {
  const id = args.id || args._[0]
  if (!id) throw new Error('show requires --id BQ-...')
  const found = await findItemPath(id)
  if (!found) throw new Error(`Queue item not found: ${id}`)
  console.log(await readFile(found.path, 'utf8'))
}

async function cmdFire(args) {
  const ids = idsFromArgs(args)
  const runId = args.run || args['run-id'] || `RUN-${nowStamp()}`
  if (ids.length === 0) throw new Error('fire requires --ids BQ-...')
  const runDir = join(RUNS_DIR, runId)
  await mkdir(runDir, { recursive: true })
  const fireStartedAt = new Date().toISOString()
  const preFireItems = await listItems('all')
  const gitStatusAtFire = await getGitStatusLines()
  const fired = []
  const firedItems = []
  for (const id of ids) {
    const found = await findItemPath(id, ['active'])
    if (!found) throw new Error(`Cannot fire ${id}: not found in active`)
    const destination = join(QUEUE_ROOT, 'in-flight', `${id}.md`)
    let text = await readFile(found.path, 'utf8')
    text = replaceField(text, 'Status', 'in-flight')
    text = replaceField(text, 'Run ID', runId)
    text = appendLog(text, `Fired in ${runId} at ${new Date().toISOString()}.`)
    await writeFile(found.path, text, 'utf8')
    await rename(found.path, destination)
    fired.push(id)
    firedItems.push({
      id,
      fromStatus: found.status,
      toStatus: 'in-flight',
      sourcePath: found.path,
      destinationPath: destination,
      domain: readField(text, 'Product Domain / Module') || 'Unassigned',
      dependencies: readField(text, 'Dependencies') || '',
      related: readField(text, 'Related') || '',
      hash: contentHash(text),
    })
    await appendEvent({
      command: 'fire',
      id,
      runId,
      fromStatus: found.status,
      toStatus: 'in-flight',
      path: destination,
    })
  }
  await writeFile(
    join(runDir, 'run-snapshot.json'),
    JSON.stringify(
      {
        runId,
        firedAt: fireStartedAt,
        firedIds: fired,
        gitStatusAtFire,
        activeQueueHash: contentHash(
          preFireItems
            .filter((item) => item.status === 'active')
            .map((item) => `${item.id}:${contentHash(item.text)}`)
            .sort()
            .join('\n')
        ),
        queueSnapshot: preFireItems.map((item) => ({
          id: item.id,
          status: item.status,
          title: item.title,
          domain: item.domain,
          priority: item.priority,
          readiness: item.readiness,
          dependencies: item.dependencies,
          related: item.related,
          runId: item.runId,
          hash: contentHash(item.text),
        })),
      },
      null,
      2
    ),
    'utf8'
  )
  await writeFile(
    join(runDir, 'ownership-manifest.md'),
    `# ${runId} Ownership Manifest

- Created At: ${fireStartedAt}
- Fired Items: ${fired.join(', ')}
- Declared Owner: ${args.owner || args.lead || 'unspecified'}
- Declared Ownership Notes: ${args.ownership || 'none provided'}

## Domain Ownership

${firedItems.map((item) => `- ${item.id}: ${item.domain}`).join('\n') || '- None'}

## Queue File Ownership

${firedItems.map((item) => `- ${item.id}: ${item.destinationPath}`).join('\n') || '- None'}
`,
    'utf8'
  )
  await writeFile(
    join(runDir, 'fire-plan.md'),
    `# ${runId} Fire Plan

- Fired At: ${fireStartedAt}
- Items: ${fired.join(', ')}

## Verification Contract

- Each item needs a proof pack in .agents/build-queue/proof-packs/<ID>.md.
- Run finish-check before moving items to done.
- For UI items, run mobile-pass and finish-check --require-mobile before moving items to done.
`,
    'utf8'
  )
  console.log(`Fired ${fired.join(', ')} in ${runId}`)
}

async function getGitStatusLines() {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--short'], {
      cwd: ROOT,
      maxBuffer: 20 * 1024 * 1024,
    })
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .sort()
  } catch {
    return null
  }
}

async function getRunSnapshot(runId) {
  if (!runId || runId === 'unassigned') return null
  const snapshotPath = join(RUNS_DIR, runId, 'run-snapshot.json')
  if (!existsSync(snapshotPath)) return null
  try {
    return JSON.parse(await readFile(snapshotPath, 'utf8'))
  } catch {
    return null
  }
}

async function checkWorkspaceCloseout(ids) {
  const current = await getGitStatusLines()
  if (current === null) {
    return {
      passed: false,
      errors: ['workspace: FAIL git status unavailable'],
    }
  }

  const baselines = []
  const missingBaselines = []
  for (const id of ids) {
    const found = await findItemPath(id, ['in-flight'])
    if (!found) {
      missingBaselines.push(`${id}: not in in-flight`)
      continue
    }
    const text = await readFile(found.path, 'utf8')
    const runId = readField(text, 'Run ID')
    const snapshot = await getRunSnapshot(runId)
    if (!snapshot || !Array.isArray(snapshot.gitStatusAtFire)) {
      missingBaselines.push(`${id}: missing fire-time git status for run ${runId || 'unassigned'}`)
      continue
    }
    baselines.push(snapshot.gitStatusAtFire)
  }

  if (missingBaselines.length > 0) {
    return {
      passed: false,
      errors: missingBaselines.map((line) => `workspace: FAIL ${line}`),
    }
  }

  const allowed = new Set(baselines.flat())
  const newDirty = current.filter((line) => !allowed.has(line))
  if (newDirty.length > 0) {
    return {
      passed: false,
      errors: [
        'workspace: FAIL unclosed dirty work added after fire-time baseline',
        ...newDirty.slice(0, 80).map((line) => `  ${line}`),
        ...(newDirty.length > 80 ? [`  ... ${newDirty.length - 80} more`] : []),
      ],
    }
  }

  console.log(
    current.length === 0
      ? 'workspace: PASS clean'
      : `workspace: PASS no new dirty entries since fire-time baseline (${current.length} baseline dirty entries remain)`
  )
  return { passed: true, errors: [] }
}

async function cmdFinishCheck(args) {
  const ids = idsFromArgs(args)
  if (ids.length === 0) throw new Error('finish-check requires --ids BQ-...')
  await warnActiveInFlightOverlaps(ids)
  const requireMobile = Boolean(args['require-mobile'] || args.mobile)
  const autoMobile = Boolean(args['auto-mobile'])
  const backendOnly = Boolean(args['backend-only'])
  const runtimeRequired = !args['skip-runtime']
  let failed = false
  const workspaceResult = await checkWorkspaceCloseout(ids)
  if (!workspaceResult.passed) {
    failed = true
    for (const error of workspaceResult.errors) console.error(error)
  }
  if (runtimeRequired) {
    try {
      const runtimeArgs = ['scripts/dev-runtime.mjs', 'verify']
      if (args['allow-isolated']) runtimeArgs.push('--allow-isolated')
      await execFileAsync(process.execPath, runtimeArgs, { cwd: ROOT, maxBuffer: 1024 * 1024 })
    } catch (error) {
      failed = true
      const output = [error.stdout, error.stderr].filter(Boolean).join('\n').trim()
      console.error(`runtime: FAIL ${output || error.message}`)
    }
  }
  for (const id of ids) {
    const found = await findItemPath(id, ['in-flight'])
    const proofPath = join(PROOF_DIR, `${id}.md`)
    const proofExists = existsSync(proofPath)
    const proofText = proofExists ? await readFile(proofPath, 'utf8') : ''
    const itemText = found ? await readFile(found.path, 'utf8') : ''
    const itemRequiresMobile =
      requireMobile ||
      (autoMobile &&
        !backendOnly &&
        isUiQueueItem({
          title: readField(itemText, 'Title'),
          domain: readField(itemText, 'Product Domain / Module'),
          scope: readSection(itemText, 'Scope'),
          acceptance: readSection(itemText, 'Acceptance Criteria'),
        }))
    const required = ['Acceptance Evidence', 'Wiring Proof', 'Runtime Proof', 'Verification Output']
    const missing = required.filter((heading) => !proofText.includes(heading))
    const mobileSection = proofText.match(/## Mobile Pass[\s\S]*?(?=\n## |\s*$)/)?.[0] || ''
    const runtimeSection = proofText.match(/## Runtime Proof[\s\S]*?(?=\n## |\s*$)/)?.[0] || ''
    const hasTbd = /\bTBD\b/i.test(proofText)
    const hasCanonicalRuntime = /https?:\/\/(?:localhost|127\.0\.0\.1):3100\b/i.test(runtimeSection)
    const noRuntimeImpact = /no runtime impact|not runtime-impacting|docs-only/i.test(runtimeSection)
    const approvedIsolatedRuntime =
      args['allow-isolated'] &&
      /isolated|alternate port|worktree/i.test(runtimeSection) &&
      /reason/i.test(runtimeSection) &&
      /cleanup/i.test(runtimeSection)
    if (!found) {
      failed = true
      console.error(`${id}: FAIL not in in-flight`)
    } else if (!proofExists) {
      failed = true
      console.error(`${id}: FAIL missing proof pack ${proofPath}`)
    } else if (missing.length > 0) {
      failed = true
      console.error(`${id}: FAIL proof pack missing headings: ${missing.join(', ')}`)
    } else if (hasTbd) {
      failed = true
      console.error(`${id}: FAIL proof pack still contains TBD`)
    } else if (!hasCanonicalRuntime && !noRuntimeImpact && !approvedIsolatedRuntime) {
      failed = true
      console.error(`${id}: FAIL runtime proof must cite http://localhost:3100, declare no runtime impact, or document an approved isolated runtime with reason and cleanup`)
    } else if (itemRequiresMobile && !proofText.includes('## Mobile Pass')) {
      failed = true
      console.error(`${id}: FAIL mobile proof required but ## Mobile Pass is missing`)
    } else if (itemRequiresMobile && !/- Status:\s*PASS/i.test(mobileSection)) {
      failed = true
      console.error(`${id}: FAIL mobile proof required but no PASS status was found`)
    } else {
      console.log(`${id}: PASS finish-check`)
    }
  }
  if (failed) process.exitCode = 1
  return !failed
}

async function cmdProofPack(args) {
  const ids = idsFromArgs(args)
  const runId = args.run || args['run-id'] || 'unassigned'
  if (ids.length === 0) throw new Error('proof-pack requires --ids BQ-...')
  for (const id of ids) {
    const proofPath = join(PROOF_DIR, `${id}.md`)
    if (existsSync(proofPath) && !args.force) {
      console.log(`${id}: proof pack already exists`)
      continue
    }
    await writeFile(
      proofPath,
      `# Proof Pack: ${id}

- Run ID: ${runId}
- Created At: ${new Date().toISOString()}

## Acceptance Evidence

TBD

## Wiring Proof

TBD

## Runtime Proof

TBD

## Verification Output

TBD

## Partial Work Notes

TBD
`,
      'utf8'
    )
    await appendEvent({
      command: 'proof-pack',
      id,
      runId,
      path: proofPath,
      forced: Boolean(args.force),
    })
    console.log(`${id}: created ${proofPath}`)
  }
}

async function moveItems(args, toStatus, reasonLabel) {
  if (!STATUS_DIRS.includes(toStatus)) {
    throw new Error(`move requires --status ${STATUS_DIRS.join('|')}`)
  }
  const ids = idsFromArgs(args)
  if (ids.length === 0) throw new Error(`${toStatus} requires --ids BQ-...`)
  for (const id of ids) {
    const found = await findItemPath(id)
    if (!found) throw new Error(`Cannot move ${id}: not found`)
    const destination = join(QUEUE_ROOT, toStatus, `${id}.md`)
    let text = await readFile(found.path, 'utf8')
    text = replaceField(text, 'Status', toStatus)
    text = appendLog(text, `${reasonLabel} at ${new Date().toISOString()}${args.reason ? `: ${args.reason}` : '.'}`)
    await writeFile(found.path, text, 'utf8')
    await rename(found.path, destination)
    await appendEvent({
      command: args.command || reasonLabel.toLowerCase().split(/\s+/)[0],
      id,
      fromStatus: found.status,
      toStatus,
      reason: args.reason || '',
      path: destination,
    })
    console.log(`${id}: ${found.status} -> ${toStatus}`)
  }
}

async function cmdDone(args) {
  const ids = idsFromArgs(args)
  if (ids.length === 0) throw new Error('done requires --ids BQ-...')
  const passed = await cmdFinishCheck({ ...args, ids })
  if (!passed) {
    throw new Error('done refused: finish-check/workspace closeout failed')
  }
  return moveItems(args, 'done', 'Marked done')
}

async function cmdDomains(args) {
  const items = await listItems(args.status || 'active')
  const counts = new Map()
  for (const item of items) counts.set(item.domain, (counts.get(item.domain) || 0) + 1)
  for (const [domain, count] of [...counts.entries()].sort()) console.log(`${domain}: ${count}`)
}

async function cmdReadiness(args) {
  const items = await listItems(args.status || 'active')
  for (const item of items.sort((a, b) => b.readiness - a.readiness)) {
    console.log(`${item.id}\t${item.readiness}\t${item.priority}\t${item.domain}\t${item.title}`)
  }
}

async function cmdDuplicates(args) {
  const items = await listItems(args.status || 'active')
  const bySlug = new Map()
  for (const item of items) {
    const key = slugify(item.title)
    bySlug.set(key, [...(bySlug.get(key) || []), item])
  }
  let found = false
  for (const group of bySlug.values()) {
    if (group.length <= 1) continue
    found = true
    console.log(group.map((item) => item.id).join(', '))
  }
  if (!found) console.log('No obvious duplicate titles found.')
}

async function cmdAudit() {
  const items = await listItems('all')
  let failed = false
  for (const item of items) {
    const required = ['ID', 'Status', 'Product Domain / Module', 'Readiness Score', 'Run ID']
    const missing = required.filter((field) => !readField(item.text, field))
    if (missing.length > 0) {
      failed = true
      console.error(`${item.id}: missing ${missing.join(', ')}`)
    }
  }
  if (!failed) console.log(`Audit passed for ${items.length} items.`)
  else process.exitCode = 1
}

function latestBlockedLine(text) {
  return (
    text
      .split('\n')
      .filter((line) => line.startsWith('- Blocked at '))
      .at(-1) || ''
  )
}

function blockedCategory(reason, proofText) {
  if (/Declared dependenc/i.test(reason)) return 'dependency blocked'
  if (/PG saturation|sync_age|sync_stale|OpenClaw sync/i.test(reason)) return 'external system state'
  if (/dirty|worktree|unrelated dirty/i.test(reason)) return 'dirty workspace/worktree'
  if (/no item has sufficient done evidence|lack proof packs|proof|finish-check|runtime proof|screenshots/i.test(reason)) {
    return 'missing proof/finish gate'
  }
  if (/partial|not accepted as DONE|incomplete|blocker:/i.test(proofText)) return 'partial proof'
  return 'other'
}

async function cmdBlockedReport() {
  const blocked = await listItems('blocked')
  const blockedIds = new Set(blocked.map((item) => item.id))
  const rows = []
  for (const item of blocked) {
    const proofPath = join(PROOF_DIR, `${item.id}.md`)
    const proofExists = existsSync(proofPath)
    const proofText = proofExists ? await readFile(proofPath, 'utf8') : ''
    const reason = latestBlockedLine(item.text)
    const frontmatter = parseFrontmatter(item.text)
    const dependsOn = Array.isArray(frontmatter.depends_on) ? frontmatter.depends_on : []
    const blockedDeps = dependsOn.filter((id) => blockedIds.has(id))
    rows.push({
      item,
      proofExists,
      proofText,
      reason,
      blockedDeps,
      category: blockedCategory(reason, proofText),
    })
  }

  const byCategory = new Map()
  for (const row of rows) byCategory.set(row.category, (byCategory.get(row.category) || 0) + 1)

  console.log(`blocked total: ${blocked.length}`)
  console.log(`with proof pack: ${rows.filter((row) => row.proofExists).length}`)
  console.log(`without proof pack: ${rows.filter((row) => !row.proofExists).length}`)
  console.log('\nby blocker type:')
  for (const [category, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${category}: ${count}`)
  }

  const rootBlockers = rows
    .filter((row) => row.blockedDeps.length === 0)
    .sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
      return (priorityOrder[a.item.priority] ?? 9) - (priorityOrder[b.item.priority] ?? 9)
    })

  console.log('\nroot blocked items to resolve first:')
  for (const row of rootBlockers.slice(0, 20)) {
    console.log(`- ${row.item.id} [${row.item.priority}] ${row.item.title}`)
    console.log(`  ${row.category}${row.proofExists ? '; has proof pack' : '; no proof pack'}`)
    if (row.reason) console.log(`  ${row.reason.replace(/^- /, '')}`)
  }

  const dependencyBlocked = rows.filter((row) => row.blockedDeps.length > 0)
  console.log(`\ndependency-blocked descendants: ${dependencyBlocked.length}`)
  if (dependencyBlocked.length > 0) {
    for (const row of dependencyBlocked.slice(0, 20)) {
      console.log(`- ${row.item.id} waits on ${row.blockedDeps.join(', ')}`)
    }
  }

  console.log('\ncompletion rule:')
  console.log('- Do not move blocked items to done unless finish-check can pass from in-flight.')
  console.log('- Items without proof packs are not completed work; they need proof, merge, rejection, or a scoped refire.')
}

async function cmdWorkspace() {
  console.log(`Queue root: ${QUEUE_ROOT}`)
  for (const dir of [...STATUS_DIRS, 'runs', 'proof-packs']) {
    const path = join(QUEUE_ROOT, dir)
    const exists = existsSync(path)
    const detail = exists ? await stat(path) : null
    console.log(`${dir}: ${exists ? `ok (${detail?.isDirectory() ? 'dir' : 'file'})` : 'missing'}`)
  }
  try {
    const { execFileSync } = await import('node:child_process')
    const branch = execFileSync('git', ['branch', '--show-current'], { cwd: ROOT, encoding: 'utf8' }).trim()
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
    const dirty = execFileSync('git', ['status', '--short'], { cwd: ROOT, encoding: 'utf8' }).trim()
    console.log(`branch: ${branch}`)
    console.log(`HEAD: ${head}`)
    console.log(`dirty files:\n${dirty || '(clean)'}`)
  } catch {
    console.log('git workspace details unavailable')
  }
}

async function cmdDomainPlan(args) {
  const items = await listItems(args.status || 'active')
  const groups = new Map()
  for (const item of items) groups.set(item.domain, [...(groups.get(item.domain) || []), item])
  for (const [domain, group] of [...groups.entries()].sort()) {
    console.log(`\n## ${domain}`)
    for (const item of group.sort((a, b) => b.readiness - a.readiness)) {
      console.log(`- ${item.id} [${item.priority}, readiness ${item.readiness}] ${item.title}`)
    }
  }
}

async function cmdRecommendFire(args) {
  const limit = Number(args.limit || 5)
  const items = await listItems(args.status || 'active')
  for (const item of items.sort((a, b) => b.readiness - a.readiness).slice(0, limit)) {
    console.log(`${item.id}\t${item.priority}\t${item.readiness}\t${item.domain}\t${item.title}`)
  }
}

async function cmdPlanFire(args) {
  const ids = idsFromArgs(args)
  if (ids.length === 0) throw new Error('plan-fire requires --ids BQ-...')
  const items = await listItems('active')
  const selected = items.filter((item) => ids.includes(item.id))
  console.log(`# Fire Plan ${args.run || args['run-id'] || `RUN-${nowStamp()}`}`)
  for (const item of selected) {
    console.log(`- ${item.id}: ${item.domain} / ${item.title}`)
  }
  const missing = ids.filter((id) => !selected.some((item) => item.id === id))
  if (missing.length > 0) console.log(`Missing from active: ${missing.join(', ')}`)
}

async function main() {
  await ensureQueue()
  const [command = 'status', ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)
  args.command = command
  const lifecycleCommands = new Set(['add', 'fire', 'proof-pack', 'done', 'block', 'blocked', 'cancel', 'move'])
  const runCommand = async () => {
    if (command === 'add') return cmdAdd(args)
    if (command === 'list') return cmdIndex(args)
    if (command === 'status') return cmdStatus(args)
    if (command === 'index') return cmdIndex(args)
    if (command === 'show') return cmdShow(args)
    if (command === 'fire') return cmdFire(args)
    if (command === 'finish-check') return cmdFinishCheck(args)
    if (command === 'preflight') return cmdFinishCheck(args)
    if (command === 'proof-pack') return cmdProofPack(args)
    if (command === 'done') return cmdDone(args)
    if (command === 'block' || command === 'blocked') return moveItems(args, 'blocked', 'Blocked')
    if (command === 'cancel') return moveItems(args, 'active', 'Returned to active')
    if (command === 'move') return moveItems(args, args.status, args.reason || 'Moved')
    if (command === 'domains') return cmdDomains(args)
    if (command === 'readiness') return cmdReadiness(args)
    if (command === 'duplicates') return cmdDuplicates(args)
    if (command === 'audit') return cmdAudit(args)
    if (command === 'blocked-report') return cmdBlockedReport(args)
    if (command === 'workspace') return cmdWorkspace(args)
    if (command === 'domain-plan') return cmdDomainPlan(args)
    if (command === 'recommend-fire') return cmdRecommendFire(args)
    if (command === 'plan-fire') return cmdPlanFire(args)
    if (command === 'help' || command === '--help') {
      console.log('Commands: add, list, status, index, show, fire, finish-check, preflight, proof-pack, done, block, cancel, move, domains, readiness, duplicates, audit, blocked-report, workspace, domain-plan, recommend-fire, plan-fire')
      return
    }
    throw new Error(`Unknown command: ${command}`)
  }
  if (lifecycleCommands.has(command)) {
    return withLifecycleLock(command, runCommand)
  }
  return runCommand()
}

main().catch((error) => {
  console.error(`[build-queue] ${error.message}`)
  process.exit(1)
})
