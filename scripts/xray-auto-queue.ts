/**
 * xray-auto-queue.ts
 *
 * Reads Page X-Ray findings and appends new build opportunities
 * to the Unified Build Queue under an "X-Ray Auto-Queue" section.
 *
 * Usage: npx tsx scripts/xray-auto-queue.ts
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const FINDINGS_PATH = path.join(ROOT, 'docs/xrays/findings/findings.json')
const QUEUE_PATH = path.join(ROOT, 'docs/UNIFIED-BUILD-QUEUE.md')

interface Finding {
  id: string
  route: string
  route_slug: string
  status: string
  severity: string
  category: string
  explanation: string
  recommended_fix: string
  model_tier?: string
  tier?: string
  estimated_effort?: string
  codex_buildable?: boolean
  build_opportunity?: boolean
  requires_human_decision?: boolean
  first_seen_scan: number
  dispatch_prompt?: string
  files_involved?: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Fuzzy match: same route AND significant word overlap in description. */
function alreadyInQueue(route: string, description: string, queueText: string): boolean {
  const normQueue = normalize(queueText)
  const normRoute = normalize(route)

  // Route must appear somewhere in the queue
  if (!normQueue.includes(normRoute)) return false

  // Check word overlap (at least 3 significant words matching)
  const words = normalize(description)
    .split(' ')
    .filter((w) => w.length > 3)
  const matchCount = words.filter((w) => normQueue.includes(w)).length
  return matchCount >= Math.min(3, words.length)
}

function tierLabel(f: Finding): string {
  return f.model_tier || f.tier || 'CODEX'
}

function effortLabel(f: Finding): string {
  return f.estimated_effort || 'small'
}

function formatEntry(f: Finding): string {
  const tier = tierLabel(f)
  const effort = effortLabel(f)
  const desc = f.recommended_fix || f.explanation
  const lines = [
    `- [ ] **[${tier}]** \`${f.route}\` - ${desc} (effort: ${effort}) \`SPEC-READY\``,
    `  - Source: X-Ray finding ${f.id}, scan ${f.first_seen_scan}`,
  ]
  if (f.dispatch_prompt) {
    lines.push(`  - Dispatch: ${f.dispatch_prompt}`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // 1. Read findings
  if (!fs.existsSync(FINDINGS_PATH)) {
    console.log('No findings file yet. Nothing to queue.')
    process.exit(0)
  }

  let findings: Finding[]
  try {
    const raw = fs.readFileSync(FINDINGS_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    findings = Array.isArray(parsed) ? parsed : (parsed.findings ?? [])
  } catch (e) {
    console.error('Failed to parse findings.json:', (e as Error).message)
    process.exit(1)
  }

  if (findings.length === 0) {
    console.log('Findings file is empty. Nothing to queue.')
    process.exit(0)
  }

  // 2. Read queue
  let queueText = ''
  if (fs.existsSync(QUEUE_PATH)) {
    queueText = fs.readFileSync(QUEUE_PATH, 'utf-8')
  } else {
    console.log('Build queue not found. Creating fresh queue file.')
    queueText = '# UNIFIED BUILD QUEUE - ChefFlow V1\n\n'
  }

  // 3. Filter actionable findings
  const actionable = findings.filter((f) => {
    const statusOk = f.status === 'new' || f.status === 'open'
    // build_opportunity may be absent; treat codex_buildable as equivalent
    const buildable =
      f.build_opportunity === true ||
      f.codex_buildable === true ||
      (f.build_opportunity === undefined && f.codex_buildable === undefined)
    return statusOk && buildable && !f.requires_human_decision
  })

  if (actionable.length === 0) {
    console.log('No actionable findings (new/open + buildable). Nothing to queue.')
    process.exit(0)
  }

  // 4. Deduplicate against existing queue
  let queued = 0
  let skipped = 0
  const newEntries: string[] = []

  for (const f of actionable) {
    const desc = f.recommended_fix || f.explanation
    if (alreadyInQueue(f.route, desc, queueText)) {
      skipped++
    } else {
      newEntries.push(formatEntry(f))
      queued++
    }
  }

  if (newEntries.length === 0) {
    console.log(`All ${skipped} actionable findings already in queue. Nothing new to add.`)
    process.exit(0)
  }

  // 5. Append to queue
  const sectionHeader = '## X-Ray Auto-Queue'
  const sectionContent = newEntries.join('\n\n')
  const today = new Date().toISOString().split('T')[0]

  if (queueText.includes(sectionHeader)) {
    // Append to existing section (before the next ## or end of file)
    const idx = queueText.indexOf(sectionHeader)
    const afterHeader = queueText.indexOf('\n## ', idx + sectionHeader.length)
    const insertAt = afterHeader === -1 ? queueText.length : afterHeader
    queueText =
      queueText.slice(0, insertAt).trimEnd() +
      '\n\n' +
      sectionContent +
      '\n\n' +
      queueText.slice(insertAt)
  } else {
    queueText =
      queueText.trimEnd() +
      '\n\n---\n\n' +
      sectionHeader +
      ` (auto-generated ${today})\n\n` +
      sectionContent +
      '\n'
  }

  fs.writeFileSync(QUEUE_PATH, queueText, 'utf-8')

  // 6. Summary
  console.log(`X-Ray Auto-Queue complete:`)
  console.log(`  ${queued} new items added to build queue`)
  console.log(`  ${skipped} skipped (already in queue)`)
  console.log(`  ${actionable.length} total actionable findings processed`)
}

main()
