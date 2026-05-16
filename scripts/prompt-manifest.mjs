#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildPromptManifest } from './lib/prompt-workflow-core.mjs'

function parseArgs(argv) {
  const args = {
    run: null,
    raw: null,
    prompt: null,
    lintScore: null,
    contextPack: null,
    queueIds: [],
    finalReport: null,
    debrief: null,
    out: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--run') args.run = argv[++index]
    else if (arg === '--raw') args.raw = argv[++index]
    else if (arg === '--prompt') args.prompt = argv[++index]
    else if (arg === '--lint-score') args.lintScore = argv[++index]
    else if (arg === '--context-pack') args.contextPack = argv[++index]
    else if (arg === '--queue-ids') args.queueIds = argv[++index].split(',').map((id) => id.trim()).filter(Boolean)
    else if (arg === '--final-report') args.finalReport = argv[++index]
    else if (arg === '--debrief') args.debrief = argv[++index]
    else if (arg === '--out') args.out = argv[++index]
    else if (!arg.startsWith('-') && !args.run) args.run = arg
    else if (!arg.startsWith('-') && !args.prompt) args.prompt = arg
    else if (!arg.startsWith('-') && args.queueIds.length === 0)
      args.queueIds = arg.split(',').map((id) => id.trim()).filter(Boolean)
    else if (!arg.startsWith('-') && !args.out) args.out = arg
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.run) {
    throw new Error('Usage: node scripts/prompt-manifest.mjs --run RUN-ID [--prompt prompt.md] [--queue-ids BQ-1,BQ-2]')
  }

  const outPath = args.out || path.join('.agents', 'build-queue', 'runs', args.run, 'prompt-manifest.md')
  const manifest = buildPromptManifest({
    runId: args.run,
    rawIdea: args.raw,
    promptPath: args.prompt,
    lintScore: args.lintScore,
    contextPackPath: args.contextPack,
    queueIds: args.queueIds,
    finalReportPath: args.finalReport,
    debriefPath: args.debrief,
  })

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, manifest, 'utf8')
  console.log(outPath)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
