#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import notificationTypesModule from '../lib/notifications/types.ts'
import tierConfigModule from '../lib/notifications/tier-config.ts'

const { NOTIFICATION_CONFIG } = notificationTypesModule
const { DEFAULT_TIER_MAP, EMAIL_SUPPRESSED_ACTIONS, getDefaultChannels } = tierConfigModule

const SOURCE_ROOTS = ['app', 'lib']
const IGNORE_FILES = new Set([
  path.normalize('lib/notifications/types.ts'),
  path.normalize('lib/notifications/tier-config.ts'),
])

function parseArgs(argv) {
  const args = { strict: false, out: null, require: [] }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--strict') args.strict = true
    if (token === '--out') args.out = argv[i + 1] ?? null
    if (token === '--out') i += 1
    if (token === '--require') {
      const raw = argv[i + 1] ?? ''
      const requested = raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
      args.require.push(...requested)
      i += 1
    }
  }
  return args
}

function walkFiles(rootDir) {
  const output = []
  if (!fs.existsSync(rootDir)) return output

  const queue = [rootDir]
  while (queue.length > 0) {
    const current = queue.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        queue.push(fullPath)
        continue
      }
      if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) continue
      output.push(path.normalize(fullPath))
    }
  }

  return output
}

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findEmitters(actions) {
  const allFiles = SOURCE_ROOTS.flatMap((root) => walkFiles(root))
  const emitterMap = new Map(actions.map((action) => [action, []]))
  const declarationPatterns = [
    /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]{0,500}?);/g,
    /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n\r;]+)/g,
  ]

  for (const filePath of allFiles) {
    if (IGNORE_FILES.has(filePath)) continue
    const text = fs.readFileSync(filePath, 'utf8')
    const notificationCallBlocks = Array.from(
      text.matchAll(
        /(?:createNotification|createClientNotification|sendNotification)\s*\(\s*\{[\s\S]{0,1400}?\}\s*\)/g
      )
    ).map((match) => match[0])

    const actionVariableMap = new Map(actions.map((action) => [action, new Set()]))
    for (const pattern of declarationPatterns) {
      for (const declaration of text.matchAll(pattern)) {
        const varName = declaration[1]
        const rhs = declaration[2]
        for (const action of actions) {
          const literal = new RegExp(`['"\`]${escapeRegex(action)}['"\`]`)
          if (literal.test(rhs)) {
            actionVariableMap.get(action).add(varName)
          }
        }
      }
    }

    for (const action of actions) {
      const directPattern = new RegExp(`(?:action|type)\\s*:\\s*['"\`]${escapeRegex(action)}['"\`]`)
      if (directPattern.test(text)) {
        emitterMap.get(action).push(filePath)
        continue
      }

      const candidateVariables = Array.from(actionVariableMap.get(action) ?? [])
      if (candidateVariables.length === 0 || notificationCallBlocks.length === 0) {
        continue
      }

      const hasVariableEmitter = candidateVariables.some((varName) => {
        const variablePattern = new RegExp(`\\b${escapeRegex(varName)}\\b`)
        return notificationCallBlocks.some((block) => variablePattern.test(block))
      })

      if (hasVariableEmitter) {
        emitterMap.get(action).push(filePath)
      }
    }
  }

  return emitterMap
}

function toRelative(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/')
}

function toMarkdown(rows, summary) {
  const lines = []
  lines.push('# Notification Audit')
  lines.push('')
  lines.push(`- Total actions: ${summary.total}`)
  lines.push(`- Missing tier mappings: ${summary.missingTier.length}`)
  lines.push(`- Actions without emitters: ${summary.noEmitter.length}`)
  lines.push('')
  lines.push(
    '| Action | Category | Tier | Email | Push | SMS | Suppressed Email | Emitters | First Emitter |'
  )
  lines.push('|---|---|---|---|---|---|---|---|---|')

  for (const row of rows) {
    lines.push(
      `| ${row.action} | ${row.category} | ${row.tier ?? 'MISSING'} | ${row.channels.email} | ${row.channels.push} | ${row.channels.sms} | ${row.emailSuppressed} | ${row.emitterCount} | ${row.firstEmitter ?? '-'} |`
    )
  }

  if (summary.missingTier.length > 0) {
    lines.push('')
    lines.push('## Missing Tier Mappings')
    for (const action of summary.missingTier) lines.push(`- ${action}`)
  }

  if (summary.noEmitter.length > 0) {
    lines.push('')
    lines.push('## No Emitter Found')
    for (const action of summary.noEmitter) lines.push(`- ${action}`)
  }

  return lines.join('\n')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const actions = Object.keys(NOTIFICATION_CONFIG).sort()
  const emitterMap = findEmitters(actions)

  const rows = actions.map((action) => {
    const category = NOTIFICATION_CONFIG[action]?.category ?? 'unknown'
    const tier = DEFAULT_TIER_MAP[action] ?? null
    const channels = getDefaultChannels(action)
    const emitters = (emitterMap.get(action) ?? []).map(toRelative).sort()
    return {
      action,
      category,
      tier,
      channels,
      emailSuppressed: EMAIL_SUPPRESSED_ACTIONS.has(action),
      emitterCount: emitters.length,
      firstEmitter: emitters[0] ?? null,
      emitters,
    }
  })

  const summary = {
    total: rows.length,
    missingTier: rows.filter((row) => !row.tier).map((row) => row.action),
    noEmitter: rows.filter((row) => row.emitterCount === 0).map((row) => row.action),
  }

  const requiredActions = Array.from(new Set(args.require))
  const unknownRequired = requiredActions.filter((action) => !(action in NOTIFICATION_CONFIG))
  const requiredMissingEmitters = requiredActions.filter((action) => summary.noEmitter.includes(action))

  console.log(`[notifications] total actions: ${summary.total}`)
  console.log(`[notifications] missing tier mappings: ${summary.missingTier.length}`)
  console.log(`[notifications] actions without emitters: ${summary.noEmitter.length}`)

  if (summary.noEmitter.length > 0) {
    console.log('[notifications] no emitter found for:')
    for (const action of summary.noEmitter) {
      console.log(`  - ${action}`)
    }
  }

  if (requiredActions.length > 0) {
    console.log(`[notifications] required actions checked: ${requiredActions.length}`)
    if (unknownRequired.length > 0) {
      console.log('[notifications] unknown required actions:')
      for (const action of unknownRequired) {
        console.log(`  - ${action}`)
      }
    }
    if (requiredMissingEmitters.length > 0) {
      console.log('[notifications] required actions missing emitters:')
      for (const action of requiredMissingEmitters) {
        console.log(`  - ${action}`)
      }
    }
  }

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out)
    const outDir = path.dirname(outPath)
    fs.mkdirSync(outDir, { recursive: true })

    const payload = {
      generatedAt: new Date().toISOString(),
      summary,
      rows,
    }

    if (outPath.endsWith('.md')) {
      fs.writeFileSync(outPath, toMarkdown(rows, summary))
    } else {
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))
    }
    console.log(`[notifications] wrote audit report: ${outPath}`)
  }

  const strictFailures =
    summary.missingTier.length > 0 ||
    unknownRequired.length > 0 ||
    (requiredActions.length > 0
      ? requiredMissingEmitters.length > 0
      : summary.noEmitter.length > 0)

  if (args.strict && strictFailures) {
    process.exit(1)
  }
}

main()
