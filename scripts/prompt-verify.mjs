#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { formatVerificationRecommendation, recommendVerification } from './lib/prompt-workflow-core.mjs'

function parseArgs(argv) {
  const args = {
    file: null,
    files: [],
    json: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--file') args.file = argv[++index]
    else if (arg === '--files') args.files = argv[++index].split(',').map((file) => file.trim()).filter(Boolean)
    else if (arg === '--json') args.json = true
    else if (!arg.startsWith('-') && !args.file) args.file = arg
    else if (!arg.startsWith('-') && args.files.length === 0)
      args.files = arg.split(',').map((file) => file.trim()).filter(Boolean)
  }

  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const text = args.file ? await readFile(args.file, 'utf8') : ''
  const recommendation = recommendVerification({
    text,
    files: args.files,
  })

  if (args.json) {
    console.log(JSON.stringify(recommendation, null, 2))
  } else {
    process.stdout.write(formatVerificationRecommendation(recommendation))
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
