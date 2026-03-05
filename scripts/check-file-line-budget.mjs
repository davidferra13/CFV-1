#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const baselinePath = path.resolve(repoRoot, 'scripts/file-line-budget-baseline.json')
const hardDefaultMaxLines = 900
const configuredMaxLines = process.env.FILE_LINE_BUDGET_MAX_LINES
  ? readPositiveNumberEnv('FILE_LINE_BUDGET_MAX_LINES', hardDefaultMaxLines)
  : null
const growthAllowance = readPositiveNumberEnv('FILE_LINE_BUDGET_ALLOW_GROWTH', 0)
const writeBaseline = process.argv.includes('--write-baseline')

const scanRoots = ['app', 'components', 'lib']
const scanFiles = ['middleware.ts']
const allowedExtensions = new Set(['.ts', '.tsx'])
const excludedDirs = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'coverage',
  'dist',
  'node_modules',
  'out',
])

function readPositiveNumberEnv(name, fallback) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function normalizeRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/')
}

function countFileLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  if (content.length === 0) return 0
  return content.split(/\r?\n/).length
}

function walkDirectory(absDir, onFile) {
  if (!fs.existsSync(absDir)) return
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue
    const absolute = path.join(absDir, entry.name)
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue
      walkDirectory(absolute, onFile)
      continue
    }
    if (!entry.isFile()) continue
    if (!allowedExtensions.has(path.extname(entry.name))) continue
    onFile(absolute)
  }
}

function collectSourceFiles() {
  const files = new Set()

  for (const root of scanRoots) {
    walkDirectory(path.join(repoRoot, root), (absPath) => {
      files.add(normalizeRelative(absPath))
    })
  }

  for (const singleFile of scanFiles) {
    const absolute = path.join(repoRoot, singleFile)
    if (!fs.existsSync(absolute)) continue
    if (!allowedExtensions.has(path.extname(singleFile))) continue
    files.add(normalizeRelative(absolute))
  }

  return [...files].sort((a, b) => a.localeCompare(b))
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return { maxLines: configuredMaxLines ?? hardDefaultMaxLines, entries: {} }
  }
  const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  return {
    maxLines:
      typeof parsed.maxLines === 'number' && parsed.maxLines > 0
        ? parsed.maxLines
        : configuredMaxLines ?? hardDefaultMaxLines,
    entries: typeof parsed.entries === 'object' && parsed.entries ? parsed.entries : {},
  }
}

function writeBaselineSnapshot(maxLines, filesWithCounts) {
  const entries = {}
  for (const row of filesWithCounts) {
    if (row.lines > maxLines) {
      entries[row.path] = row.lines
    }
  }

  const payload = {
    maxLines,
    generatedAt: new Date().toISOString(),
    entries,
  }

  fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(
    `Wrote ${Object.keys(entries).length} baseline entries to ${normalizeRelative(baselinePath)}`
  )
}

function main() {
  const files = collectSourceFiles()
  if (files.length === 0) {
    throw new Error('No source files found for file-line budget scan.')
  }

  const baseline = readBaseline()
  const maxLines = configuredMaxLines ?? baseline.maxLines

  const filesWithCounts = files.map((relativePath) => {
    const absolute = path.join(repoRoot, relativePath)
    return { path: relativePath, lines: countFileLines(absolute) }
  })

  if (writeBaseline) {
    writeBaselineSnapshot(maxLines, filesWithCounts)
    return
  }

  const oversizeRows = filesWithCounts.filter((row) => row.lines > maxLines)
  const failures = []

  for (const row of oversizeRows) {
    const baselineLines = baseline.entries[row.path]
    if (typeof baselineLines !== 'number') {
      failures.push(
        `${row.path} is ${row.lines} lines (limit ${maxLines}) and is not in baseline (new oversize file)`
      )
      continue
    }
    if (row.lines > baselineLines + growthAllowance) {
      failures.push(
        `${row.path} grew to ${row.lines} lines (baseline ${baselineLines}, allowed growth ${growthAllowance})`
      )
    }
  }

  const staleBaseline = Object.keys(baseline.entries)
    .filter((relativePath) => !filesWithCounts.some((row) => row.path === relativePath))
    .sort((a, b) => a.localeCompare(b))

  const largest = [...filesWithCounts]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 15)
    .map((row) => ({ file: row.path, lines: row.lines }))

  console.log('File line budget summary')
  console.log(
    JSON.stringify(
      {
        filesScanned: filesWithCounts.length,
        maxLines,
        oversizeFiles: oversizeRows.length,
        baselineEntries: Object.keys(baseline.entries).length,
      },
      null,
      2
    )
  )
  console.log('Top 15 largest files')
  console.table(largest)

  if (staleBaseline.length > 0) {
    console.log('Stale baseline entries (file no longer exists):')
    for (const entry of staleBaseline) {
      console.log(`- ${entry}`)
    }
    console.log('Run `node scripts/check-file-line-budget.mjs --write-baseline` to refresh baseline.')
  }

  if (failures.length > 0) {
    console.error('File line budget check failed:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('File line budget check passed.')
}

main()
