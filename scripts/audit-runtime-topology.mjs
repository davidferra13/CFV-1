#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

export const CANONICAL_TOPOLOGY = Object.freeze({
  dev: Object.freeze({
    label: 'Development',
    expectedPort: 3100,
    domains: Object.freeze(['localhost']),
  }),
  beta: Object.freeze({
    label: 'Beta',
    expectedPort: 3200,
    domains: Object.freeze(['beta.cheflowhq.com']),
  }),
  prod: Object.freeze({
    label: 'Production',
    expectedPort: 3300,
    domains: Object.freeze(['app.cheflowhq.com']),
  }),
  ollama: Object.freeze({
    label: 'Ollama',
    expectedPort: 11434,
    domains: Object.freeze(['localhost']),
  }),
})

export const SOURCE_MANIFEST = Object.freeze([
  Object.freeze({
    path: 'AGENTS.md',
    layer: 'documented',
    role: 'project operating rules',
  }),
  Object.freeze({
    path: 'docs/chefflow-product-definition.md',
    layer: 'documented',
    role: 'product definition topology table',
  }),
  Object.freeze({
    path: 'docs/system-behavior-map.md',
    layer: 'documented',
    role: 'system behavior topology table',
  }),
  Object.freeze({
    path: 'docs/CLAUDE-REFERENCE.md',
    layer: 'documented',
    role: 'legacy agent reference',
  }),
  Object.freeze({
    path: 'docs/emergency-runbook.md',
    layer: 'documented',
    role: 'legacy emergency runbook',
  }),
  Object.freeze({
    path: 'docs/architecture/unification-plan.md',
    layer: 'documented',
    role: 'architecture transition notes',
  }),
  Object.freeze({
    path: 'package.json',
    layer: 'operational',
    role: 'npm scripts',
  }),
  Object.freeze({
    path: 'chefflow-watchdog.ps1',
    layer: 'operational',
    role: 'watchdog port constants',
  }),
  Object.freeze({
    path: 'scripts/run-next-prod.mjs',
    layer: 'operational',
    role: 'production server launcher',
  }),
  Object.freeze({
    path: 'scripts/scheduled/prod-health-check.ps1',
    layer: 'operational',
    role: 'production health check',
  }),
  Object.freeze({
    path: 'scripts/scheduled/live-ops-guardian.ps1',
    layer: 'operational',
    role: 'scheduled live ops probes',
  }),
])

const HOST_ENV = Object.freeze({
  'app.cheflowhq.com': 'prod',
  'beta.cheflowhq.com': 'beta',
  'localhost': null,
  '127.0.0.1': null,
  '0.0.0.0': null,
})

const RELEVANT_HINT = /\b(prod|production|dev|development|beta|ollama|port|localhost|127\.0\.0\.1|0\.0\.0\.0|cheflowhq\.com|next start|PORT|baseUrl|prodPort|betaPort|devPort)\b/i
const URL_RE = /\bhttps?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s'"`<>)\]}]*)?/gi
const BARE_DOMAIN_RE = /\b(?:app|beta)\.cheflowhq\.com\b/gi
const LOCALHOST_PORT_RE = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})\b/gi
const DASH_P_RE = /(?:^|\s)-p\s+(\d{2,5})(?=\s|$)/gi
const NEXT_START_PORT_RE = /\bnext\s+start\b[^\r\n]*\s-p\s+(\d{2,5})\b/gi
const ASSIGNMENT_RE = /\b(devPort|betaPort|prodPort|PORT|port)\b\s*[:=]\s*['"]?(\d{2,5})['"]?/gi
const PROCESS_PORT_DEFAULT_RE = /process\.env\.PORT\s*\|\|\s*['"](\d{2,5})['"]/gi
const PORT_WORD_RE = /\bport\s+(\d{2,5})\b/gi
const MARKDOWN_TABLE_PORT_RE = /\|\s*([^|\r\n]*?)\s*\|\s*(\d{2,5})\s*\|/gi

function lineIsRelevant(line) {
  return RELEVANT_HINT.test(line)
}

function inferEnvFromPath(sourcePath) {
  const lowerPath = sourcePath.toLowerCase()
  if (lowerPath.includes('prod-health') || lowerPath.includes('run-next-prod')) {
    return 'prod'
  }
  if (lowerPath.includes('watchdog')) {
    return null
  }
  if (lowerPath.includes('beta')) {
    return 'beta'
  }
  return null
}

function inferEnvFromLabel(label) {
  const lower = label.toLowerCase()
  if (lower.includes('app.cheflowhq.com')) return 'prod'
  if (lower.includes('beta.cheflowhq.com')) return 'beta'
  if (/\b(prod|production)\b/.test(lower)) return 'prod'
  if (/\b(beta)\b/.test(lower)) return 'beta'
  if (/\b(dev|development)\b/.test(lower)) return 'dev'
  if (/\b(ollama)\b/.test(lower)) return 'ollama'
  return null
}

function inferEnvFromLine(line, sourcePath, fallbackEnv = null) {
  const lower = line.toLowerCase()
  if (lower.includes('app.cheflowhq.com')) return 'prod'
  if (lower.includes('beta.cheflowhq.com')) return 'beta'
  if (/\bprodport\b/.test(lower)) return 'prod'
  if (/\bbetaport\b/.test(lower)) return 'beta'
  if (/\bdevport\b/.test(lower)) return 'dev'
  if (/\bollama\b/.test(lower) || lower.includes(':11434')) return 'ollama'
  if (/\b(prod|production)\b/.test(lower)) return 'prod'
  if (/\bbeta\b/.test(lower)) return 'beta'
  if (/\b(dev|development)\b/.test(lower)) return 'dev'
  if (fallbackEnv) return fallbackEnv
  return inferEnvFromPath(sourcePath)
}

function inferContextEnv(line) {
  const lower = line.toLowerCase()
  if (lower.includes('app.cheflowhq.com')) return 'prod'
  if (lower.includes('beta.cheflowhq.com')) return 'beta'
  if (/\bprodport\b|\b(prod|production)\b/.test(lower)) return 'prod'
  if (/\bbetaport\b|\bbeta\b/.test(lower)) return 'beta'
  if (/\bdevport\b|\b(dev|development)\b/.test(lower)) return 'dev'
  if (/\bollama\b/.test(lower)) return 'ollama'
  return null
}

function inferEnvNearIndex(line, index, fallbackEnv) {
  const left = line.slice(Math.max(0, index - 40), index).toLowerCase()
  const right = line.slice(index, Math.min(line.length, index + 40)).toLowerCase()
  const nearby = `${left} ${right}`

  if (nearby.includes('app.cheflowhq.com')) return 'prod'
  if (nearby.includes('beta.cheflowhq.com')) return 'beta'

  const candidates = [
    { env: 'prod', index: Math.max(left.lastIndexOf('production'), left.lastIndexOf('prod')) },
    { env: 'beta', index: left.lastIndexOf('beta') },
    { env: 'dev', index: Math.max(left.lastIndexOf('development'), left.lastIndexOf('dev')) },
    { env: 'ollama', index: left.lastIndexOf('ollama') },
  ]
    .filter((candidate) => candidate.index >= 0)
    .sort((a, b) => b.index - a.index)

  if (candidates[0]) return candidates[0].env

  return fallbackEnv
}

function buildSignal({ source, lineNumber, line, env, port = null, domain = null, kind, note = null }) {
  return {
    sourcePath: source.path,
    layer: source.layer,
    role: source.role,
    lineNumber,
    env,
    port,
    domain,
    kind,
    note,
    text: line.trim(),
  }
}

function addPortSignal(signals, seen, source, lineNumber, line, env, port, kind, note = null) {
  if (!env || !Number.isInteger(port)) return
  const key = [source.path, lineNumber, env, port, kind, note ?? ''].join('|')
  if (seen.has(key)) return
  seen.add(key)
  signals.push(buildSignal({ source, lineNumber, line, env, port, kind, note }))
}

function addDomainSignal(signals, seen, source, lineNumber, line, env, domain, kind, note = null) {
  if (!env || !domain) return
  const key = [source.path, lineNumber, env, domain, kind, note ?? ''].join('|')
  if (seen.has(key)) return
  seen.add(key)
  signals.push(buildSignal({ source, lineNumber, line, env, domain, kind, note }))
}

function parsePort(value) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  return port
}

function resetRegex(regex) {
  regex.lastIndex = 0
  return regex
}

function extractSignalsFromLine({ source, line, lineNumber, fallbackEnv, signals, seen }) {
  if (!lineIsRelevant(line)) return

  const inferredEnv = inferEnvFromLine(line, source.path, fallbackEnv)

  for (const match of line.matchAll(resetRegex(URL_RE))) {
    try {
      const url = new URL(match[0])
      const host = url.hostname.toLowerCase()
      const domainEnv = HOST_ENV[host] ?? inferredEnv
      if (HOST_ENV[host]) {
        addDomainSignal(signals, seen, source, lineNumber, line, domainEnv, host, 'domain-reference')
      }
      if (url.port) {
        addPortSignal(
          signals,
          seen,
          source,
          lineNumber,
          line,
          domainEnv,
          parsePort(url.port),
          'url-port',
          host
        )
      }
    } catch {
      continue
    }
  }

  for (const match of line.matchAll(resetRegex(BARE_DOMAIN_RE))) {
    const domain = match[0].toLowerCase()
    const domainEnv = HOST_ENV[domain] ?? inferredEnv
    addDomainSignal(signals, seen, source, lineNumber, line, domainEnv, domain, 'domain-reference')
  }

  for (const match of line.matchAll(resetRegex(LOCALHOST_PORT_RE))) {
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      inferredEnv,
      parsePort(match[1]),
      'localhost-port'
    )
  }

  for (const match of line.matchAll(resetRegex(NEXT_START_PORT_RE))) {
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      inferredEnv,
      parsePort(match[1]),
      'next-start-port'
    )
  }

  for (const match of line.matchAll(resetRegex(DASH_P_RE))) {
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      inferredEnv,
      parsePort(match[1]),
      'cli-port'
    )
  }

  for (const match of line.matchAll(resetRegex(ASSIGNMENT_RE))) {
    const variableEnv = inferEnvFromLabel(match[1]) ?? inferredEnv
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      variableEnv,
      parsePort(match[2]),
      'assignment',
      match[1]
    )
  }

  for (const match of line.matchAll(resetRegex(PROCESS_PORT_DEFAULT_RE))) {
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      inferredEnv,
      parsePort(match[1]),
      'env-default',
      'process.env.PORT default'
    )
  }

  for (const match of line.matchAll(resetRegex(PORT_WORD_RE))) {
    const nearbyEnv = inferEnvNearIndex(line, match.index ?? 0, inferredEnv)
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      nearbyEnv,
      parsePort(match[1]),
      'port-word'
    )
  }

  for (const match of line.matchAll(resetRegex(MARKDOWN_TABLE_PORT_RE))) {
    const tableEnv = inferEnvFromLabel(match[1]) ?? inferredEnv
    addPortSignal(
      signals,
      seen,
      source,
      lineNumber,
      line,
      tableEnv,
      parsePort(match[2]),
      'markdown-table-port'
    )
  }
}

export function parseRuntimeSignals(sources) {
  const signals = []
  const seen = new Set()

  for (const source of sources) {
    if (!source.exists || typeof source.content !== 'string') continue
    const lines = source.content.split(/\r?\n/)
    let rollingEnv = inferEnvFromPath(source.path)
    lines.forEach((line, index) => {
      const lineContext = inferContextEnv(line)
      if (source.layer === 'operational') {
        rollingEnv = lineContext ?? rollingEnv
      }
      extractSignalsFromLine({
        source,
        line,
        lineNumber: index + 1,
        fallbackEnv: source.layer === 'operational' ? rollingEnv : inferEnvFromPath(source.path),
        signals,
        seen,
      })
    })
  }

  return signals.sort((a, b) => {
    const pathCompare = a.sourcePath.localeCompare(b.sourcePath)
    if (pathCompare !== 0) return pathCompare
    return a.lineNumber - b.lineNumber
  })
}

function makeFinding({ classification, severity, env, message, evidence }) {
  return {
    classification,
    severity,
    env,
    message,
    evidence: uniqueEvidence(evidence).map((signal) => ({
      sourcePath: signal.sourcePath,
      lineNumber: signal.lineNumber,
      layer: signal.layer,
      role: signal.role,
      port: signal.port,
      domain: signal.domain,
      kind: signal.kind,
      text: signal.text,
    })),
  }
}

function uniqueEvidence(evidence) {
  const seen = new Set()
  const unique = []
  for (const signal of evidence) {
    const key = [
      signal.sourcePath,
      signal.lineNumber,
      signal.env,
      signal.port ?? '',
      signal.domain ?? '',
      signal.text,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(signal)
  }
  return unique
}

function summarizePorts(portSignals) {
  return [...new Set(portSignals.map((signal) => signal.port))]
    .filter((port) => Number.isInteger(port))
    .sort((a, b) => a - b)
}

function classifyPortFindings(signals, canonical) {
  const findings = []

  for (const [env, expected] of Object.entries(canonical)) {
    const portSignals = signals.filter((signal) => signal.env === env && signal.port !== null)
    if (portSignals.length === 0) continue

    const ports = summarizePorts(portSignals)
    const unexpectedSignals = portSignals.filter((signal) => signal.port !== expected.expectedPort)
    if (ports.length > 1) {
      findings.push(
        makeFinding({
          classification: 'port-conflict',
          severity: 'error',
          env,
          message: `${expected.label} has conflicting ports ${ports.join(', ')}. Expected ${expected.expectedPort}.`,
          evidence: portSignals,
        })
      )
    }

    for (const signal of unexpectedSignals) {
      findings.push(
        makeFinding({
          classification: signal.layer === 'operational' ? 'operational-drift' : 'stale-runbook',
          severity: signal.layer === 'operational' ? 'error' : 'warning',
          env,
          message: `${signal.sourcePath}:${signal.lineNumber} maps ${expected.label} to ${signal.port}; expected ${expected.expectedPort}.`,
          evidence: [signal],
        })
      )
    }
  }

  return findings
}

function classifyDomainFindings(signals, canonical) {
  const findings = []
  const prodDomain = canonical.prod.domains.find((domain) => domain !== 'localhost')
  const prodDomainSignals = signals.filter((signal) => signal.domain === prodDomain)

  if (prodDomainSignals.length === 0) {
    findings.push(
      makeFinding({
        classification: 'missing-prod-domain',
        severity: 'warning',
        env: 'prod',
        message: `No scanned source references ${prodDomain}.`,
        evidence: [],
      })
    )
    return findings
  }

  for (const signal of prodDomainSignals) {
    const sameLinePorts = signals.filter(
      (candidate) =>
        candidate.sourcePath === signal.sourcePath &&
        candidate.lineNumber === signal.lineNumber &&
        candidate.env === 'prod' &&
        candidate.port !== null
    )
    const wrongPorts = sameLinePorts.filter((candidate) => candidate.port !== canonical.prod.expectedPort)
    for (const wrongPort of wrongPorts) {
      findings.push(
        makeFinding({
          classification: 'domain-conflict',
          severity: 'error',
          env: 'prod',
          message: `${prodDomain} is tied to port ${wrongPort.port} in ${wrongPort.sourcePath}:${wrongPort.lineNumber}; expected ${canonical.prod.expectedPort}.`,
          evidence: [signal, wrongPort],
        })
      )
    }
  }

  return findings
}

function dedupeFindings(findings) {
  const seen = new Set()
  const deduped = []
  for (const finding of findings) {
    const key = [
      finding.classification,
      finding.env,
      finding.message,
      finding.evidence.map((item) => `${item.sourcePath}:${item.lineNumber}:${item.port ?? item.domain ?? ''}`).join(','),
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(finding)
  }
  return deduped
}

export function classifyTopology(signals, canonical = CANONICAL_TOPOLOGY) {
  const findings = dedupeFindings([
    ...classifyPortFindings(signals, canonical),
    ...classifyDomainFindings(signals, canonical),
  ])

  const hasError = findings.some((finding) => finding.severity === 'error')
  const hasWarning = findings.some((finding) => finding.severity === 'warning')
  const verdict = hasError ? 'mixed' : hasWarning ? 'partial-proof' : 'healthy'

  return {
    verdict,
    findings,
  }
}

export async function readTopologySources({
  repoRoot = REPO_ROOT,
  manifest = SOURCE_MANIFEST,
} = {}) {
  const sources = []

  for (const source of manifest) {
    const absolutePath = path.join(repoRoot, source.path)
    try {
      const content = await readFile(absolutePath, 'utf8')
      sources.push({
        ...source,
        absolutePath,
        exists: true,
        content,
      })
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      sources.push({
        ...source,
        absolutePath,
        exists: false,
        content: null,
      })
    }
  }

  return sources
}

export function buildRuntimeTopologyReport(sources, { generatedAt = new Date().toISOString() } = {}) {
  const signals = parseRuntimeSignals(sources)
  const classification = classifyTopology(signals)

  return {
    generatedAt,
    canonical: CANONICAL_TOPOLOGY,
    sourceCount: sources.length,
    missingSources: sources
      .filter((source) => !source.exists)
      .map((source) => ({ sourcePath: source.path, layer: source.layer, role: source.role })),
    signals,
    verdict: classification.verdict,
    findings: classification.findings,
  }
}

function formatEvidence(evidence) {
  if (evidence.length === 0) return ['  evidence: none']
  const seen = new Set()
  const lines = []
  for (const item of evidence) {
    const key = `${item.sourcePath}:${item.lineNumber}:${item.text}`
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(`  evidence: ${item.sourcePath}:${item.lineNumber} [${item.layer}] ${item.text}`)
  }
  return lines
}

export function renderTextReport(report) {
  const lines = [
    'RUNTIME TOPOLOGY AUDIT',
    '',
    `Generated: ${report.generatedAt}`,
    `Verdict: ${report.verdict}`,
    '',
    'Canonical topology:',
  ]

  for (const [env, expected] of Object.entries(report.canonical)) {
    lines.push(
      `- ${env}: ${expected.label}, port ${expected.expectedPort}, domains ${expected.domains.join(', ')}`
    )
  }

  lines.push('', 'Scanned sources:')
  for (const source of SOURCE_MANIFEST) {
    const missing = report.missingSources.some((item) => item.sourcePath === source.path)
    lines.push(`- ${source.path} [${source.layer}] ${source.role}${missing ? ' (missing)' : ''}`)
  }

  lines.push('', 'Findings:')
  if (report.findings.length === 0) {
    lines.push('- healthy: no conflicting port or domain truth found')
  } else {
    for (const finding of report.findings) {
      lines.push(`- ${finding.severity} ${finding.classification}: ${finding.message}`)
      lines.push(...formatEvidence(finding.evidence))
    }
  }

  lines.push('', `Signals parsed: ${report.signals.length}`)
  lines.push('Read-only: no services were started, stopped, killed, registered, or mutated.')

  return `${lines.join('\n')}\n`
}

function parseArgs(args) {
  return {
    json: args.includes('--json'),
    strict: args.includes('--strict'),
  }
}

export async function runCli(args = process.argv.slice(2)) {
  const options = parseArgs(args)
  const sources = await readTopologySources()
  const report = buildRuntimeTopologyReport(sources)

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  } else {
    process.stdout.write(renderTextReport(report))
  }

  if (options.strict && report.findings.some((finding) => finding.severity === 'error')) {
    process.exitCode = 1
  }

  return report
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
