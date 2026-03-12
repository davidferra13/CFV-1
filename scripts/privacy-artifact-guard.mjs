#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const FORBIDDEN_PREFIXES = [
  'data/email-references/generated/',
  'data/email-references/local-generated/',
  'data/access-control-reports/',
  '.auth/',
  'backups/',
]

const FORBIDDEN_PATTERNS = [
  {
    label: 'backup SQL dump',
    test: (filePath) => /^backup-.*\.sql$/i.test(filePath),
  },
  {
    label: 'tracked log file',
    test: (filePath) => /\.log$/i.test(filePath),
  },
]

function listRepoFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    }
  )

  return output
    .toString('utf8')
    .split('\0')
    .map((value) => value.trim())
    .filter(Boolean)
}

function main() {
  const findings = []

  for (const filePath of listRepoFiles()) {
    const prefix = FORBIDDEN_PREFIXES.find((candidate) => filePath.startsWith(candidate))
    if (prefix) {
      findings.push({ filePath, reason: `forbidden path prefix (${prefix})` })
      continue
    }

    const pattern = FORBIDDEN_PATTERNS.find((candidate) => candidate.test(filePath))
    if (pattern) {
      findings.push({ filePath, reason: pattern.label })
    }
  }

  if (findings.length === 0) {
    console.log('privacy-artifact-guard: PASS (no tracked or staged privacy-risk artifacts found)')
    return
  }

  console.error('privacy-artifact-guard: FAIL')
  for (const finding of findings.slice(0, 100)) {
    console.error(`- ${finding.filePath} [${finding.reason}]`)
  }
  if (findings.length > 100) {
    console.error(`- ...and ${findings.length - 100} more`)
  }
  process.exitCode = 1
}

main()
