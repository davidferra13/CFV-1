#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { register } = require('tsx/cjs/api')
const unregister = register()
const {
  formatStartHereRecommendation,
  generateWorkContinuityArtifacts,
  validateWorkContinuityArtifactContract,
} = require('../lib/work-continuity/build-index.ts')

try {
  const rootDir = process.cwd()
  generateWorkContinuityArtifacts(rootDir)

  const index = JSON.parse(
    readFileSync(join(rootDir, 'reports/work-continuity-index.json'), 'utf8'),
  )
  const markdown = readFileSync(
    join(rootDir, 'docs/research/work-continuity-index.md'),
    'utf8',
  )
  const result = validateWorkContinuityArtifactContract({
    index,
    markdown,
    rootDir,
  })

  for (const warning of result.warnings) {
    console.warn(`[work-continuity warning] ${warning.path}: ${warning.message}`)
  }

  console.log(
    `Work continuity drift guard: ${index.items.length} items, ${result.warnings.length} warnings.`,
  )
  console.log(
    `Start Here: ${index.startHere.title} -> ${index.startHere.nextAction}`,
  )

  if (result.failures.length > 0) {
    console.error('Work continuity drift guard failed:')
    for (const failure of result.failures) {
      console.error(`- ${failure}`)
    }
    process.exitCode = 1
  } else {
    console.log(`Report recommendation: ${formatStartHereRecommendation(index)}`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  unregister()
}
