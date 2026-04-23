import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

const OUTPUT_ROOT = path.resolve(process.cwd(), 'obsidian_export')
const IMPORT_LOG_PATH = path.join(OUTPUT_ROOT, 'import_log.md')
const MISSING_SOURCE_ANALYSIS_PATH = path.join(OUTPUT_ROOT, 'missing_source_analysis.md')
const TEMP_ROOT = path.join(OUTPUT_ROOT, '.tmp')

const BATCH_TWO_MODE_A_TARGET = 200
const BATCH_TWO_MODE_B_TARGETS = new Map([
  ['chefflow-conversations', 200],
  ['codex-conversations', 100],
])
const BATCH_TWO_TOTAL_OUTPUTS = BATCH_TWO_MODE_A_TARGET + [...BATCH_TWO_MODE_B_TARGETS.values()].reduce((sum, value) => sum + value, 0)
const BATCH_ONE_TARGET_OUTPUTS = 500
const EXPECTED_BATCH_ONE_SKIP_COUNT = 311

const ROOTS = [
  {
    label: 'palace2',
    dbPath: 'C:\\Users\\david\\.mempalace\\palace2\\chroma.sqlite3',
    collections: ['mempalace_drawers', 'mempalace_compressed'],
  },
  {
    label: 'palace',
    dbPath: 'C:\\Users\\david\\.mempalace\\palace\\chroma.sqlite3',
    collections: ['mempalace_drawers'],
  },
]

const SOURCE_ROOTS = {
  cfv1: 'C:\\Users\\david\\Documents\\CFv1',
  'chefflow-conversations':
    'C:\\Users\\david\\.claude\\projects\\c--Users-david-Documents-CFv1',
  'codex-conversations': 'C:\\Users\\david\\.codex\\archived_sessions',
}

const RAW_WING_TO_NAMESPACE = new Map([
  ['cfv1', 'cfv1'],
  ['chefflow-conversations', 'chefflow-conversations'],
  ['codex-conversations', 'codex-conversations'],
  ['codex-sessions', 'codex-conversations'],
])

const NAMESPACE_ORDER = new Map([
  ['cfv1', 0],
  ['chefflow-conversations', 1],
  ['codex-conversations', 2],
])

const RAW_WING_ORDER = new Map([
  ['cfv1', 0],
  ['chefflow-conversations', 1],
  ['codex-conversations', 2],
  ['codex-sessions', 3],
])

const MODE_B_ALLOWED_EXTENSIONS = new Set(['.jsonl', '.txt', '.log', '.out', '.err', '.json'])
const MAIN_WORKSPACE_EXCLUDES = new Set([
  '.git',
  '.claude',
  '.next',
  '.next-dev',
  'node_modules',
  'obsidian_export',
])

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.batch !== 2) {
    throw new Error('This execution only supports --batch 2.')
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
  fs.mkdirSync(TEMP_ROOT, { recursive: true })

  const candidates = buildCandidates()
  const orderedCandidates = [...candidates.values()].sort(compareCandidates)
  const batchOneSkipAnalysis = analyzeBatchOneSkips(orderedCandidates)
  writeMissingSourceAnalysis(batchOneSkipAnalysis)

  const executionPlan = selectBatchTwo(orderedCandidates)
  const results = executeBatchTwo(executionPlan, batchOneSkipAnalysis)

  appendImportLog(results)
  printSummary(results)
}

function parseArgs(argv) {
  const parsed = { batch: 2 }
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--batch') {
      parsed.batch = Number(argv[index + 1] || '2')
      index += 1
    }
  }
  return parsed
}

function buildCandidates() {
  const candidates = new Map()

  for (const root of ROOTS) {
    const db = new Database(root.dbPath, { readonly: true, fileMustExist: true })
    const placeholders = root.collections.map(() => '?').join(', ')
    const rows = db
      .prepare(
        `
        SELECT
          c.name AS collection_name,
          mwing.string_value AS wing,
          lower(msf.string_value) AS normalized_source,
          msf.string_value AS source_file,
          COUNT(*) AS record_count
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
        WHERE c.name IN (${placeholders})
          AND mwing.string_value IN ('cfv1', 'chefflow-conversations', 'codex-conversations', 'codex-sessions')
        GROUP BY c.name, wing, normalized_source, source_file
        ORDER BY wing, normalized_source, source_file
      `,
      )
      .all(...root.collections)

    for (const row of rows) {
      const namespace = normalizeNamespace(row.wing)
      const key = `${namespace}\u0000${row.normalized_source}`
      const candidate = candidates.get(key) || createCandidate(namespace, row.normalized_source)

      candidate.totalRecordCount += Number(row.record_count)
      candidate.roots.add(root.label)
      candidate.collections.add(row.collection_name)
      candidate.wings.add(row.wing)

      const spellingKey = normalizePathKey(row.source_file)
      const existing = fs.existsSync(row.source_file)
      const current = candidate.sourceSpellings.get(spellingKey)

      if (current) {
        current.recordCount += Number(row.record_count)
        current.exists = current.exists || existing
      } else {
        candidate.sourceSpellings.set(spellingKey, {
          sourceFile: row.source_file,
          recordCount: Number(row.record_count),
          exists: existing,
        })
      }

      chooseDisplaySource(candidate)
      finalizeCandidate(candidate)
      candidates.set(key, candidate)
    }

    db.close()
  }

  return candidates
}

function createCandidate(namespace, normalizedSource) {
  return {
    namespace,
    normalizedSource,
    totalRecordCount: 0,
    roots: new Set(),
    collections: new Set(),
    wings: new Set(),
    sourceSpellings: new Map(),
    displaySource: null,
    sourceExists: false,
    mode: null,
    sourceRoot: null,
    relativePath: null,
    outputPath: null,
    statusPreview: null,
    skipReasonPreview: null,
    ambiguousNotes: [],
  }
}

function chooseDisplaySource(candidate) {
  const spellings = [...candidate.sourceSpellings.values()].sort((left, right) => {
    if (left.exists !== right.exists) {
      return left.exists ? -1 : 1
    }
    return left.sourceFile.localeCompare(right.sourceFile, undefined, { sensitivity: 'accent' })
  })

  if (spellings.length === 0) {
    candidate.displaySource = null
    candidate.sourceExists = false
    return
  }

  candidate.displaySource = spellings[0].sourceFile
  candidate.sourceExists = spellings.some((entry) => entry.exists)
}

function finalizeCandidate(candidate) {
  candidate.mode = candidate.namespace === 'cfv1' ? 'A' : 'B'
  candidate.sourceRoot = SOURCE_ROOTS[candidate.namespace] || null
  candidate.relativePath = getRelativePath(candidate.displaySource, candidate.sourceRoot)
  candidate.outputPath = buildOutputPath(candidate)

  if (candidate.mode === 'A') {
    if (!candidate.displaySource) {
      candidate.statusPreview = 'skip'
      candidate.skipReasonPreview = 'mode_a_missing_source_path'
      return
    }

    if (!candidate.sourceRoot || !candidate.relativePath) {
      candidate.statusPreview = 'skip'
      candidate.skipReasonPreview = 'mode_a_source_outside_root'
      return
    }

    if (!candidate.sourceExists) {
      candidate.statusPreview = 'skip'
      candidate.skipReasonPreview = 'mode_a_source_missing'
      return
    }

    candidate.statusPreview = 'write'
    candidate.skipReasonPreview = null
    return
  }

  if (!candidate.displaySource) {
    candidate.statusPreview = 'skip'
    candidate.skipReasonPreview = 'mode_b_missing_group_id'
    return
  }

  if (!candidate.sourceRoot || !candidate.relativePath) {
    candidate.statusPreview = 'skip'
    candidate.skipReasonPreview = 'mode_b_source_outside_root'
    return
  }

  if (!isModeBSessionLike(candidate.relativePath)) {
    candidate.statusPreview = 'skip'
    candidate.skipReasonPreview = 'mode_b_non_session_artifact'
    return
  }

  candidate.statusPreview = 'write'
  candidate.skipReasonPreview = null
}

function normalizeNamespace(rawWing) {
  return RAW_WING_TO_NAMESPACE.get(rawWing) || rawWing
}

function getRelativePath(sourceFile, sourceRoot) {
  if (!sourceFile || !sourceRoot) {
    return null
  }

  const sourceFileKey = normalizePathKey(sourceFile)
  const sourceRootKey = normalizePathKey(sourceRoot)
  if (!(sourceFileKey === sourceRootKey || sourceFileKey.startsWith(`${sourceRootKey}\\`))) {
    return null
  }

  const relative = path.relative(sourceRoot, sourceFile)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  return relative
}

function buildOutputPath(candidate) {
  if (!candidate.relativePath) {
    return null
  }

  const basePath = path.join(OUTPUT_ROOT, candidate.namespace, candidate.relativePath)
  if (candidate.mode === 'A') {
    return basePath
  }

  if (basePath.toLowerCase().endsWith('.md')) {
    return basePath
  }

  return `${basePath}.md`
}

function compareCandidates(left, right) {
  const namespaceRank =
    (NAMESPACE_ORDER.get(left.namespace) ?? 99) - (NAMESPACE_ORDER.get(right.namespace) ?? 99)
  if (namespaceRank !== 0) {
    return namespaceRank
  }

  const leftKey = (left.relativePath || left.displaySource || '').toLowerCase()
  const rightKey = (right.relativePath || right.displaySource || '').toLowerCase()
  const pathRank = leftKey.localeCompare(rightKey, undefined, { sensitivity: 'accent' })
  if (pathRank !== 0) {
    return pathRank
  }

  return left.normalizedSource.localeCompare(right.normalizedSource, undefined, {
    sensitivity: 'accent',
  })
}

function selectBatchTwo(orderedCandidates) {
  const selectedModeA = orderedCandidates.filter(isEligibleBatchTwoModeA).slice(0, BATCH_TWO_MODE_A_TARGET)
  if (selectedModeA.length !== BATCH_TWO_MODE_A_TARGET) {
    throw new Error(
      `Unable to assemble Batch 2 Mode A target. Planned ${selectedModeA.length}, expected ${BATCH_TWO_MODE_A_TARGET}.`,
    )
  }

  const selectedModeB = []
  for (const [namespace, target] of BATCH_TWO_MODE_B_TARGETS.entries()) {
    const planned = orderedCandidates
      .filter((candidate) => isEligibleBatchTwoModeB(candidate, namespace))
      .sort(compareModeBSelectionCandidates)
      .slice(0, target)

    if (planned.length !== target) {
      throw new Error(
        `Unable to assemble Batch 2 Mode B target for ${namespace}. Planned ${planned.length}, expected ${target}.`,
      )
    }

    selectedModeB.push(...planned)
  }

  return {
    selectedModeA,
    selectedModeB,
    totalOutputs: selectedModeA.length + selectedModeB.length,
  }
}

function isEligibleBatchTwoModeA(candidate) {
  return (
    candidate.mode === 'A' &&
    candidate.statusPreview === 'write' &&
    candidate.outputPath &&
    !fs.existsSync(candidate.outputPath)
  )
}

function isEligibleBatchTwoModeB(candidate, namespace) {
  return (
    candidate.mode === 'B' &&
    candidate.namespace === namespace &&
    candidate.statusPreview === 'write' &&
    candidate.outputPath &&
    !fs.existsSync(candidate.outputPath)
  )
}

function compareModeBSelectionCandidates(left, right) {
  const extensionRank = getModeBExtensionRank(left.relativePath) - getModeBExtensionRank(right.relativePath)
  if (extensionRank !== 0) {
    return extensionRank
  }

  const depthRank = getPathDepth(left.relativePath) - getPathDepth(right.relativePath)
  if (depthRank !== 0) {
    return depthRank
  }

  return compareCandidates(left, right)
}

function analyzeBatchOneSkips(orderedCandidates) {
  const scannedCandidates = []
  let plannedOutputs = 0

  for (const candidate of orderedCandidates) {
    if (candidate.mode !== 'A') {
      continue
    }

    scannedCandidates.push(candidate)
    if (candidate.statusPreview === 'write') {
      plannedOutputs += 1
    }

    if (plannedOutputs >= BATCH_ONE_TARGET_OUTPUTS) {
      break
    }
  }

  const skipped = scannedCandidates.filter((candidate) => candidate.statusPreview === 'skip')
  if (skipped.length !== EXPECTED_BATCH_ONE_SKIP_COUNT) {
    throw new Error(
      `Batch 1 skip analysis expected ${EXPECTED_BATCH_ONE_SKIP_COUNT} skipped Mode A cases, found ${skipped.length}.`,
    )
  }

  const mainIndex = buildFileIndex(process.cwd(), MAIN_WORKSPACE_EXCLUDES)
  const worktreeRoot = path.join(process.cwd(), '.claude', 'worktrees')
  const worktreeIndex = buildFileIndex(worktreeRoot, new Set())

  return skipped.map((candidate, index) =>
    classifyBatchOneSkip(candidate, index + 1, mainIndex, worktreeIndex),
  )
}

function buildFileIndex(rootPath, excludedDirs) {
  const index = {
    byBasename: new Map(),
    byRelativePath: new Map(),
  }

  if (!rootPath || !fs.existsSync(rootPath)) {
    return index
  }

  walkFiles(rootPath, excludedDirs, (absolutePath) => {
    const relativePath = path.relative(rootPath, absolutePath)
    const normalizedRelative = relativePath.toLowerCase()
    index.byRelativePath.set(normalizedRelative, absolutePath)

    const basename = path.basename(absolutePath).toLowerCase()
    const bucket = index.byBasename.get(basename) || []
    bucket.push(absolutePath)
    index.byBasename.set(basename, bucket)
  })

  for (const bucket of index.byBasename.values()) {
    bucket.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'accent' }))
  }

  return index
}

function walkFiles(rootPath, excludedDirs, onFile) {
  const entries = fs.readdirSync(rootPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue
    }

    const fullPath = path.join(rootPath, entry.name)
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) {
        continue
      }
      walkFiles(fullPath, excludedDirs, onFile)
      continue
    }

    if (entry.isFile()) {
      onFile(fullPath)
    }
  }
}

function classifyBatchOneSkip(candidate, caseNumber, mainIndex, worktreeIndex) {
  const expectedPath = candidate.displaySource || path.join(SOURCE_ROOTS.cfv1, candidate.relativePath || '')
  const relativePath = candidate.relativePath || path.relative(SOURCE_ROOTS.cfv1, expectedPath)

  if (fs.existsSync(expectedPath)) {
    return {
      caseNumber,
      expectedPath,
      status: 'unknown',
      classification: 'indexing inconsistency',
      recoverable: 'yes',
      details: ['file now exists at the expected path'],
    }
  }

  if (relativePath && relativePath.startsWith(`api${path.sep}`)) {
    const movedTo = path.join(process.cwd(), 'app', relativePath)
    if (fs.existsSync(movedTo)) {
      return {
        caseNumber,
        expectedPath,
        status: 'moved',
        classification: 'file moved/renamed',
        recoverable: 'yes',
        details: [`moved to: ${movedTo}`],
      }
    }
  }

  const mainMatch = findBestMainWorkspaceMatch(relativePath, mainIndex)
  if (mainMatch) {
    return {
      caseNumber,
      expectedPath,
      status: 'moved',
      classification: 'file moved/renamed',
      recoverable: 'yes',
      details: [`moved to: ${mainMatch}`],
    }
  }

  const worktreeMatches = findWorktreeMatches(relativePath, candidate.displaySource, worktreeIndex)
  if (worktreeMatches.length > 0) {
    return {
      caseNumber,
      expectedPath,
      status: 'unknown',
      classification: 'stale MemPalace reference',
      recoverable: 'no',
      details: [`worktree-only matches: ${worktreeMatches.slice(0, 3).join(' | ')}`],
    }
  }

  return {
    caseNumber,
    expectedPath,
    status: 'missing',
    classification: 'missing file path',
    recoverable: 'no',
    details: ['no main-workspace or worktree match found'],
  }
}

function findBestMainWorkspaceMatch(relativePath, index) {
  if (!relativePath) {
    return null
  }

  const normalizedRelative = relativePath.toLowerCase()
  if (index.byRelativePath.has(normalizedRelative)) {
    return index.byRelativePath.get(normalizedRelative)
  }

  const basename = path.basename(relativePath).toLowerCase()
  const matches = index.byBasename.get(basename) || []
  if (matches.length === 0) {
    return null
  }

  const expectedParts = relativePath.toLowerCase().split(/[\\/]+/)
  const ranked = matches
    .map((match) => ({
      match,
      score: commonSuffixLength(expectedParts, path.relative(process.cwd(), match).toLowerCase().split(/[\\/]+/)),
      depth: getPathDepth(path.relative(process.cwd(), match)),
    }))
    .sort((left, right) => right.score - left.score || left.depth - right.depth || left.match.localeCompare(right.match))

  return ranked[0]?.score >= 2 ? ranked[0].match : ranked[0]?.match || null
}

function findWorktreeMatches(relativePath, expectedPath, index) {
  const basename = path.basename(relativePath || expectedPath || '').toLowerCase()
  if (!basename) {
    return []
  }

  return (index.byBasename.get(basename) || []).slice(0, 5)
}

function commonSuffixLength(leftParts, rightParts) {
  let count = 0
  for (
    let leftIndex = leftParts.length - 1, rightIndex = rightParts.length - 1;
    leftIndex >= 0 && rightIndex >= 0;
    leftIndex -= 1, rightIndex -= 1
  ) {
    if (leftParts[leftIndex] !== rightParts[rightIndex]) {
      break
    }
    count += 1
  }
  return count
}

function executeBatchTwo(executionPlan, batchOneSkipAnalysis) {
  const startedAt = new Date().toISOString()
  const results = {
    batchId: 2,
    startedAt,
    finishedAt: null,
    status: 'success',
    modeAFiles: 0,
    modeBFiles: 0,
    modeBByNamespace: {},
    modeASkipsInvestigated: batchOneSkipAnalysis.length,
    errors: [],
    writtenBytes: 0,
    outputs: [],
    modeBDrawerRows: 0,
    modeBUniqueChunks: 0,
    modeBNotesValidated: 0,
    missingSourceAnalysisPath: MISSING_SOURCE_ANALYSIS_PATH,
  }

  try {
    for (const candidate of executionPlan.selectedModeA) {
      const writeResult = writeModeA(candidate)
      results.modeAFiles += 1
      results.writtenBytes += writeResult.writtenBytes
      results.outputs.push(writeResult.outputPath)
    }

    for (const candidate of executionPlan.selectedModeB) {
      const writeResult = writeModeB(candidate)
      results.modeBFiles += 1
      results.modeBDrawerRows += writeResult.drawerRows
      results.modeBUniqueChunks += writeResult.uniqueChunks
      results.modeBNotesValidated += 1
      results.modeBByNamespace[candidate.namespace] = (results.modeBByNamespace[candidate.namespace] || 0) + 1
      results.writtenBytes += writeResult.writtenBytes
      results.outputs.push(writeResult.outputPath)
    }

    if (results.modeAFiles !== BATCH_TWO_MODE_A_TARGET) {
      throw new Error(`Batch 2 wrote ${results.modeAFiles} Mode A files, expected ${BATCH_TWO_MODE_A_TARGET}.`)
    }

    const plannedModeBTotal = [...BATCH_TWO_MODE_B_TARGETS.values()].reduce((sum, value) => sum + value, 0)
    if (results.modeBFiles !== plannedModeBTotal) {
      throw new Error(`Batch 2 wrote ${results.modeBFiles} Mode B files, expected ${plannedModeBTotal}.`)
    }

    for (const [namespace, target] of BATCH_TWO_MODE_B_TARGETS.entries()) {
      if ((results.modeBByNamespace[namespace] || 0) !== target) {
        throw new Error(
          `Batch 2 wrote ${results.modeBByNamespace[namespace] || 0} Mode B files for ${namespace}, expected ${target}.`,
        )
      }
    }

    if (results.modeAFiles + results.modeBFiles !== BATCH_TWO_TOTAL_OUTPUTS) {
      throw new Error(
        `Batch 2 wrote ${results.modeAFiles + results.modeBFiles} files, expected ${BATCH_TWO_TOTAL_OUTPUTS}.`,
      )
    }

    results.finishedAt = new Date().toISOString()
    return results
  } catch (error) {
    results.status = 'failed'
    results.errors.push(error.message)
    results.finishedAt = new Date().toISOString()
    appendImportLog(results)
    printSummary(results)
    throw error
  }
}

function writeModeA(candidate) {
  const sourceBuffer = fs.readFileSync(candidate.displaySource)
  ensureParentDir(candidate.outputPath)

  const tempPath = getTempPath(candidate.outputPath)
  fs.copyFileSync(candidate.displaySource, tempPath)
  fs.renameSync(tempPath, candidate.outputPath)

  const outputBuffer = fs.readFileSync(candidate.outputPath)
  if (!sourceBuffer.equals(outputBuffer)) {
    throw new Error(`Mode A validation failed for ${candidate.displaySource}`)
  }

  return {
    outputPath: candidate.outputPath,
    writtenBytes: outputBuffer.length,
  }
}

function writeModeB(candidate) {
  const rows = loadModeBRows(candidate)
  const chunkGroups = buildModeBChunkGroups(rows)
  validateModeBRows(candidate, rows, chunkGroups)

  const note = buildModeBNote(candidate, rows, chunkGroups)
  ensureParentDir(candidate.outputPath)

  const tempPath = getTempPath(candidate.outputPath)
  fs.writeFileSync(tempPath, note, 'utf8')
  fs.renameSync(tempPath, candidate.outputPath)

  const written = fs.readFileSync(candidate.outputPath, 'utf8')
  if (written !== note) {
    throw new Error(`Mode B validation failed while rereading ${candidate.outputPath}`)
  }

  validateModeBRenderedNote(candidate, note, rows, chunkGroups)

  return {
    outputPath: candidate.outputPath,
    writtenBytes: Buffer.byteLength(written, 'utf8'),
    drawerRows: rows.length,
    uniqueChunks: chunkGroups.length,
  }
}

function loadModeBRows(candidate) {
  const rows = []
  const rawWings = [...candidate.wings].sort(compareRawWings)

  for (const root of ROOTS) {
    const db = new Database(root.dbPath, { readonly: true, fileMustExist: true })
    const collectionPlaceholders = root.collections.map(() => '?').join(', ')
    const wingPlaceholders = rawWings.map(() => '?').join(', ')
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
      .all(...root.collections, ...rawWings, candidate.normalizedSource)

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

function compareRawWings(left, right) {
  return (RAW_WING_ORDER.get(left) ?? 99) - (RAW_WING_ORDER.get(right) ?? 99)
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
    throw new Error(`Mode B group has no rows for ${candidate.displaySource}`)
  }

  if (rows.some((row) => row.chunkIndex === null)) {
    throw new Error(`Mode B grouping is unclear for ${candidate.displaySource}`)
  }

  let previousChunk = -1
  for (const group of chunkGroups) {
    if (group.chunkIndex < previousChunk) {
      throw new Error(`Mode B chunk order regression for ${candidate.displaySource}`)
    }
    previousChunk = group.chunkIndex
  }

  const drawerMapRowCount = chunkGroups.reduce(
    (sum, group) => sum + group.variants.reduce((variantSum, variant) => variantSum + variant.rows.length, 0),
    0,
  )

  if (drawerMapRowCount !== rows.length) {
    throw new Error(`Mode B content loss detected for ${candidate.displaySource}`)
  }
}

function buildModeBNote(candidate, rows, chunkGroups) {
  const relativePath = normalizeRelativePath(candidate.relativePath)
  const orderingStatus = chunkGroups.some((group) => group.variants.length > 1)
    ? 'variant_conflict'
    : 'ordered'
  const filedRange = summarizeFiledRange(rows)

  let body = ''
  body += `# ${relativePath}\n\n`
  body += '## Reconstructed Chunks\n\n'

  for (const group of chunkGroups) {
    body += `### Chunk ${formatChunkIndex(group.chunkIndex)}\n`

    if (group.variants.length === 1) {
      const variant = group.variants[0]
      body += `drawer_refs: ${JSON.stringify(variant.rows.map((row) => row.drawerId))}\n`
      body += `embedding_refs: ${JSON.stringify(variant.rows.map((row) => row.embeddingId))}\n`
      body += `source_refs: ${JSON.stringify(
        distinct(variant.rows.map((row) => `${row.root} / ${row.collectionName} / ${row.wing}`)),
      )}\n\n`
      body += `${buildFencedBlock(variant.document, inferFenceLanguage(candidate.relativePath))}\n\n`
      continue
    }

    for (const variant of group.variants) {
      body += `#### ${variant.variantLabel}\n`
      body += `drawer_refs: ${JSON.stringify(variant.rows.map((row) => row.drawerId))}\n`
      body += `embedding_refs: ${JSON.stringify(variant.rows.map((row) => row.embeddingId))}\n`
      body += `source_refs: ${JSON.stringify(
        distinct(variant.rows.map((row) => `${row.root} / ${row.collectionName} / ${row.wing}`)),
      )}\n\n`
      body += `${buildFencedBlock(variant.document, inferFenceLanguage(candidate.relativePath))}\n\n`
    }
  }

  body += '## Drawer Map\n'
  body += '| chunk_index | variant | root | collection | wing | room | filed_at | embedding_id | drawer_id |\n'
  body += '| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |\n'

  for (const group of chunkGroups) {
    for (const variant of group.variants) {
      for (const row of variant.rows) {
        body += `| ${group.chunkIndex} | ${variant.variantLabel} | ${escapeTableCell(row.root)} | ${escapeTableCell(row.collectionName)} | ${escapeTableCell(row.wing)} | ${escapeTableCell(row.room)} | ${escapeTableCell(row.filedAt)} | ${escapeTableCell(row.embeddingId)} | ${row.drawerId} |\n`
      }
    }
  }

  const contentSha = sha256(body)
  const frontmatter = [
    '---',
    'mempalace_export_version: 2',
    'note_type: mode-b-drawers',
    `export_namespace: ${yamlScalar(candidate.namespace)}`,
    `canonical_source_file: ${yamlScalar(candidate.displaySource)}`,
    `relative_source_path: ${yamlScalar(relativePath)}`,
    `source_exists: ${candidate.sourceExists ? 'true' : 'false'}`,
    'content_authority: mempalace-drawers',
    `roots_present: ${yamlArray([...candidate.roots].sort())}`,
    `collections_present: ${yamlArray([...candidate.collections].sort())}`,
    `wings_present: ${yamlArray([...candidate.wings].sort(compareRawWings))}`,
    `drawer_record_count: ${rows.length}`,
    `unique_chunk_count: ${chunkGroups.length}`,
    `filed_at_min: ${yamlScalar(filedRange.min)}`,
    `filed_at_max: ${yamlScalar(filedRange.max)}`,
    `ordering_status: ${orderingStatus}`,
    `content_sha256: ${yamlScalar(contentSha)}`,
    `export_id: ${yamlScalar(`${candidate.namespace}::${candidate.normalizedSource}`)}`,
    '---',
    '',
  ].join('\n')

  return `${frontmatter}${body}`
}

function validateModeBRenderedNote(candidate, note, rows, chunkGroups) {
  const heading = `# ${normalizeRelativePath(candidate.relativePath)}`
  if (!note.includes(heading)) {
    throw new Error(`Mode B validation missing title for ${candidate.outputPath}`)
  }

  for (const group of chunkGroups) {
    const chunkHeading = `### Chunk ${formatChunkIndex(group.chunkIndex)}`
    if (!note.includes(chunkHeading)) {
      throw new Error(`Mode B validation missing chunk heading ${chunkHeading} for ${candidate.outputPath}`)
    }
  }

  const drawerMapMarker = '\n## Drawer Map\n'
  const drawerMapIndex = note.indexOf(drawerMapMarker)
  if (drawerMapIndex === -1) {
    throw new Error(`Mode B validation missing drawer map for ${candidate.outputPath}`)
  }

  const drawerMapSection = note.slice(drawerMapIndex + drawerMapMarker.length)
  const drawerMapLines = drawerMapSection
    .split('\n')
    .filter((line) => /^\| \d+ \| variant_\d+ \| /.test(line))
  if (drawerMapLines.length !== rows.length) {
    throw new Error(`Mode B validation drawer map mismatch for ${candidate.outputPath}`)
  }
}

function appendImportLog(results) {
  const existing = fs.existsSync(IMPORT_LOG_PATH) ? fs.readFileSync(IMPORT_LOG_PATH, 'utf8') : '# Obsidian Import Log'
  let updated = existing.replace(/\s*$/, '')
  updated = updated.replace(/\n\nBatch 2:\n[\s\S]*$/, '')

  const errorLine = results.errors.length > 0 ? results.errors.join(' | ') : 'none'
  updated += `\n\nBatch 2:\n`
  updated += `- Mode A files: ${results.modeAFiles}\n`
  updated += `- Mode B files: ${results.modeBFiles}\n`
  updated += `- Mode A skips investigated: ${results.modeASkipsInvestigated}\n`
  updated += `- Errors: ${errorLine}\n`
  updated += `- Status: ${results.status}\n`
  updated += `- Started at: ${results.startedAt}\n`
  updated += `- Finished at: ${results.finishedAt}\n`
  updated += `- Output files written: ${results.modeAFiles + results.modeBFiles}\n`
  updated += `- Validation: Mode A exact match; Mode B chunk order verified, no content loss, drawer map rows=${results.modeBDrawerRows}, unique chunks=${results.modeBUniqueChunks}\n`

  fs.writeFileSync(IMPORT_LOG_PATH, `${updated}\n`, 'utf8')
}

function writeMissingSourceAnalysis(analysisRows) {
  const counts = {
    moved: 0,
    missing: 0,
    unknown: 0,
    recoverableYes: 0,
    recoverableNo: 0,
  }
  const classificationCounts = new Map()

  for (const row of analysisRows) {
    counts[row.status] += 1
    if (row.recoverable === 'yes') {
      counts.recoverableYes += 1
    } else {
      counts.recoverableNo += 1
    }
    classificationCounts.set(row.classification, (classificationCounts.get(row.classification) || 0) + 1)
  }

  let content = '# Missing Source Analysis\n\n'
  content += 'Log ID: `qz8h2n`\n\n'
  content += `Batch 1 skipped Mode A cases investigated: ${analysisRows.length}\n\n`
  content += 'Summary:\n'
  content += `- moved: ${counts.moved}\n`
  content += `- missing: ${counts.missing}\n`
  content += `- unknown: ${counts.unknown}\n`
  content += `- recoverable yes: ${counts.recoverableYes}\n`
  content += `- recoverable no: ${counts.recoverableNo}\n`
  content += `- classifications: ${[...classificationCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, count]) => `${label}=${count}`)
    .join(', ')}\n\n`

  for (const row of analysisRows) {
    content += `Case ${row.caseNumber}:\n`
    content += `- expected path: ${row.expectedPath}\n`
    content += `- status: ${row.status}\n`
    content += `- classification: ${row.classification}\n`
    for (const detail of row.details) {
      content += `- ${detail}\n`
    }
    content += `- recoverable: ${row.recoverable}\n\n`
  }

  fs.writeFileSync(MISSING_SOURCE_ANALYSIS_PATH, content, 'utf8')
}

function printSummary(results) {
  const summary = {
    batchId: results.batchId,
    status: results.status,
    modeAFiles: results.modeAFiles,
    modeBFiles: results.modeBFiles,
    modeASkipsInvestigated: results.modeASkipsInvestigated,
    modeBByNamespace: results.modeBByNamespace,
    modeBDrawerRows: results.modeBDrawerRows,
    modeBUniqueChunks: results.modeBUniqueChunks,
    writtenBytes: results.writtenBytes,
    importLog: IMPORT_LOG_PATH,
    missingSourceAnalysis: results.missingSourceAnalysisPath,
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

function normalizePathKey(filePath) {
  return path.resolve(filePath).toLowerCase()
}

function getRootRank(rootLabel) {
  return rootLabel === 'palace2' ? 0 : 1
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function getTempPath(finalPath) {
  const hash = crypto.createHash('sha1').update(finalPath).digest('hex').slice(0, 12)
  return path.join(TEMP_ROOT, `${hash}.tmp`)
}

function isModeBSessionLike(relativePath) {
  const extension = path.extname(relativePath || '').toLowerCase()
  return MODE_B_ALLOWED_EXTENSIONS.has(extension)
}

function getModeBExtensionRank(relativePath) {
  const extension = path.extname(relativePath || '').toLowerCase()
  if (extension === '.jsonl') {
    return 0
  }
  if (extension === '.txt' || extension === '.log' || extension === '.out' || extension === '.err') {
    return 1
  }
  if (extension === '.json') {
    return 2
  }
  return 3
}

function getPathDepth(relativePath) {
  return (relativePath || '').split(/[\\/]+/).filter(Boolean).length
}

function normalizeRelativePath(relativePath) {
  return (relativePath || '').replace(/\\/g, '/')
}

function formatChunkIndex(chunkIndex) {
  return String(chunkIndex).padStart(4, '0')
}

function summarizeFiledRange(rows) {
  const values = rows.map((row) => row.filedAt).filter(Boolean).sort()
  return {
    min: values[0] || '',
    max: values[values.length - 1] || '',
  }
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

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

main()
