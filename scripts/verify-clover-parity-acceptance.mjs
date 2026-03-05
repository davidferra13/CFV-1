#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const paths = {
  mvpContract: path.join(ROOT, 'plans', 'clover-parity-mvp-contract.md'),
  masterTodo: path.join(ROOT, 'plans', 'clover-parity-master-todo.md'),
  acceptanceSuite: path.join(ROOT, 'plans', 'clover-parity-acceptance-suite.json'),
  outputDir: path.join(ROOT, 'reports'),
  outputFile: path.join(ROOT, 'reports', 'clover-parity-acceptance-report.json'),
}

function parseMvpIds(raw) {
  const ids = []
  const seen = new Set()
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+`(CLV-[^`]+)`/)
    if (!match) continue
    const id = match[1]
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function parseMasterStatuses(raw) {
  const map = new Map()
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^- \[( |x|~)\]\s+`(CLV-[^`]+)`/)
    if (!match) continue
    const marker = match[1]
    const id = match[2]
    const status = marker === 'x' ? 'done' : marker === '~' ? 'inProgress' : 'notStarted'
    map.set(id, status)
  }
  return map
}

function normalizeCase(rawCase) {
  return {
    id: String(rawCase?.id || '').trim(),
    title: String(rawCase?.title || '').trim(),
    clvIds: Array.isArray(rawCase?.clvIds)
      ? rawCase.clvIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    preconditions: Array.isArray(rawCase?.preconditions)
      ? rawCase.preconditions.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    steps: Array.isArray(rawCase?.steps)
      ? rawCase.steps.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    expected: Array.isArray(rawCase?.expected)
      ? rawCase.expected.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    evidence: Array.isArray(rawCase?.evidence)
      ? rawCase.evidence.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
  }
}

function checkSuiteShape(suite) {
  const errors = []
  if (!suite || typeof suite !== 'object') {
    errors.push('Acceptance suite JSON is missing or invalid.')
    return errors
  }

  if (!suite.targetSegment || typeof suite.targetSegment !== 'string') {
    errors.push('Acceptance suite requires string field: targetSegment.')
  }

  if (!Array.isArray(suite.cases) || suite.cases.length === 0) {
    errors.push('Acceptance suite requires non-empty array: cases.')
  }

  return errors
}

function summarizeStatuses(ids, statusMap) {
  const summary = { done: 0, inProgress: 0, notStarted: 0, unknown: 0, total: ids.length }
  for (const id of ids) {
    const status = statusMap.get(id)
    if (status === 'done') summary.done += 1
    else if (status === 'inProgress') summary.inProgress += 1
    else if (status === 'notStarted') summary.notStarted += 1
    else summary.unknown += 1
  }
  return summary
}

function completionPercent(done, inProgress, total) {
  if (total <= 0) return 0
  return Math.round(((done + inProgress * 0.5) / total) * 1000) / 10
}

async function main() {
  const [mvpRaw, masterRaw, suiteRaw] = await Promise.all([
    readFile(paths.mvpContract, 'utf8'),
    readFile(paths.masterTodo, 'utf8'),
    readFile(paths.acceptanceSuite, 'utf8'),
  ])

  const suite = JSON.parse(suiteRaw)
  const suiteShapeErrors = checkSuiteShape(suite)
  if (suiteShapeErrors.length) {
    throw new Error(suiteShapeErrors.join(' '))
  }

  const mvpIds = parseMvpIds(mvpRaw)
  const masterStatuses = parseMasterStatuses(masterRaw)
  const normalizedCases = suite.cases.map(normalizeCase)

  const errors = []
  const warnings = []

  if (mvpIds.length === 0) {
    errors.push('No MVP CLV IDs parsed from contract.')
  }

  const caseIdSeen = new Set()
  const coverage = new Map()
  const unknownIdsInSuite = new Set()

  for (const testCase of normalizedCases) {
    if (!testCase.id) errors.push('UAT case missing id.')
    if (!testCase.title) errors.push(`UAT case ${testCase.id || '<unknown>'} missing title.`)
    if (caseIdSeen.has(testCase.id)) errors.push(`Duplicate UAT case id: ${testCase.id}`)
    caseIdSeen.add(testCase.id)

    if (testCase.clvIds.length === 0) errors.push(`UAT case ${testCase.id} has no CLV mapping.`)
    if (testCase.steps.length === 0) errors.push(`UAT case ${testCase.id} has no scripted steps.`)
    if (testCase.expected.length === 0) errors.push(`UAT case ${testCase.id} has no expected outcomes.`)

    for (const id of testCase.clvIds) {
      if (!mvpIds.includes(id)) {
        unknownIdsInSuite.add(id)
        continue
      }
      const hit = coverage.get(id) || []
      hit.push(testCase.id)
      coverage.set(id, hit)
    }
  }

  for (const unknown of unknownIdsInSuite) {
    errors.push(`UAT suite references non-MVP ID: ${unknown}`)
  }

  const uncoveredMvpIds = mvpIds.filter((id) => !coverage.has(id))
  if (uncoveredMvpIds.length > 0) {
    errors.push(`Uncovered MVP IDs: ${uncoveredMvpIds.join(', ')}`)
  }

  const unresolvedMvpIds = mvpIds.filter((id) => masterStatuses.get(id) !== 'done')
  if (unresolvedMvpIds.length > 0) {
    warnings.push(
      `MVP IDs not marked done in master to-do: ${unresolvedMvpIds.join(', ')}`
    )
  }

  if (suite.targetSegment.trim().toLowerCase() !== 'quick service') {
    warnings.push(
      `Suite target segment (${suite.targetSegment}) differs from expected quick service pilot segment.`
    )
  }

  const statusSummary = summarizeStatuses(mvpIds, masterStatuses)
  const report = {
    generatedAt: new Date().toISOString(),
    targetSegment: suite.targetSegment,
    totals: {
      mvpIds: mvpIds.length,
      uatCases: normalizedCases.length,
      mappedIds: mvpIds.length - uncoveredMvpIds.length,
      unresolvedMvpIds: unresolvedMvpIds.length,
      completionPercent: completionPercent(
        statusSummary.done,
        statusSummary.inProgress,
        statusSummary.total
      ),
    },
    statusSummary,
    uncoveredMvpIds,
    unresolvedMvpIds,
    warnings,
    errors,
    coverage: Object.fromEntries(
      mvpIds.map((id) => [id, coverage.get(id) || []])
    ),
  }

  await mkdir(paths.outputDir, { recursive: true })
  await writeFile(paths.outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  if (errors.length > 0) {
    console.error('CLOVER PARITY ACCEPTANCE: FAIL')
    for (const error of errors) console.error(`- ${error}`)
    if (warnings.length > 0) {
      console.error('Warnings:')
      for (const warning of warnings) console.error(`- ${warning}`)
    }
    process.exit(1)
  }

  console.log('CLOVER PARITY ACCEPTANCE: PASS')
  console.log(`- MVP IDs: ${mvpIds.length}`)
  console.log(`- UAT Cases: ${normalizedCases.length}`)
  console.log(`- Mapped IDs: ${mvpIds.length - uncoveredMvpIds.length}/${mvpIds.length}`)
  console.log(
    `- Completion: ${report.totals.completionPercent}% (${statusSummary.done} done, ${statusSummary.inProgress} in progress, ${statusSummary.notStarted} not started, ${statusSummary.unknown} unknown)`
  )
  if (warnings.length > 0) {
    console.log('Warnings:')
    for (const warning of warnings) console.log(`- ${warning}`)
  }
  console.log(`- Report: ${path.relative(ROOT, paths.outputFile)}`)
}

main().catch((error) => {
  console.error('CLOVER PARITY ACCEPTANCE: FAIL')
  console.error(`- ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
