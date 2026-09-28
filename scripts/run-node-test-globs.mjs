#!/usr/bin/env node
import { readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const listOnly = process.argv[2] === '--list'
const patterns = process.argv.slice(listOnly ? 3 : 2)
if (!patterns.length || patterns.some(pattern => !pattern.startsWith('tests/unit/'))) {
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
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
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
  const matches = available.filter(file => regex.test(file))
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
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=4', '--import', 'tsx', ...files], {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
}
