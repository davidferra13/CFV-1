import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const baselinePath = path.join(cwd, 'config', 'typecheck-baseline.txt')
const shouldUpdateBaseline = process.argv.includes('--update-baseline')

function normalize(line) {
  return line.trim().replaceAll('\\', '/')
}

function uniqueSorted(lines) {
  return [...new Set(lines.map(normalize).filter(Boolean))].sort()
}

function parseDiagnostics(rawOutput) {
  const diagnostics = []
  const pattern = /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error (?<code>TS\d+): (?<message>.+)$/gm

  for (const match of rawOutput.matchAll(pattern)) {
    const file = normalize(match.groups.file)
    const line = match.groups.line
    const column = match.groups.column
    const code = match.groups.code
    const message = normalize(match.groups.message)

    diagnostics.push({
      key: `${file}(${line},${column}): ${code}`,
      raw: `${file}(${line},${column}): error ${code}: ${message}`,
    })
  }

  return diagnostics.sort((left, right) => left.key.localeCompare(right.key))
}

function runTypecheck() {
  return spawnSync(
    process.execPath,
    [path.join(cwd, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '--skipLibCheck'],
    {
      cwd,
      encoding: 'utf8',
    }
  )
}

function readBaseline() {
  if (!existsSync(baselinePath)) return []
  return uniqueSorted(readFileSync(baselinePath, 'utf8').split(/\r?\n/))
}

function writeBaseline(lines) {
  mkdirSync(path.dirname(baselinePath), { recursive: true })
  writeFileSync(baselinePath, lines.length > 0 ? `${lines.join('\n')}\n` : '')
}

const result = runTypecheck()

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

const rawOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`
const currentDiagnostics = parseDiagnostics(rawOutput)
const currentDiagnosticKeys = uniqueSorted(currentDiagnostics.map((diagnostic) => diagnostic.key))

if (shouldUpdateBaseline) {
  writeBaseline(currentDiagnosticKeys)
  console.log(`Updated TypeScript baseline with ${currentDiagnosticKeys.length} diagnostics.`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error(`Missing TypeScript baseline at ${baselinePath}`)
  console.error('Run `npm run typecheck:baseline:update` to create it.')
  process.exit(1)
}

if ((result.status ?? 0) !== 0 && currentDiagnostics.length === 0) {
  console.error(rawOutput || 'TypeScript audit failed without parsable diagnostics.')
  process.exit(result.status ?? 1)
}

const baselineDiagnostics = readBaseline()
const baselineSet = new Set(baselineDiagnostics)
const currentSet = new Set(currentDiagnosticKeys)

const newDiagnostics = currentDiagnostics.filter((diagnostic) => !baselineSet.has(diagnostic.key))
const resolvedDiagnostics = baselineDiagnostics.filter((diagnostic) => !currentSet.has(diagnostic))

if (newDiagnostics.length > 0) {
  console.error('New TypeScript diagnostics exceeded the current baseline:')
  for (const diagnostic of newDiagnostics) {
    console.error(`- ${diagnostic.raw}`)
  }
  process.exit(1)
}

console.log(`TypeScript debt guard passed with ${currentDiagnosticKeys.length} known diagnostics and 0 new.`)

if (resolvedDiagnostics.length > 0) {
  console.log(
    `${resolvedDiagnostics.length} baseline diagnostics are now resolved. Run \`npm run typecheck:baseline:update\` to shrink the baseline.`
  )
}
