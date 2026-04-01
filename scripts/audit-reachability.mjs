import fs from 'fs'
import path from 'path'

const root = process.cwd().replace(/\\/g, '/')
const prodDirs = ['app', 'components', 'lib', 'hooks']
const allDirs = [...prodDirs, 'scripts', 'tests']
const targetDirs = ['components', 'lib', 'hooks']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function parseArgs(argv) {
  const args = { json: false, limit: 12 }

  for (const arg of argv) {
    if (arg === '--json') {
      args.json = true
      continue
    }

    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10)
      if (Number.isFinite(value) && value > 0) {
        args.limit = value
      }
    }
  }

  return args
}

function collectFiles(directories) {
  const files = []

  function walk(dir) {
    if (!fs.existsSync(dir)) return

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }

      if (extensions.has(path.extname(entry.name))) {
        files.push(full.replace(/\\/g, '/'))
      }
    }
  }

  for (const dir of directories) walk(dir)
  return files
}

function buildCanonicalIndex(files) {
  const canonical = new Map()

  for (const file of files) {
    const abs = `${root}/${file}`.replace(/\/+/g, '/')
    const withoutExt = abs.replace(/\.[^.]+$/, '')
    canonical.set(withoutExt, file)
    canonical.set(`${withoutExt}/index`, file)
  }

  return canonical
}

function resolveImport(fromFile, specifier, canonical) {
  let base = null

  if (specifier.startsWith('@/')) {
    base = `${root}/${specifier.slice(2)}`
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    base = path.resolve(root, path.dirname(fromFile), specifier).replace(/\\/g, '/')
  }

  if (!base) return null

  const probes = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    `${base}/index.mjs`,
    `${base}/index.cjs`,
  ]

  for (const probe of probes) {
    const key = probe.replace(/\.[^.]+$/, '')
    if (canonical.has(key)) return canonical.get(key)
  }

  return null
}

function buildInbound(importerFiles, universeFiles, canonical) {
  const inbound = new Map(universeFiles.map((file) => [file, new Set()]))

  for (const file of importerFiles) {
    const content = fs.readFileSync(file, 'utf8')
    const matcher =
      /(?:import|export)\s+(?:[^'"`]*?from\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g

    for (const match of content.matchAll(matcher)) {
      const specifier = match[1] || match[2]
      const target = resolveImport(file, specifier, canonical)
      if (target && inbound.has(target)) {
        inbound.get(target).add(file)
      }
    }
  }

  return inbound
}

function summarizeOrphans(prodFiles, prodInbound, allInbound, limit) {
  const report = {}

  for (const group of targetDirs) {
    const files = prodFiles.filter((file) => file.startsWith(`${group}/`))
    const orphans = files.filter((file) => (prodInbound.get(file)?.size || 0) === 0)
    const usedNowhere = []
    const usedOnlyOutsideProd = []
    const bucketCounts = new Map()

    for (const file of orphans) {
      const refs = [...(allInbound.get(file) || [])]
      const bucket = file.split('/')[1] || '(root)'
      bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1)

      if (refs.length === 0) {
        usedNowhere.push(file)
      } else {
        usedOnlyOutsideProd.push({
          file,
          refs: refs.sort(),
        })
      }
    }

    report[group] = {
      totalFiles: files.length,
      prodOrphans: orphans.length,
      usedNowhere: usedNowhere.length,
      usedOnlyOutsideProd: usedOnlyOutsideProd.length,
      topBuckets: [...bucketCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([bucket, count]) => ({ bucket, count })),
      examples: {
        usedNowhere: usedNowhere.slice(0, limit),
        usedOnlyOutsideProd: usedOnlyOutsideProd.slice(0, limit),
      },
    }
  }

  return report
}

function printTextReport(report) {
  console.log('Production Reachability Audit')
  console.log('')

  for (const group of targetDirs) {
    const entry = report[group]
    console.log(`${group}`)
    console.log(`  total files: ${entry.totalFiles}`)
    console.log(`  prod orphans: ${entry.prodOrphans}`)
    console.log(`  used nowhere: ${entry.usedNowhere}`)
    console.log(`  used only by tests/scripts: ${entry.usedOnlyOutsideProd}`)

    if (entry.topBuckets.length > 0) {
      console.log('  top buckets:')
      for (const { bucket, count } of entry.topBuckets) {
        console.log(`    ${count}  ${bucket}`)
      }
    }

    if (entry.examples.usedNowhere.length > 0) {
      console.log('  examples used nowhere:')
      for (const file of entry.examples.usedNowhere) {
        console.log(`    ${file}`)
      }
    }

    if (entry.examples.usedOnlyOutsideProd.length > 0) {
      console.log('  examples used only by tests/scripts:')
      for (const item of entry.examples.usedOnlyOutsideProd) {
        console.log(`    ${item.file}`)
        for (const ref of item.refs.slice(0, 2)) {
          console.log(`      <- ${ref}`)
        }
      }
    }

    console.log('')
  }
}

const args = parseArgs(process.argv.slice(2))
const prodFiles = collectFiles(prodDirs)
const allFiles = collectFiles(allDirs)
const canonical = buildCanonicalIndex(allFiles)
const prodInbound = buildInbound(prodFiles, allFiles, canonical)
const allInbound = buildInbound(allFiles, allFiles, canonical)
const report = summarizeOrphans(prodFiles, prodInbound, allInbound, args.limit)

if (args.json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  printTextReport(report)
}
