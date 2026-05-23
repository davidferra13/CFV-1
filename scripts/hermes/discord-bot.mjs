#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const DISCORD_API = 'https://discord.com/api/v10'
const MAX_RESPONSE = 1800

loadLocalEnv()

const selfTest = process.argv.includes('--self-test')
const token = process.env.DISCORD_BOT_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID || '1506721689306665131'
const guildId = process.env.DISCORD_GUILD_ID || '1388148643533557831'

if (!token && !selfTest) {
  console.error('[hermes-discord] DISCORD_BOT_TOKEN is missing. Store it locally before starting Hermes.')
  process.exit(1)
}

if ((!clientId || !guildId) && !selfTest) {
  console.error('[hermes-discord] DISCORD_CLIENT_ID and DISCORD_GUILD_ID are required.')
  process.exit(1)
}

const commands = [
  {
    name: 'hermes',
    description: 'ChefFlow Hermes command center',
    options: [
      {
        type: 1,
        name: 'status',
        description: 'Show Hermes Discord runtime and local ChefFlow ledger status',
      },
      {
        type: 1,
        name: 'morning',
        description: 'Summarize docs/hermes/morning-report.md',
      },
      {
        type: 1,
        name: 'ledger',
        description: 'Show active/in-flight/done/blocked queue counts',
      },
      {
        type: 1,
        name: 'alerts',
        description: 'Summarize current Hermes alerts',
      },
      {
        type: 1,
        name: 'idea',
        description: 'Capture a raw idea as approval-gated build intake',
        options: [
          {
            type: 3,
            name: 'text',
            description: 'Raw idea or problem statement',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'bug',
        description: 'Capture a bug or regression as approval-gated intake',
        options: [
          {
            type: 3,
            name: 'text',
            description: 'Observed bug, route, or regression',
            required: true,
          },
          {
            type: 3,
            name: 'severity',
            description: 'Optional severity or urgency',
            required: false,
          },
        ],
      },
      {
        type: 1,
        name: 'queue-draft',
        description: 'Shape a build-ready queue draft without mutating the queue',
        options: [
          {
            type: 3,
            name: 'text',
            description: 'Raw request to shape into queue fields',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'decision',
        description: 'Draft a decision-log entry without writing to the repo',
        options: [
          {
            type: 3,
            name: 'text',
            description: 'Decision, rationale, or tradeoff',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'proof',
        description: 'Find proof pack context by queue ID',
        options: [
          {
            type: 3,
            name: 'id',
            description: 'BQ-* queue ID',
            required: false,
          },
        ],
      },
    ],
  },
]

if (selfTest) {
  runSelfTest()
  process.exit(0)
}

await registerGuildCommands()
await startGateway()

function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, file)
    if (!fs.existsSync(envPath)) continue

    const text = fs.readFileSync(envPath, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      if (process.env[key] !== undefined) continue
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    }
  }
}

async function registerGuildCommands() {
  const response = await discordFetch(
    `/applications/${clientId}/guilds/${guildId}/commands`,
    {
      method: 'PUT',
      body: JSON.stringify(commands),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`[hermes-discord] Failed to register commands: ${response.status} ${body}`)
  }

  console.log(`[hermes-discord] Registered /hermes commands for guild ${guildId}.`)
}

async function startGateway() {
  const gatewayResponse = await discordFetch('/gateway/bot')
  if (!gatewayResponse.ok) {
    const body = await gatewayResponse.text()
    throw new Error(`[hermes-discord] Failed to fetch gateway: ${gatewayResponse.status} ${body}`)
  }

  const gateway = await gatewayResponse.json()
  const ws = new WebSocket(`${gateway.url}?v=10&encoding=json`)
  let heartbeatTimer = null
  let sequence = null

  ws.addEventListener('open', () => {
    console.log('[hermes-discord] Gateway socket opened.')
  })

  ws.addEventListener('message', async (event) => {
    const packet = JSON.parse(event.data)
    if (packet.s !== null && packet.s !== undefined) sequence = packet.s

    if (packet.op === 10) {
      const interval = packet.d.heartbeat_interval
      heartbeatTimer = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: sequence }))
      }, interval)

      ws.send(
        JSON.stringify({
          op: 2,
          d: {
            token,
            intents: 1,
            properties: {
              os: process.platform,
              browser: 'hermes-chefflow',
              device: 'hermes-chefflow',
            },
          },
        }),
      )
      return
    }

    if (packet.op === 0 && packet.t === 'READY') {
      console.log(`[hermes-discord] Hermes connected as ${packet.d.user.username}.`)
      return
    }

    if (packet.op === 0 && packet.t === 'INTERACTION_CREATE') {
      await handleInteraction(packet.d).catch(async (error) => {
        console.error('[hermes-discord] Interaction failed:', error)
        await respondToInteraction(packet.d, `Hermes hit an error: ${error.message}`)
      })
    }
  })

  ws.addEventListener('close', (event) => {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    console.error(`[hermes-discord] Gateway closed: ${event.code} ${event.reason}`)
    process.exitCode = 1
  })

  ws.addEventListener('error', (event) => {
    console.error('[hermes-discord] Gateway error:', event.message || event)
  })
}

async function handleInteraction(interaction) {
  const data = interaction.data
  if (data?.name !== 'hermes') return

  const subcommand = data.options?.[0]
  const name = subcommand?.name || 'status'
  const options = Object.fromEntries((subcommand?.options || []).map((option) => [option.name, option.value]))

  let response
  if (name === 'status') response = buildStatus()
  else if (name === 'morning') response = buildMorning()
  else if (name === 'ledger') response = buildLedger()
  else if (name === 'alerts') response = buildAlerts()
  else if (name === 'idea') response = buildIdea(options.text)
  else if (name === 'bug') response = buildBug(options.text, options.severity)
  else if (name === 'queue-draft') response = buildQueueDraft(options.text)
  else if (name === 'decision') response = buildDecision(options.text)
  else if (name === 'proof') response = buildProof(options.id)
  else response = 'Unknown Hermes command.'

  await respondToInteraction(interaction, response)
}

async function respondToInteraction(interaction, content) {
  const safeContent = truncate(content)
  const response = await fetch(`${DISCORD_API}/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 4,
      data: {
        content: safeContent,
        allowed_mentions: { parse: [] },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`interaction response failed: ${response.status} ${body}`)
  }
}

function buildStatus() {
  const counts = queueCounts()
  const morning = fileInfo('docs/hermes/morning-report.md')
  const alerts = fileInfo('docs/hermes/ALERTS.md')

  return [
    'Hermes status',
    '',
    `Runtime: connected`,
    `Guild: ${guildId}`,
    `Queue: active ${counts.active}, in-flight ${counts.inFlight}, blocked ${counts.blocked}, done ${counts.done}`,
    `Morning report: ${morning}`,
    `Alerts: ${alerts}`,
    '',
    'Boundary: Hermes can summarize and draft. Queue mutation still requires explicit approval.',
  ].join('\n')
}

function buildMorning() {
  const file = path.join(ROOT, 'docs/hermes/morning-report.md')
  if (!fs.existsSync(file)) return 'No `docs/hermes/morning-report.md` found.'

  return `Hermes morning report\n\n${truncate(fs.readFileSync(file, 'utf8'), 1600)}`
}

function buildLedger() {
  const counts = queueCounts()
  const runCount = countFilesOrDirs('.agents/build-queue/runs', { dirsOnly: true })
  const proofCount = countFilesOrDirs('.agents/build-queue/proof-packs')

  return [
    'ChefFlow build ledger',
    '',
    `Active: ${counts.active}`,
    `In-flight: ${counts.inFlight}`,
    `Blocked: ${counts.blocked}`,
    `Done: ${counts.done}`,
    `Run folders: ${runCount}`,
    `Proof packs: ${proofCount}`,
    '',
    'Discord is a routing layer. The local repo remains source of truth.',
  ].join('\n')
}

function buildAlerts() {
  const file = path.join(ROOT, 'docs/hermes/ALERTS.md')
  if (!fs.existsSync(file)) return 'No `docs/hermes/ALERTS.md` found.'

  return `Hermes alerts\n\n${truncate(fs.readFileSync(file, 'utf8'), 1600)}`
}

function buildIdea(text) {
  return [
    'Hermes idea intake',
    '',
    `Raw idea: ${text}`,
    '',
    'Before this becomes queue work, answer or infer:',
    '- Goal / user outcome',
    '- Scope boundaries',
    '- Acceptance criteria',
    '- Risks and dependencies',
    '- Verification proof',
    '- Queue-only, fire-now, or direct hotfix',
    '',
    'No queue item was created. Build Queue First remains active.',
  ].join('\n')
}

function buildBug(text, severity = 'unclassified') {
  return [
    'Hermes bug intake',
    '',
    `Severity: ${severity}`,
    `Observation: ${text}`,
    '',
    'Before this becomes queue work, capture:',
    '- Reproduction route and role',
    '- Expected behavior',
    '- Actual behavior',
    '- Browser/server/runtime evidence',
    '- Suspected blast radius',
    '- Verification proof required',
    '',
    'No queue item was created. Build Queue First remains active.',
  ].join('\n')
}

function buildQueueDraft(text) {
  return [
    'Hermes queue draft',
    '',
    `Raw request: ${text}`,
    '',
    'Goal: TBD from user outcome',
    'Scope: TBD, with explicit out-of-scope boundaries',
    'Acceptance criteria:',
    '- User-facing behavior is reachable by the correct role',
    '- Data access is tenant-scoped where applicable',
    '- Empty, loading, error, and mobile states are handled where applicable',
    '- Proof pack and finish-check pass before done',
    'Risks/dependencies: TBD',
    'Verification: focused tests plus runtime/browser proof for changed surfaces',
    '',
    'Draft only. Create a queue item only after explicit approval.',
  ].join('\n')
}

function buildDecision(text) {
  const now = new Date().toISOString()
  return [
    'Hermes decision-log draft',
    '',
    `Time: ${now}`,
    `Decision: ${text}`,
    '',
    'Record with:',
    '- Context',
    '- Options rejected',
    '- Rationale',
    '- Follow-up owner or queue item',
    '',
    'Draft only. No repo file was changed from Discord.',
  ].join('\n')
}

function buildProof(id) {
  if (!id) {
    const latest = latestFiles('.agents/build-queue/proof-packs', 5)
    if (!latest.length) return 'No proof packs found.'
    return `Latest proof packs:\n\n${latest.map((file) => `- ${file}`).join('\n')}`
  }

  const proofDir = path.join(ROOT, '.agents/build-queue/proof-packs')
  if (!fs.existsSync(proofDir)) return 'No proof pack directory found.'

  const matches = fs
    .readdirSync(proofDir)
    .filter((file) => file.toLowerCase().includes(id.toLowerCase()))
    .slice(0, 5)

  if (!matches.length) return `No proof pack found for ${id}.`
  return `Proof pack matches for ${id}:\n\n${matches.map((file) => `- ${file}`).join('\n')}`
}

function runSelfTest() {
  const subcommands = commands[0].options.map((option) => option.name).join(', ')
  const samples = [
    buildStatus(),
    buildAlerts(),
    buildBug('Sample broken page', 'P1'),
    buildQueueDraft('Sample feature request'),
    buildDecision('Sample decision'),
  ]

  console.log(`[hermes-discord] self-test commands: ${subcommands}`)
  for (const sample of samples) {
    if (!sample || sample.length > MAX_RESPONSE) throw new Error('self-test generated an invalid response')
  }
  console.log('[hermes-discord] self-test passed')
}

function queueCounts() {
  return {
    active: countFilesOrDirs('.agents/build-queue/active'),
    inFlight: countFilesOrDirs('.agents/build-queue/in-flight'),
    blocked: countFilesOrDirs('.agents/build-queue/blocked'),
    done: countFilesOrDirs('.agents/build-queue/done'),
  }
}

function countFilesOrDirs(relativePath, options = {}) {
  const target = path.join(ROOT, relativePath)
  if (!fs.existsSync(target)) return 0
  return fs.readdirSync(target).filter((entry) => {
    const stat = fs.statSync(path.join(target, entry))
    return options.dirsOnly ? stat.isDirectory() : stat.isFile() || stat.isDirectory()
  }).length
}

function latestFiles(relativePath, limit) {
  const target = path.join(ROOT, relativePath)
  if (!fs.existsSync(target)) return []
  return fs
    .readdirSync(target)
    .map((file) => ({
      file,
      mtime: fs.statSync(path.join(target, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((entry) => entry.file)
}

function fileInfo(relativePath) {
  const target = path.join(ROOT, relativePath)
  if (!fs.existsSync(target)) return 'missing'
  const stat = fs.statSync(target)
  return `present, updated ${stat.mtime.toLocaleString()}`
}

function truncate(value, max = MAX_RESPONSE) {
  const text = String(value || '')
  if (text.length <= max) return text
  return `${text.slice(0, max - 20)}\n...[truncated]`
}

async function discordFetch(pathname, init = {}) {
  return fetch(`${DISCORD_API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}
