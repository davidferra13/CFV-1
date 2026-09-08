import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_CASE_PATH = 'docs/revival/real-cases/dfpc-0492597d-shadow.json'
export const DEFAULT_REPORT_JSON_PATH =
  'docs/revival/real-cases/generated/dfpc-0492597d-shadow-report.json'
export const DEFAULT_REPORT_MD_PATH =
  'docs/revival/real-cases/generated/dfpc-0492597d-shadow-report.md'

const EVIDENCE_STATES = new Set(['supported', 'unknown', 'conflicted', 'blocked'])
const FORBIDDEN_KEYS = new Set([
  'name',
  'email',
  'phone',
  'client_name',
  'client_email',
  'client_phone',
  'to',
  'from',
  'subject',
  'body',
  'message_body',
  'raw_body',
])
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_PATTERN = /\b(?:\+?1[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/

function readJson(repoRoot, relativePath) {
  return JSON.parse(readFileSync(path.resolve(repoRoot, relativePath), 'utf8'))
}

function walk(value, visit, trail = []) {
  visit(value, trail)
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, [...trail, index]))
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => walk(item, visit, [...trail, key]))
  }
}

export function validatePrivacy(caseFile) {
  walk(caseFile, (value, trail) => {
    const key = String(trail.at(-1) ?? '').toLowerCase()
    assert.ok(!FORBIDDEN_KEYS.has(key), `Privacy guard rejected key: ${trail.join('.')}`)
    if (typeof value === 'string') {
      assert.ok(
        !EMAIL_PATTERN.test(value),
        `Privacy guard rejected an email-like value at ${trail.join('.')}`
      )
      assert.ok(
        !PHONE_PATTERN.test(value),
        `Privacy guard rejected a phone-like value at ${trail.join('.')}`
      )
    }
  })
  assert.deepEqual(caseFile.privacy, {
    client_identity: 'omitted',
    contact_details: 'omitted',
    message_bodies: 'omitted',
    culinary_content: 'omitted',
  })
}

export function validateCase(loop, caseFile) {
  assert.equal(caseFile.schema_version, 1)
  assert.equal(caseFile.source_system, 'dfpc')
  assert.equal(caseFile.controls?.mutation_state, 'read-only-shadow')
  assert.equal(caseFile.controls?.dispatch_state, 'not-sent')
  assert.ok(Number.isInteger(caseFile.controls?.due_through_order))
  assert.ok(caseFile.controls.due_through_order >= 1)
  assert.ok(caseFile.controls.due_through_order <= loop.stages.length)
  validatePrivacy(caseFile)

  const evidenceIds = new Set(caseFile.evidence.map((item) => item.id))
  assert.equal(evidenceIds.size, caseFile.evidence.length)
  for (const [stageId, facts] of Object.entries(caseFile.stage_evidence)) {
    assert.ok(
      loop.stages.some((stage) => stage.id === stageId),
      `Unknown stage: ${stageId}`
    )
    for (const [factName, fact] of Object.entries(facts)) {
      assert.ok(EVIDENCE_STATES.has(fact.state), `Invalid state for ${stageId}.${factName}`)
      for (const evidenceId of fact.evidence_ids ?? []) {
        assert.ok(
          evidenceIds.has(evidenceId),
          `Unknown evidence ${evidenceId} for ${stageId}.${factName}`
        )
      }
    }
  }
  for (const evidenceId of caseFile.coordination.pending_action.evidence_ids) {
    assert.ok(evidenceIds.has(evidenceId), `Unknown coordination evidence: ${evidenceId}`)
  }
  return caseFile
}

function evaluateStage(stage, caseFile) {
  if (stage.order > caseFile.controls.due_through_order) {
    return {
      order: stage.order,
      id: stage.id,
      status: 'not-due',
      open_evidence: [],
      blocked_evidence: [],
    }
  }

  const facts = caseFile.stage_evidence[stage.id] ?? {}
  const openEvidence = []
  const blockedEvidence = []
  for (const requirement of stage.required_evidence) {
    const state = facts[requirement]?.state ?? 'unknown'
    if (state === 'unknown') openEvidence.push(requirement)
    if (state === 'conflicted' || state === 'blocked') blockedEvidence.push(requirement)
  }
  const status =
    blockedEvidence.length > 0 ? 'blocked' : openEvidence.length > 0 ? 'open' : 'passed'
  return {
    order: stage.order,
    id: stage.id,
    status,
    open_evidence: openEvidence,
    blocked_evidence: blockedEvidence,
  }
}

function deriveLifecycle(caseFile, stages) {
  const approval = caseFile.stage_evidence['quote-and-scope']?.approval_state
  if (
    stages[0]?.status === 'passed' &&
    approval?.state === 'supported' &&
    approval?.value === 'owner-reply-sent' &&
    caseFile.coordination.pending_action.party === 'client'
  )
    return 'availability-reviewed'
  if (stages[0]?.status === 'passed') return 'inquiry-received'
  return 'intake-open'
}

export function evaluateCase(loop, rawCase) {
  const caseFile = validateCase(loop, structuredClone(rawCase))
  const stages = loop.stages.map((stage) => evaluateStage(stage, caseFile))
  const counts = Object.fromEntries(
    ['passed', 'open', 'blocked', 'not-due'].map((status) => [
      status,
      stages.filter((stage) => stage.status === status).length,
    ])
  )
  return {
    schema_version: 1,
    case_id: caseFile.case_id,
    source_record_id: caseFile.source_record_id,
    evidence_cutoff_at: caseFile.evidence_cutoff_at,
    evaluation_mode: caseFile.controls.mutation_state,
    external_dispatch: caseFile.controls.dispatch_state,
    lifecycle_stage: deriveLifecycle(caseFile, stages),
    waiting_on: caseFile.coordination.pending_action.party,
    next_objective: caseFile.coordination.next_objective,
    first_real_event_complete: stages.every((stage) => stage.status === 'passed'),
    completed_event_count_increment: 0,
    counts,
    first_open_stage:
      stages.find((stage) => stage.status === 'open' || stage.status === 'blocked')?.id ?? null,
    stages,
    source_coverage: caseFile.source_coverage,
  }
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function buildReport(loop, caseFile) {
  const evaluation = evaluateCase(loop, caseFile)
  return {
    ...evaluation,
    source_fingerprint: createHash('sha256').update(stableJson(caseFile)).digest('hex'),
  }
}

export function renderMarkdown(report) {
  const rows = report.stages.map((stage) => {
    const open = stage.open_evidence.length ? stage.open_evidence.join(', ') : '—'
    const blocked = stage.blocked_evidence.length ? stage.blocked_evidence.join(', ') : '—'
    return `| ${stage.order} | ${stage.id} | ${stage.status} | ${open} | ${blocked} |`
  })
  return [
    `# Real DFPC Shadow Evaluation — ${report.case_id}`,
    '',
    `- Evidence cutoff: ${report.evidence_cutoff_at}`,
    `- Mode: ${report.evaluation_mode}`,
    `- External dispatch: ${report.external_dispatch}`,
    `- Lifecycle: ${report.lifecycle_stage}`,
    `- Waiting on: ${report.waiting_on}`,
    `- First open stage: ${report.first_open_stage}`,
    '',
    '| # | Stage | Status | Open evidence | Blocked evidence |',
    '| ---: | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Honest result',
    '',
    `This evidence run records ${report.counts.passed} passed, ${report.counts.open} open, ${report.counts.blocked} blocked, and ${report.counts['not-due']} not-due stages.`,
    'It does not complete the first real event and adds zero to the three-event repeatability gate.',
    'No follow-up was generated or sent, and no production record was mutated.',
    '',
    'The primary calendar showed no busy window on the requested date at the cutoff. That observation is context only; it is not independent proof of operational capacity or availability.',
    'Phone and Google Messages remain an explicit access gap.',
    '',
  ].join('\n')
}

export function writeOrCheckReports(repoRoot, mode) {
  const loop = readJson(repoRoot, 'docs/revival/dfpc-operating-loop.json')
  const caseFile = readJson(repoRoot, DEFAULT_CASE_PATH)
  const report = buildReport(loop, caseFile)
  const outputs = [
    [DEFAULT_REPORT_JSON_PATH, stableJson(report)],
    [DEFAULT_REPORT_MD_PATH, renderMarkdown(report)],
  ]
  for (const [relativePath, content] of outputs) {
    const fullPath = path.resolve(repoRoot, relativePath)
    if (mode === 'write') {
      mkdirSync(path.dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content)
    } else {
      assert.equal(
        readFileSync(fullPath, 'utf8'),
        content,
        `Generated report is stale: ${relativePath}`
      )
    }
  }
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const mode = process.argv.includes('--write')
      ? 'write'
      : process.argv.includes('--check')
        ? 'check'
        : 'print'
    const repoRoot = process.cwd()
    const report =
      mode === 'print'
        ? buildReport(
            readJson(repoRoot, 'docs/revival/dfpc-operating-loop.json'),
            readJson(repoRoot, DEFAULT_CASE_PATH)
          )
        : writeOrCheckReports(repoRoot, mode)
    console.log(
      JSON.stringify({
        case_id: report.case_id,
        lifecycle_stage: report.lifecycle_stage,
        waiting_on: report.waiting_on,
        counts: report.counts,
        first_real_event_complete: report.first_real_event_complete,
      })
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
