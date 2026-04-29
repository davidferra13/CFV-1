#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import {
  ensureDir,
  nowStamp,
  parseArgs,
  readJson,
  relative,
  repoRoot,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const command = args._[0] || args.command || 'next'
const DEFAULT_URL = process.env.PERSONA_INBOX_URL || 'http://127.0.0.1:3977'
const readyDir = path.resolve(String(args['ready-dir'] || path.join(repoRoot, 'system', 'ready-tasks')))
const buildQueueDir = path.resolve(String(args['build-queue-dir'] || path.join(repoRoot, 'system', 'build-queue')))
const reportsDir = path.resolve(
  String(args['output-dir'] || path.join(repoRoot, 'system', 'agent-reports', 'codex-build-bridge')),
)

const hardStopPatterns = [
  { id: 'main_or_deploy', pattern: /\b(push to main|merge to main|deploy|production deploy)\b/i },
  { id: 'destructive_database', pattern: /\b(drop table|drop column|delete from|truncate|alter column type)\b/i },
  { id: 'drizzle_push', pattern: /\bdrizzle-kit push\b/i },
  { id: 'generated_database_types', pattern: /\btypes\/database\.ts\b/i },
  { id: 'ts_nocheck', pattern: /@ts-nocheck/i },
  { id: 'unapproved_server_control', pattern: /\b(kill server|restart server|npm run dev|next build)\b/i },
  { id: 'ai_recipe_generation', pattern: /\b(ai|agent|remy|ollama).{0,40}\b(generate|create|draft|suggest).{0,40}\b(recipe|menu)\b/i },
]

const riskPatterns = [
  { id: 'database', pattern: /\b(database|migration|sql|schema|tenant_id|chef_id)\b/i, skill: 'builder' },
  { id: 'auth', pattern: /\b(auth|requireChef|requireClient|requireAdmin|requireAuth|permission)\b/i, skill: 'review' },
  { id: 'ledger', pattern: /\b(ledger|balance|cents|payment|payout)\b/i, skill: 'ledger-safety' },
  { id: 'stripe', pattern: /\b(stripe|webhook|checkout|payment intent|subscription)\b/i, skill: 'stripe-webhook-integrity' },
  { id: 'billing', pattern: /\b(billing|paid tier|free tier|upgrade prompt|monetization)\b/i, skill: 'billing-monetization' },
  { id: 'public_ui', pattern: /\b(public|button|ui|component|page|copy)\b/i, skill: 'hallucination-scan' },
]

function usage() {
  console.log(`Usage:
  node devtools/codex-build-bridge.mjs status [--json]
  node devtools/codex-build-bridge.mjs next [--ready-dir dir] [--build-queue-dir dir] [--write]
  node devtools/codex-build-bridge.mjs packet --file path [--write]
  node devtools/codex-build-bridge.mjs claim [--url http://127.0.0.1:3977] [--dry-run] [--write]
  node devtools/codex-build-bridge.mjs complete --source-plan path --commit sha --status built|blocked|duplicate|rejected|failed-validation|needs-human [--url url] [--dry-run]`)
}

function readText(file) {
  return fs.readFileSync(file, 'utf8')
}

function isInside(parent, child) {
  const relativePath = path.relative(parent, child)
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
    .map((name) => path.join(dir, name))
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: {}, body: content }
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: content }
  const frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!pair) continue
    frontmatter[pair[1]] = pair[2].trim().replace(/^['"]|['"]$/g, '')
  }
  return { frontmatter, body: match[2] || '' }
}

function titleFromContent(file, content, frontmatter) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return frontmatter.title || heading || path.basename(file, path.extname(file)).replace(/[-_]+/g, ' ')
}

function extractFileRefs(content) {
  const refs = new Set()
  for (const match of content.matchAll(/`([^`\r\n]+\.(?:ts|tsx|js|jsx|mjs|css|sql|md|json))`/g)) {
    const value = match[1].replace(/\\/g, '/')
    if (!value.startsWith('http') && !value.includes('{')) refs.add(value)
  }
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^-\s+([A-Za-z0-9_.()[\] /-]+\.(?:ts|tsx|js|jsx|mjs|css|sql|md|json))\b/)
    if (match) refs.add(match[1].trim().replace(/\\/g, '/'))
  }
  return [...refs]
}

function readReadyTasks() {
  return listFiles(readyDir).map((file) => {
    const content = readText(file)
    const { frontmatter, body } = parseFrontmatter(content)
    return {
      kind: 'ready-task',
      file: relative(file),
      absolute_file: file,
      title: titleFromContent(file, body || content, frontmatter),
      priority: frontmatter.priority || 'medium',
      score: Number(frontmatter.score || 0),
      source_plan: frontmatter.source_plan || null,
      source_persona: frontmatter.source_persona || null,
      content,
    }
  })
}

function readBuildQueueTasks() {
  return listFiles(buildQueueDir).map((file) => {
    const content = readText(file)
    const { frontmatter, body } = parseFrontmatter(content)
    return {
      kind: 'build-queue',
      file: relative(file),
      absolute_file: file,
      title: titleFromContent(file, body || content, frontmatter),
      priority: frontmatter.priority || 'medium',
      score: priorityScore(frontmatter.priority || path.basename(file)),
      source_plan: null,
      source_persona: frontmatter.source || null,
      content,
    }
  })
}

function priorityScore(priority) {
  const text = String(priority || '').toLowerCase()
  if (text.includes('high')) return 80
  if (text.includes('medium')) return 50
  if (text.includes('low')) return 20
  return 40
}

function sortTasks(tasks) {
  const priorityRank = { high: 3, medium: 2, low: 1 }
  return tasks.sort((a, b) => {
    const ap = priorityRank[String(a.priority).toLowerCase()] || priorityScore(a.priority)
    const bp = priorityRank[String(b.priority).toLowerCase()] || priorityScore(b.priority)
    return bp - ap || b.score - a.score || a.file.localeCompare(b.file)
  })
}

function classifyTask(task, allTasks = []) {
  const content = task.content || ''
  const files = extractFileRefs(content)
  const hardStops = hardStopPatterns.filter((item) => item.pattern.test(content)).map((item) => item.id)
  const risks = riskPatterns.filter((item) => item.pattern.test(content))
  const requiredSkills = ['omninet', 'builder']
  for (const risk of risks) {
    if (!requiredSkills.includes(risk.skill)) requiredSkills.push(risk.skill)
  }
  const missingFiles = files.filter((file) => !fs.existsSync(path.join(repoRoot, file)))
  const normalizedTitle = slugify(task.title)
  const duplicates = allTasks
    .filter((item) => item.file !== task.file && slugify(item.title) === normalizedTitle)
    .map((item) => item.file)

  let status = 'buildable'
  const reasons = []
  if (hardStops.length) {
    status = 'blocked'
    reasons.push(`hard stops: ${hardStops.join(', ')}`)
  } else if (duplicates.length) {
    status = 'duplicate'
    reasons.push(`duplicate title in ${duplicates[0]}`)
  } else if (!files.length) {
    status = 'needs-triage'
    reasons.push('no affected file references found')
  } else if (missingFiles.length === files.length) {
    status = 'needs-triage'
    reasons.push('all affected file references are missing')
  } else if (risks.some((risk) => ['database', 'stripe', 'ledger', 'auth'].includes(risk.id))) {
    status = 'needs-human'
    reasons.push(`high-risk domain: ${risks.map((risk) => risk.id).join(', ')}`)
  }

  return {
    status,
    reasons,
    risk_domains: risks.map((risk) => risk.id),
    hard_stops: hardStops,
    required_skills: requiredSkills,
    affected_files: files,
    missing_files: missingFiles,
    duplicate_files: duplicates,
  }
}

function buildPacket(task, classification) {
  const prompt = [
    'Act as a ChefFlow Codex builder on this claimed 3977 task.',
    '',
    'Use `omninet` first, then the required skills listed below. Keep ownership to the affected files and preserve unrelated dirty work.',
    '',
    `Task: ${task.title}`,
    `Source: ${task.source_plan || task.file}`,
    `Priority: ${task.priority}`,
    `Bridge classification: ${classification.status}`,
    `Required skills: ${classification.required_skills.join(', ')}`,
    `Affected files: ${classification.affected_files.join(', ') || 'none detected'}`,
    '',
    'Safety result:',
    classification.reasons.length ? classification.reasons.map((reason) => `- ${reason}`).join('\n') : '- buildable',
    '',
    'Original task:',
    '',
    task.content.trim(),
  ].join('\n')
  return {
    id: slugify(`${task.kind}-${task.title}`),
    generated_at: new Date().toISOString(),
    task: {
      kind: task.kind,
      file: task.file,
      title: task.title,
      priority: task.priority,
      score: task.score,
      source_plan: task.source_plan,
      source_persona: task.source_persona,
    },
    classification,
    codex_prompt: prompt,
  }
}

function pickNextTask(mode = 'ready-first') {
  const ready = readReadyTasks()
  const buildQueue = readBuildQueueTasks()
  if (mode === 'ready-only') return { task: sortTasks(ready)[0] || null, allTasks: ready }
  if (mode === 'build-queue-only') return { task: sortTasks(buildQueue)[0] || null, allTasks: buildQueue }
  if (ready.length) return { task: sortTasks(ready)[0], allTasks: ready }
  if (buildQueue.length) return { task: sortTasks(buildQueue)[0], allTasks: buildQueue }
  const tasks = sortTasks([...ready, ...buildQueue])
  if (!tasks.length) return { task: null, allTasks: [] }
  return { task: tasks[0], allTasks: tasks }
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`)
  return data
}

function writeReport(prefix, data) {
  if (!(args.write || args.report)) return null
  ensureDir(reportsDir)
  const file = path.join(reportsDir, `${nowStamp()}-${prefix}.json`)
  writeJson(file, data)
  return relative(file)
}

function output(data) {
  console.log(JSON.stringify(data, null, 2))
}

async function run() {
  if (args.help || args.h) {
    usage()
    return
  }

  if (command === 'status') {
    const ready = readReadyTasks()
    const buildQueue = readBuildQueueTasks()
    const result = {
      ok: true,
      generated_at: new Date().toISOString(),
      ready_task_count: ready.length,
      build_queue_count: buildQueue.length,
      top_ready_task: sortTasks(ready)[0]?.file || null,
      top_build_queue_task: sortTasks(buildQueue)[0]?.file || null,
    }
    result.report_file = writeReport('status', result)
    output(result)
    return
  }

  let task = null
  let allTasks = []
  let claim = null
  if (command === 'claim' && !args['dry-run']) {
    const url = String(args.url || DEFAULT_URL).replace(/\/$/, '')
    claim = await postJson(`${url}/api/claim-task`, {})
    if (!claim.claimed) {
      output({ ok: true, claimed: false, message: claim.message || 'No tasks available' })
      return
    }
    task = {
      kind: 'claimed-task',
      file: claim.file,
      absolute_file: null,
      title: titleFromContent(claim.file, claim.content || '', {}),
      priority: 'claimed',
      score: 0,
      source_plan: claim.source_plan,
      source_persona: null,
      content: claim.content || '',
    }
    allTasks = [task]
  } else if (command === 'packet') {
    if (!args.file || args.file === true) throw new Error('Missing --file for packet.')
    const file = path.resolve(String(args.file))
    if (
      !args['allow-outside-queue'] &&
      !isInside(readyDir, file) &&
      !isInside(buildQueueDir, file)
    ) {
      throw new Error(`Refusing to read file outside ready/build queues: ${file}`)
    }
    if (!fs.existsSync(file)) throw new Error(`Missing task file: ${file}`)
    const content = readText(file)
    const { frontmatter, body } = parseFrontmatter(content)
    task = {
      kind: file.includes(`${path.sep}build-queue${path.sep}`) ? 'build-queue' : 'ready-task',
      file: relative(file),
      absolute_file: file,
      title: titleFromContent(file, body || content, frontmatter),
      priority: frontmatter.priority || 'medium',
      score: Number(frontmatter.score || priorityScore(frontmatter.priority)),
      source_plan: frontmatter.source_plan || null,
      source_persona: frontmatter.source_persona || frontmatter.source || null,
      content,
    }
    allTasks = [task]
  } else if (command === 'next' || command === 'claim') {
    const picked = pickNextTask(command === 'claim' ? 'ready-only' : String(args.queue || 'ready-first'))
    task = picked.task
    allTasks = picked.allTasks
  } else if (command === 'complete') {
    if (!args['source-plan'] || args['source-plan'] === true) throw new Error('Missing --source-plan.')
    const sourcePlan = String(args['source-plan'])
    const status = String(args.status || 'built')
    const result = {
      ok: true,
      dry_run: Boolean(args['dry-run']),
      source_plan: sourcePlan,
      status,
      commit: args.commit && args.commit !== true ? String(args.commit) : null,
      pushed: Boolean(args.pushed),
      validations: args.validations && args.validations !== true ? String(args.validations) : null,
      completed_at: new Date().toISOString(),
    }
    if (!args['dry-run']) {
      const url = String(args.url || DEFAULT_URL).replace(/\/$/, '')
      result.remote = await postJson(`${url}/api/complete-claimed`, { source_plan: sourcePlan })
    }
    result.report_file = writeReport(`complete-${slugify(sourcePlan)}`, result)
    output(result)
    return
  } else {
    throw new Error(`Unknown command ${command}.`)
  }

  if (!task) {
    output({ ok: true, claimed: false, task: null, message: 'No tasks available.' })
    return
  }
  const classification = classifyTask(task, allTasks)
  const packet = buildPacket(task, classification)
  const result = {
    ok: classification.status !== 'blocked',
    dry_run: Boolean(args['dry-run']) || command !== 'claim',
    claimed: Boolean(claim?.claimed),
    claim: claim
      ? {
          file: claim.file,
          source_plan: claim.source_plan,
          claimed_at: claim.claimed_at,
        }
      : null,
    packet,
  }
  result.report_file = writeReport(`packet-${packet.id}`, result)
  output(result)
  if (!result.ok) process.exit(1)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.log(
    JSON.stringify(
      {
        ok: false,
        command,
        error: message,
        endpoint_called: false,
      },
      null,
      2,
    ),
  )
  process.exit(1)
})
