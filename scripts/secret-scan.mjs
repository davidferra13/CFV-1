#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { extname } from 'node:path'

const SECRET_PATTERNS = [
  {
    name: 'Stripe secret key',
    regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    name: 'Stripe restricted key',
    regex: /\brk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    name: 'Stripe webhook secret',
    regex: /\bwhsec_[A-Za-z0-9]{16,}\b/g,
  },
  {
    name: 'GitHub PAT',
    regex: /\bghp_[A-Za-z0-9]{36}\b/g,
  },
  {
    name: 'Slack token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    name: 'OpenAI key',
    regex: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g,
  },
]

const SKIP_PATH_PREFIXES = [
  '.next/',
  '.next-dev/',
  '.next-staging/',
  'node_modules/',
  'playwright-report/',
  'test-results/',
  'coverage/',
]

const SKIP_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
  '.mp4',
  '.mp3',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.db',
  '.sqlite',
  '.lock',
  '.avif',
])

const SAFE_CONTEXT_MARKERS = [
  'example',
  'placeholder',
  'redacted',
  'dummy',
  'sample',
  'your_',
  'your-',
  'xxxx',
  '***',
  '<secret>',
]

function listGitFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  })
  return out
    .toString('utf8')
    .split('\0')
    .map((value) => value.trim())
    .filter(Boolean)
}

function shouldSkipPath(filePath) {
  // Skip all Next.js build output variants: .next/, .next-dev/, .next-verify-*, etc.
  if (filePath.startsWith('.next')) return true
  if (SKIP_PATH_PREFIXES.some((prefix) => filePath.startsWith(prefix))) return true
  return SKIP_EXTENSIONS.has(extname(filePath).toLowerCase())
}

function isProbablyBinary(buffer) {
  const sampleLength = Math.min(buffer.length, 4096)
  for (let i = 0; i < sampleLength; i += 1) {
    if (buffer[i] === 0) return true
  }
  return false
}

function hasSafeContext(line) {
  const normalized = line.toLowerCase()
  return SAFE_CONTEXT_MARKERS.some((marker) => normalized.includes(marker))
}

function scanText(filePath, text) {
  const findings = []
  const lines = text.split(/\r?\n/)

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    if (!line) continue
    if (hasSafeContext(line)) continue

    for (const pattern of SECRET_PATTERNS) {
      pattern.regex.lastIndex = 0
      let match
      while ((match = pattern.regex.exec(line)) !== null) {
        findings.push({
          filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          type: pattern.name,
          preview: match[0].slice(0, 12) + '...',
        })
      }
    }
  }

  return findings
}

function main() {
  const files = listGitFiles()
  const findings = []

  for (const filePath of files) {
    if (shouldSkipPath(filePath)) continue

    let buffer
    try {
      buffer = readFileSync(filePath)
    } catch {
      continue
    }

    if (isProbablyBinary(buffer)) continue

    const text = buffer.toString('utf8')
    findings.push(...scanText(filePath, text))
  }

  if (findings.length === 0) {
    console.log('secret-scan: PASS (no high-confidence secrets detected)')
    return
  }

  console.error('secret-scan: FAIL (potential secrets detected)')
  for (const finding of findings.slice(0, 100)) {
    console.error(
      `- ${finding.filePath}:${finding.line}:${finding.column} [${finding.type}] ${finding.preview}`
    )
  }
  if (findings.length > 100) {
    console.error(`- ...and ${findings.length - 100} more`)
  }
  process.exitCode = 1
}

main()
