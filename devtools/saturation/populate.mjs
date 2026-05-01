import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { DECAY_THRESHOLDS, SKIP_WORDS, SPEC_STATUSES } from './constants.mjs'

const ROOT = process.cwd()
const UNKNOWN = 'unknown'

function gitExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: ROOT }).trim()
  } catch (err) {
    console.warn(`[saturation] git command failed: ${cmd}`)
    return ''
  }
}

function safeReadFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch (err) {
    console.warn(`[saturation] could not read file: ${toRelativePath(filePath)}`)
    return null
  }
}

function safeReadDir(dirPath) {
  try {
    return readdirSync(dirPath)
  } catch (err) {
    console.warn(`[saturation] could not read directory: ${toRelativePath(dirPath)}`)
    return []
  }
}

function toRelativePath(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/')
}

function stripMarkdownValue(value) {
  return value
    .replace(/^>+\s*/, '')
    .replace(/^\*+/, '')
    .replace(/\*+$/, '')
    .trim()
}

function normalizeStatus(rawStatus) {
  if (!rawStatus) return UNKNOWN

  const status = stripMarkdownValue(rawStatus)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (status === 'in progress') return 'in-progress'
  if (status === 'ready to build') return 'ready'
  if (SPEC_STATUSES.includes(status)) return status
  return UNKNOWN
}

function parseSpecItem(filePath) {
  const content = safeReadFile(filePath)
  if (!content) return null

  const header = content.split(/\r?\n/).slice(0, 20).join('\n')
  const statusMatch = header.match(/Status:\**\s*(.+)/i)
  const priorityMatch = header.match(/Priority:\**\s*(P\d)/i)
  const complexityMatch = header.match(/complexity:\**\s*(\w+)/i)

  return {
    file: toRelativePath(filePath),
    status: normalizeStatus(statusMatch?.[1]),
    priority: priorityMatch ? priorityMatch[1].toUpperCase() : UNKNOWN,
    complexity: complexityMatch ? complexityMatch[1].toLowerCase() : UNKNOWN,
  }
}

function tally(items, key, allowedValues) {
  const counts = Object.fromEntries([...allowedValues, UNKNOWN].map((value) => [value, 0]))

  for (const item of items) {
    const value = allowedValues.includes(item[key]) ? item[key] : UNKNOWN
    counts[value] += 1
  }

  return counts
}

function scanSpecs() {
  const specsDir = path.join(ROOT, 'docs', 'specs')
  const items = safeReadDir(specsDir)
    .filter((filename) => filename.endsWith('.md'))
    .filter((filename) => filename !== '_TEMPLATE.md' && filename !== 'README.md')
    .map((filename) => parseSpecItem(path.join(specsDir, filename)))
    .filter(Boolean)

  return {
    total: items.length,
    by_status: tally(items, 'status', SPEC_STATUSES),
    by_priority: tally(items, 'priority', ['P0', 'P1', 'P2', 'P3']),
    items,
  }
}

function dateFromAuditFile(filePath) {
  const filename = path.basename(filePath)
  const filenameDate = filename.match(/(\d{4}-\d{2}-\d{2})/)
  if (filenameDate) return filenameDate[1]

  const gitDate = gitExec(`git log -1 --format=%aI -- "${toRelativePath(filePath)}"`)
  return gitDate ? gitDate.slice(0, 10) : null
}

function changedFilesSince(date) {
  const output = gitExec(
    `git log --since="${date}" --name-only --pretty=format:"" -- "app/" "lib/" "components/"`
  )

  if (!output) return 0

  return new Set(output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)).size
}

function classifyDecay(date, filesChangedSince) {
  const time = new Date(`${date}T00:00:00Z`).getTime()
  const daysSince = Number.isFinite(time) ? (Date.now() - time) / 86400000 : Infinity

  if (
    daysSince <= DECAY_THRESHOLDS.fresh.maxDays &&
    filesChangedSince <= DECAY_THRESHOLDS.fresh.maxChanges
  ) {
    return 'fresh'
  }

  if (
    daysSince <= DECAY_THRESHOLDS.aging.maxDays &&
    filesChangedSince <= DECAY_THRESHOLDS.aging.maxChanges
  ) {
    return 'aging'
  }

  return 'stale'
}

function scanAudits() {
  const docsDir = path.join(ROOT, 'docs')
  const items = safeReadDir(docsDir)
    .filter((filename) => filename.endsWith('.md'))
    .filter((filename) => filename.toLowerCase().includes('audit'))
    .map((filename) => {
      const filePath = path.join(docsDir, filename)
      const date = dateFromAuditFile(filePath)
      if (!date) return null

      const filesChangedSince = changedFilesSince(date)
      return {
        file: toRelativePath(filePath),
        date,
        files_changed_since: filesChangedSince,
        decay: classifyDecay(date, filesChangedSince),
      }
    })
    .filter(Boolean)

  return {
    total: items.length,
    fresh: items.filter((item) => item.decay === 'fresh').length,
    aging: items.filter((item) => item.decay === 'aging').length,
    stale: items.filter((item) => item.decay === 'stale').length,
    items,
  }
}

function isTableSeparator(line) {
  return /^\|\s*:?-{2,}/.test(line)
}

function tableRowsAfterHeading(lines, heading) {
  const headingIndex = lines.findIndex((line) => line.toLowerCase().includes(heading.toLowerCase()))
  if (headingIndex === -1) return []

  const rows = []
  let hasTableStarted = false

  for (const line of lines.slice(headingIndex + 1)) {
    if (!line.trim()) {
      if (hasTableStarted) break
      continue
    }

    if (!line.trim().startsWith('|')) {
      if (hasTableStarted) break
      continue
    }

    hasTableStarted = true
    if (!isTableSeparator(line)) rows.push(line)
  }

  return rows.slice(1)
}

function splitTableRow(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
}

function estimatePersonaSaturation(tested) {
  if (tested < 3) return 'LOW'
  if (tested <= 10) return 'MEDIUM'
  if (tested <= 20) return 'HIGH'
  return 'SATURATED'
}

function scanPersonas() {
  const registryPath = path.join(ROOT, 'docs', 'stress-tests', 'REGISTRY.md')

  if (!existsSync(registryPath)) {
    return {
      tested: 0,
      defined: 0,
      research_cataloged: 0,
      unique_gaps: 0,
      saturation: UNKNOWN,
    }
  }

  const content = safeReadFile(registryPath)
  if (!content) {
    return {
      tested: 0,
      defined: 0,
      research_cataloged: 0,
      unique_gaps: 0,
      saturation: UNKNOWN,
    }
  }

  const lines = content.split(/\r?\n/)
  const personaRows = tableRowsAfterHeading(lines, '## Persona Registry').filter((row) =>
    /^\|\s*\d+\s*\|/.test(row)
  )
  const researchRows = tableRowsAfterHeading(lines, '### Research-Only Personas').filter((row) =>
    row.trim().startsWith('|')
  )
  const gapRows = tableRowsAfterHeading(lines, '## Gap Inventory').filter((row) =>
    /^\|\s*\d+\s*\|/.test(row)
  )

  const tested = personaRows.filter((row) => {
    const score = splitTableRow(row)[4] ?? ''
    return score !== '--' && score.length > 0
  }).length

  const saturationMatch = content.match(/Saturation estimate:\s*\*?\*?(\w+)/i)

  return {
    tested,
    defined: personaRows.length,
    research_cataloged: researchRows.length,
    unique_gaps: gapRows.length,
    saturation: saturationMatch ? saturationMatch[1].toUpperCase() : estimatePersonaSaturation(tested),
  }
}

function scanSessions() {
  const digestsDir = path.join(ROOT, 'docs', 'session-digests')

  if (!existsSync(digestsDir)) {
    return {
      total: 0,
      date_range: { earliest: null, latest: null },
      top_topics: [],
    }
  }

  const filenames = safeReadDir(digestsDir)
    .filter((filename) => filename.endsWith('.md'))
    .filter((filename) => filename !== 'README.md')
    .sort()

  const topics = new Map()

  for (const filename of filenames) {
    const match = filename.match(/\d{4}-\d{2}-\d{2}(?:-\d{6})?-(.+)\.md/)
    if (!match) continue

    for (const word of match[1].split('-')) {
      const normalized = word.toLowerCase().trim()
      if (normalized.length < 3 || SKIP_WORDS.has(normalized)) continue
      topics.set(normalized, (topics.get(normalized) ?? 0) + 1)
    }
  }

  const dateNames = filenames.filter((filename) => /^\d{4}-\d{2}-\d{2}/.test(filename))

  return {
    total: filenames.length,
    date_range: {
      earliest: dateNames[0]?.slice(0, 10) ?? null,
      latest: dateNames[dateNames.length - 1]?.slice(0, 10) ?? null,
    },
    top_topics: [...topics.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20)
      .map(([word, count]) => ({ word, count })),
  }
}

function scanFileHeatmap() {
  const output = gitExec(
    'git log --since="30 days ago" --name-only --pretty=format:"" -- "app/" "lib/" "components/"'
  )

  if (!output) return []

  const counts = new Map()

  for (const line of output.split(/\r?\n/)) {
    const file = line.trim()
    if (!file) continue
    counts.set(file, (counts.get(file) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([file, commits]) => ({ file, commits }))
}

function main() {
  const specs = scanSpecs()
  const audits = scanAudits()
  const personas = scanPersonas()
  const sessions = scanSessions()
  const fileHeatmap = scanFileHeatmap()

  const registry = {
    generated_at: new Date().toISOString(),
    specs,
    audits,
    personas,
    sessions,
    file_heatmap: fileHeatmap,
  }

  const outputDir = path.join(ROOT, 'saturation-tracking')
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(path.join(outputDir, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`)

  console.log(
    `Saturation scan complete. ${specs.total} specs, ${audits.total} audits, ${sessions.total} digests. Written to saturation-tracking/registry.json`
  )
}

main()
