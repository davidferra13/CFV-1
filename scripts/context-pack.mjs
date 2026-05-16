#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { buildContextPack } from './lib/context-pack-core.mjs'

const execFileAsync = promisify(execFile)
const QUEUE_ROOT = path.join('.agents', 'build-queue')
const QUEUE_STATUSES = ['active', 'in-flight', 'blocked', 'done']

function parseArgs(argv) {
  const args = {
    run: null,
    ids: [],
    out: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--run') {
      args.run = argv[++index]
    } else if (arg === '--ids') {
      args.ids = argv[++index].split(',').map((id) => id.trim()).filter(Boolean)
    } else if (arg === '--out') {
      args.out = argv[++index]
    } else if (!arg.startsWith('-') && !args.run) {
      args.run = arg
    } else if (!arg.startsWith('-') && args.ids.length === 0) {
      args.ids = arg.split(',').map((id) => id.trim()).filter(Boolean)
    } else if (!arg.startsWith('-') && !args.out) {
      args.out = arg
    }
  }

  return args
}

async function tryCommand(command, args) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 8,
      windowsHide: true,
    })
    return `${result.stdout || ''}${result.stderr || ''}`.trim()
  } catch (error) {
    return String(error.stdout || error.stderr || error.message || '').trim()
  }
}

async function findQueueItem(id) {
  for (const status of QUEUE_STATUSES) {
    const dir = path.join(QUEUE_ROOT, status)
    let entries = []
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    const match = entries.find((entry) => entry.isFile() && entry.name.includes(id))
    if (!match) {
      continue
    }

    const itemPath = path.join(dir, match.name)
    return {
      id,
      status,
      path: itemPath,
      content: await readFile(itemPath, 'utf8'),
    }
  }

  return {
    id,
    status: 'missing',
    path: 'not found',
    content: 'Queue item file was not found in active, in-flight, blocked, or done.',
  }
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.run) {
    throw new Error('Usage: node scripts/context-pack.mjs --run RUN-ID [--ids BQ-1,BQ-2] [--out path]')
  }

  const outputPath = args.out || path.join(QUEUE_ROOT, 'runs', args.run, 'context-pack.md')
  const items = await Promise.all(args.ids.map((id) => findQueueItem(id)))
  const [gitStatus, queueStatus, domainPlan, workspace] = await Promise.all([
    tryCommand('git', ['status', '--short']),
    tryCommand('node', ['.agents/skills/build-queue/scripts/build-queue.mjs', 'status']),
    tryCommand('node', ['.agents/skills/build-queue/scripts/build-queue.mjs', 'domain-plan', '--status', 'active']),
    tryCommand('node', ['.agents/skills/build-queue/scripts/build-queue.mjs', 'workspace']),
  ])
  const firePlan = await readOptional(path.join(QUEUE_ROOT, 'runs', args.run, 'fire-plan.md'))

  const markdown = buildContextPack({
    runId: args.run,
    items,
    gitStatus,
    queueStatus,
    domainPlan,
    workspace,
    firePlan,
  })

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, markdown, 'utf8')
  console.log(outputPath)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
