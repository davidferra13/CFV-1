#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const rootDir = process.cwd()
const testRoot = resolve(rootDir, 'tests/unit')
const vitestCliPath = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
const patterns = process.argv.slice(2)

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTests(path)
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [path] : []
  }))
  return nested.flat()
}

function wildcardRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replaceAll('*', '.*')}$`)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const matchers = patterns.map(wildcardRegex)
const files = (await collectTests(testRoot))
  .filter((file) => matchers.length === 0 || matchers.some((matcher) => matcher.test(file.split(/[\\/]/).at(-1))))
  .sort()

if (files.length === 0) {
  console.error(`[run-unit-tests] No tests matched: ${patterns.join(', ') || '(all)'}`)
  process.exit(1)
}

const classified = await Promise.all(files.map(async (file) => ({
  file,
  vitest: (await readFile(file, 'utf8')).includes("from 'vitest'") ||
    (await readFile(file, 'utf8')).includes('from "vitest"'),
})))
const nodeTests = classified.filter(({ vitest }) => !vitest).map(({ file }) => relative(rootDir, file))
const vitestTests = classified.filter(({ vitest }) => vitest).map(({ file }) => relative(rootDir, file))

console.log(`[run-unit-tests] node:test=${nodeTests.length} vitest=${vitestTests.length}`)
if (nodeTests.length > 0) run(process.execPath, ['--test', '--import', 'tsx', ...nodeTests])
if (vitestTests.length > 0) run(process.execPath, [vitestCliPath, 'run', ...vitestTests])
