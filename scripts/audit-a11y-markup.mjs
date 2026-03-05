#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const SOURCE_ROOTS = ['app', 'components', 'pages']
const SOURCE_EXTENSIONS = new Set(['.tsx', '.jsx', '.mdx', '.html'])
const IGNORE_FILES = new Set([path.normalize('components/ui/button.tsx')])

const RULES = [
  {
    id: 'anchor-wraps-button-component',
    description: '<a> wraps <Button>',
    pattern: /<a\b[^>]*>(?:(?!<\/a>).){0,2000}<Button\b/gs,
  },
  {
    id: 'anchor-wraps-native-button',
    description: '<a> wraps <button>',
    pattern: /<a\b[^>]*>(?:(?!<\/a>).){0,2000}<button\b/gs,
  },
  {
    id: 'native-button-wraps-anchor',
    description: '<button> wraps <a>',
    pattern: /<button\b[^>]*>(?:(?!<\/button>).){0,2000}<a\b/gs,
  },
  {
    id: 'button-component-wraps-anchor',
    description: '<Button> wraps <a>',
    pattern: /<Button\b[^>]*>(?:(?!<\/Button>).){0,2000}<a\b/gs,
  },
]

function parseArgs(argv) {
  const args = { strict: false, out: null }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--strict') args.strict = true
    if (token === '--out') {
      args.out = argv[index + 1] ?? null
      index += 1
    }
  }
  return args
}

function walkFiles(rootDir) {
  const output = []
  if (!fs.existsSync(rootDir)) return output

  const queue = [rootDir]
  while (queue.length > 0) {
    const currentDir = queue.pop()
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue
        queue.push(fullPath)
        continue
      }
      const ext = path.extname(entry.name)
      if (!SOURCE_EXTENSIONS.has(ext)) continue
      output.push(fullPath)
    }
  }

  return output
}

function lineFromIndex(text, index) {
  let line = 1
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1
  }
  return line
}

function findViolations(text, filePath) {
  const violations = []
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      const index = match.index ?? 0
      const line = lineFromIndex(text, index)
      violations.push({
        file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
        line,
        rule: rule.id,
        description: rule.description,
      })
    }
  }
  return violations
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const files = SOURCE_ROOTS.flatMap((root) => walkFiles(path.resolve(process.cwd(), root)))

  const violations = []
  for (const filePath of files) {
    const relativePath = path.relative(process.cwd(), filePath)
    if (IGNORE_FILES.has(path.normalize(relativePath))) continue
    const text = fs.readFileSync(filePath, 'utf8')
    violations.push(...findViolations(text, filePath))
  }

  if (violations.length === 0) {
    console.log(`[a11y-markup] OK. Scanned ${files.length} files, no invalid nested interactive patterns.`)
  } else {
    console.log(`[a11y-markup] Found ${violations.length} issue(s) across ${files.length} files:`)
    for (const violation of violations) {
      console.log(
        `  - ${violation.file}:${violation.line} [${violation.rule}] ${violation.description}`
      )
    }
  }

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          filesScanned: files.length,
          violations,
        },
        null,
        2
      )
    )
    console.log(`[a11y-markup] Wrote report: ${outPath}`)
  }

  if (args.strict && violations.length > 0) {
    process.exit(1)
  }
}

main()
