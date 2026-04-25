#!/usr/bin/env node

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { register } = require('tsx/cjs/api')
const unregister = register()
const { generateWorkContinuityArtifacts } = require(
  '../lib/work-continuity/build-index.ts'
)

try {
  const index = generateWorkContinuityArtifacts(process.cwd())
  console.log(
    `Generated work continuity index: ${index.items.length} items, ${index.warnings.length} warnings.`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  unregister()
}
