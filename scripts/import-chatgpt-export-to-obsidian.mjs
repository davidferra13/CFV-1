import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { unzipSync } from 'fflate'

const DEFAULT_NAMESPACE = 'chatgpt-conversations'

export function importChatgptExport(options) {
  const resolvedOptions = normalizeOptions(options)
  const source = loadChatgptSource(resolvedOptions.inputPath)
  const outputDir = path.join(resolvedOptions.outputRoot, resolvedOptions.namespace)

  fs.mkdirSync(outputDir, { recursive: true })

  const noteSummaries = []

  try {
    for (const batchLoader of source.batchLoaders) {
      const conversations = extractConversationArray(batchLoader.load())

      for (const conversation of conversations) {
        const normalized = normalizeConversation(conversation)
        if (!normalized) {
          continue
        }

        const note = buildConversationNote(normalized, {
          namespace: resolvedOptions.namespace,
          sourceLabel: source.sourceLabel,
        })

        const notePath = path.join(outputDir, `${buildStableFileStem(normalized)}.md`)
        const writeStatus = writeIfChanged(notePath, note)

        noteSummaries.push({
          ...normalized,
          notePath,
          writeStatus,
        })
      }
    }
  } finally {
    source.cleanup?.()
  }

  noteSummaries.sort(compareConversationSummaries)

  const indexPath = path.join(outputDir, '_INDEX.md')
  const indexText = buildNamespaceIndex(noteSummaries, {
    namespace: resolvedOptions.namespace,
    sourceLabel: source.sourceLabel,
  })
  const indexWriteStatus = writeIfChanged(indexPath, indexText)

  const rootIndexPath = path.join(resolvedOptions.outputRoot, '_INDEX.md')
  ensureRootIndex(rootIndexPath, resolvedOptions.namespace)

  return {
    namespace: resolvedOptions.namespace,
    sourceLabel: source.sourceLabel,
    outputRoot: resolvedOptions.outputRoot,
    outputDir,
    totalConversations: noteSummaries.length,
    writtenNotes: noteSummaries.filter((entry) => entry.writeStatus === 'written').length,
    unchangedNotes: noteSummaries.filter((entry) => entry.writeStatus === 'unchanged').length,
    indexWriteStatus,
    notes: noteSummaries,
  }
}

function normalizeOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new Error('Options are required.')
  }

  if (!options.inputPath) {
    throw new Error('An input path is required. Pass --input <path-to-export>.')
  }

  return {
    inputPath: path.resolve(String(options.inputPath)),
    outputRoot: path.resolve(String(options.outputRoot || path.join(process.cwd(), 'obsidian_export'))),
    namespace: String(options.namespace || DEFAULT_NAMESPACE),
  }
}

function loadChatgptSource(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input path does not exist: ${inputPath}`)
  }

  const stat = fs.statSync(inputPath)
  if (stat.isDirectory()) {
    return loadChatgptSourceFromDirectory(inputPath)
  }

  const extension = path.extname(inputPath).toLowerCase()
  if (extension === '.zip') {
    return loadChatgptSourceFromZip(inputPath)
  }

  if (extension === '.json') {
    return {
      sourceLabel: inputPath,
      conversations: parseJsonFile(inputPath),
    }
  }

  throw new Error(`Unsupported input type: ${inputPath}. Use a ChatGPT export zip, folder, or conversations.json file.`)
}

function loadChatgptSourceFromDirectory(rootDir) {
  const conversationsPath = findConversationsJson(rootDir)
  if (conversationsPath) {
    return {
      sourceLabel: conversationsPath,
      batchLoaders: [
        {
          label: conversationsPath,
          load: () => parseJsonFile(conversationsPath),
        },
      ],
      cleanup: null,
    }
  }

  const batchPaths = findConversationBatchJsonFiles(rootDir)
  if (batchPaths.length === 0) {
    throw new Error(`No conversations.json or conversations-*.json files were found under ${rootDir}`)
  }

  return {
    sourceLabel: rootDir,
    batchLoaders: batchPaths.map((batchPath) => ({
      label: batchPath,
      load: () => parseJsonFile(batchPath),
    })),
    cleanup: null,
  }
}

function findConversationsJson(rootDir) {
  const queue = [rootDir]

  while (queue.length) {
    const current = queue.shift()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absolutePath)
        continue
      }

      if (entry.isFile() && entry.name.toLowerCase() === 'conversations.json') {
        return absolutePath
      }
    }
  }

  return null
}

function findConversationBatchJsonFiles(rootDir) {
  const matches = []
  const queue = [rootDir]

  while (queue.length) {
    const current = queue.shift()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(absolutePath)
        continue
      }

      if (entry.isFile() && /^conversations-\d+\.json$/i.test(entry.name)) {
        matches.push(absolutePath)
      }
    }
  }

  return matches.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'accent' }))
}

function loadChatgptSourceFromZip(zipPath) {
  if (process.platform === 'win32') {
    return loadChatgptSourceFromZipWithPowerShell(zipPath)
  }

  const archive = unzipSync(fs.readFileSync(zipPath))
  const conversationEntryNames = Object.keys(archive)
    .filter((entryName) => isConversationJsonBasename(path.basename(entryName)))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'accent' }))

  if (conversationEntryNames.length === 0) {
    throw new Error(`No conversations.json file was found inside ${zipPath}`)
  }

  return {
    sourceLabel: zipPath,
    batchLoaders: conversationEntryNames.map((entryName) => ({
      label: `${zipPath}::${entryName}`,
      load: () => parseJsonText(Buffer.from(archive[entryName]).toString('utf8'), `${zipPath}::${entryName}`),
    })),
    cleanup: null,
  }
}

function loadChatgptSourceFromZipWithPowerShell(zipPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatgpt-zip-import-'))
  const command = `
$zipPath = $env:CHATGPT_IMPORT_ZIP_PATH
$outputDir = $env:CHATGPT_IMPORT_OUTPUT_DIR
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $matched = 0
  foreach ($entry in $zip.Entries) {
    $name = [IO.Path]::GetFileName($entry.FullName)
    if ($name -match '^conversations(\\.json|-\\d+\\.json)$') {
      $destination = Join-Path $outputDir $name
      $directory = Split-Path $destination -Parent
      if ($directory) {
        New-Item -ItemType Directory -Path $directory -Force | Out-Null
      }
      $inputStream = $entry.Open()
      try {
        $outputStream = [IO.File]::Open($destination, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
        try {
          $inputStream.CopyTo($outputStream)
        } finally {
          $outputStream.Dispose()
        }
      } finally {
        $inputStream.Dispose()
      }
      $matched += 1
    }
  }
  if ($matched -eq 0) {
    throw 'No conversation json entries found in archive.'
  }
} finally {
  $zip.Dispose()
}
`

  const result = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', command],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CHATGPT_IMPORT_ZIP_PATH: zipPath,
        CHATGPT_IMPORT_OUTPUT_DIR: tempDir,
      },
      windowsHide: true,
    },
  )

  if (result.status !== 0) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    throw new Error(
      [
        `Failed to extract conversation JSON files from ${zipPath}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  const source = loadChatgptSourceFromDirectory(tempDir)
  return {
    ...source,
    sourceLabel: zipPath,
    cleanup: () => {
      fs.rmSync(tempDir, { recursive: true, force: true })
    },
  }
}

function isConversationJsonBasename(name) {
  return /^conversations(\.json|-\d+\.json)$/i.test(name)
}

function parseJsonFile(filePath) {
  return parseJsonText(fs.readFileSync(filePath, 'utf8'), filePath)
}

function parseJsonText(text, label) {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Failed to parse JSON from ${label}: ${error.message}`)
  }
}

function extractConversationArray(parsed) {
  if (Array.isArray(parsed)) {
    return parsed
  }

  if (parsed && Array.isArray(parsed.conversations)) {
    return parsed.conversations
  }

  throw new Error('Expected the ChatGPT export to contain an array of conversations.')
}

function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== 'object') {
    return null
  }

  const conversationId = String(conversation.id || conversation.conversation_id || conversation.chat_id || '').trim()
  const mapping = conversation.mapping && typeof conversation.mapping === 'object' ? conversation.mapping : {}
  const visibleEntries = buildVisibleEntries(mapping, conversation.current_node)
  const messages = visibleEntries.map((entry, index) => normalizeMessage(entry, index)).filter(Boolean)

  if (messages.length === 0) {
    return null
  }

  const allMessageEntries = Object.values(mapping).filter((entry) => entry?.message)
  const title = cleanInlineText(conversation.title) || 'Untitled ChatGPT Conversation'
  const createdAt = normalizeTimestamp(conversation.create_time) || messages[0]?.createdAt || null
  const updatedAt = normalizeTimestamp(conversation.update_time) || messages[messages.length - 1]?.createdAt || null
  const contentHash = sha256(
    JSON.stringify({
      conversationId,
      title,
      createdAt,
      updatedAt,
      messages: messages.map((message) => ({
        role: message.role,
        authorLabel: message.authorLabel,
        createdAt: message.createdAt,
        body: message.body,
      })),
    }),
  )

  return {
    conversationId: conversationId || `hash-${contentHash.slice(0, 12)}`,
    title,
    createdAt,
    updatedAt,
    messages,
    totalMessageNodes: allMessageEntries.length,
    visibleMessageNodes: messages.length,
    omittedBranchNodes: Math.max(allMessageEntries.length - messages.length, 0),
    contentHash,
  }
}

function buildVisibleEntries(mapping, currentNodeId) {
  if (currentNodeId && mapping[currentNodeId]) {
    const seen = new Set()
    const chain = []
    let currentId = currentNodeId

    while (currentId && mapping[currentId] && !seen.has(currentId)) {
      const entry = mapping[currentId]
      chain.push(entry)
      seen.add(currentId)
      currentId = entry.parent || null
    }

    const visible = chain
      .reverse()
      .filter((entry) => entry?.message)

    if (visible.length > 0) {
      return visible
    }
  }

  return Object.values(mapping)
    .filter((entry) => entry?.message)
    .sort(compareMessageEntries)
}

function compareMessageEntries(left, right) {
  const leftTime = extractEntryTime(left)
  const rightTime = extractEntryTime(right)

  if (leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return String(left?.id || '').localeCompare(String(right?.id || ''), undefined, { sensitivity: 'accent' })
}

function extractEntryTime(entry) {
  const iso = normalizeTimestamp(entry?.message?.create_time)
  if (!iso) {
    return Number.MAX_SAFE_INTEGER
  }

  return Date.parse(iso)
}

function normalizeMessage(entry, index) {
  const message = entry?.message
  if (!message || typeof message !== 'object') {
    return null
  }

  const role = String(message.author?.role || 'unknown')
  const authorLabel = buildAuthorLabel(message.author)
  const body = extractMessageBody(message)

  if (!body) {
    return null
  }

  const metadataBits = []
  const modelSlug = cleanInlineText(message.metadata?.model_slug)
  if (modelSlug) {
    metadataBits.push(`model: ${modelSlug}`)
  }

  const status = cleanInlineText(message.status)
  if (status && status !== 'finished_successfully') {
    metadataBits.push(`status: ${status}`)
  }

  return {
    sequence: index + 1,
    messageId: String(message.id || entry.id || ''),
    role,
    authorLabel,
    createdAt: normalizeTimestamp(message.create_time),
    body,
    metadataLine: metadataBits.join(' | ') || null,
  }
}

function buildAuthorLabel(author) {
  const role = String(author?.role || 'unknown')
  const explicitName = cleanInlineText(author?.name)

  if (explicitName) {
    return explicitName
  }

  switch (role) {
    case 'assistant':
      return 'ChatGPT'
    case 'user':
      return 'User'
    case 'system':
      return 'System'
    case 'tool':
      return 'Tool'
    default:
      return role.charAt(0).toUpperCase() + role.slice(1)
  }
}

function extractMessageBody(message) {
  const contentSegments = extractContentSegments(message.content)
  const attachmentSegments = extractAttachmentSegments(message)
  const parts = [...contentSegments, ...attachmentSegments]
    .map((part) => normalizeBlockText(part))
    .filter(Boolean)

  if (parts.length === 0) {
    return ''
  }

  return parts.join('\n\n').trim()
}

function extractContentSegments(content) {
  if (content == null) {
    return []
  }

  if (typeof content === 'string') {
    return [content]
  }

  if (Array.isArray(content)) {
    return content.flatMap((item) => extractContentSegments(item))
  }

  if (typeof content !== 'object') {
    return [String(content)]
  }

  const contentType = cleanInlineText(content.content_type)
  if (contentType === 'text' || contentType === 'multimodal_text') {
    return extractPartSegments(content.parts)
  }

  if (contentType === 'code') {
    const codeText = extractPartSegments(content.text || content.parts || []).join('\n\n').trim()
    if (!codeText) {
      return []
    }

    const language = cleanInlineText(content.language)
    return [`\`\`\`${language || ''}\n${codeText}\n\`\`\``]
  }

  if (contentType === 'image_asset_pointer') {
    const pointer = cleanInlineText(content.asset_pointer || content.pointer || content.url)
    return [`[Image asset${pointer ? `: ${pointer}` : ''}]`]
  }

  if (contentType === 'audio') {
    const transcript = extractPartSegments(content.transcript || content.text || content.parts).join('\n\n').trim()
    if (transcript) {
      return [transcript]
    }

    return ['[Audio message]']
  }

  if (Array.isArray(content.parts)) {
    const partSegments = extractPartSegments(content.parts)
    if (partSegments.length > 0) {
      return partSegments
    }
  }

  if (typeof content.text === 'string') {
    return [content.text]
  }

  if (typeof content.result === 'string') {
    return [content.result]
  }

  if (Array.isArray(content.text)) {
    return extractPartSegments(content.text)
  }

  return []
}

function extractPartSegments(parts) {
  if (parts == null) {
    return []
  }

  if (typeof parts === 'string') {
    return [parts]
  }

  if (!Array.isArray(parts)) {
    return extractContentSegments(parts)
  }

  const segments = []

  for (const part of parts) {
    if (typeof part === 'string') {
      segments.push(part)
      continue
    }

    if (typeof part === 'number' || typeof part === 'boolean') {
      segments.push(String(part))
      continue
    }

    if (!part || typeof part !== 'object') {
      continue
    }

    const partType = cleanInlineText(part.content_type || part.type)
    if (partType === 'image_asset_pointer') {
      const pointer = cleanInlineText(part.asset_pointer || part.pointer || part.url)
      segments.push(`[Image asset${pointer ? `: ${pointer}` : ''}]`)
      continue
    }

    if (partType === 'audio' || partType === 'audio_transcript') {
      const transcript = extractContentSegments(part.transcript || part.text || part.parts).join('\n\n').trim()
      segments.push(transcript || '[Audio message]')
      continue
    }

    if (typeof part.text === 'string') {
      segments.push(part.text)
      continue
    }

    if (typeof part.caption === 'string') {
      segments.push(part.caption)
      continue
    }

    if (typeof part.url === 'string') {
      segments.push(part.url)
      continue
    }
  }

  return segments
}

function extractAttachmentSegments(message) {
  const attachmentCandidates = []

  if (Array.isArray(message.metadata?.attachments)) {
    attachmentCandidates.push(...message.metadata.attachments)
  }

  if (Array.isArray(message.attachments)) {
    attachmentCandidates.push(...message.attachments)
  }

  return attachmentCandidates
    .map((attachment) => {
      if (!attachment || typeof attachment !== 'object') {
        return null
      }

      const name =
        cleanInlineText(attachment.name) ||
        cleanInlineText(attachment.file_name) ||
        cleanInlineText(attachment.id)

      if (!name) {
        return '[Attachment]'
      }

      return `[Attachment: ${name}]`
    })
    .filter(Boolean)
}

function buildConversationNote(conversation, options) {
  const frontmatter = [
    '---',
    'obsidian_export_version: 1',
    'note_type: "chatgpt-conversation"',
    `export_namespace: ${yamlString(options.namespace)}`,
    'source_format: "openai-chatgpt-export"',
    `source_label: ${yamlString(options.sourceLabel)}`,
    `conversation_id: ${yamlString(conversation.conversationId)}`,
    `title: ${yamlString(conversation.title)}`,
    `created_at: ${yamlNullableString(conversation.createdAt)}`,
    `updated_at: ${yamlNullableString(conversation.updatedAt)}`,
    `message_count: ${conversation.messages.length}`,
    `total_message_nodes: ${conversation.totalMessageNodes}`,
    `omitted_branch_nodes: ${conversation.omittedBranchNodes}`,
    `content_sha256: ${yamlString(conversation.contentHash)}`,
    'tags: ["chatgpt", "obsidian-import"]',
    '---',
  ]

  const metadata = [
    `- conversation id: \`${conversation.conversationId}\``,
    `- messages on visible path: ${conversation.messages.length}`,
    `- total message nodes in export: ${conversation.totalMessageNodes}`,
    `- omitted alternate-branch nodes: ${conversation.omittedBranchNodes}`,
  ]

  if (conversation.createdAt) {
    metadata.push(`- created: ${conversation.createdAt}`)
  }

  if (conversation.updatedAt) {
    metadata.push(`- updated: ${conversation.updatedAt}`)
  }

  const transcript = conversation.messages.map((message) => renderMessageSection(message)).join('\n\n')

  return [
    ...frontmatter,
    `# ${conversation.title}`,
    '',
    '## Metadata',
    ...metadata,
    '',
    '## Transcript',
    transcript,
    '',
  ].join('\n')
}

function renderMessageSection(message) {
  const headingBits = [`### ${String(message.sequence).padStart(3, '0')} ${message.authorLabel}`]
  const detailBits = []

  if (message.createdAt) {
    detailBits.push(message.createdAt)
  }

  if (message.metadataLine) {
    detailBits.push(message.metadataLine)
  }

  const lines = [...headingBits, '']

  if (detailBits.length > 0) {
    lines.push(`_${detailBits.join(' | ')}_`, '')
  }

  lines.push(message.body.trim())
  return lines.join('\n')
}

function buildStableFileStem(conversation) {
  const stableId = sanitizeForFilename(conversation.conversationId || conversation.contentHash).slice(0, 96)
  return `chatgpt-${stableId || conversation.contentHash.slice(0, 12)}`
}

function buildNamespaceIndex(noteSummaries, options) {
  const lines = [
    '# ChatGPT Conversations',
    '',
    `- generated_at: ${new Date().toISOString()}`,
    `- source: \`${options.sourceLabel}\``,
    `- conversations: ${noteSummaries.length}`,
    '',
    '## Notes',
  ]

  if (noteSummaries.length === 0) {
    lines.push('', '- No importable conversations were found.')
    return lines.join('\n')
  }

  lines.push('')

  for (const summary of noteSummaries) {
    const relativeNotePath = `./${path.basename(summary.notePath)}`
    const metaBits = [`${summary.messages.length} messages`]

    if (summary.updatedAt) {
      metaBits.push(`updated ${summary.updatedAt}`)
    } else if (summary.createdAt) {
      metaBits.push(`created ${summary.createdAt}`)
    }

    lines.push(`- [${escapeMarkdownLabel(summary.title)}](${relativeNotePath}) - ${metaBits.join(' - ')}`)
  }

  return lines.join('\n')
}

function ensureRootIndex(indexPath, namespace) {
  const existing = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, 'utf8')
    : '# Obsidian Export\n'

  const desiredLine = `- [${namespace}](./${namespace}/)`
  if (existing.includes(desiredLine)) {
    return
  }

  const trimmed = existing.trimEnd()
  const next = trimmed.length === 0 ? `# Obsidian Export\n\n${desiredLine}\n` : `${trimmed}\n${desiredLine}\n`
  fs.writeFileSync(indexPath, next, 'utf8')
}

function writeIfChanged(filePath, text) {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8')
    if (existing === text) {
      return 'unchanged'
    }
  }

  fs.writeFileSync(filePath, text, 'utf8')
  return 'written'
}

function compareConversationSummaries(left, right) {
  const leftTime = sortableConversationTime(left)
  const rightTime = sortableConversationTime(right)

  if (leftTime !== rightTime) {
    return rightTime - leftTime
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: 'accent' })
}

function sortableConversationTime(conversation) {
  const iso = conversation.updatedAt || conversation.createdAt
  return iso ? Date.parse(iso) : 0
}

function normalizeTimestamp(value) {
  if (value == null || value === '') {
    return null
  }

  if (typeof value === 'number') {
    const milliseconds = value > 1_000_000_000_000 ? value : value * 1000
    const parsed = new Date(milliseconds)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) {
      return normalizeTimestamp(numeric)
    }

    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  return null
}

function normalizeBlockText(value) {
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .trim()
}

function cleanInlineText(value) {
  if (value == null) {
    return ''
  }

  return String(value).replace(/\s+/g, ' ').trim()
}

function sanitizeForFilename(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function escapeMarkdownLabel(value) {
  return String(value).replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

function yamlString(value) {
  return JSON.stringify(String(value))
}

function yamlNullableString(value) {
  return value ? yamlString(value) : 'null'
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function parseArgs(argv) {
  const parsed = {
    inputPath: null,
    outputRoot: path.join(process.cwd(), 'obsidian_export'),
    namespace: DEFAULT_NAMESPACE,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (value === '--input') {
      parsed.inputPath = argv[index + 1] || null
      index += 1
      continue
    }

    if (value === '--output-root') {
      parsed.outputRoot = argv[index + 1] || parsed.outputRoot
      index += 1
      continue
    }

    if (value === '--namespace') {
      parsed.namespace = argv[index + 1] || parsed.namespace
      index += 1
      continue
    }

    if (value === '--help' || value === '-h') {
      parsed.help = true
      continue
    }

    if (!value.startsWith('-') && !parsed.inputPath) {
      parsed.inputPath = value
    }
  }

  return parsed
}

function printHelp() {
  console.log('Usage: node scripts/import-chatgpt-export-to-obsidian.mjs --input <export.zip|folder|conversations.json> [--output-root <dir>] [--namespace <name>]')
}

function isDirectExecution() {
  return path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)
}

if (isDirectExecution()) {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || !args.inputPath) {
    printHelp()
    process.exit(args.help ? 0 : 1)
  }

  const result = importChatgptExport(args)
  console.log(
    [
      `[chatgpt-import] source: ${result.sourceLabel}`,
      `[chatgpt-import] namespace: ${result.namespace}`,
      `[chatgpt-import] output: ${result.outputDir}`,
      `[chatgpt-import] conversations: ${result.totalConversations}`,
      `[chatgpt-import] notes written: ${result.writtenNotes}`,
      `[chatgpt-import] notes unchanged: ${result.unchangedNotes}`,
    ].join('\n'),
  )
}
