#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildPromptArchive } from './lib/prompt-archive-core.mjs'

function parseArgs(argv) {
  const args = {
    file: null,
    run: null,
    slug: null,
    title: null,
    date: null,
    docsOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--file') {
      args.file = argv[++index]
    } else if (arg === '--run') {
      args.run = argv[++index]
    } else if (arg === '--slug') {
      args.slug = argv[++index]
    } else if (arg === '--title') {
      args.title = argv[++index]
    } else if (arg === '--date') {
      args.date = argv[++index]
    } else if (arg === '--docs-only') {
      args.docsOnly = true
    } else if (!arg.startsWith('-') && !args.file) {
      args.file = arg
    } else if (!arg.startsWith('-') && !args.run) {
      args.run = arg
    } else if (!arg.startsWith('-') && !args.slug) {
      args.slug = arg
    }
  }

  return args
}

async function writeArchive(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.file) {
    throw new Error('Usage: node scripts/prompt-archive.mjs --file prompt.md [--run RUN-ID] [--slug slug] [--title title]')
  }

  const prompt = await readFile(args.file, 'utf8')
  const archive = buildPromptArchive({
    prompt,
    source: args.file,
    runId: args.run,
    slug: args.slug,
    title: args.title,
    date: args.date,
  })

  await writeArchive(archive.docsPath, archive.content)
  const written = [archive.docsPath]

  if (archive.runPath && !args.docsOnly) {
    await writeArchive(archive.runPath, prompt.endsWith('\n') ? prompt : `${prompt}\n`)
    written.push(archive.runPath)
  }

  console.log(written.join('\n'))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
