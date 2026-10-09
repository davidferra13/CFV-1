#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const listOnly = process.argv[2] === '--list'
const patterns = process.argv.slice(listOnly ? 3 : 2)
if (!patterns.length || patterns.some((pattern) => !pattern.startsWith('tests/unit/'))) {
  console.error('Expected one or more tests/unit/ file patterns')
  process.exit(2)
}

function globRegex(glob) {
  let source = '^'
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]
    if (ch === '*' && glob[i + 1] === '*' && glob[i + 2] === '/') {
      source += '(?:.*/)?'
      i += 2
    } else if (ch === '*') {
      source += '[^/]*'
    } else if (ch === '?') {
      source += '[^/]'
    } else {
      source += '.+^$(){}|[]\\'.includes(ch) ? '\\' + ch : ch
    }
  }
  return new RegExp(source + '$')
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collect(path)
    return entry.isFile() && entry.name.endsWith('.test.ts')
      ? [relative(root, path).split(sep).join('/')]
      : []
  })
}

const available = collect(join(root, 'tests', 'unit'))
const selected = new Set()
for (const pattern of patterns) {
  const regex = globRegex(pattern)
  const matches = available.filter((file) => regex.test(file))
  if (!matches.length) {
    console.error(`No test files match ${pattern}`)
    process.exit(2)
  }
  for (const file of matches) selected.add(file)
}
const files = [...selected].sort()
if (listOnly) {
  console.log(files.join('\n'))
} else {
  // Some files under tests/unit are written for Vitest (import from 'vitest',
  // vi.mock). node:test cannot load them, so they used to count as failures
  // on every run and their assertions never executed anywhere. Route each
  // file to the runner it was written for; the command fails if either does.
  const usesVitest = (file) => /from\s+['"]vitest['"]/.test(readFileSync(join(root, file), 'utf8'))
  const vitestFiles = files.filter(usesVitest)
  const nodeFiles = files.filter((file) => !vitestFiles.includes(file))
  let status = 0
  if (nodeFiles.length) {
    const result = spawnSync(
      process.execPath,
      [
        '--test',
        '--test-concurrency=4',
        '--require',
        './tests/helpers/node-react-cache.cjs',
        '--import',
        'tsx',
        ...nodeFiles,
      ],
      {
        cwd: root,
        stdio: 'inherit',
      }
    )
    if (result.error) throw result.error
    status = Math.max(status, result.status ?? 1)
  }
  if (vitestFiles.length) {
    console.log(`\n[run-node-test-globs] ${vitestFiles.length} Vitest file(s): running with vitest`)
    const vitestCli = join(root, 'node_modules', 'vitest', 'vitest.mjs')
    const result = spawnSync(process.execPath, [vitestCli, 'run', ...vitestFiles], {
      cwd: root,
      stdio: 'inherit',
    })
    if (result.error) throw result.error
    status = Math.max(status, result.status ?? 1)
  }
  process.exitCode = status
}
