import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

const OUTPUT_ROOT = path.resolve(process.cwd(), 'obsidian_export')
const IMPORT_LOG_PATH = path.join(OUTPUT_ROOT, 'import_log.md')
const MISSING_SOURCE_ANALYSIS_PATH = path.join(OUTPUT_ROOT, 'missing_source_analysis.md')
const COVERAGE_REPORT_PATH = path.join(OUTPUT_ROOT, 'coverage_report.md')
const FINAL_COVERAGE_REPORT_PATH = path.join(OUTPUT_ROOT, 'final_coverage_report.md')
const VALIDATION_REPORT_PATH = path.join(OUTPUT_ROOT, 'validation_report.md')
const FINAL_VALIDATION_REPORT_PATH = path.join(OUTPUT_ROOT, 'final_validation_report.md')
const INDEX_PATH = path.join(OUTPUT_ROOT, '_INDEX.md')
const SESSIONS_INDEX_PATH = path.join(OUTPUT_ROOT, 'sessions', '_INDEX.md')
const TEMP_ROOT = path.join(OUTPUT_ROOT, '.tmp')
const FINAL_BATCH_ID = 5

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

const RAW_WING_ORDER = new Map([
  ['cfv1', 0],
  ['chefflow-conversations', 1],
  ['codex-conversations', 2],
  ['codex-sessions', 3],
])

const NAMESPACE_ORDER = new Map([
  ['cfv1', 0],
  ['chefflow-conversations', 1],
  ['codex-conversations', 2],
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

const MODE_B_CONVERSATION_POOLS = [
  {
    namespace: 'chefflow-conversations',
    rawWings: ['chefflow-conversations'],
    selector: (relativePath) => /^[^\\/]+\.jsonl$/i.test(relativePath || ''),
    label: 'chefflow-conversations',
  },
  {
    namespace: 'codex-conversations',
    rawWings: ['codex-conversations', 'codex-sessions'],
    selector: (relativePath) => /^[^\\/]+\.jsonl$/i.test(relativePath || ''),
    label: 'codex-conversations',
  },
]

function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
  fs.mkdirSync(TEMP_ROOT, { recursive: true })

  const candidateMap = buildCandidates()
  const orderedCandidates = [...candidateMap.values()].sort(compareCandidates)
  const mainIndex = buildFileIndex(process.cwd(), MAIN_WORKSPACE_EXCLUDES)
  const worktreeIndex = buildFileIndex(path.join(process.cwd(), '.claude', 'worktrees'), new Set())

  const missingSourceRows = analyzeMissingSources(orderedCandidates, mainIndex, worktreeIndex)
  const preExportModeBConversationIndex = buildModeBConversationIndex(orderedCandidates)
  const executionPlan = selectBatchPlan(orderedCandidates, preExportModeBConversationIndex)
  const batchResults = executeBatch(executionPlan)

  createIndexNotes()

  const modeBConversationIndex = buildModeBConversationIndex(orderedCandidates)
  const coverage = buildCoverageReport(orderedCandidates, missingSourceRows, modeBConversationIndex)
  writeMissingSourceAnalysis(missingSourceRows)
  writeCoverageReport(coverage)
  appendImportLog(batchResults, coverage)
  writePendingValidationReport()

  const validation = validateOutputVault()
  writeValidationReport(validation)

  printSummary(batchResults, coverage, validation)
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
      `,
      )
      .all(...root.collections)

    for (const row of rows) {
      const namespace = normalizeNamespace(row.wing)
      const key = candidateKey(namespace, row.normalized_source)
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
  }
}

function chooseDisplaySource(candidate) {
  const spellings = [...candidate.sourceSpellings.values()].sort((left, right) => {
    if (left.exists !== right.exists) {
      return left.exists ? -1 : 1
    }
    return left.sourceFile.localeCompare(right.sourceFile, undefined, { sensitivity: 'accent' })
  })

  candidate.displaySource = spellings[0]?.sourceFile || null
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

    if (!candidate.relativePath) {
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

  if (!candidate.relativePath) {
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

function buildOutputPath(candidate) {
  if (!candidate.relativePath) {
    return null
  }

  const basePath = path.join(OUTPUT_ROOT, candidate.namespace, candidate.relativePath)
  if (candidate.mode === 'A') {
    return basePath
  }
  return basePath.toLowerCase().endsWith('.md') ? basePath : `${basePath}.md`
}

function buildModeBConversationIndex(orderedCandidates) {
  const poolIndex = new Map()

  for (const pool of MODE_B_CONVERSATION_POOLS) {
    const groupedRows = loadBulkModeBRows(pool.rawWings)
    const poolStats = {
      namespace: pool.namespace,
      label: pool.label,
      totalCandidates: 0,
      reliableCandidates: 0,
      reliableDrawers: 0,
      failedGrouping: 0,
      failures: [],
      candidateStates: new Map(),
      exportedReliable: 0,
      exportedReliableDrawers: 0,
      remainingReliable: 0,
      remainingReliableDrawers: 0,
    }

    for (const candidate of orderedCandidates) {
      if (candidate.namespace !== pool.namespace || candidate.statusPreview !== 'write') {
        continue
      }

      const normalizedRelative = normalizeRelativePath(candidate.relativePath)
      if (!pool.selector(normalizedRelative)) {
        continue
      }

      poolStats.totalCandidates += 1
      const state = evaluateModeBConversationCandidate(candidate, groupedRows.get(candidate.normalizedSource) || [])
      poolStats.candidateStates.set(candidateKey(candidate.namespace, candidate.normalizedSource), state)

      if (state.reliable) {
        poolStats.reliableCandidates += 1
        poolStats.reliableDrawers += candidate.totalRecordCount
        if (fs.existsSync(candidate.outputPath)) {
          poolStats.exportedReliable += 1
          poolStats.exportedReliableDrawers += candidate.totalRecordCount
        } else {
          poolStats.remainingReliable += 1
          poolStats.remainingReliableDrawers += candidate.totalRecordCount
        }
      } else {
        poolStats.failedGrouping += 1
        if (poolStats.failures.length < 10) {
          poolStats.failures.push({
            relativePath: normalizedRelative,
            nullChunk: state.nullChunk,
            gapCount: state.gapCount,
            conflictCount: state.conflictCount,
          })
        }
      }
    }

    poolIndex.set(pool.namespace, poolStats)
  }

  return poolIndex
}

function loadBulkModeBRows(rawWings) {
  const groupedRows = new Map()

  for (const root of ROOTS) {
    const db = new Database(root.dbPath, { readonly: true, fileMustExist: true })
    const collectionPlaceholders = root.collections.map(() => '?').join(', ')
    const wingPlaceholders = rawWings.map(() => '?').join(', ')
    const rows = db
      .prepare(
        `
        SELECT
          lower(msf.string_value) AS normalized_source,
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
        LEFT JOIN embedding_metadata mchunk
          ON mchunk.id = e.id
         AND mchunk.key = 'chunk_index'
        LEFT JOIN embedding_metadata mdoc
          ON mdoc.id = e.id
         AND mdoc.key = 'chroma:document'
        WHERE c.name IN (${collectionPlaceholders})
          AND mwing.string_value IN (${wingPlaceholders})
      `,
      )
      .all(...root.collections, ...rawWings)

    for (const row of rows) {
      const bucket = groupedRows.get(row.normalized_source) || []
      bucket.push({
        chunkIndex: Number.isInteger(row.chunk_index) ? row.chunk_index : null,
        document: row.document || '',
      })
      groupedRows.set(row.normalized_source, bucket)
    }

    db.close()
  }

  return groupedRows
}

function evaluateModeBConversationCandidate(candidate, rows) {
  const byChunk = new Map()
  let nullChunk = false

  for (const row of rows) {
    if (row.chunkIndex === null) {
      nullChunk = true
      continue
    }
    const bucket = byChunk.get(row.chunkIndex) || new Set()
    bucket.add(row.document)
    byChunk.set(row.chunkIndex, bucket)
  }

  const chunkIndexes = [...byChunk.keys()].sort((left, right) => left - right)
  let gapCount = 0
  if (chunkIndexes.length > 0) {
    for (let index = chunkIndexes[0]; index <= chunkIndexes[chunkIndexes.length - 1]; index += 1) {
      if (!byChunk.has(index)) {
        gapCount += 1
      }
    }
  }

  let conflictCount = 0
  for (const docs of byChunk.values()) {
    if (docs.size > 1) {
      conflictCount += 1
    }
  }

  return {
    reliable: !nullChunk && gapCount === 0 && conflictCount === 0,
    nullChunk,
    gapCount,
    conflictCount,
    chunkCount: chunkIndexes.length,
  }
}

function selectBatchPlan(orderedCandidates, modeBConversationIndex) {
  const selectedModeA = orderedCandidates.filter((candidate) => isEligibleModeA(candidate))
  const selectedModeB = []
  for (const pool of MODE_B_CONVERSATION_POOLS) {
    const namespace = pool.namespace
    const reliabilityMap = modeBConversationIndex.get(namespace)?.candidateStates
    const planned = orderedCandidates.filter((candidate) => isEligibleModeB(candidate, reliabilityMap))
    selectedModeB.push(...planned)
  }

  return {
    selectedModeA,
    selectedModeB,
  }
}

function executeBatch(executionPlan) {
  const results = {
    batchId: FINAL_BATCH_ID,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'success',
    modeAFiles: 0,
    modeBFiles: 0,
    modeBByNamespace: {},
    modeADrawers: 0,
    modeBDrawers: 0,
    modeBUniqueChunks: 0,
    outputsWrittenThisRun: [],
    errors: [],
  }

  try {
    for (const candidate of executionPlan.selectedModeA) {
      const writeResult = writeModeA(candidate)
      results.modeAFiles += 1
      results.modeADrawers += candidate.totalRecordCount
      results.outputsWrittenThisRun.push(writeResult.outputPath)
    }

    for (const candidate of executionPlan.selectedModeB) {
      const writeResult = writeModeB(candidate)
      results.modeBFiles += 1
      results.modeBDrawers += writeResult.drawerRows
      results.modeBUniqueChunks += writeResult.uniqueChunks
      results.modeBByNamespace[candidate.namespace] = (results.modeBByNamespace[candidate.namespace] || 0) + 1
      results.outputsWrittenThisRun.push(writeResult.outputPath)
    }

    results.finishedAt = new Date().toISOString()
    return results
  } catch (error) {
    results.status = 'failed'
    results.errors.push(error.message)
    results.finishedAt = new Date().toISOString()
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

  const reread = fs.readFileSync(candidate.outputPath, 'utf8')
  if (reread !== note) {
    throw new Error(`Mode B validation failed while rereading ${candidate.outputPath}`)
  }

  validateModeBRenderedNote(candidate, note, rows, chunkGroups)

  return {
    outputPath: candidate.outputPath,
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

  const minChunk = chunkGroups[0]?.chunkIndex ?? 0
  const maxChunk = chunkGroups[chunkGroups.length - 1]?.chunkIndex ?? -1
  for (let chunkIndex = minChunk; chunkIndex <= maxChunk; chunkIndex += 1) {
    if (!chunkGroups.find((group) => group.chunkIndex === chunkIndex)) {
      throw new Error(`Mode B missing chunk ${chunkIndex} for ${candidate.displaySource}`)
    }
  }

  if (chunkGroups.some((group) => group.variants.length > 1)) {
    throw new Error(`Mode B variant conflict detected for ${candidate.displaySource}`)
  }
}

function buildModeBNote(candidate, rows, chunkGroups) {
  const relativePath = normalizeRelativePath(candidate.relativePath)
  const filedRange = summarizeFiledRange(rows)

  let body = ''
  body += `# ${relativePath}\n\n`
  body += '## Reconstructed Chunks\n\n'

  for (const group of chunkGroups) {
    const variant = group.variants[0]
    body += `### Chunk ${formatChunkIndex(group.chunkIndex)}\n`
    body += `drawer_refs: ${JSON.stringify(variant.rows.map((row) => row.drawerId))}\n`
    body += `embedding_refs: ${JSON.stringify(variant.rows.map((row) => row.embeddingId))}\n`
    body += `source_refs: ${JSON.stringify(
      distinct(variant.rows.map((row) => `${row.root} / ${row.collectionName} / ${row.wing}`)),
    )}\n\n`
    body += `${buildFencedBlock(sanitizeDrawerDocument(variant.document), inferFenceLanguage(candidate.relativePath))}\n\n`
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
    'ordering_status: "ordered"',
    `content_sha256: ${yamlScalar(contentSha)}`,
    `export_id: ${yamlScalar(`${candidate.namespace}::${candidate.normalizedSource}`)}`,
    '---',
    '',
  ].join('\n')

  return `${frontmatter}${body}`
}

function validateModeBRenderedNote(candidate, note, rows, chunkGroups) {
  const title = `# ${normalizeRelativePath(candidate.relativePath)}`
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

function analyzeMissingSources(orderedCandidates, mainIndex, worktreeIndex) {
  const rows = []
  for (const candidate of orderedCandidates) {
    if (candidate.namespace !== 'cfv1' || candidate.skipReasonPreview !== 'mode_a_source_missing') {
      continue
    }

    rows.push(classifyMissingSourceCandidate(candidate, rows.length + 1, mainIndex, worktreeIndex))
  }
  return rows
}

function classifyMissingSourceCandidate(candidate, caseNumber, mainIndex, worktreeIndex) {
  const expectedPath = candidate.displaySource || path.join(SOURCE_ROOTS.cfv1, candidate.relativePath || '')
  const relativePath = candidate.relativePath || path.relative(SOURCE_ROOTS.cfv1, expectedPath)

  if (relativePath && relativePath.startsWith(`api${path.sep}`)) {
    const movedTo = path.join(process.cwd(), 'app', relativePath)
    if (fs.existsSync(movedTo)) {
      return {
        caseNumber,
        expectedPath,
        status: 'moved',
        classification: 'file moved/renamed',
        movedTo,
        finalStatus: 'recovered',
        actionTaken: `verified canonical workspace path at ${movedTo}; no duplicate export synthesized from the stale source path`,
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
      movedTo: mainMatch,
      finalStatus: 'recovered',
      actionTaken: `verified canonical workspace path at ${mainMatch}; stale MemPalace path mapped without fabricating content`,
    }
  }

  const worktreeMatches = findWorktreeMatches(relativePath, candidate.displaySource, worktreeIndex)
  if (worktreeMatches.length > 0) {
    return {
      caseNumber,
      expectedPath,
      status: 'unknown',
      classification: 'stale MemPalace reference',
      movedTo: null,
      worktreeMatches,
      finalStatus: 'irrecoverable',
      actionTaken:
        'checked main workspace and Claude worktrees; only worktree-only copies remain, so no canonical source can be recovered safely',
    }
  }

  return {
    caseNumber,
    expectedPath,
    status: 'missing',
    classification: 'missing file path',
    movedTo: null,
    worktreeMatches: [],
    finalStatus: 'irrecoverable',
    actionTaken:
      'checked main workspace and Claude worktrees; no surviving file was found, so the source remains unrecoverable',
  }
}

function buildCoverageReport(orderedCandidates, missingSourceRows, modeBConversationIndex) {
  const totals = {
    totalDrawers: 0,
    processedDrawers: 0,
    remainingDrawers: 0,
    modeAEligible: 0,
    modeAExported: 0,
    modeBEligibleReliable: 0,
    modeBExportedReliable: 0,
    contentOutputs: 0,
    modeBOutputs: 0,
  }
  const skipped = {
    total: 0,
    missingSource: 0,
    irrecoverable: 0,
    ambiguous: 0,
  }
  const missingSourceIndex = new Map(
    missingSourceRows.map((row) => [normalizePathKey(row.expectedPath), row]),
  )

  for (const candidate of orderedCandidates) {
    totals.totalDrawers += candidate.totalRecordCount

    if (candidate.outputPath && fs.existsSync(candidate.outputPath)) {
      totals.processedDrawers += candidate.totalRecordCount
      totals.contentOutputs += 1
      if (candidate.mode === 'B') {
        totals.modeBOutputs += 1
      }
    }

    if (candidate.mode === 'A' && candidate.statusPreview === 'write') {
      totals.modeAEligible += 1
      if (candidate.outputPath && fs.existsSync(candidate.outputPath)) {
        totals.modeAExported += 1
      }
    }
  }

  totals.remainingDrawers = totals.totalDrawers - totals.processedDrawers

  for (const stats of modeBConversationIndex.values()) {
    totals.modeBEligibleReliable += stats.reliableCandidates
    totals.modeBExportedReliable += stats.exportedReliable
  }

  const excludedModeBArtifacts = orderedCandidates.filter(
    (candidate) => candidate.mode === 'B' && candidate.skipReasonPreview === 'mode_b_non_session_artifact',
  ).length

  for (const candidate of orderedCandidates) {
    if (candidate.outputPath && fs.existsSync(candidate.outputPath)) {
      continue
    }

    if (candidate.namespace === 'cfv1' && candidate.skipReasonPreview === 'mode_a_source_missing') {
      const missingRow = missingSourceIndex.get(normalizePathKey(getExpectedModeAMissingSourcePath(candidate)))
      if (missingRow?.finalStatus === 'recovered') {
        continue
      }

      if (missingRow?.status === 'missing') {
        skipped.missingSource += 1
      } else {
        skipped.ambiguous += 1
      }
      continue
    }

    if (candidate.mode === 'B' && candidate.statusPreview === 'write') {
      const conversationState = modeBConversationIndex
        .get(candidate.namespace)
        ?.candidateStates.get(candidateKey(candidate.namespace, candidate.normalizedSource))

      if (conversationState?.reliable === true) {
        continue
      }
    }

    skipped.irrecoverable += 1
  }

  skipped.total = skipped.missingSource + skipped.irrecoverable + skipped.ambiguous

  const recoverableCoverageComplete =
    totals.modeAExported === totals.modeAEligible &&
    totals.modeBExportedReliable === totals.modeBEligibleReliable

  const knownLimitations = []
  if (skipped.missingSource > 0 || skipped.ambiguous > 0) {
    knownLimitations.push(
      `${formatInt(skipped.missingSource + skipped.ambiguous)} cfv1 source references remain without recoverable canonical content.`,
    )
  }
  if (excludedModeBArtifacts > 0) {
    knownLimitations.push(
      `${formatInt(excludedModeBArtifacts)} non-session conversation artifacts remain excluded from the session export pool.`,
    )
  }
  if (skipped.irrecoverable > excludedModeBArtifacts) {
    knownLimitations.push(
      `${formatInt(skipped.irrecoverable - excludedModeBArtifacts)} additional candidates remain outside recoverable scope because they are non-actionable or lack reliable grouping.`,
    )
  }
  knownLimitations.push(
    `Raw drawer coverage remains below logical completeness because stale historical drawers still count toward the observed total (${percent(totals.processedDrawers, totals.totalDrawers)} processed).`,
  )

  return {
    totals,
    skipped,
    excludedModeBArtifacts,
    modeBConversationIndex,
    finalAssessment: {
      completenessLevel: recoverableCoverageComplete ? 'complete to recoverable limit' : 'near-complete',
      finalStatus: recoverableCoverageComplete ? 'complete' : 'near-complete',
      knownLimitations,
    },
  }
}

function writeCoverageReport(coverage) {
  const modeAPct = percent(coverage.totals.modeAExported, coverage.totals.modeAEligible)
  const modeBPct = percent(coverage.totals.modeBExportedReliable, coverage.totals.modeBEligibleReliable)
  const processedDrawerPct = percent(coverage.totals.processedDrawers, coverage.totals.totalDrawers)
  const chefflow = coverage.modeBConversationIndex.get('chefflow-conversations')
  const codex = coverage.modeBConversationIndex.get('codex-conversations')

  let content = '# Final Coverage Report\n\n'
  content += 'Report ID: `c9k2x1`\n\n'
  content += '## Drawers\n'
  content += `- initial drawers observed: ${formatInt(coverage.totals.totalDrawers)}\n`
  content += `- processed drawers: ${formatInt(coverage.totals.processedDrawers)}\n`
  content += `- remaining drawers: ${formatInt(coverage.totals.remainingDrawers)}\n`
  content += `- processed drawer coverage: ${processedDrawerPct}\n\n`
  content += '## Mode A\n'
  content += `- total files reconstructed: ${formatInt(coverage.totals.modeAExported)}\n`
  content += `- source-backed eligible files: ${formatInt(coverage.totals.modeAEligible)}\n`
  content += `- % coverage: ${modeAPct}\n\n`
  content += '## Mode B\n'
  content += `- total conversations/sessions reconstructed: ${formatInt(coverage.totals.modeBExportedReliable)}\n`
  content += `- reliable conversation/session pool: ${formatInt(coverage.totals.modeBEligibleReliable)}\n`
  content += `- % coverage: ${modeBPct}\n`
  content += `- chefflow-conversations: ${formatInt(chefflow.exportedReliable)} / ${formatInt(chefflow.reliableCandidates)} reliable top-level transcripts\n`
  content += `- codex-conversations: ${formatInt(codex.exportedReliable)} / ${formatInt(codex.reliableCandidates)} reliable top-level transcripts\n\n`
  content += '## Skipped Items\n'
  content += `- total: ${formatInt(coverage.skipped.total)}\n`
  content += `- missing source: ${formatInt(coverage.skipped.missingSource)}\n`
  content += `- irrecoverable: ${formatInt(coverage.skipped.irrecoverable)}\n`
  content += `- ambiguous: ${formatInt(coverage.skipped.ambiguous)}\n\n`
  content += '## Final Assessment\n'
  content += `- completeness level: ${coverage.finalAssessment.completenessLevel}\n`
  content += `- final status: ${coverage.finalAssessment.finalStatus}\n`
  for (const limitation of coverage.finalAssessment.knownLimitations) {
    content += `- known limitation: ${limitation}\n`
  }

  fs.writeFileSync(COVERAGE_REPORT_PATH, content, 'utf8')
  fs.writeFileSync(FINAL_COVERAGE_REPORT_PATH, content, 'utf8')
}

function writePendingValidationReport() {
  const pending = [
    '# Final Validation Report',
    '',
    'Report ID: `k4m9pz`',
    '',
    'Status: pending final validation sweep.',
    '',
  ].join('\n')

  fs.writeFileSync(VALIDATION_REPORT_PATH, pending, 'utf8')
  fs.writeFileSync(FINAL_VALIDATION_REPORT_PATH, pending, 'utf8')
}

function validateOutputVault() {
  const expectedDirs = ['cfv1', 'chefflow-conversations', 'codex-conversations', 'sessions']
  const structureIssues = []
  for (const dirName of expectedDirs) {
    if (!fs.existsSync(path.join(OUTPUT_ROOT, dirName))) {
      structureIssues.push(`missing directory: ${dirName}`)
    }
  }

  const files = []
  walkFiles(OUTPUT_ROOT, new Set(['.tmp']), (absolutePath) => files.push(absolutePath))

  const emptyFiles = []
  const malformedFiles = []
  const replacementCharFiles = []
  const markdownIssues = []
  const duplicateOutputs = []
  const seenPaths = new Set()
  const seenExportIds = new Map()
  let markdownFileCount = 0
  let filesOpenedCleanly = 0

  for (const absolutePath of files) {
    const normalized = normalizePathKey(absolutePath)
    if (seenPaths.has(normalized)) {
      duplicateOutputs.push(`${absolutePath} :: duplicate path collision`)
      continue
    }
    seenPaths.add(normalized)

    const stats = fs.statSync(absolutePath)
    if (stats.size === 0) {
      emptyFiles.push(absolutePath)
    }

    const buffer = fs.readFileSync(absolutePath)
    const decodedResult = decodeTextBuffer(buffer)
    if (!decodedResult.decoded) {
      malformedFiles.push(`${absolutePath} :: contains unsupported NUL bytes`)
      continue
    }

    const decoded = decodedResult.decoded
    filesOpenedCleanly += 1
    if (decoded.includes('\uFFFD')) {
      replacementCharFiles.push(`${absolutePath} :: replacement characters present in text payload`)
    }

    if (absolutePath.toLowerCase().endsWith('.md')) {
      markdownFileCount += 1
      if (decoded.startsWith('---\n') && !decoded.includes('\n---\n')) {
        markdownIssues.push(`${absolutePath} :: unclosed frontmatter`)
      }

      const exportId = extractFrontmatterScalar(decoded, 'export_id')
      if (exportId) {
        const priorPath = seenExportIds.get(exportId)
        if (priorPath) {
          duplicateOutputs.push(`${absolutePath} :: duplicate export_id with ${priorPath}`)
        } else {
          seenExportIds.set(exportId, absolutePath)
        }
      }
    }
  }

  return {
    structureIssues,
    totalFiles: files.length,
    filesOpenedCleanly,
    duplicateOutputs,
    emptyFiles,
    malformedFiles,
    replacementCharFiles,
    markdownIssues,
    markdownFileCount,
    status:
      structureIssues.length === 0 &&
      duplicateOutputs.length === 0 &&
      emptyFiles.length === 0 &&
      malformedFiles.length === 0 &&
      markdownIssues.length === 0
        ? 'pass'
        : 'fail',
  }
}

function writeValidationReport(validation) {
  let content = '# Final Validation Report\n\n'
  content += 'Report ID: `k4m9pz`\n\n'
  content += `- directory structure is consistent: ${validation.structureIssues.length === 0 ? 'yes' : 'no'}\n`
  content += `- total files scanned: ${formatInt(validation.totalFiles)}\n`
  content += `- all files opened cleanly: ${formatInt(validation.filesOpenedCleanly)} / ${formatInt(validation.totalFiles)}\n`
  content += `- duplicate outputs: ${formatInt(validation.duplicateOutputs.length)}\n`
  content += `- empty files: ${formatInt(validation.emptyFiles.length)}\n`
  content += `- malformed markdown: ${formatInt(validation.markdownIssues.length)}\n`
  content += `- malformed files: ${formatInt(validation.malformedFiles.length)}\n`
  content += `- replacement-character files: ${formatInt(validation.replacementCharFiles.length)}\n`
  content += `- markdown files opened cleanly: ${formatInt(validation.markdownFileCount - validation.markdownIssues.length)} / ${formatInt(validation.markdownFileCount)}\n`
  content += `- status: ${validation.status}\n`
  content += '- note: Mode A exports preserve original source extensions by design; validation checked them as plain-text/UTF-8 files rather than rewriting them into markdown wrappers\n'
  content += '- note: replacement characters were reported separately because they reflect source-text payloads that still open in Obsidian, not broken export structure\n'

  if (validation.structureIssues.length > 0) {
    content += '\n## Structure Issues\n'
    for (const issue of validation.structureIssues) {
      content += `- ${issue}\n`
    }
  }

  if (validation.duplicateOutputs.length > 0) {
    content += '\n## Duplicate Outputs\n'
    for (const issue of validation.duplicateOutputs.slice(0, 20)) {
      content += `- ${issue}\n`
    }
  }

  if (validation.emptyFiles.length > 0) {
    content += '\n## Empty Files\n'
    for (const filePath of validation.emptyFiles.slice(0, 20)) {
      content += `- ${filePath}\n`
    }
  }

  if (validation.malformedFiles.length > 0) {
    content += '\n## Malformed Files\n'
    for (const issue of validation.malformedFiles.slice(0, 20)) {
      content += `- ${issue}\n`
    }
  }

  if (validation.replacementCharFiles.length > 0) {
    content += '\n## Replacement Characters\n'
    for (const issue of validation.replacementCharFiles.slice(0, 20)) {
      content += `- ${issue}\n`
    }
  }

  if (validation.markdownIssues.length > 0) {
    content += '\n## Markdown Issues\n'
    for (const issue of validation.markdownIssues.slice(0, 20)) {
      content += `- ${issue}\n`
    }
  }

  fs.writeFileSync(VALIDATION_REPORT_PATH, content, 'utf8')
  fs.writeFileSync(FINAL_VALIDATION_REPORT_PATH, content, 'utf8')

  if (validation.status !== 'pass') {
    throw new Error('Validation failed: structural or content issues were detected in obsidian_export.')
  }
}

function createIndexNotes() {
  fs.mkdirSync(path.dirname(SESSIONS_INDEX_PATH), { recursive: true })

  const rootIndex = [
    '# Obsidian Export',
    '',
    '- [cfv1](./cfv1/)',
    '- [chefflow-conversations](./chefflow-conversations/)',
    '- [codex-conversations](./codex-conversations/)',
    '- [sessions](./sessions/_INDEX.md)',
    '',
  ].join('\n')

  const sessionsIndex = [
    '# Sessions',
    '',
    '- [chefflow-conversations](../chefflow-conversations/)',
    '- [codex-conversations](../codex-conversations/)',
    '',
  ].join('\n')

  fs.writeFileSync(INDEX_PATH, rootIndex, 'utf8')
  fs.writeFileSync(SESSIONS_INDEX_PATH, sessionsIndex, 'utf8')
}

function appendImportLog(batchResults, coverage) {
  const existing = fs.existsSync(IMPORT_LOG_PATH) ? fs.readFileSync(IMPORT_LOG_PATH, 'utf8').replace(/\s*$/, '') : '# Obsidian Import Log'
  const errorLine = batchResults.errors.length > 0 ? batchResults.errors.join(' | ') : 'none'
  const coverageProgress = `Mode A ${coverage.totals.modeAExported}/${coverage.totals.modeAEligible} (${percent(coverage.totals.modeAExported, coverage.totals.modeAEligible)}); Mode B ${coverage.totals.modeBExportedReliable}/${coverage.totals.modeBEligibleReliable} (${percent(coverage.totals.modeBExportedReliable, coverage.totals.modeBEligibleReliable)})`

  let updated = existing
  updated = updated.replace(new RegExp(`\\n\\nBatch ${batchResults.batchId}:\\n[\\s\\S]*?(?=\\n\\nBatch \\d+:|\\n\\nFINAL SUMMARY:|$)`), '')
  updated = updated.replace(/\n\nFINAL SUMMARY:\n[\s\S]*$/, '')
  updated += `\n\nBatch ${batchResults.batchId}:\n`
  updated += `- Mode A files: ${batchResults.modeAFiles}\n`
  updated += `- Mode B files: ${batchResults.modeBFiles}\n`
  updated += `- Coverage progress: ${coverageProgress}\n`
  updated += `- Errors: ${errorLine}\n`
  updated += `- Status: ${batchResults.status}\n`
  updated += `- Started at: ${batchResults.startedAt}\n`
  updated += `- Finished at: ${batchResults.finishedAt}\n`
  updated += `- Output files written: ${batchResults.modeAFiles + batchResults.modeBFiles}\n`
  updated += `- Drawers processed this run: ${formatInt(batchResults.modeADrawers + batchResults.modeBDrawers)}\n`
  updated += `- Unique Mode B chunks written: ${formatInt(batchResults.modeBUniqueChunks)}\n`
  updated += '\nFINAL SUMMARY:\n\n'
  updated += `Total Mode A files: ${formatInt(coverage.totals.modeAExported)}\n`
  updated += `Total Mode B files: ${formatInt(coverage.totals.modeBExportedReliable)}\n`
  updated += `Total drawers processed: ${formatInt(coverage.totals.processedDrawers)}\n`
  updated += `Total skipped: ${formatInt(coverage.skipped.total)}\n`
  updated += `Final status: ${coverage.finalAssessment.finalStatus}\n`
  updated += `Notes: Mode A reached ${percent(coverage.totals.modeAExported, coverage.totals.modeAEligible)} of source-backed files; Mode B reached ${percent(coverage.totals.modeBExportedReliable, coverage.totals.modeBEligibleReliable)} of reliable sessions; remaining candidates are irrecoverable, ambiguous, or non-actionable.\n`

  fs.writeFileSync(IMPORT_LOG_PATH, `${updated}\n`, 'utf8')
}

function writeMissingSourceAnalysis(rows) {
  const counts = {
    moved: 0,
    missing: 0,
    unknown: 0,
    recovered: 0,
    irrecoverable: 0,
  }

  for (const row of rows) {
    counts[row.status] += 1
    counts[row.finalStatus] += 1
  }

  let content = '# Missing Source Analysis\n\n'
  content += 'Log ID: `x2m9k4`\n\n'
  content += `Mode A missing-source candidates investigated: ${rows.length}\n\n`
  content += 'Summary:\n'
  content += `- moved: ${counts.moved}\n`
  content += `- missing: ${counts.missing}\n`
  content += `- ambiguous: ${counts.unknown}\n`
  content += `- final_status recovered: ${counts.recovered}\n`
  content += `- final_status irrecoverable: ${counts.irrecoverable}\n\n`

  for (const row of rows) {
    content += `Case ${row.caseNumber}:\n`
    content += `- expected_path: ${row.expectedPath}\n`
    content += `- detected_status: ${row.status}\n`
    content += `- classification: ${row.classification}\n`
    if (row.movedTo) {
      content += `- moved_to: ${row.movedTo}\n`
    }
    if (row.worktreeMatches?.length > 0) {
      content += `- worktree_matches: ${row.worktreeMatches.join(' | ')}\n`
    }
    content += `- final_status: ${row.finalStatus}\n`
    content += `- reason: ${deriveMissingSourceReason(row)}\n`
    content += `- action_taken: ${row.actionTaken}\n\n`
  }

  fs.writeFileSync(MISSING_SOURCE_ANALYSIS_PATH, content, 'utf8')
}

function printSummary(batchResults, coverage, validation) {
  const summary = {
    batchId: batchResults.batchId,
    status: batchResults.status,
    modeAFiles: batchResults.modeAFiles,
    modeBFiles: batchResults.modeBFiles,
    modeBByNamespace: batchResults.modeBByNamespace,
    modeACoverage: `${coverage.totals.modeAExported}/${coverage.totals.modeAEligible}`,
    modeBCoverage: `${coverage.totals.modeBExportedReliable}/${coverage.totals.modeBEligibleReliable}`,
    processedDrawers: coverage.totals.processedDrawers,
    remainingDrawers: coverage.totals.remainingDrawers,
    skipped: coverage.skipped,
    validationStatus: validation.status,
    outputsWrittenThisRun: batchResults.outputsWrittenThisRun.length,
    coverageReport: FINAL_COVERAGE_REPORT_PATH,
    missingSourceAnalysis: MISSING_SOURCE_ANALYSIS_PATH,
    validationReport: FINAL_VALIDATION_REPORT_PATH,
    importLog: IMPORT_LOG_PATH,
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

function getExpectedModeAMissingSourcePath(candidate) {
  if (candidate.displaySource) {
    return candidate.displaySource
  }
  if (candidate.relativePath) {
    return path.join(SOURCE_ROOTS.cfv1, candidate.relativePath)
  }
  return SOURCE_ROOTS.cfv1
}

function deriveMissingSourceReason(row) {
  if (row.finalStatus === 'recovered') {
    return row.movedTo
      ? `canonical source was recovered at ${row.movedTo}`
      : 'canonical source was recovered from a surviving workspace path'
  }

  if (row.status === 'unknown') {
    return 'only worktree-only copies remained, so no authoritative canonical source could be recovered safely'
  }

  return 'no surviving canonical source was found in the workspace or Claude worktrees'
}

function extractFrontmatterScalar(decoded, fieldName) {
  if (!decoded.startsWith('---\n')) {
    return null
  }

  const frontmatterEnd = decoded.indexOf('\n---\n', 4)
  if (frontmatterEnd === -1) {
    return null
  }

  const frontmatter = decoded.slice(4, frontmatterEnd)
  const pattern = new RegExp(`^${escapeRegExp(fieldName)}:\\s*(.+)$`, 'm')
  const match = frontmatter.match(pattern)
  if (!match) {
    return null
  }

  return match[1].trim()
}

function isEligibleModeA(candidate) {
  return candidate.mode === 'A' && candidate.statusPreview === 'write' && !fs.existsSync(candidate.outputPath)
}

function isEligibleModeB(candidate, reliabilityMap) {
  if (candidate.mode !== 'B' || candidate.statusPreview !== 'write' || fs.existsSync(candidate.outputPath)) {
    return false
  }
  return reliabilityMap?.get(candidateKey(candidate.namespace, candidate.normalizedSource))?.reliable === true
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
  if (!fs.existsSync(rootPath)) {
    return
  }

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

function normalizeNamespace(rawWing) {
  return RAW_WING_TO_NAMESPACE.get(rawWing) || rawWing
}

function candidateKey(namespace, normalizedSource) {
  return `${namespace}\u0000${normalizedSource}`
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

function normalizePathKey(filePath) {
  return path.resolve(filePath).toLowerCase()
}

function normalizeRelativePath(relativePath) {
  return (relativePath || '').replace(/\\/g, '/')
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

function getPathDepth(relativePath) {
  return (relativePath || '').split(/[\\/]+/).filter(Boolean).length
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function percent(numerator, denominator) {
  if (denominator === 0) {
    return '0.00%'
  }
  return `${((numerator / denominator) * 100).toFixed(2)}%`
}

function formatInt(value) {
  return Intl.NumberFormat('en-US').format(value)
}

main()
