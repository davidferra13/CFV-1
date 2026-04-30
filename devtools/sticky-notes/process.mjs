#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { ensureDir, ensureOutputRoot, nowStamp, outputPaths, readJson, relativePath, writeJson } from './config.mjs'

const DEFAULT_STATUS_BY_CLASS = {
  'chefFlow.directive': 'activated',
  'chefFlow.feature': 'queued',
  'chefFlow.bug': 'queued',
  'chefFlow.specFragment': 'needs_planner',
  'chefFlow.context': 'needs_planner',
}

const STATUS_ORDER = [
  'activated',
  'queued',
  'needs_planner',
  'security_review',
  'developer_escalation',
  'duplicate',
  'rejected',
]

function parseArgs(argv = process.argv.slice(2)) {
  const args = { manifestFile: null, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--manifest') args.manifestFile = argv[++index]
    if (arg === '--dry-run') args.dryRun = true
  }
  return args
}

function packetPath(packet) {
  if (!packet) return null
  return path.isAbsolute(packet) ? packet : path.join(process.cwd(), packet)
}

function extractPacket(packetFile) {
  const body = fs.readFileSync(packetFile, 'utf8')
  const title = body.match(/^# (.*)$/m)?.[1]?.trim() || ''
  const originalText = (body.split('## Original Text')[1] || '').trim()
  const normalizedText = originalText.replace(/\s+/g, ' ').trim()
  const lower = normalizedText.toLowerCase()
  return {
    title,
    textHash: createHash('sha256').update(normalizedText).digest('hex').slice(0, 16),
    textLength: normalizedText.length,
    lower,
  }
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term))
}

function classifyProcessedItem(item, packet, duplicateOf) {
  if (duplicateOf) {
    return {
      status: 'duplicate',
      owner: 'sticky-notes-intake-layer',
      reason: `Duplicate of ${duplicateOf}.`,
      nextAction: 'ignore_duplicate_packet',
    }
  }

  const lower = packet.lower
  if (includesAny(lower, ['illegal', 'lawsuit', 'sued by', 'legal relationship'])) {
    return {
      status: 'developer_escalation',
      owner: 'Founder Authority',
      reason: 'Legal or business-risk question requires Founder Authority or legal review.',
      nextAction: 'prepare_evidence_packet_only',
    }
  }

  if (
    includesAny(lower, [
      'cross-tenant',
      'privilege escalation',
      'unauthorized visibility',
      'access control',
      'forbidden from accessing',
      'data leakage',
    ])
  ) {
    return {
      status: 'security_review',
      owner: 'security-review',
      reason: 'Security-sensitive visibility or access-control concern.',
      nextAction: 'write_or_run_security_review_before_code',
    }
  }

  if (includesAny(lower, ['barcode buddy', 'wix website', 'broker eligibility', 'backtest', 'slippage'])) {
    return {
      status: 'rejected',
      owner: 'out-of-scope',
      reason: 'Promoted note is off-domain or mixed with another product.',
      nextAction: 'preserve_only',
    }
  }

  if (includesAny(lower, ['visibility control', 'obscured', 'screen sharing'])) {
    return {
      status: 'needs_planner',
      owner: 'privacy-data-handling-baseline',
      reason: 'Sensitive-data reveal behavior needs a privacy and UI primitive spec before code.',
      nextAction: 'write_dedicated_spec',
    }
  }

  if (includesAny(lower, ['pantry engine', 'full inventory', 'grocery shopping', 'receipt'])) {
    return {
      status: 'needs_planner',
      owner: 'inventory-and-pantry-surfaces',
      reason: 'Inventory truth must attach to existing inventory, counts, demand, and pantry review code first.',
      nextAction: 'inspect_existing_inventory_code',
    }
  }

  if (includesAny(lower, ['planner start', 'builder start', 'research agent', '/ship', '/close-session'])) {
    return {
      status: 'activated',
      owner: 'existing-agent-skills',
      reason: 'Covered by current planner, builder, research, ship, and close-session skills.',
      nextAction: 'no_project_mutation',
    }
  }

  if (includesAny(lower, ['sticky notes', 'simple sticky notes', 'organize everything'])) {
    return {
      status: 'activated',
      owner: 'sticky-notes-intake-layer',
      reason: 'Sticky Notes intake behavior is now implemented as the local intake layer.',
      nextAction: 'use_sticky_commands',
    }
  }

  const fallbackStatus = DEFAULT_STATUS_BY_CLASS[item.class] || 'needs_planner'
  return {
    status: fallbackStatus,
    owner: item.route || 'manual-review',
    reason: `Default route for ${item.class}.`,
    nextAction:
      fallbackStatus === 'queued'
        ? item.action || 'review_governed_queue_item'
        : item.action || 'review_before_project_mutation',
  }
}

function renderMarkdown(payload) {
  const lines = [
    '# Sticky Notes Processed Actions',
    '',
    `- Generated: ${payload.generatedAt}`,
    `- Source manifest: ${payload.sourceManifest}`,
    `- Promoted packets processed: ${payload.total}`,
    `- Dry run: ${payload.dryRun}`,
    '',
    '## Status Counts',
    '',
  ]

  for (const status of STATUS_ORDER) {
    lines.push(`- ${status}: ${payload.statusCounts[status] || 0}`)
  }

  lines.push('', '## Actions', '')
  for (const status of STATUS_ORDER) {
    const items = payload.actions.filter((item) => item.status === status)
    lines.push(`### ${status}`)
    lines.push('')
    if (!items.length) {
      lines.push('_None._', '')
      continue
    }
    for (const item of items) {
      lines.push(`- ${item.actionId}: note ${item.noteId}, ${item.class}`)
      lines.push(`  - Owner: ${item.owner}`)
      lines.push(`  - Reason: ${item.reason}`)
      lines.push(`  - Next: ${item.nextAction}`)
      lines.push(`  - Packet: ${item.packet}`)
    }
    lines.push('')
  }

  lines.push('## Boundary')
  lines.push('')
  lines.push('This report is safe routing output. It does not include raw note bodies.')
  lines.push('No processed action may mutate code, specs, skills, queues, or project rules without its destination gate.')
  lines.push('')
  return lines.join('\n')
}

export function processPromotedStickyNotes(options = {}) {
  ensureOutputRoot()
  ensureDir(outputPaths.processed)
  const manifestPath = options.manifestFile || outputPaths.promotionsLatest
  const manifest = readJson(manifestPath, null)
  if (!manifest?.promoted) throw new Error(`No Sticky Notes promotion manifest found: ${manifestPath}`)

  const seenByTextHash = new Map()
  const actions = []
  for (const item of manifest.promoted) {
    const absolutePacket = packetPath(item.packet)
    if (!absolutePacket || !fs.existsSync(absolutePacket)) {
      actions.push({
        actionId: `sticky-process-${String(actions.length + 1).padStart(4, '0')}`,
        reviewId: item.reviewId,
        noteRef: item.noteRef,
        noteId: item.noteId,
        class: item.class,
        route: item.route,
        packet: item.packet || null,
        status: 'developer_escalation',
        owner: 'sticky-notes-intake-layer',
        reason: 'Promotion packet is missing and needs manual inspection.',
        nextAction: 'rerun_sticky_promote',
        duplicateOf: null,
        textHash: null,
        textLength: 0,
        mayMutateProject: false,
        requiresReview: true,
      })
      continue
    }

    const packet = extractPacket(absolutePacket)
    const duplicateOf = seenByTextHash.get(packet.textHash) || null
    if (!duplicateOf) seenByTextHash.set(packet.textHash, item.reviewId || `note-${item.noteId}`)
    const decision = classifyProcessedItem(item, packet, duplicateOf)
    actions.push({
      actionId: `sticky-process-${String(actions.length + 1).padStart(4, '0')}`,
      reviewId: item.reviewId,
      noteRef: item.noteRef,
      noteId: item.noteId,
      class: item.class,
      route: item.route,
      packet: item.packet,
      status: decision.status,
      owner: decision.owner,
      reason: decision.reason,
      nextAction: decision.nextAction,
      duplicateOf,
      textHash: packet.textHash,
      textLength: packet.textLength,
      mayMutateProject: false,
      requiresReview: true,
    })
  }

  const stamp = options.stamp || nowStamp()
  const payload = {
    generatedAt: new Date().toISOString(),
    dryRun: Boolean(options.dryRun),
    sourceManifest: relativePath(manifestPath),
    total: actions.length,
    statusCounts: countBy(actions, 'status'),
    classCounts: countBy(actions, 'class'),
    routeCounts: countBy(actions, 'route'),
    actions,
  }

  const jsonFile = path.join(outputPaths.processed, `${stamp}-actions.json`)
  const mdFile = path.join(outputPaths.processed, `${stamp}-report.md`)
  if (!options.dryRun) {
    writeJson(jsonFile, payload)
    fs.writeFileSync(mdFile, renderMarkdown({ ...payload, jsonFile: relativePath(jsonFile) }))
    if (options.writeLatest !== false) {
      writeJson(outputPaths.processedLatest, {
        ...payload,
        jsonFile: relativePath(jsonFile),
        mdFile: relativePath(mdFile),
      })
    }
  }
  return { ...payload, jsonFile, mdFile }
}

function main() {
  const args = parseArgs()
  const result = processPromotedStickyNotes(args)
  console.log(`Processed promoted packets: ${result.total}`)
  console.log(`Activated: ${result.statusCounts.activated || 0}`)
  console.log(`Queued: ${result.statusCounts.queued || 0}`)
  console.log(`Needs planner: ${result.statusCounts.needs_planner || 0}`)
  console.log(`Security review: ${result.statusCounts.security_review || 0}`)
  console.log(`Developer escalation: ${result.statusCounts.developer_escalation || 0}`)
  console.log(`Duplicate: ${result.statusCounts.duplicate || 0}`)
  console.log(`Rejected: ${result.statusCounts.rejected || 0}`)
  if (!result.dryRun) {
    console.log(`Action manifest: ${relativePath(result.jsonFile)}`)
    console.log(`Processing report: ${relativePath(result.mdFile)}`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
