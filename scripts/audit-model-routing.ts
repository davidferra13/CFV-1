#!/usr/bin/env npx tsx
// Audit: Direct Provider Imports
//
// Scans the codebase for direct imports of AI provider parsers
// outside the dispatch layer. These should eventually be migrated
// to use dispatch() instead.
//
// Usage: npx tsx scripts/audit-model-routing.ts
//
// Exit codes:
//   0 = no violations (or --report mode)
//   1 = violations found (when --strict is passed)

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// Files that are ALLOWED to import providers directly
// (the dispatch layer itself, the provider configs, and tests)
const ALLOWED_PATHS = [
  'lib/ai/dispatch/', // The dispatch layer itself
  'lib/ai/providers.ts', // Provider configuration
  'lib/ai/parse-ollama.ts', // Adapter (imported by dispatch)
  'lib/ai/parse-groq.ts', // Adapter (imported by dispatch)
  'lib/ai/parse-github-models.ts', // Adapter (imported by dispatch)
  'lib/ai/parse-workers-ai.ts', // Adapter (imported by dispatch)
  'lib/ai/gemini-service.ts', // Adapter (Gemini has its own SDK pattern)
  'lib/ai/ollama-errors.ts', // Error types
  'lib/ai/ollama-health.ts', // Health checks
  'lib/ai/ollama-wake.ts', // Wake/sleep
  'lib/ai/ollama-cache.ts', // Cache layer
  'lib/ai/llm-router.ts', // Existing Ollama router (legacy)
  'lib/ai/with-ai-fallback.ts', // Formula-first wrapper
  'lib/ai/ai-metrics.ts', // Metrics
  'scripts/', // Scripts are allowed
  'tests/', // Tests are allowed
  '__tests__/', // Tests are allowed
  '.test.', // Test files anywhere
  '.spec.', // Spec files anywhere
]

// Patterns that indicate a direct provider import
const DIRECT_IMPORT_PATTERNS = [
  /from\s+['"].*parse-ollama['"]/,
  /from\s+['"].*parse-groq['"]/,
  /from\s+['"].*parse-github-models['"]/,
  /from\s+['"].*parse-workers-ai['"]/,
  /from\s+['"].*gemini-service['"]/,
  /import.*parseWithOllama/,
  /import.*parseWithGroq/,
  /import.*parseWithGitHubModels/,
  /import.*parseWithWorkersAi/,
  // Dynamic imports
  /await\s+import\(['"].*parse-ollama['"]\)/,
  /await\s+import\(['"].*parse-groq['"]\)/,
  /await\s+import\(['"].*parse-github-models['"]\)/,
  /await\s+import\(['"].*parse-workers-ai['"]\)/,
]

interface Violation {
  file: string
  line: number
  content: string
  provider: string
}

function walkDir(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          walkDir(fullPath, files)
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          files.push(fullPath)
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return files
}

function isAllowed(filePath: string): boolean {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  return ALLOWED_PATHS.some((allowed) => rel.startsWith(allowed) || rel.includes(allowed))
}

function detectProvider(line: string): string {
  if (/ollama/i.test(line)) return 'Ollama'
  if (/groq/i.test(line)) return 'Groq'
  if (/github.models/i.test(line)) return 'GitHub Models'
  if (/workers.ai/i.test(line)) return 'Workers AI'
  if (/gemini/i.test(line)) return 'Gemini'
  return 'unknown'
}

function audit(): Violation[] {
  const violations: Violation[] = []
  const files = walkDir(ROOT)

  for (const filePath of files) {
    if (isAllowed(filePath)) continue

    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      continue
    }

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const pattern of DIRECT_IMPORT_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: relative(ROOT, filePath).replace(/\\/g, '/'),
            line: i + 1,
            content: line.trim(),
            provider: detectProvider(line),
          })
          break // One violation per line is enough
        }
      }
    }
  }

  return violations
}

// ── Main ──
const isStrict = process.argv.includes('--strict')
const violations = audit()

if (violations.length === 0) {
  console.log('No direct provider imports found outside the dispatch layer.')
  process.exit(0)
}

console.log(`\nFound ${violations.length} direct provider import(s) outside dispatch layer:\n`)

// Group by provider
const byProvider: Record<string, Violation[]> = {}
for (const v of violations) {
  if (!byProvider[v.provider]) byProvider[v.provider] = []
  byProvider[v.provider].push(v)
}

for (const [provider, provViolations] of Object.entries(byProvider)) {
  console.log(`  ${provider} (${provViolations.length}):`)
  for (const v of provViolations) {
    console.log(`    ${v.file}:${v.line}`)
    console.log(`      ${v.content}`)
  }
  console.log()
}

console.log('These files should be migrated to use dispatch() from lib/ai/dispatch.')
console.log('See docs/ai-model-governance.md for the migration guide.\n')

if (isStrict) {
  console.log('STRICT MODE: Failing with exit code 1.')
  process.exit(1)
} else {
  console.log('(Run with --strict to fail CI on violations)')
  process.exit(0)
}
