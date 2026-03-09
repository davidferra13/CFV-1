#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const REPORTS_DIR = path.join(ROOT, 'reports')

function parseArgs(argv) {
  const out = { runDir: '' }
  for (const arg of argv) {
    if (arg.startsWith('--run-dir=')) {
      out.runDir = arg.slice('--run-dir='.length).trim()
    }
  }
  return out
}

function findLatestDir(parentDir, prefix) {
  if (!fs.existsSync(parentDir)) return ''
  const items = fs
    .readdirSync(parentDir, { withFileTypes: true })
    .filter((x) => x.isDirectory() && x.name.startsWith(prefix))
    .map((x) => {
      const fullPath = path.join(parentDir, x.name)
      const mtimeMs = fs.statSync(fullPath).mtimeMs
      return { fullPath, mtimeMs }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  return items[0]?.fullPath || ''
}

function parseLaneLog(logPath) {
  const result = {
    path: logPath,
    passes: 0,
    fails: 0,
    failedCommands: [],
  }

  if (!fs.existsSync(logPath)) return result
  const lines = readTextFileSmart(logPath).split(/\r?\n/)
  for (const line of lines) {
    const normalized = line.trim()
    const m = normalized.match(/\[(PASS|FAIL)\]\s+EXIT\s+(-?\d+)\s+::\s+(.+)/)
    if (!m) continue
    const level = m[1]
    const exitCode = Number(m[2])
    const command = m[3]
    if (level === 'PASS' && exitCode === 0) {
      result.passes += 1
    } else {
      result.fails += 1
      result.failedCommands.push({ exitCode, command })
    }
  }
  return result
}

function readTextFileSmart(filePath) {
  const buf = fs.readFileSync(filePath)
  const nullBytes = buf.reduce((acc, b) => acc + (b === 0 ? 1 : 0), 0)
  // PowerShell Tee-Object often writes UTF-16LE on Windows.
  if (nullBytes > buf.length / 8) {
    return buf.toString('utf16le')
  }
  return buf.toString('utf8')
}

function findLatestOvernightReport() {
  const latestOvernight = findLatestDir(REPORTS_DIR, 'overnight-')
  if (!latestOvernight) return ''
  const reportPath = path.join(latestOvernight, 'report.md')
  return fs.existsSync(reportPath) ? reportPath : ''
}

function findLatestSiteAuditReport() {
  const latestSiteAudit = findLatestDir(REPORTS_DIR, 'site-audit-')
  if (!latestSiteAudit) return ''
  const reportPath = path.join(latestSiteAudit, 'report.md')
  return fs.existsSync(reportPath) ? reportPath : ''
}

function parseTopIssues(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) return []
  const raw = readTextFileSmart(reportPath)
  const issues = []
  const regex = /^### \d+\. \[(CRITICAL|HIGH|MEDIUM|LOW)\] (.+)$/gm
  let match = null
  while ((match = regex.exec(raw)) !== null) {
    issues.push({ severity: match[1], title: match[2] })
  }
  return issues
}

function parseSiteAuditFailures(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) return []
  const raw = readTextFileSmart(reportPath)
  const failures = []
  const regex = /^### ([^\n]+)$/gm
  let match = null
  while ((match = regex.exec(raw)) !== null) {
    const title = match[1].trim()
    if (title === 'Summary' || title === 'Failures' || title === 'Skipped Dynamic Routes') {
      continue
    }
    failures.push({ severity: 'FAIL', title })
  }
  return failures
}

function findLatestRemyArtifacts() {
  const reportDir = path.join(ROOT, 'tests', 'remy-quality', 'reports')
  const benchmarkDir = path.join(ROOT, 'tests', 'remy-quality', 'benchmarks')

  const latestReports = fs.existsSync(reportDir)
    ? fs
        .readdirSync(reportDir, { withFileTypes: true })
        .filter((x) => x.isFile() && x.name.endsWith('.md'))
        .map((x) => {
          const fullPath = path.join(reportDir, x.name)
          return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs }
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 8)
    : []

  const latestBenchmarks = fs.existsSync(benchmarkDir)
    ? fs
        .readdirSync(benchmarkDir, { withFileTypes: true })
        .filter((x) => x.isFile() && x.name.endsWith('.json'))
        .map((x) => {
          const fullPath = path.join(benchmarkDir, x.name)
          return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs }
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 8)
    : []

  return { latestReports, latestBenchmarks }
}

function formatPath(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  let runDir = ''
  if (args.runDir) {
    runDir = path.isAbsolute(args.runDir) ? args.runDir : path.resolve(ROOT, args.runDir)
  } else {
    runDir = findLatestDir(REPORTS_DIR, 'gold-watch-')
  }

  if (!runDir || !fs.existsSync(runDir)) {
    throw new Error('No gold-watch run directory found. Pass --run-dir=...')
  }

  const logsDir = path.join(runDir, 'logs')
  const laneNames = ['lane-core.log', 'lane-remy.log', 'lane-hardening.log']
  const laneResults = laneNames.map((name) => parseLaneLog(path.join(logsDir, name)))
  const totalPasses = laneResults.reduce((sum, x) => sum + x.passes, 0)
  const totalFails = laneResults.reduce((sum, x) => sum + x.fails, 0)

  const overnightReport = findLatestOvernightReport()
  const siteAuditReport = findLatestSiteAuditReport()
  const auditReport = overnightReport || siteAuditReport
  const topIssues = overnightReport
    ? parseTopIssues(overnightReport).slice(0, 15)
    : parseSiteAuditFailures(siteAuditReport).slice(0, 15)
  const remy = findLatestRemyArtifacts()

  const lines = []
  lines.push('# Gold Run Morning Brief')
  lines.push('')
  lines.push(`- Generated: ${new Date().toISOString()}`)
  lines.push(`- Run Dir: ${formatPath(runDir)}`)
  lines.push(`- Command Results: ${totalPasses} pass / ${totalFails} fail`)
  lines.push('')

  lines.push('## Lane Health')
  lines.push('')
  for (const lane of laneResults) {
    const laneLabel = path.basename(lane.path, '.log')
    lines.push(`- ${laneLabel}: ${lane.passes} pass / ${lane.fails} fail`)
    if (lane.failedCommands.length > 0) {
      const top = lane.failedCommands.slice(0, 5)
      for (const fail of top) {
        lines.push(`  - exit ${fail.exitCode}: ${fail.command}`)
      }
    }
  }
  lines.push('')

  lines.push('## Top Issues (Latest Audit)')
  lines.push('')
  if (!auditReport) {
    lines.push('- No overnight or site-audit report found.')
  } else if (topIssues.length === 0) {
    lines.push(`- Report found at ${formatPath(auditReport)} but no issues were parsed.`)
  } else {
    lines.push(`- Source: ${formatPath(auditReport)}`)
    for (const issue of topIssues) {
      lines.push(`- [${issue.severity}] ${issue.title}`)
    }
  }
  lines.push('')

  lines.push('## Remy Artifacts')
  lines.push('')
  if (remy.latestReports.length === 0) {
    lines.push('- No recent Remy markdown reports found.')
  } else {
    lines.push('- Reports:')
    for (const item of remy.latestReports) {
      lines.push(`  - ${formatPath(item.fullPath)}`)
    }
  }
  if (remy.latestBenchmarks.length === 0) {
    lines.push('- No recent Remy benchmark JSON files found.')
  } else {
    lines.push('- Benchmarks:')
    for (const item of remy.latestBenchmarks) {
      lines.push(`  - ${formatPath(item.fullPath)}`)
    }
  }
  lines.push('')

  lines.push('## Immediate Hardening Queue')
  lines.push('')
  lines.push('1. Fix every CRITICAL/HIGH item from the overnight report first.')
  lines.push('2. Fix any failures from lane-core before feature work.')
  lines.push('3. Fix privacy/security failures (isolation, boundary, auth) before UX changes.')
  lines.push('4. Fix financial test failures (ledger/quotes) before release.')
  lines.push('5. Re-run the same gold watch profile after fixes to confirm regression closure.')
  lines.push('')

  const outputPath = path.join(runDir, 'MORNING-BRIEF.md')
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')

  console.log(`[gold-brief] Wrote ${outputPath}`)
}

main()
