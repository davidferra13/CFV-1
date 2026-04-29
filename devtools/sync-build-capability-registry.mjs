#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const QUEUE_DIR = path.join(ROOT, 'system', 'build-queue')
const REGISTRY_PATH = path.join(ROOT, 'lib', 'build-queue', 'capability-registry.ts')

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/')
}

function escapeString(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const data = {}

  if (!match) return data

  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!parts) continue
    data[parts[1]] = parts[2].trim().replace(/^"|"$/g, '')
  }

  return data
}

function extractSectionList(content, heading) {
  const lines = content.split(/\r?\n/)
  const headingIndex = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (headingIndex === -1) return []

  const result = []
  for (const line of lines.slice(headingIndex + 1)) {
    if (line.startsWith('## ')) break
    const item = line.match(/^\s*-\s+(.+?)\s*$/)
    if (item) result.push(item[1])
  }

  return result
}

function extractTitle(content, filename) {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()
  return filename.replace(/\.md$/i, '')
}

function normalizePriority(priority) {
  const normalized = String(priority || '').toLowerCase()
  return ['high', 'medium', 'low'].includes(normalized) ? normalized : 'medium'
}

function formatStringArray(values, indent = '    ') {
  if (values.length === 0) return '[]'
  return `[\n${values.map((value) => `${indent}  '${escapeString(value)}',`).join('\n')}\n${indent}]`
}

async function readQueueItems() {
  const entries = await fs.readdir(QUEUE_DIR, { withFileTypes: true })
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort()

  const items = []

  for (const filename of markdownFiles) {
    const absolutePath = path.join(QUEUE_DIR, filename)
    const content = await fs.readFile(absolutePath, 'utf8')
    const frontmatter = parseFrontmatter(content)
    const queuePath = toPosix(path.relative(ROOT, absolutePath))

    items.push({
      id: filename.replace(/\.md$/i, ''),
      title: extractTitle(content, filename),
      category: frontmatter.category || 'uncategorized',
      priority: normalizePriority(frontmatter.priority),
      source: frontmatter.source || 'unknown',
      confidence: frontmatter.confidence || 'unknown',
      queuePath,
      affectedFiles: extractSectionList(content, 'Affected Files'),
      searchHints: extractSectionList(content, 'Search Hints'),
    })
  }

  return items
}

function renderRegistry(items) {
  const entries = items
    .map(
      (item) => `  {
    id: '${escapeString(item.id)}',
    title: '${escapeString(item.title)}',
    category: '${escapeString(item.category)}',
    priority: '${item.priority}',
    source: '${escapeString(item.source)}',
    confidence: '${escapeString(item.confidence)}',
    queuePath: '${escapeString(item.queuePath)}',
    affectedFiles: ${formatStringArray(item.affectedFiles)},
    searchHints: ${formatStringArray(item.searchHints)},
    firstPassScope: FIRST_PASS_SCOPE,
  }`
    )
    .join(',\n')

  return `export type BuildCapabilityPriority = 'high' | 'medium' | 'low'

export interface BuildCapabilityDefinition {
  id: string
  title: string
  category: string
  priority: BuildCapabilityPriority
  source: string
  confidence: string
  queuePath: string
  affectedFiles: readonly string[]
  searchHints: readonly string[]
  firstPassScope: string
}

export interface BuildCapabilityCoverageSummary {
  total: number
  categories: readonly string[]
  priorityCounts: Record<BuildCapabilityPriority, number>
  withAffectedFiles: number
  missingAffectedFiles: number
  sources: readonly string[]
}

const FIRST_PASS_SCOPE =
  'First-pass build registry entry. This records the requested capability, source, queue path, search hints, and affected-file scope without changing runtime business logic.'

export const BUILD_CAPABILITY_REGISTRY: readonly BuildCapabilityDefinition[] = [
${entries}
]

export function listBuildCapabilities(): readonly BuildCapabilityDefinition[] {
  return BUILD_CAPABILITY_REGISTRY
}

export function getBuildCapability(id: string): BuildCapabilityDefinition | null {
  return BUILD_CAPABILITY_REGISTRY.find((item) => item.id === id) ?? null
}

export function findBuildCapabilitiesByCategory(
  category: string
): readonly BuildCapabilityDefinition[] {
  return BUILD_CAPABILITY_REGISTRY.filter((item) => item.category === category)
}

export function findBuildCapabilitiesByQuery(
  query: string,
  limit = 12
): readonly BuildCapabilityDefinition[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.\\s-]/g, ' ')
    .split(/\\s+/)
    .filter((token) => token.length >= 3)

  if (!tokens.length) return []

  return BUILD_CAPABILITY_REGISTRY.map((item) => {
    const haystack = [
      item.id,
      item.title,
      item.category,
      item.source,
      item.confidence,
      item.affectedFiles.join(' '),
      item.searchHints.join(' '),
    ]
      .join(' ')
      .toLowerCase()
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0)
    return { item, score }
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item)
}

export function getBuildCapabilityCoverageSummary(
  definitions: readonly BuildCapabilityDefinition[] = BUILD_CAPABILITY_REGISTRY
): BuildCapabilityCoverageSummary {
  const priorityCounts: Record<BuildCapabilityPriority, number> = { high: 0, medium: 0, low: 0 }
  const categories = new Set<string>()
  const sources = new Set<string>()
  let withAffectedFiles = 0

  for (const item of definitions) {
    priorityCounts[item.priority] += 1
    categories.add(item.category)
    sources.add(item.source)
    if (item.affectedFiles.length > 0) withAffectedFiles += 1
  }

  return {
    total: definitions.length,
    categories: Array.from(categories).sort(),
    priorityCounts,
    withAffectedFiles,
    missingAffectedFiles: definitions.length - withAffectedFiles,
    sources: Array.from(sources).sort(),
  }
}
`
}

async function main() {
  const items = await readQueueItems()
  await fs.writeFile(REGISTRY_PATH, renderRegistry(items), 'utf8')
  process.stdout.write(`Synced ${items.length} build queue items to ${toPosix(path.relative(ROOT, REGISTRY_PATH))}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
