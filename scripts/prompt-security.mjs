#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { buildSecurityAppendix } from './lib/prompt-workflow-core.mjs'

function parseArgs(argv) {
  const args = {
    file: null,
    text: '',
    json: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--file') args.file = argv[++index]
    else if (arg === '--text') args.text = argv[++index]
    else if (arg === '--json') args.json = true
    else if (!arg.startsWith('-') && !args.file) args.file = arg
    else if (!arg.startsWith('-') && !args.text) args.text = arg
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const text = args.file ? await readFile(args.file, 'utf8') : args.text
  if (!text) {
    throw new Error('Usage: node scripts/prompt-security.mjs --file prompt.md OR --text "server action..."')
  }

  const result = buildSecurityAppendix(text)
  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    process.stdout.write(`${result.appendix.trim()}\n`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
