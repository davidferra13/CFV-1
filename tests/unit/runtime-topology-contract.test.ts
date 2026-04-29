import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRuntimeTopologyReport,
  classifyTopology,
  parseRuntimeSignals,
} from '../../scripts/audit-runtime-topology.mjs'

function source(path: string, layer: 'documented' | 'operational', content: string) {
  return {
    path,
    layer,
    role: 'test source',
    exists: true,
    content,
  }
}

test('parseRuntimeSignals extracts production port assignments and app domain references', () => {
  const signals = parseRuntimeSignals([
    source(
      'chefflow-watchdog.ps1',
      'operational',
      [
        '$devPort = 3100',
        '$betaPort = 3200',
        '$prodPort = 3000',
        'Invoke-WebRequest -Uri "https://app.cheflowhq.com/api/health/ping"',
      ].join('\n')
    ),
  ])

  assert.ok(
    signals.some(
      (signal) =>
        signal.env === 'prod' &&
        signal.port === 3000 &&
        signal.kind === 'assignment' &&
        signal.sourcePath === 'chefflow-watchdog.ps1'
    )
  )
  assert.ok(
    signals.some(
      (signal) =>
        signal.env === 'prod' &&
        signal.domain === 'app.cheflowhq.com' &&
        signal.kind === 'domain-reference'
    )
  )
})

test('classifyTopology reports production 3000 versus canonical 3300 as drift', () => {
  const signals = parseRuntimeSignals([
    source('AGENTS.md', 'documented', '| Production | 3300 | app.cheflowhq.com |'),
    source('scripts/run-next-prod.mjs', 'operational', "const port = Number(process.env.PORT || '3000')"),
  ])

  const result = classifyTopology(signals)

  assert.equal(result.verdict, 'mixed')
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.classification === 'port-conflict' &&
        finding.severity === 'error' &&
        finding.env === 'prod' &&
        finding.message.includes('3000, 3300')
    )
  )
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.classification === 'operational-drift' &&
        finding.message.includes('scripts/run-next-prod.mjs')
    )
  )
})

test('classifyTopology flags app.cheflowhq.com tied to localhost port 3000', () => {
  const signals = parseRuntimeSignals([
    source(
      'docs/CLAUDE-REFERENCE.md',
      'documented',
      'app.cheflowhq.com -> localhost:3000'
    ),
  ])

  const result = classifyTopology(signals)

  assert.ok(
    result.findings.some(
      (finding) =>
        finding.classification === 'domain-conflict' &&
        finding.severity === 'error' &&
        finding.message.includes('app.cheflowhq.com is tied to port 3000')
    )
  )
})

test('buildRuntimeTopologyReport preserves missing source evidence without failing parsing', () => {
  const report = buildRuntimeTopologyReport(
    [
      source('AGENTS.md', 'documented', '| Production | 3300 | app.cheflowhq.com |'),
      {
        path: 'missing.ps1',
        layer: 'operational',
        role: 'missing test file',
        exists: false,
        content: null,
      },
    ],
    { generatedAt: '2026-04-29T00:00:00.000Z' }
  )

  assert.equal(report.generatedAt, '2026-04-29T00:00:00.000Z')
  assert.deepEqual(report.missingSources, [
    {
      sourcePath: 'missing.ps1',
      layer: 'operational',
      role: 'missing test file',
    },
  ])
  assert.ok(report.signals.some((signal) => signal.port === 3300))
})
