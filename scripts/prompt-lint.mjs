#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { stdin } from 'node:process'
import {
  buildRepairTemplate,
  formatPromptLintReport,
  lintPrompt,
} from './lib/prompt-lint-core.mjs'

function parseArgs(argv) {
  const args = {
    file: null,
    stdin: false,
    json: false,
    strict: false,
    repairTemplate: false,
    threshold: 85,
    mode: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--file') {
      args.file = argv[++index]
    } else if (arg === '--stdin') {
      args.stdin = true
    } else if (arg === '--json') {
      args.json = true
    } else if (arg === '--strict') {
      args.strict = true
    } else if (arg === '--repair-template') {
      args.repairTemplate = true
    } else if (arg === '--threshold') {
      args.threshold = Number(argv[++index])
    } else if (arg === '--mode') {
      args.mode = argv[++index]
    } else if (!arg.startsWith('-') && !args.file) {
      args.file = arg
    }
  }

  return args
}

async function readStdin() {
  const chunks = []
  for await (const chunk of stdin) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function readPrompt(args) {
  if (args.stdin) {
    return readStdin()
  }

  if (args.file) {
    return readFile(args.file, 'utf8')
  }

  throw new Error('Usage: node scripts/prompt-lint.mjs --file prompt.md [--strict] [--json]')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const prompt = await readPrompt(args)
  const result = lintPrompt(prompt, {
    mode: args.mode,
    threshold: Number.isFinite(args.threshold) ? args.threshold : 85,
  })
  const repairTemplate = args.repairTemplate
    ? buildRepairTemplate(result, {
        mode: args.mode ?? result.mode,
        originalPrompt: prompt,
      })
    : null

  if (args.json) {
    console.log(
      JSON.stringify(
        repairTemplate
          ? {
              ...result,
              repairTemplate,
            }
          : result,
        null,
        2,
      ),
    )
  } else {
    process.stdout.write(formatPromptLintReport(result))
    if (repairTemplate) {
      process.stdout.write(`\n${repairTemplate}`)
    }
  }

  if (args.strict && !result.passed) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
