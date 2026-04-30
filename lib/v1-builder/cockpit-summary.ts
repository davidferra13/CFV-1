import { queueRecordSchema, type CockpitSummary, type QueueRecord } from './types'
import { getClaimState } from './claims'
import { readOpenEscalations } from './escalations'
import { readReceipts } from './receipts'
import { pathExists, readJsonl, resolveBuilderPath } from './store'

async function readQueueFile(name: string, root: string) {
  return readJsonl(resolveBuilderPath(name, root), queueRecordSchema)
}

function findTaskForClaim(tasks: QueueRecord[], taskId: string | null) {
  if (!taskId) return null
  return tasks.find((task) => task.id === taskId) ?? null
}

async function buildIntakeSummary(root: string) {
  const stickyCandidates = [
    'system/intake/sticky-notes/latest.json',
    'system/intake/sticky-notes/report.json',
    'system/sticky-notes/latest.json',
  ]
  const inboxCandidates = [
    'system/intake/3977/queue.json',
    'system/persona-pipeline-state.json',
  ]

  const stickyConnected = await Promise.any(
    stickyCandidates.map((path) => pathExists(`${root}/${path}`).then((exists) => (exists ? path : Promise.reject()))),
  ).catch(() => null)
  const inboxConnected = await Promise.any(
    inboxCandidates.map((path) => pathExists(`${root}/${path}`).then((exists) => (exists ? path : Promise.reject()))),
  ).catch(() => null)

  return {
    stickyNotes: stickyConnected ? `Sticky Notes intake evidence: ${stickyConnected}` : 'Sticky Notes intake not connected yet',
    inbox3977: inboxConnected ? `3977 intake evidence: ${inboxConnected}` : '3977 offline or not configured',
  }
}

export async function buildCockpitSummary(root = process.cwd(), now = new Date()): Promise<CockpitSummary> {
  const errors: string[] = []
  const approved = await readQueueFile('approved-queue.jsonl', root)
  const blocked = await readQueueFile('blocked.jsonl', root)
  const research = await readQueueFile('research-queue.jsonl', root)
  const parkedV2 = await readQueueFile('parked-v2.jsonl', root)
  const claimState = await getClaimState(root, now)
  const receipts = await readReceipts(root)
  const escalations = await readOpenEscalations(root)

  for (const result of [approved, blocked, research, parkedV2, claimState, receipts, escalations]) {
    if (!result.ok) errors.push(...result.errors)
  }

  const approvedRecords = approved.records
  const activeTask = findTaskForClaim(approvedRecords, claimState.activeClaim?.taskId ?? null)
  const openEscalations = escalations.records

  return {
    ok: errors.length === 0,
    generatedAt: now.toISOString(),
    activeTask,
    activeClaim: claimState.activeClaim,
    queueCounts: {
      v1Blockers: approvedRecords.filter((task) => task.classification === 'approved_v1_blocker' && task.status === 'queued').length,
      v1Support: approvedRecords.filter((task) => task.classification === 'approved_v1_support' && task.status === 'queued').length,
      blocked: blocked.records.length,
      research: research.records.length,
      parkedV2: parkedV2.records.length,
      escalations: openEscalations.length,
    },
    latestReceipts: receipts.records.slice(0, 8),
    openEscalations,
    pricingReadiness: {
      status: 'blocked',
      message: 'THE PRICING DATA SUCKS AND IT MUST BE FIXED.',
      evidence: [
        '.claude/skills/pricing-reliability/SKILL.md',
        'docs/pricing-pipeline.md',
      ],
    },
    intake: await buildIntakeSummary(root),
    errors,
  }
}
