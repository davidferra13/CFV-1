#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_QUEUE_DIR = 'system/build-queue'
const DEFAULT_REGISTRY_FILE = 'lib/build-queue/capability-registry.ts'

function normalizeRelPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '')
}

function resolveFromRoot(rootDir, filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath)
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

async function listQueueMarkdownFiles(rootDir, queueDir) {
  const absoluteQueueDir = resolveFromRoot(rootDir, queueDir)

  if (!(await pathExists(absoluteQueueDir))) {
    return []
  }

  const entries = await fs.readdir(absoluteQueueDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => normalizeRelPath(path.posix.join(normalizeRelPath(queueDir), entry.name)))
    .sort()
}

function runGit(rootDir, args) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.status !== 0) {
    return { ok: false, lines: [] }
  }

  return {
    ok: true,
    lines: result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(normalizeRelPath),
  }
}

function findDuplicateNumericPrefixes(queueFiles) {
  const byPrefix = new Map()

  for (const filePath of queueFiles) {
    const match = path.posix.basename(filePath).match(/^(\d+)-.+\.md$/)
    if (!match) continue

    const prefix = match[1]
    const files = byPrefix.get(prefix) ?? []
    files.push(filePath)
    byPrefix.set(prefix, files)
  }

  return Array.from(byPrefix.entries())
    .filter(([, files]) => files.length > 1)
    .map(([prefix, files]) => ({ prefix, files: files.sort() }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix))
}

function extractRegistryQueuePaths(source) {
  const paths = new Set()
  const queuePathPattern = /\bqueuePath\s*:\s*(['"`])([^'"`]+)\1/g

  for (const match of source.matchAll(queuePathPattern)) {
    paths.add(normalizeRelPath(match[2]))
  }

  return Array.from(paths).sort()
}

async function findStaleRegistryReferences(rootDir, registryFile, queueDir) {
  const absoluteRegistryFile = resolveFromRoot(rootDir, registryFile)

  if (!(await pathExists(absoluteRegistryFile))) {
    return {
      exists: false,
      checkedReferences: 0,
      staleReferences: [],
    }
  }

  const source = await fs.readFile(absoluteRegistryFile, 'utf8')
  const queueDirPrefix = `${normalizeRelPath(queueDir).replace(/\/$/, '')}/`
  const registryQueuePaths = extractRegistryQueuePaths(source).filter(
    (queuePath) => queuePath.startsWith(queueDirPrefix) && queuePath.endsWith('.md')
  )
  const staleReferences = []

  for (const queuePath of registryQueuePaths) {
    if (!(await pathExists(resolveFromRoot(rootDir, queuePath)))) {
      staleReferences.push({
        queuePath,
        registryFile: normalizeRelPath(registryFile),
      })
    }
  }

  return {
    exists: true,
    checkedReferences: registryQueuePaths.length,
    staleReferences,
  }
}

function deriveUntrackedFromFixture(currentQueueFiles, trackedQueueFiles) {
  const tracked = new Set(trackedQueueFiles)
  return currentQueueFiles.filter((filePath) => !tracked.has(filePath))
}

export async function auditBuildQueueConsistency(options = {}) {
  const rootDir = path.resolve(options.rootDir ?? process.cwd())
  const queueDir = normalizeRelPath(options.queueDir ?? DEFAULT_QUEUE_DIR)
  const registryFile = normalizeRelPath(options.registryFile ?? DEFAULT_REGISTRY_FILE)
  const currentQueueFiles = await listQueueMarkdownFiles(rootDir, queueDir)
  const queuePathspec = `${queueDir.replace(/\/$/, '')}/*.md`

  let gitAvailable = false
  let trackedQueueFiles
  let untrackedQueueFiles

  if (Array.isArray(options.trackedQueueFiles)) {
    trackedQueueFiles = options.trackedQueueFiles.map(normalizeRelPath).sort()
  } else {
    const tracked = runGit(rootDir, ['ls-files', '--', queuePathspec])
    gitAvailable = tracked.ok
    trackedQueueFiles = tracked.lines.sort()
  }

  if (Array.isArray(options.untrackedQueueFiles)) {
    untrackedQueueFiles = options.untrackedQueueFiles.map(normalizeRelPath).sort()
  } else if (gitAvailable) {
    untrackedQueueFiles = runGit(rootDir, [
      'ls-files',
      '--others',
      '--exclude-standard',
      '--',
      queuePathspec,
    ]).lines.sort()
  } else {
    untrackedQueueFiles = deriveUntrackedFromFixture(currentQueueFiles, trackedQueueFiles)
  }

  const deletedTrackedQueueFiles = []
  for (const filePath of trackedQueueFiles) {
    if (!(await pathExists(resolveFromRoot(rootDir, filePath)))) {
      deletedTrackedQueueFiles.push(filePath)
    }
  }

  const duplicateNumericPrefixes = findDuplicateNumericPrefixes(currentQueueFiles)
  const registry = await findStaleRegistryReferences(rootDir, registryFile, queueDir)
  const staleRegistryReferences = registry.staleReferences

  const summary = {
    trackedQueueFiles: trackedQueueFiles.length,
    currentQueueFiles: currentQueueFiles.length,
    deletedTrackedQueueFiles: deletedTrackedQueueFiles.length,
    untrackedQueueFiles: untrackedQueueFiles.length,
    duplicateNumericPrefixes: duplicateNumericPrefixes.length,
    staleRegistryReferences: staleRegistryReferences.length,
  }
  const issueCount =
    summary.deletedTrackedQueueFiles +
    summary.untrackedQueueFiles +
    summary.duplicateNumericPrefixes +
    summary.staleRegistryReferences

  return {
    ok: issueCount === 0,
    issueCount,
    rootDir,
    queueDir,
    registryFile,
    git: { available: gitAvailable },
    registry,
    summary,
    issues: {
      deletedTrackedQueueFiles,
      untrackedQueueFiles,
      duplicateNumericPrefixes,
      staleRegistryReferences,
    },
  }
}

function parseArgs(argv) {
  const options = {
    strict: false,
    rootDir: process.cwd(),
    queueDir: DEFAULT_QUEUE_DIR,
    registryFile: DEFAULT_REGISTRY_FILE,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--strict') {
      options.strict = true
      continue
    }

    if (arg === '--root') {
      options.rootDir = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--queue-dir') {
      options.queueDir = argv[index + 1]
      index += 1
      continue
    }

    if (arg === '--registry') {
      options.registryFile = argv[index + 1]
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

async function main() {
  const cliOptions = parseArgs(process.argv.slice(2))
  const report = await auditBuildQueueConsistency(cliOptions)

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

  if (cliOptions.strict && !report.ok) {
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const report = {
      ok: false,
      issueCount: 1,
      error: error instanceof Error ? error.message : String(error),
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    process.exitCode = 1
  })
}
