import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const baselinePath = path.join(cwd, 'config', 'lint-baseline.txt')
const shouldUpdateBaseline = process.argv.includes('--update-baseline')

function normalize(line) {
  return line.trim().replaceAll('\\', '/')
}

function uniqueSorted(lines) {
  return [...new Set(lines.map(normalize).filter(Boolean))].sort()
}

function readBaseline() {
  if (!existsSync(baselinePath)) return []
  return uniqueSorted(readFileSync(baselinePath, 'utf8').split(/\r?\n/))
}

function writeBaseline(lines) {
  mkdirSync(path.dirname(baselinePath), { recursive: true })
  writeFileSync(baselinePath, lines.length > 0 ? `${lines.join('\n')}\n` : '')
}

function runLint() {
  return spawnSync(process.execPath, [path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next'), 'lint'], {
    cwd,
    encoding: 'utf8',
  })
}

function parseDiagnostics(rawOutput) {
  const diagnostics = []
  let currentFile = null

  for (const rawLine of rawOutput.split(/\r?\n/)) {
    const line = rawLine.trimEnd()

    if (/^\.\//.test(line)) {
      currentFile = normalize(line)
      continue
    }

    const match = line.match(/^(\d+):(\d+)\s+(Warning|Error):\s+(.+?)\s{2,}(\S+)$/)
    if (match && currentFile) {
      const [, lineNumber, columnNumber, severity, message, rule] = match
      diagnostics.push(
        `${currentFile}:${lineNumber}:${columnNumber} ${severity}: ${message} [${rule}]`
      )
    }
  }

  return uniqueSorted(diagnostics)
}

const result = runLint()

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

const rawOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`
const currentDiagnostics = parseDiagnostics(rawOutput)

if (shouldUpdateBaseline) {
  writeBaseline(currentDiagnostics)
  console.log(`Updated ESLint baseline with ${currentDiagnostics.length} diagnostics.`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error(`Missing ESLint baseline at ${baselinePath}`)
  console.error('Run `npm run lint:baseline:update` to create it.')
  process.exit(1)
}

if ((result.status ?? 0) !== 0 && currentDiagnostics.length === 0) {
  console.error(rawOutput || 'ESLint audit failed without parsable diagnostics.')
  process.exit(result.status ?? 1)
}

const baselineDiagnostics = readBaseline()
const baselineSet = new Set(baselineDiagnostics)
const currentSet = new Set(currentDiagnostics)

const newDiagnostics = currentDiagnostics.filter((diagnostic) => !baselineSet.has(diagnostic))
const resolvedDiagnostics = baselineDiagnostics.filter((diagnostic) => !currentSet.has(diagnostic))

if (newDiagnostics.length > 0) {
  console.error('New ESLint diagnostics exceeded the current baseline:')
  for (const diagnostic of newDiagnostics) {
    console.error(`- ${diagnostic}`)
  }
  process.exit(1)
}

console.log(`ESLint debt guard passed with ${currentDiagnostics.length} known diagnostics and 0 new.`)

if (resolvedDiagnostics.length > 0) {
  console.log(
    `${resolvedDiagnostics.length} baseline diagnostics are now resolved. Run \`npm run lint:baseline:update\` to shrink the baseline.`
  )
}
