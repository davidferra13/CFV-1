import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import Database from 'better-sqlite3'

const REPO_ROOT = process.cwd()
const INTERNAL_ROOT = path.join(REPO_ROOT, '.live-ingestion')
const OBSIDIAN_ROOT = path.join(REPO_ROOT, 'obsidian_export')
const OBSIDIAN_CFV1_ROOT = path.join(OBSIDIAN_ROOT, 'cfv1')
const OBSIDIAN_SESSIONS_ROOT = path.join(OBSIDIAN_ROOT, 'sessions')
const LIVE_LOG_PATH = path.join(OBSIDIAN_ROOT, 'live_ingestion_log.md')
const LIVE_REPORT_PATH = path.join(OBSIDIAN_ROOT, 'live_pipeline_report.md')
const LIVE_SESSIONS_PATH = path.join(OBSIDIAN_SESSIONS_ROOT, 'live_sessions.md')
const SESSIONS_INDEX_PATH = path.join(OBSIDIAN_SESSIONS_ROOT, '_INDEX.md')
const ANYTHINGLLM_INCREMENTAL_ROOT = path.join(REPO_ROOT, 'anythingllm_dataset', 'incremental')
const TEMP_ROOT = path.join(INTERNAL_ROOT, 'tmp')
const STAGING_ROOT = path.join(INTERNAL_ROOT, 'staging')
const STATE_PATH = path.join(INTERNAL_ROOT, 'state.json')
const LOCK_PATH = path.join(INTERNAL_ROOT, 'runner.lock.json')
const STATUS_PATH = path.join(INTERNAL_ROOT, 'status.json')

const CLAUDE_ROOT = 'C:\\Users\\david\\.claude\\projects\\c--Users-david-Documents-CFv1'
const CODEX_ACTIVE_ROOT = 'C:\\Users\\david\\.codex\\sessions'
const CODEX_ARCHIVE_ROOT = 'C:\\Users\\david\\.codex\\archived_sessions'
const CONVERSATION_PALACES = [
  {
    label: 'palace',
    palacePath: 'C:\\Users\\david\\.mempalace\\palace',
    dbPath: 'C:\\Users\\david\\.mempalace\\palace\\chroma.sqlite3',
    collections: ['mempalace_drawers'],
  },
  {
    label: 'palace2',
    palacePath: 'C:\\Users\\david\\.mempalace\\palace2',
    dbPath: 'C:\\Users\\david\\.mempalace\\palace2\\chroma.sqlite3',
    collections: ['mempalace_drawers', 'mempalace_compressed'],
  },
]

const STABLE_AGE_MS = 60_000
const DEFAULT_INTERVAL_SECONDS = 60
const MAX_MODE_A_COPY_BYTES = 250_000_000
const MAX_DATASET_SOURCE_BYTES = 5_000_000

const REQUIRED_METADATA_KEYS = [
  'source_file',
  'category',
  'section',
  'chunk_index',
  'total_chunks',
  'origin_type',
]

const CHUNKING = {
  minTokens: 500,
  targetTokens: 950,
  maxTokens: 1500,
  overlapRatio: 0.15,
}

const EXACT_EXCLUDED_DIRS = new Set([
  '.git',
  '.claude',
  '.auth',
  '.cloudflared',
  'node_modules',
  'obsidian_export',
  'anythingllm_dataset',
  '.live-ingestion',
])

const PREFIX_EXCLUDED_DIRS = [
  '.next',
  '.openclaw',
  '.codex-video-analysis',
  '.qa-screenshots',
]

const NAME_EXCLUDED_DIR_PARTS = [
  'screenshot',
  'test-results',
]

const MODE_A_ALLOWED_EXTENSIONS = new Set([
  '.bat',
  '.cjs',
  '.cmd',
  '.conf',
  '.css',
  '.csv',
  '.env',
  '.err',
  '.gitignore',
  '.html',
  '.ini',
  '.js',
  '.json',
  '.jsonl',
  '.log',
  '.md',
  '.mjs',
  '.out',
  '.ps1',
  '.scss',
  '.sh',
  '.sql',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
])

const MODE_A_ALLOWED_DOTFILES = new Set([
  '.env',
  '.env.example',
  '.env.local',
  '.env.local.dev',
  '.env.local.example',
  '.eslintrc.json',
  '.gitignore',
  '.prettierignore',
  '.prettierrc',
])

function main() {
  const args = parseArgs(process.argv.slice(2))
  ensureRuntimeLayout()
  const releaseLock = acquireLock(args)

  let state = loadState()

  try {
    if (args.watch) {
      while (true) {
        try {
          state = runCycle(state, args)
        } catch (error) {
          console.error('[live-ingestion] cycle failed:', error instanceof Error ? error.message : String(error))
        }
        saveState(state)
        sleep(args.intervalSeconds * 1000)
      }
    } else {
      state = runCycle(state, args)
      saveState(state)
    }
  } finally {
    writeStatus({
      pid: process.pid,
      active: false,
      mode: args.watch ? 'watch' : 'once',
      stoppedAt: new Date().toISOString(),
      lockHeld: false,
    })
    releaseLock()
  }
}

function parseArgs(argv) {
  const parsed = {
    once: false,
    watch: false,
    intervalSeconds: DEFAULT_INTERVAL_SECONDS,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--once') {
      parsed.once = true
      continue
    }
    if (value === '--watch') {
      parsed.watch = true
      continue
    }
    if (value === '--interval-seconds') {
      parsed.intervalSeconds = Number(argv[index + 1] || DEFAULT_INTERVAL_SECONDS)
      index += 1
    }
  }

  if (!parsed.once && !parsed.watch) {
    parsed.once = true
  }

  if (parsed.once && parsed.watch) {
    throw new Error('Choose either --once or --watch, not both.')
  }

  if (!Number.isFinite(parsed.intervalSeconds) || parsed.intervalSeconds < 5) {
    throw new Error('Interval must be at least 5 seconds.')
  }

  return parsed
}

function ensureRuntimeLayout() {
  for (const dir of [
    INTERNAL_ROOT,
    TEMP_ROOT,
    STAGING_ROOT,
    OBSIDIAN_ROOT,
    OBSIDIAN_CFV1_ROOT,
    OBSIDIAN_SESSIONS_ROOT,
    ANYTHINGLLM_INCREMENTAL_ROOT,
  ]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function acquireLock(args) {
  const now = new Date().toISOString()
  const existing = readJsonFile(LOCK_PATH)
  if (existing && existing.pid && processExists(existing.pid) && existing.pid !== process.pid) {
    throw new Error(`Live ingestion is already running with PID ${existing.pid}.`)
  }

  writeJsonFileAtomic(LOCK_PATH, {
    pid: process.pid,
    startedAt: now,
    mode: args.watch ? 'watch' : 'once',
    cwd: REPO_ROOT,
  })

  writeStatus({
    pid: process.pid,
    active: true,
    mode: args.watch ? 'watch' : 'once',
    startedAt: now,
    lastTickAt: now,
    lockHeld: true,
  })

  return () => {
    const current = readJsonFile(LOCK_PATH)
    if (current?.pid === process.pid && fs.existsSync(LOCK_PATH)) {
      fs.unlinkSync(LOCK_PATH)
    }
  }
}

function processExists(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function loadState() {
  const state = readJsonFile(STATE_PATH)
  if (state && typeof state === 'object') {
    state.version ||= 1
    state.createdAt ||= new Date().toISOString()
    state.ingested ||= {}
    state.sessionEntries ||= {}
    state.lastRunAt ||= null
    state.lastSuccessfulRunAt ||= null
    return state
  }

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    ingested: {},
    sessionEntries: {},
    lastRunAt: null,
    lastSuccessfulRunAt: null,
  }
}

function saveState(state) {
  writeJsonFileAtomic(STATE_PATH, state)
}

function writeActiveStatus(args, startedAt) {
  writeStatus({
    pid: process.pid,
    active: true,
    mode: args.watch ? 'watch' : 'once',
    startedAt: readJsonFile(STATUS_PATH)?.startedAt || startedAt,
    lastTickAt: new Date().toISOString(),
    lockHeld: true,
  })
}

function runCycle(state, args) {
  const startedAt = new Date().toISOString()
  const summary = {
    startedAt,
    endedAt: null,
    newFilesAdded: 0,
    categories: new Set(),
    errors: [],
    obsidianOutputs: [],
    datasetBatchPath: null,
    sessionEntries: [],
    notes: [],
  }

  writeActiveStatus(args, startedAt)

  ensureSessionFiles()

  const workspaceScan = collectWorkspaceCandidates(state)
  const conversationCandidates = collectConversationCandidates(state)

  const newObsidianSources = []

  try {
    for (const skipped of workspaceScan.skipped) {
      state.ingested[skipped.stateKey] = {
        namespace: 'cfv1',
        sourcePath: skipped.sourcePath,
        outputPath: null,
        ingestedAt: new Date().toISOString(),
        mode: 'A',
        skipped: true,
        reason: skipped.reason,
      }
      summary.notes.push(`${normalizeSlashes(path.relative(REPO_ROOT, skipped.sourcePath))} skipped: ${skipped.reason}`)
    }

    for (const candidate of workspaceScan.candidates) {
      const result = writeModeAWorkspaceCandidate(candidate, state)
      if (!result.written) {
        continue
      }

      summary.newFilesAdded += 1
      summary.categories.add('cfv1')
      summary.obsidianOutputs.push(normalizeSlashes(path.relative(REPO_ROOT, result.outputPath)))
      newObsidianSources.push({
        absolutePath: result.outputPath,
        sourceFile: normalizeSlashes(path.relative(OBSIDIAN_ROOT, result.outputPath)),
        outputCategory: 'code',
        category: 'code',
        originType: 'code',
      })
    }

    const conversationGroups = groupConversationCandidatesByMineRoot(conversationCandidates)
    for (const group of conversationGroups) {
      try {
        runConversationMine(group)

        for (const candidate of group.candidates) {
          const result = writeModeBConversationCandidate(candidate, state)
          if (!result.written) {
            continue
          }

          const sessionEntryAdded = appendLiveSessionEntry(candidate, result.outputPath, state)

          summary.newFilesAdded += 1
          summary.categories.add(candidate.namespace)
          summary.obsidianOutputs.push(normalizeSlashes(path.relative(REPO_ROOT, result.outputPath)))
          if (sessionEntryAdded) {
            summary.categories.add('sessions')
            summary.sessionEntries.push(sessionEntryAdded)
          }

          newObsidianSources.push({
            absolutePath: result.outputPath,
            sourceFile: normalizeSlashes(path.relative(OBSIDIAN_ROOT, result.outputPath)),
            outputCategory: 'conversations',
            category: 'conversations',
            originType: 'conversation',
          })
        }
        writeActiveStatus(args, startedAt)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        summary.errors.push(`[${group.namespace}] ${message}`)
        summary.notes.push(`conversation ingest failed for ${group.namespace}; watcher will retry next cycle`)
        writeActiveStatus(args, startedAt)
      }
    }

    const datasetBatch = buildIncrementalDataset(newObsidianSources)
    if (datasetBatch) {
      summary.datasetBatchPath = normalizeSlashes(path.relative(REPO_ROOT, datasetBatch.batchPath))
      summary.notes.push(`prepared incremental AnythingLLM batch with ${datasetBatch.recordCount} records`)
    }

    summary.endedAt = new Date().toISOString()
    state.lastRunAt = summary.endedAt
    if (summary.errors.length === 0) {
      state.lastSuccessfulRunAt = summary.endedAt
    }

    appendLiveIngestionLog(summary)
    writeLivePipelineReport(summary, state, args)
    return state
  } catch (error) {
    summary.errors.push(error instanceof Error ? error.message : String(error))
    summary.endedAt = new Date().toISOString()
    state.lastRunAt = summary.endedAt
    appendLiveIngestionLog(summary)
    writeLivePipelineReport(summary, state, args)
    throw error
  }
}

function ensureSessionFiles() {
  if (!fs.existsSync(SESSIONS_INDEX_PATH)) {
    fs.writeFileSync(
      SESSIONS_INDEX_PATH,
      '# Sessions\n\n- [chefflow-conversations](../chefflow-conversations/)\n- [codex-conversations](../codex-conversations/)\n- [live_sessions](./live_sessions.md)\n',
      'utf8',
    )
  } else {
    const existing = fs.readFileSync(SESSIONS_INDEX_PATH, 'utf8')
    if (!existing.includes('[live_sessions](./live_sessions.md)')) {
      fs.writeFileSync(
        SESSIONS_INDEX_PATH,
        `${existing.trimEnd()}\n- [live_sessions](./live_sessions.md)\n`,
        'utf8',
      )
    }
  }

  if (!fs.existsSync(LIVE_SESSIONS_PATH)) {
    fs.writeFileSync(LIVE_SESSIONS_PATH, '# Live Sessions\n\n', 'utf8')
  }

  if (!fs.existsSync(LIVE_LOG_PATH)) {
    fs.writeFileSync(LIVE_LOG_PATH, '# Live Ingestion Log\n\n', 'utf8')
  }
}

function collectWorkspaceCandidates(state) {
  const candidates = []
  const skipped = []
  walkWorkspace(REPO_ROOT, (absolutePath, relativePath, stat) => {
    const outputPath = path.join(OBSIDIAN_CFV1_ROOT, relativePath)
    const stateKey = `cfv1::${normalizeSlashes(relativePath)}`

    if (state.ingested[stateKey] || fs.existsSync(outputPath)) {
      return
    }

    if (!isModeAEligibleWorkspaceFile(relativePath)) {
      skipped.push({
        stateKey,
        sourcePath: absolutePath,
        reason: 'unsupported_mode_a_type',
      })
      return
    }

    if (stat.size > MAX_MODE_A_COPY_BYTES) {
      skipped.push({
        stateKey,
        sourcePath: absolutePath,
        reason: `oversize_mode_a_source (${formatInt(stat.size)} bytes)`,
      })
      return
    }

    if (!isStableEnough(stat)) {
      return
    }

    candidates.push({
      stateKey,
      sourcePath: absolutePath,
      relativePath,
      outputPath,
      stat,
    })
  })

  candidates.sort((left, right) => left.relativePath.localeCompare(right.relativePath, undefined, { sensitivity: 'accent' }))
  return {
    candidates,
    skipped,
  }
}

function walkWorkspace(rootDir, onFile) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      if (shouldSkipWorkspaceDirectory(entry.name)) {
        continue
      }
      walkWorkspace(absolutePath, onFile)
      continue
    }

    const stat = fs.statSync(absolutePath)
    const relativePath = path.relative(REPO_ROOT, absolutePath)
    onFile(absolutePath, relativePath, stat)
  }
}

function shouldSkipWorkspaceDirectory(name) {
  if (EXACT_EXCLUDED_DIRS.has(name)) {
    return true
  }

  if (PREFIX_EXCLUDED_DIRS.some((prefix) => name.startsWith(prefix))) {
    return true
  }

  return NAME_EXCLUDED_DIR_PARTS.some((part) => name.toLowerCase().includes(part))
}

function isModeAEligibleWorkspaceFile(relativePath) {
  const normalized = normalizeSlashes(relativePath)
  const basename = path.basename(normalized)
  const extension = path.extname(basename).toLowerCase()

  if (basename.startsWith('.env')) {
    return true
  }

  if (MODE_A_ALLOWED_DOTFILES.has(basename.toLowerCase())) {
    return true
  }

  if (MODE_A_ALLOWED_EXTENSIONS.has(extension)) {
    return true
  }

  return false
}

function collectConversationCandidates(state) {
  const candidates = []

  for (const filePath of collectFiles(CLAUDE_ROOT, (absolutePath) => path.extname(absolutePath).toLowerCase() === '.jsonl', false)) {
    const basename = path.basename(filePath)
    const outputPath = path.join(OBSIDIAN_ROOT, 'chefflow-conversations', `${basename}.md`)
    const stateKey = `chefflow-conversations::${basename}`
    if (state.ingested[stateKey] || fs.existsSync(outputPath)) {
      continue
    }

    const stat = fs.statSync(filePath)
    if (!isStableEnough(stat)) {
      continue
    }

    candidates.push({
      stateKey,
      namespace: 'chefflow-conversations',
      rawWings: ['chefflow-conversations'],
      sourcePath: filePath,
      mineRoot: path.join(STAGING_ROOT, 'chefflow-conversations'),
      minedSourcePath: path.join(STAGING_ROOT, 'chefflow-conversations', basename),
      relativeSourcePath: basename,
      outputPath,
    })
  }

  const codexRoots = [
    { root: CODEX_ACTIVE_ROOT, recurse: true },
    { root: CODEX_ARCHIVE_ROOT, recurse: false },
  ]

  for (const codexRoot of codexRoots) {
    for (const filePath of collectFiles(codexRoot.root, (absolutePath) => path.extname(absolutePath).toLowerCase() === '.jsonl', codexRoot.recurse)) {
      const basename = path.basename(filePath)
      const outputPath = path.join(OBSIDIAN_ROOT, 'codex-conversations', `${basename}.md`)
      const stateKey = `codex-conversations::${basename}`
      if (state.ingested[stateKey] || fs.existsSync(outputPath)) {
        continue
      }

      const stat = fs.statSync(filePath)
      if (!isStableEnough(stat)) {
        continue
      }

      candidates.push({
        stateKey,
        namespace: 'codex-conversations',
        rawWings: ['codex-conversations', 'codex-sessions'],
        sourcePath: filePath,
        mineRoot: path.join(STAGING_ROOT, 'codex-conversations'),
        minedSourcePath: path.join(STAGING_ROOT, 'codex-conversations', basename),
        relativeSourcePath: basename,
        outputPath,
      })
    }
  }

  candidates.sort((left, right) => left.outputPath.localeCompare(right.outputPath, undefined, { sensitivity: 'accent' }))
  return candidates
}

function collectFiles(rootDir, predicate, recurse) {
  if (!fs.existsSync(rootDir)) {
    return []
  }

  const files = []
  const walk = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (recurse) {
          walk(absolutePath)
        }
        continue
      }
      if (predicate(absolutePath)) {
        files.push(absolutePath)
      }
    }
  }

  walk(rootDir)
  return files
}

function isStableEnough(stat) {
  return Date.now() - stat.mtimeMs >= STABLE_AGE_MS
}

function writeModeAWorkspaceCandidate(candidate, state) {
  const sourceBuffer = fs.readFileSync(candidate.sourcePath)
  ensureParentDir(candidate.outputPath)

  const tempPath = getTempPath(candidate.outputPath)
  fs.copyFileSync(candidate.sourcePath, tempPath)
  fs.renameSync(tempPath, candidate.outputPath)

  const outputBuffer = fs.readFileSync(candidate.outputPath)
  if (!sourceBuffer.equals(outputBuffer)) {
    throw new Error(`Mode A validation failed for ${candidate.sourcePath}`)
  }

  state.ingested[candidate.stateKey] = {
    namespace: 'cfv1',
    sourcePath: candidate.sourcePath,
    outputPath: candidate.outputPath,
    ingestedAt: new Date().toISOString(),
    mode: 'A',
    sha256: sha256(sourceBuffer),
  }

  return { written: true, outputPath: candidate.outputPath }
}

function groupConversationCandidatesByMineRoot(candidates) {
  const groups = new Map()

  for (const candidate of candidates) {
    const key = `${candidate.namespace}\u0000${candidate.mineRoot}`
    const current = groups.get(key)
    if (current) {
      current.candidates.push(candidate)
      continue
    }

    groups.set(key, {
      namespace: candidate.namespace,
      mineRoot: candidate.mineRoot,
      wing: candidate.namespace === 'chefflow-conversations' ? 'chefflow-conversations' : 'codex-conversations',
      candidates: [candidate],
    })
  }

  return [...groups.values()].sort((left, right) => {
    const order = new Map([
      ['codex-conversations', 0],
      ['chefflow-conversations', 1],
    ])

    const namespaceRank = (order.get(left.namespace) ?? 99) - (order.get(right.namespace) ?? 99)
    if (namespaceRank !== 0) {
      return namespaceRank
    }

    return left.mineRoot.localeCompare(right.mineRoot, undefined, { sensitivity: 'accent' })
  })
}

function runConversationMine(group) {
  fs.rmSync(group.mineRoot, { recursive: true, force: true })
  fs.mkdirSync(group.mineRoot, { recursive: true })
  for (const candidate of group.candidates) {
    fs.copyFileSync(candidate.sourcePath, candidate.minedSourcePath)
  }

  const minePalace = getPreferredConversationMinePalace()
  const command = [
    'py',
    '-X',
    'utf8',
    '-m',
    'mempalace',
    '--palace',
    minePalace,
    'mine',
    group.mineRoot,
    '--mode',
    'convos',
    '--extract',
    'general',
    '--wing',
    group.wing,
  ]

  const result = spawnSync(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
    },
    windowsHide: true,
  })

  if (result.status !== 0) {
    throw new Error(
      [
        `MemPalace mine failed for ${group.mineRoot}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }
}

function getPreferredConversationMinePalace() {
  const activeRoot = CONVERSATION_PALACES.find((root) => root.label === 'palace2')
  if (activeRoot) {
    return activeRoot.palacePath
  }

  return CONVERSATION_PALACES[0].palacePath
}

function writeModeBConversationCandidate(candidate, state) {
  const rows = loadModeBRows(candidate)
  const chunkGroups = buildModeBChunkGroups(rows)
  validateModeBRows(candidate, rows, chunkGroups)

  const note = buildModeBNote(candidate, rows, chunkGroups)
  ensureParentDir(candidate.outputPath)

  const tempPath = getTempPath(candidate.outputPath)
  fs.writeFileSync(tempPath, note, 'utf8')
  fs.renameSync(tempPath, candidate.outputPath)

  const reread = fs.readFileSync(candidate.outputPath, 'utf8')
  if (reread !== note) {
    throw new Error(`Mode B validation failed while rereading ${candidate.outputPath}`)
  }

  validateModeBRenderedNote(candidate, note, rows, chunkGroups)

  state.ingested[candidate.stateKey] = {
    namespace: candidate.namespace,
    sourcePath: candidate.sourcePath,
    outputPath: candidate.outputPath,
    ingestedAt: new Date().toISOString(),
    mode: 'B',
    uniqueChunks: chunkGroups.length,
    drawerRows: rows.length,
    sha256: sha256(note),
  }

  return { written: true, outputPath: candidate.outputPath }
}

function loadModeBRows(candidate) {
  const rows = []

  for (const root of CONVERSATION_PALACES) {
    if (!fs.existsSync(root.dbPath)) {
      continue
    }

    const db = new Database(root.dbPath, { readonly: true, fileMustExist: true })
    const collectionPlaceholders = root.collections.map(() => '?').join(', ')
    const wingPlaceholders = candidate.rawWings.map(() => '?').join(', ')
    const query = `
      SELECT
        e.id AS drawer_id,
        e.embedding_id AS embedding_id,
        c.name AS collection_name,
        mwing.string_value AS wing,
        msf.string_value AS source_file,
        mroom.string_value AS room,
        mfiled.string_value AS filed_at,
        mchunk.int_value AS chunk_index,
        mdoc.string_value AS document
      FROM embeddings e
      JOIN segments s
        ON s.id = e.segment_id
      JOIN collections c
        ON c.id = s.collection
      JOIN embedding_metadata mwing
        ON mwing.id = e.id
       AND mwing.key = 'wing'
      JOIN embedding_metadata msf
        ON msf.id = e.id
       AND msf.key = 'source_file'
      LEFT JOIN embedding_metadata mroom
        ON mroom.id = e.id
       AND mroom.key = 'room'
      LEFT JOIN embedding_metadata mfiled
        ON mfiled.id = e.id
       AND mfiled.key = 'filed_at'
      LEFT JOIN embedding_metadata mchunk
        ON mchunk.id = e.id
       AND mchunk.key = 'chunk_index'
      LEFT JOIN embedding_metadata mdoc
        ON mdoc.id = e.id
       AND mdoc.key = 'chroma:document'
      WHERE c.name IN (${collectionPlaceholders})
        AND mwing.string_value IN (${wingPlaceholders})
        AND lower(msf.string_value) = ?
    `

    const resultRows = db
      .prepare(query)
      .all(...root.collections, ...candidate.rawWings, candidate.minedSourcePath.toLowerCase())

    for (const row of resultRows) {
      rows.push({
        root: root.label,
        collectionName: row.collection_name,
        wing: row.wing,
        sourceFile: row.source_file,
        room: row.room || '',
        filedAt: row.filed_at || '',
        chunkIndex: Number.isInteger(row.chunk_index) ? row.chunk_index : null,
        document: row.document || '',
        drawerId: row.drawer_id,
        embeddingId: row.embedding_id,
      })
    }

    db.close()
  }

  rows.sort(compareModeBRows)
  return rows
}

function buildModeBChunkGroups(rows) {
  const groups = []

  for (const row of rows) {
    const chunkIndex = row.chunkIndex
    let group = groups[groups.length - 1]
    if (!group || group.chunkIndex !== chunkIndex) {
      group = {
        chunkIndex,
        variants: [],
      }
      groups.push(group)
    }

    let variant = group.variants.find((entry) => entry.document === row.document)
    if (!variant) {
      variant = {
        variantLabel: `variant_${String(group.variants.length + 1).padStart(2, '0')}`,
        document: row.document,
        rows: [],
      }
      group.variants.push(variant)
    }

    variant.rows.push(row)
  }

  return groups
}

function validateModeBRows(candidate, rows, chunkGroups) {
  if (rows.length === 0) {
    throw new Error(`Mode B group has no rows for ${candidate.sourcePath}`)
  }

  if (rows.some((row) => row.chunkIndex === null)) {
    throw new Error(`Mode B grouping is unclear for ${candidate.sourcePath}`)
  }

  let previousChunk = -1
  for (const group of chunkGroups) {
    if (group.chunkIndex < previousChunk) {
      throw new Error(`Mode B chunk order regression for ${candidate.sourcePath}`)
    }
    previousChunk = group.chunkIndex
  }

  const minChunk = chunkGroups[0]?.chunkIndex ?? 0
  const maxChunk = chunkGroups[chunkGroups.length - 1]?.chunkIndex ?? -1
  for (let chunkIndex = minChunk; chunkIndex <= maxChunk; chunkIndex += 1) {
    if (!chunkGroups.find((group) => group.chunkIndex === chunkIndex)) {
      throw new Error(`Mode B missing chunk ${chunkIndex} for ${candidate.sourcePath}`)
    }
  }

  if (chunkGroups.some((group) => group.variants.length > 1)) {
    throw new Error(`Mode B variant conflict detected for ${candidate.sourcePath}`)
  }
}

function buildModeBNote(candidate, rows, chunkGroups) {
  const filedRange = summarizeFiledRange(rows)
  const rootsPresent = distinct(rows.map((row) => row.root)).sort()
  const collectionsPresent = distinct(rows.map((row) => row.collectionName)).sort()
  const wingsPresent = distinct(rows.map((row) => row.wing)).sort(compareRawWings)

  let body = ''
  body += `# ${candidate.relativeSourcePath}\n\n`
  body += '## Reconstructed Chunks\n\n'

  for (const group of chunkGroups) {
    const variant = group.variants[0]
    body += `### Chunk ${formatChunkIndex(group.chunkIndex)}\n`
    body += `drawer_refs: ${JSON.stringify(variant.rows.map((row) => row.drawerId))}\n`
    body += `embedding_refs: ${JSON.stringify(variant.rows.map((row) => row.embeddingId))}\n`
    body += `source_refs: ${JSON.stringify(
      distinct(variant.rows.map((row) => `${row.root} / ${row.collectionName} / ${row.wing}`)),
    )}\n\n`
    body += `${buildFencedBlock(sanitizeDrawerDocument(variant.document), inferFenceLanguage(candidate.relativeSourcePath))}\n\n`
  }

  body += '## Drawer Map\n'
  body += '| chunk_index | root | collection | wing | room | filed_at | embedding_id | drawer_id |\n'
  body += '| ---: | --- | --- | --- | --- | --- | --- | ---: |\n'

  for (const group of chunkGroups) {
    for (const row of group.variants[0].rows) {
      body += `| ${group.chunkIndex} | ${escapeTableCell(row.root)} | ${escapeTableCell(row.collectionName)} | ${escapeTableCell(row.wing)} | ${escapeTableCell(row.room)} | ${escapeTableCell(row.filedAt)} | ${escapeTableCell(row.embeddingId)} | ${row.drawerId} |\n`
    }
  }

  const contentSha = sha256(body)
  const frontmatter = [
    '---',
    'mempalace_export_version: 3',
    'note_type: mode-b-drawers',
    `export_namespace: ${yamlScalar(candidate.namespace)}`,
    `canonical_source_file: ${yamlScalar(candidate.sourcePath)}`,
    `relative_source_path: ${yamlScalar(candidate.relativeSourcePath)}`,
    `source_exists: ${fs.existsSync(candidate.sourcePath) ? 'true' : 'false'}`,
    'content_authority: mempalace-drawers',
    `roots_present: ${yamlArray(rootsPresent)}`,
    `collections_present: ${yamlArray(collectionsPresent)}`,
    `wings_present: ${yamlArray(wingsPresent)}`,
    `drawer_record_count: ${rows.length}`,
    `unique_chunk_count: ${chunkGroups.length}`,
    `filed_at_min: ${yamlScalar(filedRange.min)}`,
    `filed_at_max: ${yamlScalar(filedRange.max)}`,
    'ordering_status: "ordered"',
    `content_sha256: ${yamlScalar(contentSha)}`,
    `export_id: ${yamlScalar(`${candidate.namespace}::${candidate.sourcePath.toLowerCase()}`)}`,
    '---',
    '',
  ].join('\n')

  return `${frontmatter}${body}`
}

function validateModeBRenderedNote(candidate, note, rows, chunkGroups) {
  const title = `# ${candidate.relativeSourcePath}`
  if (!note.includes(title)) {
    throw new Error(`Mode B validation missing title for ${candidate.outputPath}`)
  }

  const drawerMapMarker = '\n## Drawer Map\n'
  const drawerMapIndex = note.indexOf(drawerMapMarker)
  if (drawerMapIndex === -1) {
    throw new Error(`Mode B validation missing drawer map for ${candidate.outputPath}`)
  }

  const drawerMapLines = note
    .slice(drawerMapIndex + drawerMapMarker.length)
    .split('\n')
    .filter((line) => /^\| \d+ \| /.test(line))
  if (drawerMapLines.length !== rows.length) {
    throw new Error(`Mode B validation drawer map mismatch for ${candidate.outputPath}`)
  }

  for (const group of chunkGroups) {
    const heading = `### Chunk ${formatChunkIndex(group.chunkIndex)}`
    if (!note.includes(heading)) {
      throw new Error(`Mode B validation missing chunk heading ${heading} for ${candidate.outputPath}`)
    }
  }
}

function appendLiveSessionEntry(candidate, outputPath, state) {
  const entryKey = `${candidate.namespace}::${candidate.relativeSourcePath}`
  if (state.sessionEntries[entryKey]) {
    return null
  }

  const line = `- ${new Date().toISOString()} | ${candidate.namespace} | [${path.basename(outputPath)}](../${candidate.namespace}/${path.basename(outputPath)})`
  fs.writeFileSync(LIVE_SESSIONS_PATH, `${fs.readFileSync(LIVE_SESSIONS_PATH, 'utf8').trimEnd()}\n${line}\n`, 'utf8')
  state.sessionEntries[entryKey] = {
    outputPath,
    addedAt: new Date().toISOString(),
  }
  return line
}

function buildIncrementalDataset(newSources) {
  const records = []
  const skipped = []

  for (const source of newSources) {
    if (!isDatasetEligibleSource(source.absolutePath)) {
      skipped.push(`${source.sourceFile} :: skipped incremental chunk prep (binary or too large)`)
      continue
    }

    const sourceBuild = buildSourceChunks(source)
    if (sourceBuild.skipReason) {
      skipped.push(`${source.sourceFile} :: ${sourceBuild.skipReason}`)
      continue
    }

    records.push(...sourceBuild.records)
  }

  if (!records.length && !skipped.length) {
    return null
  }

  const batchId = `incremental-${new Date().toISOString().replace(/[:.]/g, '-').replace(/-Z$/, 'Z')}`
  const batchPath = path.join(ANYTHINGLLM_INCREMENTAL_ROOT, `${batchId}.jsonl`)
  const lines = records.map((record) => JSON.stringify(record))
  fs.writeFileSync(batchPath, `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8')

  if (skipped.length) {
    const skippedPath = path.join(ANYTHINGLLM_INCREMENTAL_ROOT, `${batchId}.skipped.md`)
    const body = ['# Incremental Dataset Skips', '', ...skipped.map((item) => `- ${item}`)].join('\n')
    fs.writeFileSync(skippedPath, `${body}\n`, 'utf8')
  }

  validateIncrementalDatasetBatch(batchPath)

  return {
    batchPath,
    recordCount: records.length,
  }
}

function isDatasetEligibleSource(absolutePath) {
  const stat = fs.statSync(absolutePath)
  if (stat.size > MAX_DATASET_SOURCE_BYTES) {
    return false
  }

  const buffer = fs.readFileSync(absolutePath)
  const decoded = decodeTextBuffer(buffer)
  return Boolean(decoded.decoded)
}

function buildSourceChunks(source) {
  const raw = fs.readFileSync(source.absolutePath, 'utf8')
  if (!raw.trim()) {
    return { records: [], skipReason: 'Source file is empty' }
  }

  if (raw.includes('\uFFFD')) {
    return { records: [], skipReason: 'Skipped because source contains replacement characters' }
  }

  const units =
    source.originType === 'conversation'
      ? extractConversationUnits(raw, source)
      : extractDocumentUnits(raw, source)

  const normalizedUnits = prepareUnits(units)
  if (!normalizedUnits.length) {
    return { records: [], skipReason: null }
  }

  const chunkSpecs = assembleChunks(normalizedUnits, source)
  const totalChunks = chunkSpecs.length

  const records = chunkSpecs.map((chunkSpec, index) => {
    const metadata = {
      source_file: source.sourceFile,
      category: source.category,
      section: chunkSpec.section,
      chunk_index: index,
      total_chunks: totalChunks,
      origin_type: source.originType,
    }

    return {
      text: renderChunkText(source, chunkSpec),
      metadata,
    }
  })

  return { records, skipReason: null }
}

function extractConversationUnits(raw, source) {
  const content = stripFrontMatter(raw)
  const sections = extractReconstructedChunkSections(content)
  const units = []

  for (const section of sections) {
    const rendered = renderConversationSection(section.body, source)
    if (!rendered) {
      continue
    }

    const chunkLabel = `Chunk ${section.chunkId}`
    units.push({
      section: `Reconstructed Chunks / ${chunkLabel}`,
      text: `[${chunkLabel}]\n${rendered}`,
    })
  }

  return units
}

function extractDocumentUnits(raw, source) {
  const extension = path.extname(source.absolutePath).toLowerCase()
  const content = normalizeWhitespace(stripFrontMatter(raw))

  if (!content.trim()) {
    return []
  }

  if (['.md', '.txt'].includes(extension)) {
    return extractMarkdownUnits(content)
  }

  return extractPlainTextUnits(content)
}

function extractReconstructedChunkSections(content) {
  const lines = content.split('\n')
  const sections = []
  let inReconstructedChunks = false
  let currentSection = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (line.trim() === '## Reconstructed Chunks') {
        inReconstructedChunks = true
        continue
      }

      if (inReconstructedChunks) {
        break
      }
    }

    if (!inReconstructedChunks) {
      continue
    }

    const headingMatch = line.match(/^### Chunk (\d{4})\s*$/)
    if (headingMatch) {
      if (currentSection) {
        sections.push(currentSection)
      }

      currentSection = {
        chunkId: headingMatch[1],
        body: '',
      }
      continue
    }

    if (currentSection) {
      currentSection.body += `${line}\n`
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

function renderConversationSection(sectionBody, source) {
  const withoutProvenance = sectionBody
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return !(
        trimmed.startsWith('drawer_refs:') ||
        trimmed.startsWith('embedding_refs:') ||
        trimmed.startsWith('source_refs:')
      )
    })
    .join('\n')
    .trim()

  const fencedBlocks = extractFencedBlocks(withoutProvenance)
  const candidate = fencedBlocks.length ? fencedBlocks.join('\n\n') : withoutProvenance

  if (!candidate.trim()) {
    return ''
  }

  if (source.sourceFile.endsWith('.jsonl.md') && looksLikeJsonLines(candidate)) {
    const renderedJsonConversation = renderJsonConversation(candidate)
    if (renderedJsonConversation.trim()) {
      return stripStandaloneFenceLines(renderedJsonConversation)
    }
  }

  return stripStandaloneFenceLines(normalizeWhitespace(candidate))
}

function extractFencedBlocks(text) {
  const blocks = []
  const pattern = /(```+|~~~~+)([^\n]*)\n([\s\S]*?)\n\1/g
  let match = pattern.exec(text)
  while (match) {
    blocks.push(match[3].trim())
    match = pattern.exec(text)
  }
  return blocks
}

function looksLikeJsonLines(text) {
  const firstContentLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  return Boolean(firstContentLine && firstContentLine.startsWith('{') && firstContentLine.includes('"type"'))
}

function renderJsonConversation(rawJsonl) {
  const rendered = []

  for (const line of rawJsonl.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    try {
      const payload = JSON.parse(trimmed)
      const message = renderConversationEvent(payload)
      if (message) {
        rendered.push(message)
      }
    } catch {
      rendered.push(trimmed)
    }
  }

  return normalizeWhitespace(rendered.join('\n\n'))
}

function renderConversationEvent(event) {
  if (!event || typeof event !== 'object') {
    return ''
  }

  switch (event.type) {
    case 'response_item':
      return renderResponseItem(event.payload)
    case 'event_msg':
      return renderEventMessage(event.payload)
    case 'session_meta':
      return renderSessionMeta(event.payload)
    default:
      return ''
  }
}

function renderResponseItem(payload) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  if (payload.type === 'message') {
    const role = String(payload.role || '').toLowerCase()
    if (role === 'developer' || role === 'system') {
      return ''
    }

    const text = normalizeWhitespace(extractStructuredText(payload.content))
    if (!text || isBoilerplateConversationText(text)) {
      return ''
    }

    return `[${role || 'message'}]\n${text}`
  }

  if (payload.type === 'custom_tool_call') {
    const name = payload.name || 'tool'
    const input = normalizeWhitespace(String(payload.input || ''))
    return input ? `[tool_call:${name}]\n${input}` : `[tool_call:${name}]`
  }

  if (payload.type === 'custom_tool_call_output') {
    const output = renderToolOutput(payload.output)
    return output ? `[tool_output]\n${output}` : ''
  }

  if (payload.type === 'function_call') {
    const name = payload.name || 'tool'
    const argumentsText = renderFunctionArguments(payload.arguments)
    return argumentsText ? `[tool_call:${name}]\n${argumentsText}` : `[tool_call:${name}]`
  }

  if (payload.type === 'function_call_output') {
    const output = renderToolOutput(payload.output)
    return output ? `[tool_output]\n${output}` : ''
  }

  if (payload.type === 'reasoning') {
    return ''
  }

  return ''
}

function renderEventMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  if (payload.type === 'user_message') {
    const text = normalizeWhitespace(String(payload.message || ''))
    if (!text || isBoilerplateConversationText(text)) {
      return ''
    }
    return `[user_message]\n${text}`
  }

  if (payload.type === 'token_count' || payload.type === 'agent_reasoning') {
    return ''
  }

  return ''
}

function renderSessionMeta(payload) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const details = []
  if (payload.id) {
    details.push(`session_id: ${payload.id}`)
  }
  if (payload.cwd) {
    details.push(`cwd: ${payload.cwd}`)
  }
  if (payload.model_provider) {
    details.push(`model_provider: ${payload.model_provider}`)
  }

  return details.length ? `[session_meta]\n${details.join('\n')}` : ''
}

function renderToolOutput(output) {
  if (output == null) {
    return ''
  }

  const value = String(output).trim()
  if (!value) {
    return ''
  }

  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') {
      return normalizeWhitespace(parsed)
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.output === 'string') {
      return normalizeWhitespace(parsed.output)
    }
    return normalizeWhitespace(JSON.stringify(parsed, null, 2))
  } catch {
    return normalizeWhitespace(value)
  }
}

function renderFunctionArguments(argumentsValue) {
  if (argumentsValue == null) {
    return ''
  }

  const text = String(argumentsValue).trim()
  if (!text) {
    return ''
  }

  try {
    return normalizeWhitespace(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    return normalizeWhitespace(text)
  }
}

function extractStructuredText(value) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractStructuredText(item))
      .filter(Boolean)
      .join('\n\n')
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  if (typeof value.text === 'string') {
    return value.text
  }

  if (typeof value.output_text === 'string') {
    return value.output_text
  }

  if (typeof value.input_text === 'string') {
    return value.input_text
  }

  return ''
}

function isBoilerplateConversationText(text) {
  const trimmed = text.trim()
  return (
    trimmed.startsWith('<permissions instructions>') ||
    trimmed.startsWith('# AGENTS.md instructions') ||
    trimmed.startsWith('<environment_context>') ||
    trimmed.startsWith('## Skills') ||
    trimmed.startsWith('A skill is a set of local instructions') ||
    trimmed.startsWith('Filesystem sandboxing defines') ||
    trimmed.startsWith('<INSTRUCTIONS>')
  )
}

function extractMarkdownUnits(content) {
  const sections = splitMarkdownSections(content)
  const units = []

  for (const section of sections) {
    const sectionContent = section.content.trim()
    if (!sectionContent) {
      continue
    }

    if (estimateTokens(sectionContent) <= CHUNKING.maxTokens) {
      units.push({
        section: section.path,
        text: sectionContent,
      })
      continue
    }

    for (const block of splitIntoBlocks(sectionContent)) {
      if (!block.trim()) {
        continue
      }

      units.push({
        section: section.path,
        text: block.trim(),
      })
    }
  }

  return units
}

function splitMarkdownSections(content) {
  const lines = content.split('\n')
  const sections = []
  let headingStack = []
  let buffer = []
  let currentPath = 'Document'
  let inFence = false
  let fenceMarker = ''

  const flush = () => {
    const sectionText = buffer.join('\n').trim()
    if (sectionText) {
      sections.push({
        path: currentPath,
        content: sectionText,
      })
    }
    buffer = []
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^(```+|~~~~+)/)
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (marker === fenceMarker) {
        inFence = false
        fenceMarker = ''
      }
      buffer.push(line)
      continue
    }

    if (!inFence) {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
      if (headingMatch) {
        flush()
        const level = headingMatch[1].length
        const title = headingMatch[2].trim()
        headingStack = headingStack.slice(0, level - 1)
        headingStack[level - 1] = title
        currentPath = headingStack.filter(Boolean).join(' > ') || 'Document'
        buffer.push(line)
        continue
      }
    }

    buffer.push(line)
  }

  flush()
  return sections.length ? sections : [{ path: 'Document', content: content.trim() }]
}

function extractPlainTextUnits(content) {
  return splitIntoBlocks(content).map((block, index) => ({
    section: index === 0 ? 'Document' : `Document / Block ${index + 1}`,
    text: block,
  }))
}

function splitIntoBlocks(content) {
  const lines = content.split('\n')
  const blocks = []
  let current = []
  let inFence = false
  let fenceMarker = ''

  const flush = () => {
    const text = current.join('\n').trim()
    if (text) {
      blocks.push(text)
    }
    current = []
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^(```+|~~~~+)/)
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (marker === fenceMarker) {
        inFence = false
        fenceMarker = ''
      }
      current.push(line)
      continue
    }

    if (!inFence && line.trim() === '') {
      flush()
      continue
    }

    current.push(line)
  }

  flush()
  return blocks
}

function prepareUnits(units) {
  const prepared = []

  for (const unit of units) {
    const normalizedText = normalizeWhitespace(unit.text)
    if (!normalizedText) {
      continue
    }

    const nextUnit = {
      section: unit.section || 'Document',
      text: normalizedText,
      tokens: estimateTokens(normalizedText),
    }

    if (nextUnit.tokens <= CHUNKING.maxTokens) {
      prepared.push(nextUnit)
      continue
    }

    prepared.push(...splitOversizedUnit(nextUnit))
  }

  return prepared
}

function splitOversizedUnit(unit) {
  const blocks = splitIntoBlocks(unit.text)
  if (blocks.length > 1) {
    return blocks.flatMap((block, index) =>
      splitBlockToSize({
        section: index === 0 ? unit.section : `${unit.section} / Segment ${index + 1}`,
        text: block,
      }),
    )
  }

  return splitBlockToSize(unit)
}

function splitBlockToSize(unit) {
  const lines = unit.text.split('\n')
  const segments = []
  let current = []
  let currentTokens = 0
  let inFence = false
  let fenceMarker = ''

  const flush = () => {
    const text = normalizeWhitespace(current.join('\n'))
    if (text) {
      segments.push({
        section: unit.section,
        text,
        tokens: estimateTokens(text),
      })
    }
    current = []
    currentTokens = 0
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^(```+|~~~~+)/)
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (marker === fenceMarker) {
        inFence = false
        fenceMarker = ''
      }
    }

    const lineTokens = estimateTokens(line)
    if (current.length && currentTokens + lineTokens > CHUNKING.maxTokens && !inFence) {
      flush()
    }

    current.push(line)
    currentTokens += lineTokens
  }

  flush()
  return segments
}

function assembleChunks(units, source) {
  const chunks = []
  let window = []
  let windowTokens = 0

  const pushWindow = () => {
    if (!window.length) {
      return
    }

    chunks.push(buildChunkSpec(window))
    const overlapUnits = computeOverlapUnits(window)
    window = overlapUnits
    windowTokens = overlapUnits.reduce((sum, unit) => sum + unit.tokens, 0)
  }

  for (const unit of units) {
    if (
      window.length &&
      windowTokens + unit.tokens > CHUNKING.maxTokens &&
      windowTokens >= CHUNKING.minTokens
    ) {
      pushWindow()
    }

    window.push(unit)
    windowTokens += unit.tokens

    if (windowTokens >= CHUNKING.targetTokens && windowTokens <= CHUNKING.maxTokens) {
      pushWindow()
    }
  }

  if (window.length) {
    chunks.push(buildChunkSpec(window))
  }

  return dedupeChunkSpecs(chunks, source.sourceFile)
}

function buildChunkSpec(window) {
  const firstSection = window[0].section
  const lastSection = window[window.length - 1].section
  const section = firstSection === lastSection ? firstSection : `${firstSection} -> ${lastSection}`
  return {
    section,
    body: window.map((unit) => unit.text).join('\n\n'),
  }
}

function computeOverlapUnits(window) {
  if (window.length < 2) {
    return []
  }

  const overlapTarget = Math.max(1, Math.round(CHUNKING.targetTokens * CHUNKING.overlapRatio))
  const overlap = []
  let tokens = 0

  for (let index = window.length - 1; index >= 0; index -= 1) {
    const unit = window[index]
    overlap.unshift(unit)
    tokens += unit.tokens
    if (tokens >= overlapTarget) {
      break
    }
  }

  return overlap
}

function dedupeChunkSpecs(chunks, sourceFile) {
  const seen = new Set()
  return chunks.filter((chunk) => {
    const key = createHash(`${sourceFile}\n${chunk.section}\n${chunk.body}`)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function renderChunkText(source, chunkSpec) {
  return normalizeWhitespace(
    `Source file: ${source.sourceFile}\nSection: ${chunkSpec.section}\n\n${chunkSpec.body}`,
  )
}

function validateIncrementalDatasetBatch(batchPath) {
  if (!fs.existsSync(batchPath)) {
    return
  }

  const raw = fs.readFileSync(batchPath, 'utf8')
  const lines = raw.split('\n').filter(Boolean)
  const seenHashes = new Set()

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    let parsed
    try {
      parsed = JSON.parse(line)
    } catch {
      throw new Error(`Incremental dataset malformed JSON at line ${index + 1}`)
    }

    if (!parsed.text || !String(parsed.text).trim()) {
      throw new Error(`Incremental dataset empty chunk at line ${index + 1}`)
    }

    for (const key of REQUIRED_METADATA_KEYS) {
      if (!(key in (parsed.metadata || {}))) {
        throw new Error(`Incremental dataset missing metadata key "${key}" at line ${index + 1}`)
      }
    }

    const chunkHash = createHash(parsed.text)
    if (seenHashes.has(chunkHash)) {
      throw new Error(`Incremental dataset duplicate chunk text at line ${index + 1}`)
    }
    seenHashes.add(chunkHash)
  }
}

function appendLiveIngestionLog(summary) {
  const lines = [
    `## ${summary.endedAt || summary.startedAt}`,
    `- new files added: ${summary.newFilesAdded}`,
    `- category: ${summary.categories.size ? [...summary.categories].sort().join(', ') : 'none'}`,
    `- errors: ${summary.errors.length ? summary.errors.join(' | ') : 'none'}`,
    `- obsidian outputs: ${summary.obsidianOutputs.length ? summary.obsidianOutputs.join(', ') : 'none'}`,
    `- anythingllm incremental batch: ${summary.datasetBatchPath || 'none'}`,
  ]

  fs.writeFileSync(LIVE_LOG_PATH, `${fs.readFileSync(LIVE_LOG_PATH, 'utf8').trimEnd()}\n\n${lines.join('\n')}\n`, 'utf8')
}

function writeLivePipelineReport(summary, state, args) {
  const report = [
    '# Live Pipeline Report',
    '',
    `- status: ${args.watch ? 'active watcher configured' : 'manual run completed'}`,
    `- generated_at: ${new Date().toISOString()}`,
    `- last_run_at: ${summary.endedAt || summary.startedAt}`,
    `- last_successful_run_at: ${state.lastSuccessfulRunAt || 'none'}`,
    `- watcher_pid: ${process.pid}`,
    `- poll_interval_seconds: ${args.intervalSeconds}`,
    '',
    '## How Ingestion Works',
    '',
    '1. The runner polls the live source roots and only accepts files that have gone quiet for at least 60 seconds.',
    '2. New workspace files are classified as Mode A and copied byte-for-byte into `obsidian_export/cfv1/` with atomic temp-file swaps.',
    '3. New Claude and Codex transcripts are classified as Mode B, mined into MemPalace, then rendered into the existing drawer-backed markdown note format in `obsidian_export/chefflow-conversations/` or `obsidian_export/codex-conversations/`.',
    '4. Each newly exported Obsidian file is converted into an incremental AnythingLLM batch in `anythingllm_dataset/incremental/` using the same chunking rules as the dataset phase.',
    '5. A live append-only log is written to `obsidian_export/live_ingestion_log.md`, and session links are appended to `obsidian_export/sessions/live_sessions.md`.',
    '',
    '## Monitored Inputs',
    '',
    `- Codex conversations: \`${CODEX_ACTIVE_ROOT}\` and \`${CODEX_ARCHIVE_ROOT}\``,
    `- Claude sessions: \`${CLAUDE_ROOT}\``,
    `- Project files: \`${REPO_ROOT}\` (text/config/log sources only, excluding generated/output folders such as \`.git\`, \`.auth\`, \`node_modules\`, \`obsidian_export\`, \`anythingllm_dataset\`, and runtime scratch directories)`,
    '- New logs and transcripts: captured when they are text-based and stable under the same forward-only file scan',
    '',
    '## New Data Flow',
    '',
    '- source artifact becomes stable',
    '- runner dedupes against prior ingestions and existing export paths',
    '- Obsidian output is written atomically',
    '- session registry is appended for new conversation exports',
    '- incremental AnythingLLM JSONL batch is prepared, but not ingested',
    '',
    '## Stability Guards',
    '',
    '- single-instance lock file prevents duplicate watcher processes',
    '- no existing exported file is overwritten by the forward-only ingestion rules',
    '- Mode A copy validates source/output byte equality after write',
    '- Mode B note re-reads the rendered note and validates chunk headings plus drawer map row counts',
    '- incremental dataset batches are validated for JSON shape, required metadata, empty chunks, and duplicate chunk text',
    '',
    '## Limitations',
    '',
    '- The pipeline is forward-only. It intentionally does not rewrite historical vault files or version later edits to already-exported project files.',
    '- Conversation notes depend on local MemPalace mining being available (`py -m mempalace`). If mining fails, the run is logged as an error and retried on the next cycle.',
    '- Mode A is intentionally text-first. Binary assets, auth blobs, screenshots, and unsupported artifact types are skipped instead of being pushed into the live memory layer.',
    `- Oversized Mode A sources above ${formatInt(MAX_MODE_A_COPY_BYTES)} bytes are logged and skipped so the watcher does not corrupt the vault by copying transient multi-gigabyte artifacts.`,
    `- Incremental AnythingLLM prep skips binary files and very large files above ${formatInt(MAX_DATASET_SOURCE_BYTES)} bytes to avoid corrupt chunks.`,
    '',
    '## Latest Run',
    '',
    `- new files added: ${summary.newFilesAdded}`,
    `- categories touched: ${summary.categories.size ? [...summary.categories].sort().join(', ') : 'none'}`,
    `- latest obsidian outputs: ${summary.obsidianOutputs.length ? summary.obsidianOutputs.join(', ') : 'none'}`,
    `- latest incremental batch: ${summary.datasetBatchPath || 'none'}`,
    `- latest errors: ${summary.errors.length ? summary.errors.join(' | ') : 'none'}`,
  ].join('\n')

  fs.writeFileSync(LIVE_REPORT_PATH, `${report}\n`, 'utf8')
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripStandaloneFenceLines(text) {
  return normalizeWhitespace(
    text
      .split('\n')
      .filter((line) => !line.trim().match(/^(```+|~~~~+)[a-zA-Z0-9_-]*$/))
      .join('\n'),
  )
}

function stripFrontMatter(text) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return normalized
  }

  const closingIndex = normalized.indexOf('\n---\n', 4)
  if (closingIndex === -1) {
    return normalized
  }

  return normalized.slice(closingIndex + 5)
}

function estimateTokens(text) {
  const characterEstimate = Math.ceil(text.length / 4)
  const wordEstimate = Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.2)
  return Math.max(characterEstimate, wordEstimate)
}

function createHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function compareRawWings(left, right) {
  const order = new Map([
    ['chefflow-conversations', 0],
    ['codex-conversations', 1],
    ['codex-sessions', 2],
  ])
  return (order.get(left) ?? 99) - (order.get(right) ?? 99)
}

function compareModeBRows(left, right) {
  const leftChunk = left.chunkIndex === null ? Number.MAX_SAFE_INTEGER : left.chunkIndex
  const rightChunk = right.chunkIndex === null ? Number.MAX_SAFE_INTEGER : right.chunkIndex
  if (leftChunk !== rightChunk) {
    return leftChunk - rightChunk
  }

  const rootRank = getRootRank(left.root) - getRootRank(right.root)
  if (rootRank !== 0) {
    return rootRank
  }

  const collectionRank = left.collectionName.localeCompare(right.collectionName, undefined, {
    sensitivity: 'accent',
  })
  if (collectionRank !== 0) {
    return collectionRank
  }

  const wingRank = compareRawWings(left.wing, right.wing)
  if (wingRank !== 0) {
    return wingRank
  }

  const filedRank = left.filedAt.localeCompare(right.filedAt, undefined, {
    sensitivity: 'accent',
  })
  if (filedRank !== 0) {
    return filedRank
  }

  const embeddingRank = left.embeddingId.localeCompare(right.embeddingId, undefined, {
    sensitivity: 'accent',
  })
  if (embeddingRank !== 0) {
    return embeddingRank
  }

  return left.drawerId - right.drawerId
}

function getRootRank(rootLabel) {
  return rootLabel === 'palace2' ? 0 : 1
}

function summarizeFiledRange(rows) {
  const values = rows.map((row) => row.filedAt).filter(Boolean).sort()
  return {
    min: values[0] || '',
    max: values[values.length - 1] || '',
  }
}

function formatChunkIndex(chunkIndex) {
  return String(chunkIndex).padStart(4, '0')
}

function inferFenceLanguage(relativePath) {
  const extension = path.extname(relativePath || '').toLowerCase()
  switch (extension) {
    case '.ts':
      return 'ts'
    case '.tsx':
      return 'tsx'
    case '.js':
    case '.cjs':
    case '.mjs':
      return 'js'
    case '.json':
    case '.jsonl':
      return 'json'
    case '.md':
      return 'markdown'
    case '.yaml':
    case '.yml':
      return 'yaml'
    default:
      return 'text'
  }
}

function buildFencedBlock(text, language) {
  const maxRun = findLongestBacktickRun(text)
  const fence = '`'.repeat(Math.max(4, maxRun + 1))
  return `${fence}${language}\n${text}\n${fence}`
}

function sanitizeDrawerDocument(text) {
  return String(text ?? '').replace(/\u0000+/g, (match) => `[NULL_BYTES x${match.length}]`)
}

function findLongestBacktickRun(text) {
  const matches = text.match(/`+/g) || []
  return matches.reduce((max, run) => Math.max(max, run.length), 0)
}

function escapeTableCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\r/g, '')
}

function yamlScalar(value) {
  return JSON.stringify(value ?? '')
}

function yamlArray(values) {
  return `[${values.map((value) => yamlScalar(value)).join(', ')}]`
}

function distinct(values) {
  return [...new Set(values)]
}

function decodeTextBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return {
      decoded: buffer.toString('utf16le'),
      encoding: 'utf16le',
    }
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buffer.length - 2)
    for (let index = 2; index < buffer.length; index += 2) {
      if (index + 1 < buffer.length) {
        swapped[index - 2] = buffer[index + 1]
        swapped[index - 1] = buffer[index]
      }
    }
    return {
      decoded: swapped.toString('utf16le'),
      encoding: 'utf16be',
    }
  }

  if (buffer.includes(0)) {
    return {
      decoded: null,
      encoding: null,
    }
  }

  return {
    decoded: buffer.toString('utf8'),
    encoding: 'utf8',
  }
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function getTempPath(finalPath) {
  const hash = crypto.createHash('sha1').update(finalPath).digest('hex').slice(0, 12)
  return path.join(TEMP_ROOT, `${hash}.tmp`)
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function writeJsonFileAtomic(filePath, value) {
  ensureParentDir(filePath)
  const tempPath = getTempPath(filePath)
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  fs.renameSync(tempPath, filePath)
}

function writeStatus(status) {
  writeJsonFileAtomic(STATUS_PATH, status)
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function normalizeSlashes(filePath) {
  return filePath.replace(/\\/g, '/')
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function formatInt(value) {
  return Intl.NumberFormat('en-US').format(value)
}

main()
