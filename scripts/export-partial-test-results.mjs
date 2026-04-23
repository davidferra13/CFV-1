#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { discoverSiteAuditRoutes } from './site-audit-manifest.mjs'

const ROOT = process.cwd()
const DEFAULT_RUN_DIR = path.join(ROOT, 'reports', 'gold-watch-20260309-020321')
const DEFAULT_SITE_AUDIT_DIR = path.join(ROOT, 'reports', 'site-audit-2026-03-09T06-03-37-899Z')

function parseArgs(argv) {
  const options = {
    runDir: DEFAULT_RUN_DIR,
    siteAuditDir: DEFAULT_SITE_AUDIT_DIR,
    outDir: '',
  }

  for (const arg of argv) {
    if (arg.startsWith('--run-dir=')) {
      options.runDir = path.resolve(ROOT, arg.slice('--run-dir='.length))
      continue
    }
    if (arg.startsWith('--site-audit-dir=')) {
      options.siteAuditDir = path.resolve(ROOT, arg.slice('--site-audit-dir='.length))
      continue
    }
    if (arg.startsWith('--out-dir=')) {
      options.outDir = path.resolve(ROOT, arg.slice('--out-dir='.length))
      continue
    }
  }

  return options
}

function nowIso() {
  return new Date().toISOString()
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function readTextFile(filePath) {
  const buffer = fs.readFileSync(filePath)
  const hasBomUtf16Le = buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe
  const hasNullBytes = buffer.includes(0x00)
  if (hasBomUtf16Le || hasNullBytes) {
    return buffer.toString('utf16le').replace(/^\uFEFF/, '')
  }
  return buffer.toString('utf8')
}

function relativePath(targetPath) {
  return path.relative(ROOT, targetPath).replace(/\\/g, '/')
}

function slugifyPath(routePath) {
  return (
    routePath
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9._/-]/g, '-')
      .replace(/\//g, '__')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'root'
  )
}

function csvEscape(value) {
  const stringValue = value == null ? '' : String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

async function loadSiteAuditSnapshot(siteAuditDir) {
  const screenshotsDir = path.join(siteAuditDir, 'screenshots')
  const manifest = await discoverSiteAuditRoutes(ROOT)
  const routeMap = new Map()

  for (let index = 0; index < manifest.routes.length; index += 1) {
    const route = manifest.routes[index]
    const key = `${route.role}/${slugifyPath(route.path)}`
    if (!routeMap.has(key)) routeMap.set(key, [])
    routeMap.get(key).push({ ...route, manifestIndex: index + 1 })
  }

  if (!fs.existsSync(screenshotsDir)) {
    return []
  }

  const screenshotFiles = fs
    .readdirSync(screenshotsDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(entry.parentPath, entry.name)
      const relativeToScreenshots = path.relative(screenshotsDir, fullPath).replace(/\\/g, '/')
      const role = relativeToScreenshots.split('/')[0]
      const basename = path.basename(entry.name, path.extname(entry.name))
      return {
        fullPath,
        relativeToScreenshots,
        role,
        slug: basename,
        stats: fs.statSync(fullPath),
      }
    })
    .sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs)

  return screenshotFiles.map((file, index) => {
    const mapKey = `${file.role}/${file.slug}`
    const candidates = routeMap.get(mapKey) || []
    const matchedRoute = candidates.shift() || null
    if (candidates.length === 0) {
      routeMap.delete(mapKey)
    } else {
      routeMap.set(mapKey, candidates)
    }

    return {
      lane: 'core',
      source: 'site-audit',
      suite: 'site-audit-full-snapshot',
      cycle: '',
      runLabel: path.basename(siteAuditDir),
      testId: matchedRoute ? `${matchedRoute.role}:${matchedRoute.path}` : `snapshot:${file.relativeToScreenshots}`,
      testName: matchedRoute ? matchedRoute.path : file.relativeToScreenshots,
      status: 'artifact_captured',
      detail:
        'Screenshot captured. The live crawl has not written incremental pass/fail classification yet.',
      role: matchedRoute?.role || file.role,
      category: matchedRoute?.template || '',
      artifactPath: relativePath(file.fullPath),
      sourceFile: matchedRoute?.sourceFile ? relativePath(matchedRoute.sourceFile) : '',
      startedAt: '',
      finishedAt: file.stats.mtime.toISOString(),
      durationMs: '',
      sequence: index + 1,
      outcomeKnown: 'no',
      notes: matchedRoute
        ? `Manifest route #${matchedRoute.manifestIndex}`
        : 'No manifest route match found for screenshot slug.',
    }
  })
}

function extractTapLeafTests(lines, meta) {
  const results = []
  let pending = null

  for (const line of lines) {
    const tapMatch = line.match(/^\s*(ok|not ok)\s+\d+\s+-\s+(.*)$/)
    if (tapMatch) {
      pending = {
        ...meta,
        testId: '',
        testName: tapMatch[2].trim(),
        status: tapMatch[1] === 'ok' ? 'pass' : 'fail',
        detail: '',
        artifactPath: relativePath(meta.logPath),
        sourceFile: '',
        startedAt: '',
        finishedAt: '',
        durationMs: '',
        sequence: '',
        outcomeKnown: 'yes',
        notes: '',
      }
      continue
    }

    if (!pending) continue

    if (/type:\s+'test'/.test(line)) {
      results.push({ ...pending })
      pending = null
      continue
    }

    if (/type:\s+'suite'/.test(line)) {
      pending = null
    }
  }

  return results
}

function loadHardeningResults(runDir) {
  const logPath = path.join(runDir, 'logs', 'lane-hardening.log')
  const text = readTextFile(logPath)
  const lines = text.split(/\r?\n/)

  const results = []
  let currentCycle = ''
  let currentCommand = ''
  let segmentLines = []

  function flushCommandSegment() {
    if (!currentCommand || segmentLines.length === 0) return

    const commandLabel = currentCommand
      .replace(/^npm run /, '')
      .replace(/^npx /, '')
      .replace(/^node /, '')

    if (
      currentCommand === 'npm run test:unit:financial' ||
      currentCommand === 'npm run test:critical' ||
      currentCommand === 'npm run test:integration'
    ) {
      const suiteResults = extractTapLeafTests(segmentLines, {
        lane: 'hardening',
        source: 'hardening-log',
        suite: commandLabel,
        cycle: currentCycle,
        runLabel: path.basename(runDir),
        logPath,
      })
      results.push(...suiteResults)
      return
    }

    if (currentCommand === 'npm run audit:db') {
      let sequence = 0
      for (const line of segmentLines) {
        const match = line.match(
          /^\[(\d{2}:\d{2}:\d{2})\].*?([A-Z]{3}-\d{3}):\s+(.*?)\s+[^\d]*(\d+)\s+issues\b/
        )
        if (!match) continue
        sequence += 1
        const issueCount = Number(match[4])
        results.push({
          lane: 'hardening',
          source: 'hardening-log',
          suite: 'audit:db',
          cycle: currentCycle,
          runLabel: path.basename(runDir),
          testId: match[2],
          testName: match[3].trim(),
          status: issueCount > 0 ? 'fail' : 'pass',
          detail: `${issueCount} issue(s)`,
          role: '',
          category: 'db-integrity',
          artifactPath: relativePath(logPath),
          sourceFile: '',
          startedAt: '',
          finishedAt: '',
          durationMs: '',
          sequence,
          outcomeKnown: 'yes',
          notes: '',
        })
      }
    }
  }

  for (const line of lines) {
    const cycleMatch = line.match(/\[INFO\] Starting hardening cycle (\d+)/)
    if (cycleMatch) {
      flushCommandSegment()
      currentCycle = cycleMatch[1]
      currentCommand = ''
      segmentLines = []
      continue
    }

    const runMatch = line.match(/\[INFO\] RUN (.+)$/)
    if (runMatch) {
      flushCommandSegment()
      currentCommand = runMatch[1].trim()
      segmentLines = []
      continue
    }

    if (currentCommand) {
      segmentLines.push(line)
    }
  }

  flushCommandSegment()
  return results
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadRemyResults() {
  const benchmarkDir = path.join(ROOT, 'tests', 'remy-quality', 'benchmarks')
  const files = [
    '2026-03-09T08-03-10.json',
    '2026-03-09T12-06-18-819Z-client.json',
    '2026-03-09T13-16-37-368Z-client-boundary.json',
    '2026-03-09T14-51-33-709Z-client-resilience.json',
    '2026-03-09T15-53-23-307Z-client-boundary.json',
    '2026-03-09T16-07-40-877Z-client-resilience.json',
  ]

  const results = []

  for (const file of files) {
    const fullPath = path.join(benchmarkDir, file)
    if (!fs.existsSync(fullPath)) continue
    const data = loadJson(fullPath)
    const artifactPath = relativePath(fullPath)

    if (data.suite === 'chef' && Array.isArray(data.results)) {
      for (const item of data.results) {
        results.push({
          lane: 'remy',
          source: 'remy-benchmark',
          suite: 'chef-quality',
          cycle: '',
          runLabel: file,
          testId: item.promptId || '',
          testName: item.prompt || item.promptId || '',
          status: item.overall || 'unknown',
          detail: item.notes || '',
          role: 'chef',
          category: item.category || '',
          artifactPath,
          sourceFile: '',
          startedAt: '',
          finishedAt: data.timestamp || '',
          durationMs: item.timing?.totalMs || '',
          sequence: '',
          outcomeKnown: 'yes',
          notes: '',
        })
      }
      continue
    }

    if (data.meta?.role === 'client' && Array.isArray(data.results)) {
      for (const item of data.results) {
        results.push({
          lane: 'remy',
          source: 'remy-benchmark',
          suite: 'client-quality',
          cycle: '',
          runLabel: file,
          testId: String(item.id),
          testName: item.message || String(item.id),
          status: item.pass ? 'pass' : 'fail',
          detail: `score=${item.score}`,
          role: 'client',
          category: item.category || '',
          artifactPath,
          sourceFile: '',
          startedAt: '',
          finishedAt: data.meta?.timestamp || '',
          durationMs: item.timing?.totalMs || '',
          sequence: '',
          outcomeKnown: 'yes',
          notes: '',
        })
      }
      continue
    }

    if (data.meta?.runner === 'client-boundary' && Array.isArray(data.results)) {
      for (const item of data.results) {
        results.push({
          lane: 'remy',
          source: 'remy-benchmark',
          suite: 'client-boundary',
          cycle: '',
          runLabel: file,
          testId: item.id,
          testName: item.name,
          status: item.pass ? 'pass' : 'fail',
          detail: item.detail || '',
          role: 'client',
          category: item.severity || '',
          artifactPath,
          sourceFile: '',
          startedAt: '',
          finishedAt: data.meta?.timestamp || '',
          durationMs: '',
          sequence: '',
          outcomeKnown: 'yes',
          notes: '',
        })
      }
      continue
    }

    if (data.meta?.suite === 'client-resilience' && Array.isArray(data.tests)) {
      for (const item of data.tests) {
        results.push({
          lane: 'remy',
          source: 'remy-benchmark',
          suite: 'client-resilience',
          cycle: '',
          runLabel: file,
          testId: item.name,
          testName: item.name,
          status: item.pass ? 'pass' : 'fail',
          detail: '',
          role: 'client',
          category: 'resilience',
          artifactPath,
          sourceFile: '',
          startedAt: '',
          finishedAt: data.meta?.timestamp || '',
          durationMs: '',
          sequence: '',
          outcomeKnown: 'yes',
          notes: '',
        })
      }
    }
  }

  return results
}

function summarize(allResults) {
  const counts = {
    total: allResults.length,
    siteAudit: allResults.filter((result) => result.source === 'site-audit').length,
    hardening: allResults.filter((result) => result.lane === 'hardening').length,
    remy: allResults.filter((result) => result.lane === 'remy').length,
    pass: allResults.filter((result) => result.status === 'pass').length,
    fail: allResults.filter((result) => result.status === 'fail').length,
    unknown: allResults.filter((result) => result.outcomeKnown === 'no').length,
  }

  const bySuite = {}
  for (const result of allResults) {
    const key = `${result.lane}:${result.suite}`
    if (!bySuite[key]) {
      bySuite[key] = { lane: result.lane, suite: result.suite, total: 0, pass: 0, fail: 0, unknown: 0 }
    }
    bySuite[key].total += 1
    if (result.status === 'pass') bySuite[key].pass += 1
    else if (result.status === 'fail') bySuite[key].fail += 1
    if (result.outcomeKnown === 'no') bySuite[key].unknown += 1
  }

  return { counts, bySuite: Object.values(bySuite).sort((a, b) => a.lane.localeCompare(b.lane) || a.suite.localeCompare(b.suite)) }
}

function writeOutputs(outDir, allResults, summary) {
  const jsonPath = path.join(outDir, 'partial-test-results.json')
  const csvPath = path.join(outDir, 'partial-test-results.csv')
  const summaryPath = path.join(outDir, 'partial-test-results-summary.md')

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: nowIso(),
        summary,
        results: allResults,
      },
      null,
      2
    ),
    'utf8'
  )

  const csvHeaders = [
    'lane',
    'source',
    'suite',
    'cycle',
    'runLabel',
    'testId',
    'testName',
    'status',
    'detail',
    'role',
    'category',
    'artifactPath',
    'sourceFile',
    'startedAt',
    'finishedAt',
    'durationMs',
    'sequence',
    'outcomeKnown',
    'notes',
  ]

  const csvLines = [csvHeaders.map(csvEscape).join(',')]
  for (const result of allResults) {
    csvLines.push(csvHeaders.map((header) => csvEscape(result[header])).join(','))
  }
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8')

  const lines = []
  lines.push('# Partial Test Results Snapshot')
  lines.push('')
  lines.push(`- Generated: ${nowIso()}`)
  lines.push(`- Total result rows: ${summary.counts.total}`)
  lines.push(`- Site audit snapshot rows: ${summary.counts.siteAudit}`)
  lines.push(`- Hardening result rows: ${summary.counts.hardening}`)
  lines.push(`- Remy result rows: ${summary.counts.remy}`)
  lines.push(`- Pass rows: ${summary.counts.pass}`)
  lines.push(`- Fail rows: ${summary.counts.fail}`)
  lines.push(`- Unknown site-audit outcomes: ${summary.counts.unknown}`)
  lines.push('')
  lines.push('## Caveat')
  lines.push('')
  lines.push(
    'The live full-site audit does not write per-route pass/fail incrementally. Its snapshot rows mean a screenshot exists for that route, not that the final classification has already been persisted.'
  )
  lines.push('')
  lines.push('## By Suite')
  lines.push('')
  lines.push('| Lane | Suite | Total | Pass | Fail | Unknown |')
  lines.push('|---|---|---:|---:|---:|---:|')
  for (const row of summary.bySuite) {
    lines.push(
      `| ${row.lane} | ${row.suite} | ${row.total} | ${row.pass} | ${row.fail} | ${row.unknown} |`
    )
  }
  lines.push('')
  lines.push('## Files')
  lines.push('')
  lines.push(`- JSON: ${relativePath(jsonPath)}`)
  lines.push(`- CSV: ${relativePath(csvPath)}`)
  lines.push(`- Summary: ${relativePath(summaryPath)}`)
  lines.push('')

  fs.writeFileSync(summaryPath, lines.join('\n'), 'utf8')
  return { jsonPath, csvPath, summaryPath }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const outDir =
    options.outDir ||
    path.join(options.runDir, `partial-results-${timestampSlug(new Date())}`)
  ensureDir(outDir)

  const siteAuditResults = await loadSiteAuditSnapshot(options.siteAuditDir)
  const hardeningResults = loadHardeningResults(options.runDir)
  const remyResults = loadRemyResults()

  const allResults = [...siteAuditResults, ...hardeningResults, ...remyResults]
  const summary = summarize(allResults)
  const outputs = writeOutputs(outDir, allResults, summary)

  console.log(`[partial-results] json: ${outputs.jsonPath}`)
  console.log(`[partial-results] csv: ${outputs.csvPath}`)
  console.log(`[partial-results] summary: ${outputs.summaryPath}`)
  console.log(
    `[partial-results] rows=${summary.counts.total} siteAudit=${summary.counts.siteAudit} hardening=${summary.counts.hardening} remy=${summary.counts.remy}`
  )
}

await main()
