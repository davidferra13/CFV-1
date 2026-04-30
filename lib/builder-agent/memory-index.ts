import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import type { MemoryConflict, MemoryIndexManifest, MemoryRecord, MemorySourceType } from './types'

type MemorySourceDefinition = {
  pattern: string
  sourceType: MemorySourceType
  required?: boolean
}

export const MEMORY_SOURCE_PRECEDENCE: MemorySourceDefinition[] = [
  { pattern: 'CLAUDE.md', sourceType: 'policy', required: true },
  { pattern: 'MEMORY.md', sourceType: 'durable_memory', required: true },
  { pattern: 'docs/specs/README.md', sourceType: 'spec' },
  { pattern: 'docs/session-log.md', sourceType: 'session_log' },
  { pattern: 'docs/build-state.md', sourceType: 'session_log' },
  { pattern: 'docs/specs/*.md', sourceType: 'spec' },
  { pattern: 'docs/research/*.md', sourceType: 'research' },
  { pattern: 'memory/**/*.md', sourceType: 'working_memory' },
  { pattern: 'prompts/**/*.md', sourceType: 'prompt_asset' },
]

export const DEFAULT_MANIFEST_PATH = join(
  'memory',
  'builder-agent',
  'index',
  'manifest.json',
)

export function buildMemoryIndex(root = process.cwd()): MemoryIndexManifest {
  const warnings: string[] = []
  const conflicts: MemoryConflict[] = []
  const recordsById = new Map<string, MemoryRecord>()

  MEMORY_SOURCE_PRECEDENCE.forEach((definition, precedence) => {
    const paths = resolveSourcePaths(root, definition.pattern)

    if (definition.required && paths.length === 0) {
      throw new Error(`Missing required builder-agent memory source: ${definition.pattern}`)
    }

    for (const absolutePath of paths) {
      try {
        const record = readMemoryRecord(root, absolutePath, definition.sourceType, precedence)
        const existing = recordsById.get(record.id)

        if (existing) {
          conflicts.push({
            id: record.id,
            keptSourcePath: existing.sourcePath,
            ignoredSourcePath: record.sourcePath,
            reason: 'A higher-precedence memory source already owns this title.',
          })
          continue
        }

        recordsById.set(record.id, record)
      } catch (error) {
        warnings.push(
          `${relative(root, absolutePath)} skipped: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    sourcePrecedence: MEMORY_SOURCE_PRECEDENCE.map((source) => source.pattern),
    records: Array.from(recordsById.values()),
    conflicts,
    warnings,
  }
}

export function writeMemoryManifest(
  manifest: MemoryIndexManifest,
  root = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH,
) {
  const absolutePath = join(root, manifestPath)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return absolutePath
}

export function readMemoryManifest(
  root = process.cwd(),
  manifestPath = DEFAULT_MANIFEST_PATH,
): MemoryIndexManifest | null {
  const absolutePath = join(root, manifestPath)
  if (!existsSync(absolutePath)) return null

  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8')) as MemoryIndexManifest
  } catch {
    return null
  }
}

function readMemoryRecord(
  root: string,
  absolutePath: string,
  sourceType: MemorySourceType,
  precedence: number,
): MemoryRecord {
  const text = readFileSync(absolutePath, 'utf8')
  const sourcePath = toProjectPath(root, absolutePath)
  const title = extractTitle(text, sourcePath)

  return {
    id: slugify(title),
    sourcePath,
    sourceType,
    title: sanitizeManifestText(title),
    summary: sanitizeManifestText(summarize(text)),
    tags: deriveTags(sourcePath, sourceType),
    fingerprint: createHash('sha256').update(text).digest('hex'),
    updatedAt: statSync(absolutePath).mtime.toISOString(),
    precedence,
  }
}

function resolveSourcePaths(root: string, pattern: string): string[] {
  if (!pattern.includes('*')) {
    const path = join(root, pattern)
    return existsSync(path) ? [path] : []
  }

  if (pattern === 'docs/specs/*.md') {
    return listFiles(join(root, 'docs', 'specs'), false).filter(
      (path) => !path.endsWith(`${join('docs', 'specs', 'README.md')}`),
    )
  }

  if (pattern === 'docs/research/*.md') {
    return listFiles(join(root, 'docs', 'research'), false)
  }

  if (pattern === 'memory/**/*.md') {
    return listFiles(join(root, 'memory'), true)
  }

  if (pattern === 'prompts/**/*.md') {
    return listFiles(join(root, 'prompts'), true)
  }

  return []
}

function listFiles(dir: string, recursive: boolean): string[] {
  if (!existsSync(dir)) return []

  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (recursive) files.push(...listFiles(path, true))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path)
    }
  }

  return files.sort()
}

function extractTitle(text: string, sourcePath: string) {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || sourcePath
}

function summarize(text: string) {
  const normalized = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('|'))
    .join(' ')

  return normalized.slice(0, 280)
}

function sanitizeManifestText(text: string) {
  return text.replace(/\u2014/g, ' - ').replace(/@ts-nocheck/g, 'ts-nocheck')
}

function deriveTags(sourcePath: string, sourceType: MemorySourceType) {
  const tags = new Set<string>([sourceType])
  sourcePath
    .split(/[\\/.-]+/)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length > 3)
    .slice(0, 8)
    .forEach((part) => tags.add(part))
  return Array.from(tags)
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96) || 'memory-record'
  )
}

function toProjectPath(root: string, absolutePath: string) {
  return relative(root, absolutePath).replace(/\\/g, '/')
}
