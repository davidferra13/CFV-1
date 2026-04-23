#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const TARGET_DIRS = [
  '.openclaw-build/lib',
  '.openclaw-build/services',
  'scripts/openclaw-pull',
  'scripts/openclaw-archive-digester/lib',
  'scripts/openclaw-archive-digester/services',
]
const SKIP_SEGMENTS = new Set(['patches', 'node_modules'])
const CODE_EXTENSIONS = new Set(['.js', '.mjs'])
const FORBIDDEN_LOCAL_MODEL_PATTERNS = [
  { label: 'nomic-embed-text', regex: /\bnomic-embed-text\b/i },
  { label: 'llama', regex: /\bllama(?:[-.:]|\b)/i },
  { label: 'mistral', regex: /\bmistral(?:[-.:]|\b)/i },
  { label: 'mixtral', regex: /\bmixtral(?:[-.:]|\b)/i },
  { label: 'qwen', regex: /\bqwen(?:[-.:]|\b)/i },
  { label: 'phi', regex: /\bphi(?:[-.:]|\b)/i },
  { label: 'deepseek', regex: /\bdeepseek(?:[-.:]|\b)/i },
  { label: 'gemma3', regex: /\bgemma3(?:[-.:]|\b)/i },
]

function shouldInspect(filePath) {
  const ext = path.extname(filePath)
  if (!CODE_EXTENSIONS.has(ext)) return false
  const segments = filePath.split(/[\\/]+/)
  return !segments.some((segment) => SKIP_SEGMENTS.has(segment))
}

function walk(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_SEGMENTS.has(entry.name)) walk(fullPath, files)
      continue
    }
    if (shouldInspect(fullPath)) files.push(fullPath)
  }

  return files
}

function isLocalModelContext(line) {
  return (
    line.includes('OLLAMA') ||
    line.includes('OPENCLAW_LOCAL_MODEL') ||
    line.includes('LOCAL_MODEL') ||
    line.includes('TEXT_MODEL') ||
    line.includes('VISION_MODEL') ||
    line.includes('/api/generate') ||
    line.includes('/api/chat') ||
    line.includes('/api/embeddings') ||
    line.includes('model:')
  )
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

const findings = []
for (const targetDir of TARGET_DIRS) {
  const absoluteDir = path.join(ROOT, targetDir)
  for (const filePath of walk(absoluteDir)) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      const lower = line.toLowerCase()
      if (!isLocalModelContext(line)) return

      for (const token of FORBIDDEN_LOCAL_MODEL_PATTERNS) {
        if (token.regex.test(lower)) {
          findings.push({
            file: relative(filePath),
            line: index + 1,
            token: token.label,
            text: line.trim(),
          })
        }
      }
    })
  }
}

if (findings.length > 0) {
  console.error('[openclaw-local-model-audit] Non-Gemma local model references found:')
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} -> ${finding.token}`)
    console.error(`    ${finding.text}`)
  }
  process.exit(1)
}

console.log('[openclaw-local-model-audit] PASS - OpenClaw local model references are Gemma-only')
