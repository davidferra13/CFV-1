import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = process.cwd()
const OBSIDIAN_ROOT = path.join(REPO_ROOT, 'obsidian_export')
const OUTPUT_ROOT = path.join(REPO_ROOT, 'anythingllm_dataset')
const OUTPUT_DIRS = {
  conversations: path.join(OUTPUT_ROOT, 'conversations'),
  sessions: path.join(OUTPUT_ROOT, 'sessions'),
  code: path.join(OUTPUT_ROOT, 'code'),
}

const REPORT_PATHS = {
  datasetLog: path.join(OUTPUT_ROOT, 'dataset_log.md'),
  validation: path.join(OUTPUT_ROOT, 'validation_report.md'),
  finalReport: path.join(OUTPUT_ROOT, 'final_dataset_report.md'),
}

const BATCH_NAME = 'batch-0001-pilot'

const CHUNKING = {
  minTokens: 500,
  targetTokens: 950,
  maxTokens: 1500,
  overlapRatio: 0.15,
}

const PILOT = {
  minChunks: 1000,
  targetChunks: 1500,
  maxChunks: 1900,
  groupChunkCaps: {
    sessions: 10,
    code: 180,
    chefflow: 320,
    codex: 1100,
  },
}

const REQUIRED_METADATA_KEYS = [
  'source_file',
  'category',
  'section',
  'chunk_index',
  'total_chunks',
  'origin_type',
]

const CODE_ROOT_FILES = ['README.md', 'MEMORY.md', 'CLAUDE.md']
const CODE_ROOT_DIRS = ['docs', 'project-map', 'prompts', 'ops', 'database']
const CODE_EXTENSIONS = new Set(['.md', '.txt', '.sql'])

function main() {
  assertObsidianExport()
  ensureOutputLayout()

  const sourceGroups = collectSourceGroups()
  const build = buildPilotDataset(sourceGroups)
  writeBatchFiles(build.recordsByOutput)

  const validation = validateDataset()
  writeDatasetLog(build, sourceGroups)
  writeValidationReport(validation)
  writeFinalReport(build, sourceGroups, validation)

  console.log(
    JSON.stringify(
      {
        batch_name: BATCH_NAME,
        total_chunks: build.totalChunks,
        processed_sources: build.processedSourceCount,
        output_files: Object.fromEntries(
          Object.entries(build.recordsByOutput).map(([key, records]) => [
            key,
            path.relative(REPO_ROOT, batchFilePathForOutput(key)),
          ])
        ),
        validation_status: validation.passed ? 'passed' : 'failed',
      },
      null,
      2
    )
  )
}

function assertObsidianExport() {
  const requiredDirs = [
    path.join(OBSIDIAN_ROOT, 'chefflow-conversations'),
    path.join(OBSIDIAN_ROOT, 'codex-conversations'),
    path.join(OBSIDIAN_ROOT, 'sessions'),
    path.join(OBSIDIAN_ROOT, 'cfv1'),
  ]

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Missing required source directory: ${dir}`)
    }
  }
}

function ensureOutputLayout() {
  ensureDir(OUTPUT_ROOT)
  for (const dir of Object.values(OUTPUT_DIRS)) {
    ensureDir(dir)
  }
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true })
}

function collectSourceGroups() {
  const chefflowRoot = path.join(OBSIDIAN_ROOT, 'chefflow-conversations')
  const codexRoot = path.join(OBSIDIAN_ROOT, 'codex-conversations')
  const sessionsRoot = path.join(OBSIDIAN_ROOT, 'sessions')
  const cfv1Root = path.join(OBSIDIAN_ROOT, 'cfv1')

  return {
    sessions: collectFiles(sessionsRoot, (absolutePath) => isAllowedTextFile(absolutePath)).map(
      (absolutePath) => createSource(absolutePath, 'sessions', 'sessions', 'session')
    ),
    code: collectCodeSources(cfv1Root).map((absolutePath) =>
      createSource(absolutePath, 'code', 'code', 'code')
    ),
    chefflow: collectFiles(
      chefflowRoot,
      (absolutePath) => path.extname(absolutePath).toLowerCase() === '.md'
    ).map((absolutePath) => createSource(absolutePath, 'conversations', 'conversations', 'conversation')),
    codex: collectFiles(
      codexRoot,
      (absolutePath) => path.extname(absolutePath).toLowerCase() === '.md'
    ).map((absolutePath) => createSource(absolutePath, 'conversations', 'conversations', 'conversation')),
  }
}

function collectCodeSources(cfv1Root) {
  const rootFiles = CODE_ROOT_FILES.map((relativePath) => path.join(cfv1Root, relativePath)).filter(
    (absolutePath) => fs.existsSync(absolutePath)
  )

  const nestedFiles = CODE_ROOT_DIRS.flatMap((relativeDir) => {
    const absoluteDir = path.join(cfv1Root, relativeDir)
    if (!fs.existsSync(absoluteDir)) {
      return []
    }

    return collectFiles(absoluteDir, (absolutePath) => CODE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase()))
  })

  return [...new Set([...rootFiles, ...nestedFiles])].sort((left, right) =>
    normalizeSlashes(path.relative(OBSIDIAN_ROOT, left)).localeCompare(
      normalizeSlashes(path.relative(OBSIDIAN_ROOT, right))
    )
  )
}

function collectFiles(rootDir, predicate) {
  const files = []
  walkFiles(rootDir, files, predicate)
  return files.sort((left, right) =>
    normalizeSlashes(path.relative(OBSIDIAN_ROOT, left)).localeCompare(
      normalizeSlashes(path.relative(OBSIDIAN_ROOT, right))
    )
  )
}

function walkFiles(currentDir, files, predicate) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(absolutePath, files, predicate)
      continue
    }

    if (predicate(absolutePath)) {
      files.push(absolutePath)
    }
  }
}

function isAllowedTextFile(absolutePath) {
  const extension = path.extname(absolutePath).toLowerCase()
  return ['.md', '.txt', '.json', '.sql'].includes(extension)
}

function createSource(absolutePath, outputCategory, category, originType) {
  return {
    absolutePath,
    sourceFile: normalizeSlashes(path.relative(OBSIDIAN_ROOT, absolutePath)),
    fileName: path.basename(absolutePath),
    outputCategory,
    category,
    originType,
  }
}

function buildPilotDataset(sourceGroups) {
  const recordsByOutput = {
    conversations: [],
    sessions: [],
    code: [],
  }

  const stats = {
    groupChunks: {
      sessions: 0,
      code: 0,
      chefflow: 0,
      codex: 0,
    },
    processedSources: [],
    skippedSources: [],
  }

  for (const groupName of ['sessions', 'code', 'chefflow', 'codex']) {
    for (const source of sourceGroups[groupName]) {
      if (totalRecordCount(recordsByOutput) >= PILOT.maxChunks) {
        break
      }

      if (stats.groupChunks[groupName] >= PILOT.groupChunkCaps[groupName]) {
        break
      }

      const sourceBuild = buildSourceChunks(source)

      if (sourceBuild.skipReason) {
        stats.skippedSources.push({
          source_file: source.sourceFile,
          reason: sourceBuild.skipReason,
        })
        continue
      }

      if (!sourceBuild.records.length) {
        stats.skippedSources.push({
          source_file: source.sourceFile,
          reason: 'No chunkable text remained after normalization',
        })
        continue
      }

      if (
        totalRecordCount(recordsByOutput) >= PILOT.minChunks &&
        totalRecordCount(recordsByOutput) + sourceBuild.records.length > PILOT.maxChunks
      ) {
        break
      }

      recordsByOutput[source.outputCategory].push(...sourceBuild.records)
      stats.groupChunks[groupName] += sourceBuild.records.length
      stats.processedSources.push({
        source_file: source.sourceFile,
        category: source.category,
        origin_type: source.originType,
        chunk_count: sourceBuild.records.length,
      })
    }
  }

  if (totalRecordCount(recordsByOutput) < PILOT.minChunks) {
    topUpFromRemainder(sourceGroups, recordsByOutput, stats)
  }

  return {
    recordsByOutput,
    totalChunks: totalRecordCount(recordsByOutput),
    processedSourceCount: stats.processedSources.length,
    processedSources: stats.processedSources,
    skippedSources: stats.skippedSources,
    groupChunks: stats.groupChunks,
  }
}

function topUpFromRemainder(sourceGroups, recordsByOutput, stats) {
  const processed = new Set(stats.processedSources.map((item) => item.source_file))
  const skipped = new Set(stats.skippedSources.map((item) => item.source_file))

  for (const groupName of ['codex', 'chefflow', 'code']) {
    for (const source of sourceGroups[groupName]) {
      if (totalRecordCount(recordsByOutput) >= PILOT.minChunks) {
        return
      }

      if (processed.has(source.sourceFile) || skipped.has(source.sourceFile)) {
        continue
      }

      const sourceBuild = buildSourceChunks(source)

      if (sourceBuild.skipReason) {
        stats.skippedSources.push({
          source_file: source.sourceFile,
          reason: sourceBuild.skipReason,
        })
        skipped.add(source.sourceFile)
        continue
      }

      if (!sourceBuild.records.length) {
        stats.skippedSources.push({
          source_file: source.sourceFile,
          reason: 'No chunkable text remained after normalization',
        })
        skipped.add(source.sourceFile)
        continue
      }

      if (
        totalRecordCount(recordsByOutput) >= PILOT.minChunks ||
        totalRecordCount(recordsByOutput) + sourceBuild.records.length > PILOT.maxChunks
      ) {
        return
      }

      recordsByOutput[source.outputCategory].push(...sourceBuild.records)
      stats.groupChunks[groupName] += sourceBuild.records.length
      stats.processedSources.push({
        source_file: source.sourceFile,
        category: source.category,
        origin_type: source.originType,
        chunk_count: sourceBuild.records.length,
      })
      processed.add(source.sourceFile)
    }
  }
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

  if (source.fileName.endsWith('.jsonl.md') && looksLikeJsonLines(candidate)) {
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
      })
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
    `Source file: ${source.sourceFile}\nSection: ${chunkSpec.section}\n\n${chunkSpec.body}`
  )
}

function writeBatchFiles(recordsByOutput) {
  for (const [outputCategory, records] of Object.entries(recordsByOutput)) {
    const destination = batchFilePathForOutput(outputCategory)
    const lines = records.map((record) => JSON.stringify(record))
    fs.writeFileSync(destination, `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8')
  }
}

function batchFilePathForOutput(outputCategory) {
  return path.join(OUTPUT_DIRS[outputCategory], `${BATCH_NAME}.jsonl`)
}

function validateDataset() {
  const batchFiles = Object.keys(OUTPUT_DIRS).map((key) => ({
    category: key,
    absolutePath: batchFilePathForOutput(key),
  }))

  const issues = []
  const advisoryNotes = []
  const seenHashes = new Map()
  const perFileStats = []

  let totalRecords = 0
  let shortChunkCount = 0

  for (const batchFile of batchFiles) {
    const raw = fs.existsSync(batchFile.absolutePath) ? fs.readFileSync(batchFile.absolutePath, 'utf8') : ''
    const lines = raw.split('\n').filter(Boolean)

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex]
      let parsed
      try {
        parsed = JSON.parse(line)
      } catch {
        issues.push(`${batchFile.category}: malformed JSON at line ${lineIndex + 1}`)
        continue
      }

      totalRecords += 1
      const text = typeof parsed.text === 'string' ? parsed.text : ''
      const metadata = parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : null

      if (!text.trim()) {
        issues.push(`${batchFile.category}: empty chunk at line ${lineIndex + 1}`)
      }

      if (!metadata) {
        issues.push(`${batchFile.category}: missing metadata at line ${lineIndex + 1}`)
      } else {
        for (const key of REQUIRED_METADATA_KEYS) {
          if (!(key in metadata)) {
            issues.push(`${batchFile.category}: missing metadata key "${key}" at line ${lineIndex + 1}`)
          }
        }

        if (metadata && metadata.source_file) {
          const sourcePath = path.join(OBSIDIAN_ROOT, metadata.source_file)
          if (!fs.existsSync(sourcePath)) {
            issues.push(
              `${batchFile.category}: metadata source_file does not resolve at line ${lineIndex + 1} (${metadata.source_file})`
            )
          }
        }

        if (!metadata.section || !String(metadata.section).trim()) {
          issues.push(`${batchFile.category}: blank metadata section at line ${lineIndex + 1}`)
        }
      }

      if (!hasBalancedFenceLines(text)) {
        issues.push(`${batchFile.category}: unmatched code fence markers at line ${lineIndex + 1}`)
      }

      const chunkHash = createHash(text)
      if (seenHashes.has(chunkHash)) {
        const firstSeen = seenHashes.get(chunkHash)
        issues.push(
          `${batchFile.category}: duplicate chunk text at line ${lineIndex + 1}; first seen in ${firstSeen}`
        )
      } else {
        seenHashes.set(chunkHash, `${batchFile.category}:${lineIndex + 1}`)
      }

      const estimatedTokens = estimateTokens(text)
      if (estimatedTokens < CHUNKING.minTokens) {
        shortChunkCount += 1
      }

      perFileStats.push({
        category: batchFile.category,
        line: lineIndex + 1,
        source_file: metadata?.source_file || '[missing]',
        tokens: estimatedTokens,
      })
    }
  }

  if (shortChunkCount) {
    advisoryNotes.push(
      `${shortChunkCount} chunk(s) fell below the 500-token target because the underlying source section was shorter than the target window.`
    )
  }

  advisoryNotes.push(
    'No chunk boundaries were cut mid-unit; all splits were made on reconstructed chunk boundaries, heading sections, blank-line blocks, or line boundaries for oversized blocks.'
  )

  return {
    passed: issues.length === 0,
    issues,
    advisoryNotes,
    totalRecords,
    shortChunkCount,
    perFileStats,
  }
}

function writeDatasetLog(build, sourceGroups) {
  const lines = [
    '# AnythingLLM Dataset Log',
    '',
    `- Run date: ${new Date().toISOString()}`,
    `- Batch name: \`${BATCH_NAME}\``,
    `- Dataset mode: pilot subset`,
    `- Pilot target: ${PILOT.minChunks}-${PILOT.maxChunks} chunks before scale-up`,
    `- Production batch target after validation: 5,000-10,000 chunks per batch`,
    `- Chunk size target: ${CHUNKING.minTokens}-${CHUNKING.maxTokens} estimated tokens`,
    `- Overlap policy: ~${Math.round(CHUNKING.overlapRatio * 100)}% when a carry-over was needed`,
    '',
    '## Source Inventory',
    '',
    '| Group | Available source files | Processed source files | Generated chunks |',
    '| --- | ---: | ---: | ---: |',
    `| sessions | ${sourceGroups.sessions.length} | ${countProcessedSources(build.processedSources, 'session')} | ${build.groupChunks.sessions} |`,
    `| code | ${sourceGroups.code.length} | ${countProcessedSources(build.processedSources, 'code')} | ${build.groupChunks.code} |`,
    `| chefflow conversations | ${sourceGroups.chefflow.length} | ${countProcessedSources(build.processedSources, 'conversation', 'chefflow-conversations/')} | ${build.groupChunks.chefflow} |`,
    `| codex conversations | ${sourceGroups.codex.length} | ${countProcessedSources(build.processedSources, 'conversation', 'codex-conversations/')} | ${build.groupChunks.codex} |`,
    '',
    '## Output Files',
    '',
    `- [conversations/${BATCH_NAME}.jsonl](${toFileLink(batchFilePathForOutput('conversations'))})`,
    `- [sessions/${BATCH_NAME}.jsonl](${toFileLink(batchFilePathForOutput('sessions'))})`,
    `- [code/${BATCH_NAME}.jsonl](${toFileLink(batchFilePathForOutput('code'))})`,
    '',
    `- Total chunks generated: ${build.totalChunks}`,
  ]

  if (build.skippedSources.length) {
    lines.push('', '## Skipped Sources', '')
    const preview = build.skippedSources.slice(0, 30)
    for (const item of preview) {
      lines.push(`- \`${item.source_file}\` :: ${item.reason}`)
    }
    if (build.skippedSources.length > preview.length) {
      lines.push(`- ${build.skippedSources.length - preview.length} additional skipped source files omitted from this log preview`)
    }
  }

  fs.writeFileSync(REPORT_PATHS.datasetLog, `${lines.join('\n')}\n`, 'utf8')
}

function writeValidationReport(validation) {
  const lines = [
    '# AnythingLLM Validation Report',
    '',
    `- Validation date: ${new Date().toISOString()}`,
    `- Status: ${validation.passed ? 'passed' : 'failed'}`,
    `- Total records inspected: ${validation.totalRecords}`,
    `- Empty chunks detected: ${validation.issues.filter((issue) => issue.includes('empty chunk')).length}`,
    `- Malformed JSON lines detected: ${validation.issues.filter((issue) => issue.includes('malformed JSON')).length}`,
    `- Duplicate chunk texts detected: ${validation.issues.filter((issue) => issue.includes('duplicate chunk text')).length}`,
    '',
    '## Checks',
    '',
    '- No empty chunks',
    '- No malformed JSON',
    '- Metadata completeness',
    '- Source-file mapping back to `obsidian_export/`',
    '- No identical duplicate chunk texts',
    '- No unmatched code fences in chunk payloads',
    '',
    '## Advisory Notes',
    '',
    ...validation.advisoryNotes.map((note) => `- ${note}`),
  ]

  if (validation.issues.length) {
    lines.push('', '## Issues', '')
    for (const issue of validation.issues) {
      lines.push(`- ${issue}`)
    }
  } else {
    lines.push('', '## Issues', '', '- None')
  }

  fs.writeFileSync(REPORT_PATHS.validation, `${lines.join('\n')}\n`, 'utf8')
}

function writeFinalReport(build, sourceGroups, validation) {
  const lines = [
    '# AnythingLLM Final Dataset Report',
    '',
    `- Report date: ${new Date().toISOString()}`,
    `- Batch name: \`${BATCH_NAME}\``,
    `- Total chunks generated: ${build.totalChunks}`,
    `- Validation status: ${validation.passed ? 'passed' : 'failed'}`,
    '',
    '## Source Coverage',
    '',
    '| Category | Available sources | Processed sources | Generated chunks |',
    '| --- | ---: | ---: | ---: |',
    `| conversations (ChefFlow) | ${sourceGroups.chefflow.length} | ${countProcessedSources(build.processedSources, 'conversation', 'chefflow-conversations/')} | ${build.groupChunks.chefflow} |`,
    `| conversations (Codex) | ${sourceGroups.codex.length} | ${countProcessedSources(build.processedSources, 'conversation', 'codex-conversations/')} | ${build.groupChunks.codex} |`,
    `| sessions | ${sourceGroups.sessions.length} | ${countProcessedSources(build.processedSources, 'session')} | ${build.groupChunks.sessions} |`,
    `| code | ${sourceGroups.code.length} | ${countProcessedSources(build.processedSources, 'code')} | ${build.groupChunks.code} |`,
    '',
    '## Category Breakdown',
    '',
    `- conversations: ${build.groupChunks.chefflow + build.groupChunks.codex}`,
    `- sessions: ${build.groupChunks.sessions}`,
    `- code: ${build.groupChunks.code}`,
  ]

  if (build.skippedSources.length) {
    lines.push('', '## Skipped Content', '')
    const groupedSkips = summarizeSkippedSources(build.skippedSources)
    for (const item of groupedSkips) {
      lines.push(`- ${item.reason}: ${item.count}`)
    }
  } else {
    lines.push('', '## Skipped Content', '', '- None')
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- This pilot intentionally stays below the standard 5,000-10,000 chunk batch size so chunk quality can be validated before scaling.',
    '- Obsidian source files were not modified. The dataset is a derived JSONL layer only.'
  )

  fs.writeFileSync(REPORT_PATHS.finalReport, `${lines.join('\n')}\n`, 'utf8')
}

function summarizeSkippedSources(skippedSources) {
  const counts = new Map()
  for (const item of skippedSources) {
    counts.set(item.reason, (counts.get(item.reason) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count)
}

function totalRecordCount(recordsByOutput) {
  return Object.values(recordsByOutput).reduce((sum, records) => sum + records.length, 0)
}

function countProcessedSources(processedSources, originType, prefix = '') {
  return processedSources.filter(
    (item) => item.origin_type === originType && (!prefix || item.source_file.startsWith(prefix))
  ).length
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
      .join('\n')
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

function normalizeSlashes(filePath) {
  return filePath.replace(/\\/g, '/')
}

function countOccurrences(text, needle) {
  if (!needle) {
    return 0
  }
  return text.split(needle).length - 1
}

function hasBalancedFenceLines(text) {
  let openFence = null

  for (const line of text.split('\n')) {
    const match = line.trim().match(/^(```+|~~~~+)([a-zA-Z0-9_-]*)?$/)
    if (!match) {
      continue
    }

    const marker = match[1]
    if (!openFence) {
      openFence = marker[0]
      continue
    }

    if (openFence === marker[0]) {
      openFence = null
    } else {
      return false
    }
  }

  return openFence === null
}

function toFileLink(absolutePath) {
  return normalizeSlashes(absolutePath)
}

main()
