import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { zipSync } from 'fflate'

const scriptModulePath = path.resolve('scripts/import-chatgpt-export-to-obsidian.mjs')

function createFixtureConversations() {
  return [
    {
      id: 'conv-smoke-001',
      title: 'Obsidian import smoke test',
      create_time: 1_710_000_000,
      update_time: 1_710_003_600,
      current_node: 'assistant-2',
      mapping: {
        root: {
          id: 'root',
          message: null,
          parent: null,
          children: ['user-1'],
        },
        'user-1': {
          id: 'user-1',
          parent: 'root',
          children: ['assistant-1', 'assistant-alt'],
          message: {
            id: 'message-user-1',
            author: { role: 'user' },
            create_time: 1_710_000_000,
            content: {
              content_type: 'text',
              parts: ['Hello from ChatGPT export'],
            },
          },
        },
        'assistant-1': {
          id: 'assistant-1',
          parent: 'user-1',
          children: ['user-2'],
          message: {
            id: 'message-assistant-1',
            author: { role: 'assistant' },
            create_time: 1_710_000_100,
            content: {
              content_type: 'text',
              parts: ['First answer from ChatGPT'],
            },
            metadata: {
              model_slug: 'gpt-4o-mini',
            },
          },
        },
        'assistant-alt': {
          id: 'assistant-alt',
          parent: 'user-1',
          children: [],
          message: {
            id: 'message-assistant-alt',
            author: { role: 'assistant' },
            create_time: 1_710_000_150,
            content: {
              content_type: 'text',
              parts: ['Alternative branch answer that should stay out of the visible transcript'],
            },
          },
        },
        'user-2': {
          id: 'user-2',
          parent: 'assistant-1',
          children: ['assistant-2'],
          message: {
            id: 'message-user-2',
            author: { role: 'user' },
            create_time: 1_710_000_200,
            content: {
              content_type: 'text',
              parts: ['Please include the code sample too.'],
            },
            metadata: {
              attachments: [{ name: 'sample.txt' }],
            },
          },
        },
        'assistant-2': {
          id: 'assistant-2',
          parent: 'user-2',
          children: [],
          message: {
            id: 'message-assistant-2',
            author: { role: 'assistant' },
            create_time: 1_710_000_300,
            content: {
              content_type: 'code',
              language: 'ts',
              text: 'console.log("done")',
            },
          },
        },
      },
    },
  ]
}

async function loadImporter() {
  return import(`${pathToFileUrl(scriptModulePath)}?t=${Date.now()}`)
}

function pathToFileUrl(filePath: string) {
  const resolved = path.resolve(filePath).replace(/\\/g, '/')
  return `file:///${resolved.startsWith('/') ? resolved.slice(1) : resolved}`
}

function createTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chatgpt-obsidian-import-'))
}

test('imports an unpacked ChatGPT export folder into Obsidian markdown notes', async () => {
  const importer = await loadImporter()
  const tempRoot = createTempWorkspace()
  const exportDir = path.join(tempRoot, 'chatgpt-export')
  const outputRoot = path.join(tempRoot, 'obsidian')

  fs.mkdirSync(exportDir, { recursive: true })
  fs.writeFileSync(
    path.join(exportDir, 'conversations.json'),
    JSON.stringify(createFixtureConversations(), null, 2),
    'utf8'
  )

  const result = importer.importChatgptExport({
    inputPath: exportDir,
    outputRoot,
  })

  assert.equal(result.totalConversations, 1)
  assert.equal(result.writtenNotes, 1)

  const namespaceDir = path.join(outputRoot, 'chatgpt-conversations')
  const noteFiles = fs
    .readdirSync(namespaceDir)
    .filter((entry) => entry.endsWith('.md') && entry !== '_INDEX.md')
  assert.equal(noteFiles.length, 1)

  const noteText = fs.readFileSync(path.join(namespaceDir, noteFiles[0]), 'utf8')
  assert.match(noteText, /# Obsidian import smoke test/)
  assert.match(noteText, /Hello from ChatGPT export/)
  assert.match(noteText, /First answer from ChatGPT/)
  assert.match(noteText, /\[Attachment: sample.txt\]/)
  assert.match(noteText, /```ts\s+console\.log\("done"\)\s+```/m)
  assert.doesNotMatch(
    noteText,
    /Alternative branch answer that should stay out of the visible transcript/
  )
  assert.match(noteText, /export_namespace: "chatgpt-conversations"/)

  const namespaceIndex = fs.readFileSync(path.join(namespaceDir, '_INDEX.md'), 'utf8')
  assert.match(namespaceIndex, /\[Obsidian import smoke test\]/)

  const rootIndex = fs.readFileSync(path.join(outputRoot, '_INDEX.md'), 'utf8')
  assert.match(rootIndex, /\[chatgpt-conversations\]\(\.\/chatgpt-conversations\/\)/)
})

test('imports a ChatGPT export zip when conversations.json is nested in the archive', async () => {
  const importer = await loadImporter()
  const tempRoot = createTempWorkspace()
  const zipPath = path.join(tempRoot, 'chatgpt-export.zip')
  const outputRoot = path.join(tempRoot, 'obsidian')
  const conversationsJson = JSON.stringify(createFixtureConversations(), null, 2)

  const archive = zipSync({
    'takeout/conversations.json': new TextEncoder().encode(conversationsJson),
  })

  fs.writeFileSync(zipPath, Buffer.from(archive))

  const result = importer.importChatgptExport({
    inputPath: zipPath,
    outputRoot,
  })

  assert.equal(result.totalConversations, 1)

  const namespaceDir = path.join(outputRoot, 'chatgpt-conversations')
  const noteFiles = fs
    .readdirSync(namespaceDir)
    .filter((entry) => entry.endsWith('.md') && entry !== '_INDEX.md')
  assert.equal(noteFiles.length, 1)

  const noteText = fs.readFileSync(path.join(namespaceDir, noteFiles[0]), 'utf8')
  assert.match(noteText, /source_format: "openai-chatgpt-export"/)
  assert.match(noteText, /ChatGPT/)
})

test('imports a batched ChatGPT export zip that uses conversations-000.json files', async () => {
  const importer = await loadImporter()
  const tempRoot = createTempWorkspace()
  const zipPath = path.join(tempRoot, 'chatgpt-batched-export.zip')
  const outputRoot = path.join(tempRoot, 'obsidian')
  const conversationsJson = JSON.stringify(createFixtureConversations(), null, 2)

  const archive = zipSync({
    'conversations-000.json': new TextEncoder().encode(conversationsJson),
    'shared_conversations.json': new TextEncoder().encode('[]'),
  })

  fs.writeFileSync(zipPath, Buffer.from(archive))

  const result = importer.importChatgptExport({
    inputPath: zipPath,
    outputRoot,
  })

  assert.equal(result.totalConversations, 1)

  const namespaceDir = path.join(outputRoot, 'chatgpt-conversations')
  const noteFiles = fs
    .readdirSync(namespaceDir)
    .filter((entry) => entry.endsWith('.md') && entry !== '_INDEX.md')
  assert.equal(noteFiles.length, 1)

  const noteText = fs.readFileSync(path.join(namespaceDir, noteFiles[0]), 'utf8')
  assert.match(noteText, /Please include the code sample too\./)
})
