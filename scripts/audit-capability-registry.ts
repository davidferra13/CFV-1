import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import * as capabilityModule from '../lib/capabilities/index.ts'

const capabilityApi =
  (capabilityModule as { default?: typeof capabilityModule }).default ?? capabilityModule
const {
  CHEFFLOW_CAPABILITY_REGISTRY,
  applyCapabilityProof,
  evaluateCapabilityProofFile,
  getCapabilityAuditSummary,
  getCapabilityBacklog,
  validateCapabilityRegistry,
} = capabilityApi

const root = process.cwd()

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) files.push(...walk(full))
    else files.push(relative(root, full).replaceAll('\\', '/'))
  }
  return files
}

const testFiles = walk(join(root, 'tests'))
const validationErrors = validateCapabilityRegistry(CHEFFLOW_CAPABILITY_REGISTRY)
if (validationErrors.length) {
  console.error(validationErrors.join('\n'))
  process.exitCode = 1
}

function testTokens(id: string, capability: string, shell: string): string[] {
  const stop = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'system', 'management'])
  return `${id} ${capability} ${shell}`
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((token) => token.length >= 5 && !stop.has(token))
}

const rows = CHEFFLOW_CAPABILITY_REGISTRY.map((entry) => {
  const proof = evaluateCapabilityProofFile(entry, root)
  const audited = applyCapabilityProof(entry, proof)
  const evidenceHits = entry.evidence.filter((candidate) => existsSync(join(root, candidate)))
  const tokens = testTokens(entry.id, entry.capability, entry.shell)
  const testHits = testFiles
    .filter((file) => tokens.some((token) => file.toLowerCase().includes(token)))
    .slice(0, 12)
  const observedCode = evidenceHits.length > 0
  const observedTests = testHits.length > 0
  const observedState = !observedCode
    ? 'NO_MAPPED_CODE_SIGNAL'
    : observedTests
      ? 'CANDIDATE_CODE_AND_TEST_SIGNAL'
      : 'CANDIDATE_CODE_SIGNAL_ONLY'

  return {
    ...audited,
    declaredBuildStatus: entry.buildStatus,
    declaredTestStatus: entry.testStatus,
    declaredProductDebt: entry.productDebt,
    proof,
    observedState,
    evidenceHits,
    testHits,
  }
})

const summary = getCapabilityAuditSummary(rows)
const observedCounts = rows.reduce<Record<string, number>>((acc, row) => {
  acc[row.observedState] = (acc[row.observedState] ?? 0) + 1
  return acc
}, {})
const proofCounts = rows.reduce<Record<string, number>>((acc, row) => {
  acc[row.proof.state] = (acc[row.proof.state] ?? 0) + 1
  return acc
}, {})
const nextCapability = getCapabilityBacklog(rows)[0] ?? null

const report = {
  generatedAt: new Date().toISOString(),
  doctrine:
    'A normal chef workflow that cannot be completed without thinking about or manually switching to another application is a ChefFlow capability gap.',
  totalCapabilities: summary.total,
  capabilityGaps: summary.gaps.length,
  stackEliminated: summary.stackEliminated,
  launchOnlyDebt: summary.launchOnlyDebt.map((entry) => entry.id),
  observedCounts,
  proofCounts,
  nextCapability: nextCapability
    ? {
        id: nextCapability.id,
        capability: nextCapability.capability,
        shell: nextCapability.shell,
        priority: nextCapability.priority,
        strategy: nextCapability.strategy,
        proofState: nextCapability.proof.state,
      }
    : null,
  validationErrors,
  capabilities: rows,
}

mkdirSync(join(root, 'reports'), { recursive: true })
writeFileSync(
  join(root, 'reports', 'capability-registry-audit.json'),
  `${JSON.stringify(report, null, 2)}\n`
)

const gapRows = getCapabilityBacklog(rows)
  .map(
    (row) =>
      `| ${row.priority} | ${row.shell} | ${row.capability} | ${row.strategy} | ${row.buildStatus} | ${row.testStatus} | ${row.proof.state} | ${row.observedState} |`
  )
  .join('\n')

const markdown = `# ChefFlow Capability Registry Audit

Generated: ${report.generatedAt}

North star: **Can a chef operate their entire working day from ChefFlow without needing to think about or manually switch between a stack of other applications?**

- capabilities: ${summary.total}
- unresolved capability gaps after proof application: ${summary.gaps.length}
- workflows with stack elimination verified: ${summary.stackEliminated}
- LAUNCH ONLY debt: ${summary.launchOnlyDebt.length}
- proof states: ${Object.entries(proofCounts)
  .map(([state, count]) => `${state}=${count}`)
  .join(', ')}
- candidate code + related-test signals: ${observedCounts.CANDIDATE_CODE_AND_TEST_SIGNAL ?? 0}
- candidate code signals only: ${observedCounts.CANDIDATE_CODE_SIGNAL_ONLY ?? 0}
- no mapped code signal: ${observedCounts.NO_MAPPED_CODE_SIGNAL ?? 0}
- next capability: ${nextCapability ? `${nextCapability.id} — ${nextCapability.capability} (${nextCapability.priority}, ${nextCapability.proof.state})` : 'none'}

## Backlog

| priority | shell | capability | strategy | build | test | proof | repo evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
${gapRows}

## Interpretation

Heuristic repo evidence is discovery-only. A capability leaves the backlog only when a current capability proof receipt verifies implementation, tests, runtime behavior, and zero undocumented external app switches. LAUNCH ONLY always remains debt.
`

mkdirSync(join(root, 'docs', 'audit'), { recursive: true })
writeFileSync(join(root, 'docs', 'audit', '2026-09-16-chefflow-capability-registry.md'), markdown)
console.log(
  JSON.stringify(
    {
      total: summary.total,
      gaps: summary.gaps.length,
      launchOnly: summary.launchOnlyDebt.length,
      proofCounts,
      observedCounts,
      nextCapability: report.nextCapability,
    },
    null,
    2
  )
)
