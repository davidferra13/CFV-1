#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { buildCollisionPreflight, formatCollisionPreflight } from './lib/prompt-workflow-core.mjs'

const execFileAsync = promisify(execFile)

function parseArgs(argv) {
  const args = {
    prompt: null,
    queueFiles: [],
    gitStatusFile: null,
    json: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--prompt') args.prompt = argv[++index]
    else if (arg === '--queue-files') args.queueFiles = argv[++index].split(',').map((file) => file.trim()).filter(Boolean)
    else if (arg === '--git-status-file') args.gitStatusFile = argv[++index]
    else if (arg === '--json') args.json = true
    else if (!arg.startsWith('-') && !args.prompt) args.prompt = arg
    else if (!arg.startsWith('-') && args.queueFiles.length === 0)
      args.queueFiles = arg.split(',').map((file) => file.trim()).filter(Boolean)
  }

  return args
}

async function readOptional(filePath) {
  if (!filePath) return ''
  return readFile(filePath, 'utf8')
}

async function currentGitStatus() {
  try {
    const result = await execFileAsync('git', ['status', '--short'], { windowsHide: true })
    return result.stdout
  } catch (error) {
    return String(error.stdout || error.stderr || error.message || '')
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.prompt) {
    throw new Error('Usage: node scripts/prompt-preflight.mjs --prompt prompt.md [--queue-files item1.md,item2.md] [--json]')
  }

  const [prompt, gitStatus, ...queueContents] = await Promise.all([
    readFile(args.prompt, 'utf8'),
    args.gitStatusFile ? readFile(args.gitStatusFile, 'utf8') : currentGitStatus(),
    ...args.queueFiles.map((file) => readOptional(file)),
  ])

  const preflight = buildCollisionPreflight({
    prompt,
    gitStatus,
    queueItems: queueContents.map((content, index) => ({
      path: args.queueFiles[index],
      content,
    })),
  })

  if (args.json) {
    console.log(JSON.stringify(preflight, null, 2))
  } else {
    process.stdout.write(formatCollisionPreflight(preflight))
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
