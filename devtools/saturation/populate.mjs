import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { SPEC_STATUSES, DECAY_THRESHOLDS, SKIP_WORDS } from './constants.mjs'

const ROOT = process.cwd()

function gitExec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: ROOT }).trim()
  } catch (err) {
    console.warn(`[saturation] git command failed: ${cmd}`)
    return ''
  }
}

// Step 1: Scan specs
function scanSpecs() {
  const specsDir = path.join(ROOT, 'docs', 'specs')
  const items = []
  const byStatus = {}
  const byPriority = {}

  for (const s of SPEC_STATUSES) byStatus[s] = 0
  byStatus['unknown'] = 0
  for (const p of ['P0', 'P1', 'P2', 'P3', 'unknown']) byPriority[p] = 0

  let files = []
  try {
    files = fs.readdirSync(specsDir).filter(
      (f) => f.endsWith('.md') && f !== '_TEMPLATE.md' && f !== 'README.md'
    )
  } catch (err) {
    console.warn('[saturation] Could not read docs/specs/')
    return { total: 0, by_status: byStatus, by_priority: byPriority, items }
  }

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(specsDir, file), 'utf-8')
      const lines = content.split('\n').slice(0, 20)
      const header = lines.join('\n')

      let status = 'unknown'
      const statusMatch = header.match(/Status:\s*(.+)/i)
      if (statusMatch) {
        status = statusMatch[1].trim().toLowerCase().replace(/\*+/g, '').trim()
        if (status === 'in progress') status = 'in-progress'
        if (!SPEC_STATUSES.includes(status)) status = 'unknown'
      }

      let priority = 'unknown'
      const prioMatch = header.match(/Priority:\s*(P\d)/i)
      if (prioMatch) priority = prioMatch[1].toUpperCase()

      let complexity = 'unknown'
      const compMatch = header.match(/complexity:\s*(\w+)/i)
      if (compMatch) complexity = compMatch[1].toLowerCase()

      items.push({ file: ['docs', 'specs', file].join('/'), status, priority, complexity })

      byStatus[status] = (byStatus[status] || 0) + 1
      byPriority[priority] = (byPriority[priority] || 0) + 1
    } catch (err) {
      console.warn(`[saturation] Could not read spec: ${file}`)
    }
  }

  return { total: items.length, by_status: byStatus, by_priority: byPriority, items }
}

// Step 2: Scan audits
function scanAudits() {
  const docsDir = path.join(ROOT, 'docs')
  const items = []

  let files = []
  try {
    files = fs.readdirSync(docsDir).filter(
      (f) => f.endsWith('.md') && f.toLowerCase().includes('audit')
    )
  } catch (err) {
    console.warn('[saturation] Could not read docs/')
    return { total: 0, fresh: 0, aging: 0, stale: 0, items }
  }

  for (const file of files) {
    try {
      let date = null
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        date = dateMatch[1]
      } else {
        const gitDate = gitExec(`git log -1 --format=%aI -- "${path.join('docs', file)}"`)
        if (gitDate) date = gitDate.slice(0, 10)
      }

      if (!date) continue

      const raw = gitExec(
        `git log --since="${date}" --name-only --pretty=format:"" -- "app/" "lib/" "components/"`
      )
      const changedFiles = raw
        ? [...new Set(raw.split('\n').filter((l) => l.length > 0))].length
        : 0

      const daysSince = (Date.now() - new Date(date).getTime()) / 86400000
      let decay = 'stale'
      if (daysSince <= DECAY_THRESHOLDS.fresh.maxDays && changedFiles <= DECAY_THRESHOLDS.fresh.maxChanges) {
        decay = 'fresh'
      } else if (daysSince <= DECAY_THRESHOLDS.aging.maxDays && changedFiles <= DECAY_THRESHOLDS.aging.maxChanges) {
        decay = 'aging'
      }

      items.push({ file: ['docs', file].join('/'), date, files_changed_since: changedFiles, decay })
    } catch (err) {
      console.warn(`[saturation] Could not process audit: ${file}`)
    }
  }

  const fresh = items.filter((i) => i.decay === 'fresh').length
  const aging = items.filter((i) => i.decay === 'aging').length
  const stale = items.filter((i) => i.decay === 'stale').length

  return { total: items.length, fresh, aging, stale, items }
}

// Step 3: Read persona data
function scanPersonas() {
  const registryPath = path.join(ROOT, 'docs', 'stress-tests', 'REGISTRY.md')
  const result = {
    tested: 0,
    defined: 0,
    research_cataloged: 0,
    unique_gaps: 0,
    saturation: 'unknown',
  }

  if (!fs.existsSync(registryPath)) return result

  try {
    const content = fs.readFileSync(registryPath, 'utf-8')
    const lines = content.split('\n')

    // Count persona registry rows (lines starting with | that have a # number)
    let inPersonaTable = false
    let inResearchTable = false
    let inGapTable = false

    for (const line of lines) {
      if (line.match(/persona\s+registry/i)) {
        inPersonaTable = true
        inResearchTable = false
        inGapTable = false
        continue
      }
      if (line.match(/research.only\s+persona/i)) {
        inPersonaTable = false
        inResearchTable = true
        inGapTable = false
        continue
      }
      if (line.match(/gap\s+inventory/i)) {
        inPersonaTable = false
        inResearchTable = false
        inGapTable = true
        continue
      }
      // New section header resets
      if (line.startsWith('## ') && !line.match(/persona|research|gap/i)) {
        inPersonaTable = false
        inResearchTable = false
        inGapTable = false
      }

      if (!line.startsWith('|')) continue
      // Skip header/separator rows
      if (line.match(/^\|\s*[-:]+/)) continue
      if (line.match(/^\|\s*#\s*\|/i)) continue

      if (inPersonaTable && line.match(/^\|\s*\d+/)) {
        result.defined++
        // Check if Score column is not "--" and not empty
        const cells = line.split('|').map((c) => c.trim()).filter(Boolean)
        // Score is typically one of the later columns
        const hasScore = cells.some(
          (c) => c.match(/^\d+(\.\d+)?$/) || c.match(/^\d+\/\d+$/)
        )
        if (hasScore) result.tested++
      }

      if (inResearchTable && line.match(/^\|\s*\d+/)) {
        result.research_cataloged++
      }

      if (inGapTable && line.match(/^\|\s*\d+/)) {
        result.unique_gaps++
      }
    }

    // Look for saturation estimate line
    const satMatch = content.match(/saturation\s+estimate:\s*\*?\*?(\w+)/i)
    if (satMatch) {
      result.saturation = satMatch[1].toUpperCase()
    } else {
      if (result.tested < 3) result.saturation = 'LOW'
      else if (result.tested <= 10) result.saturation = 'MEDIUM'
      else if (result.tested <= 20) result.saturation = 'HIGH'
      else result.saturation = 'SATURATED'
    }
  } catch (err) {
    console.warn('[saturation] Could not read REGISTRY.md')
  }

  return result
}

// Step 4: Scan session digests
function scanSessions() {
  const digestsDir = path.join(ROOT, 'docs', 'session-digests')
  const result = { total: 0, date_range: { earliest: null, latest: null }, top_topics: [] }

  if (!fs.existsSync(digestsDir)) return result

  let files = []
  try {
    files = fs.readdirSync(digestsDir).filter(
      (f) => f.endsWith('.md') && f !== 'README.md'
    )
  } catch (err) {
    console.warn('[saturation] Could not read docs/session-digests/')
    return result
  }

  result.total = files.length
  if (files.length === 0) return result

  // Sort by filename to find date range
  const sorted = [...files].sort()
  result.date_range.earliest = sorted[0].slice(0, 10)
  result.date_range.latest = sorted[sorted.length - 1].slice(0, 10)

  // Extract topic slugs
  const wordCounts = new Map()
  for (const file of files) {
    const match = file.match(/\d{4}-\d{2}-\d{2}-\d{6}-(.+)\.md/)
    if (!match) continue
    const slug = match[1]
    const words = slug.split('-')
    for (const word of words) {
      if (SKIP_WORDS.has(word) || word.length < 3) continue
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }
  }

  result.top_topics = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }))

  return result
}

// Step 5: File attention heatmap
function buildHeatmap() {
  const raw = gitExec(
    'git log --since="30 days ago" --name-only --pretty=format:"" -- "app/" "lib/" "components/"'
  )

  if (!raw) return []

  const counts = new Map()
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    counts.set(trimmed, (counts.get(trimmed) || 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([file, commits]) => ({ file, commits }))
}

// Step 6: Write output
function main() {
  const specs = scanSpecs()
  const audits = scanAudits()
  const personas = scanPersonas()
  const sessions = scanSessions()
  const file_heatmap = buildHeatmap()

  const registry = {
    generated_at: new Date().toISOString(),
    specs,
    audits,
    personas,
    sessions,
    file_heatmap,
  }

  const outDir = path.join(ROOT, 'saturation-tracking')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'registry.json'), JSON.stringify(registry, null, 2))

  console.log(
    `Saturation scan complete. ${specs.total} specs, ${audits.total} audits, ${sessions.total} digests. Written to saturation-tracking/registry.json`
  )
}

main()
