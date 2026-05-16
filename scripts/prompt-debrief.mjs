#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { analyzePromptDebrief, formatPromptDebrief } from './lib/prompt-debrief-core.mjs'

function parseArgs(argv) {
  const args = {
    report: null,
    prompt: null,
    out: null,
    title: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--report') {
      args.report = argv[++index]
    } else if (arg === '--prompt') {
      args.prompt = argv[++index]
    } else if (arg === '--out') {
      args.out = argv[++index]
    } else if (arg === '--title') {
      args.title = argv[++index]
    } else if (!arg.startsWith('-') && !args.report) {
      args.report = arg
    } else if (!arg.startsWith('-') && !args.prompt) {
      args.prompt = arg
    } else if (!arg.startsWith('-') && !args.out) {
      args.out = arg
    }
  }

  return args
}

function defaultOutPath(reportPath) {
  const base = path.basename(reportPath, path.extname(reportPath)).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return path.join('docs', 'prompts', 'generated', `${base || 'prompt'}-debrief.md`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.report) {
    throw new Error('Usage: node scripts/prompt-debrief.mjs --report final-report.md [--prompt prompt.md] [--out path]')
  }

  const report = await readFile(args.report, 'utf8')
  const prompt = args.prompt ? await readFile(args.prompt, 'utf8') : ''
  const analysis = analyzePromptDebrief({ report, prompt })
  const markdown = formatPromptDebrief(analysis, { title: args.title })
  const outPath = args.out || defaultOutPath(args.report)

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, markdown, 'utf8')
  console.log(outPath)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
