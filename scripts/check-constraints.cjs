#!/usr/bin/env node

/**
 * ChefFlow Architectural Constraint Checker
 *
 * Reads .constraints/*.json and checks the codebase for violations.
 * Zero dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   node scripts/check-constraints.js           # Check all files
 *   node scripts/check-constraints.js --staged   # Only check git-staged files
 *   node scripts/check-constraints.js --file <path>  # Check a single file
 *
 * Exit code 0 = all pass, 1 = failures found.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const CONSTRAINTS_DIR = path.join(ROOT, '.constraints')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadConstraint(name) {
  const filePath = path.join(CONSTRAINTS_DIR, name)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/** Recursively find files matching a glob-like pattern (simple implementation) */
function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      findFiles(fullPath, pattern, results)
    } else if (entry.isFile() && matchesPattern(entry.name, pattern)) {
      results.push(fullPath)
    }
  }
  return results
}

function matchesPattern(filename, pattern) {
  if (pattern === '*.ts') return filename.endsWith('.ts') && !filename.endsWith('.d.ts')
  if (pattern === '*.sql') return filename.endsWith('.sql')
  return filename === pattern
}

function relativePath(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/')
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

// ─── Check: Auth Guard in Server Actions (sa-auth-guard) ─────────────────────
//
// Only flags functions that BOTH:
//   (a) are exported async in a 'use server' file
//   (b) query the database via .from() — meaning they access tenant data
//   (c) do NOT call an auth guard function
//
// This avoids false positives on:
//   - AI utility functions (no DB access, called by guarded callers)
//   - Admin functions (use createAdminClient, not requireChef)
//   - Stripe/system functions (webhook context, no user session)
//   - Pure helpers that don't touch the database

function checkAuthGuards(targetFiles) {
  const violations = []
  const AUTH_FUNCTIONS = [
    'requireChef', 'requireClient', 'requireAuth',
    'requireAdmin', 'requirePartner', 'getCurrentUser'
  ]

  // Directories/file patterns that are legitimately unguarded
  const SKIP_PATTERNS = [
    'public-action', 'public_action',    // Public endpoints (no auth)
    'webhook',                            // Stripe/system webhooks
    'lib/admin/',                         // Admin functions use createAdminClient
    'lib/admin-time/',                   // Admin time tracking
    'lib/stripe/',                        // Stripe system context
    'lib/auth/',                          // Auth actions (signup/signout handle auth differently)
    'lib/cron/',                          // Cron jobs (system context)
    'lib/push/',                          // Push notification system context
    'lib/ai/gemini-service',             // AI utility (no DB access)
    'lib/ai/ace-ollama',                 // AI utility (no DB access)
    'lib/ai/parse-ollama',              // AI utility (no DB access)
    'lib/ai/llm-router',               // AI infrastructure (no DB access)
    'lib/ai/parse-brain-dump',          // AI parser (no direct DB)
    'lib/ai/parse-client.ts',           // AI parser (no direct DB)
    'lib/ai/parse-clients-bulk',        // AI parser (no direct DB)
    'lib/ai/parse-inquiry',             // AI parser (no direct DB)
    'lib/ai/parse-recipe',             // AI parser (no direct DB)
    'lib/ai/parse-csv',                // AI parser (no direct DB)
    'lib/ai/parse-document',           // AI parser (no direct DB)
    'lib/ai/command-intent-parser',    // AI parser (no direct DB)
    'lib/ai/chef-profile-actions',     // AI helper (called by guarded callers)
    'lib/ai/remy-email',               // AI email digest (called by system)
    'lib/ai/draft-actions',            // AI drafting helper (called by guarded callers)
    'lib/sms/ingest',                  // System ingest (no user session)
    'lib/scheduling/calendar-sync',    // Wrapper functions (delegate to guarded callers)
    'lib/scheduling/availability-share',// Public availability sharing
    'lib/contact/',                     // Public contact form
    'lib/directory/',                   // Public chef directory
    'lib/guest-',                       // Guest actions (unauthenticated guests)
    'lib/surveys/',                     // Survey submission (public token-based)
    'lib/testimonials/',                // Public testimonial submission
    'lib/booking/booking-settings',    // Public booking config
    'lib/community/template-sharing',  // Public template downloads
    'lib/chat/system-messages',        // System message posting (no user session)
    'lib/notifications/actions',       // Internal notification helpers
    'lib/marketing/holiday',           // Background processing
    'lib/loyalty/gift-card-purchase',  // Public purchase by session ID
    'lib/safety/recall',               // System-level recall checking
  ]

  const serverActionFiles = getServerActionFiles(targetFiles)

  for (const filePath of serverActionFiles) {
    const relPath = relativePath(filePath)

    // Skip known-safe file patterns
    if (SKIP_PATTERNS.some(p => relPath.includes(p))) continue

    const content = readFile(filePath)
    if (!content) continue

    // Find all exported async functions
    const funcRegex = /export\s+async\s+function\s+(\w+)\s*\(/g
    let match
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1]
      const funcStart = match.index

      // Extract function body (up to 3000 chars to cover larger functions)
      const afterFunc = content.slice(funcStart, funcStart + 3000)

      // Find the opening brace of the function
      const braceIdx = afterFunc.indexOf('{')
      if (braceIdx === -1) continue

      const funcBody = afterFunc.slice(braceIdx + 1)

      // Only flag if the function actually queries the database
      const queriesDb = funcBody.includes('.from(') || funcBody.includes('.rpc(')
      if (!queriesDb) continue

      // Check if any auth function is called before the DB query
      const hasAuth = AUTH_FUNCTIONS.some(fn => funcBody.includes(fn + '('))

      // Special case: functions with systemTransition parameter handle auth conditionally
      const hasSystemTransition = afterFunc.slice(0, braceIdx).includes('systemTransition')

      // Special case: functions using createAdminClient (admin context)
      const usesAdminClient = funcBody.includes('createAdminClient')

      if (!hasAuth && !hasSystemTransition && !usesAdminClient) {
        const lineNum = content.slice(0, funcStart).split('\n').length
        violations.push({
          file: relPath,
          line: lineNum,
          message: `${funcName}() queries DB via .from() but has no auth guard`
        })
      }
    }
  }

  return violations
}

// ─── Check: No export const in 'use server' files (sa-no-export-const) ───────

function checkNoExportConst(targetFiles) {
  const violations = []
  const FORBIDDEN = [
    /^export\s+const\s+/m,
    /^export\s+let\s+/m,
    /^export\s+var\s+/m,
    /^export\s+class\s+/m,
    /^export\s+enum\s+/m,
  ]

  const serverActionFiles = getServerActionFiles(targetFiles)

  for (const filePath of serverActionFiles) {
    const relPath = relativePath(filePath)
    const content = readFile(filePath)
    if (!content) continue

    // If the file has NO exported async functions, it's a pure constants/config file
    // that happens to have 'use server' — skip it entirely.
    // Also skip if the filename clearly indicates a constants/types/schema file.
    const hasExportedAsyncFn = /export\s+async\s+function/.test(content)
    const isConstantsFile = /constants|types\.ts|schemas|schema\.ts|errors\.ts|utils\.ts|colors\.ts|personality|guardrails|defs\.ts|prompt/.test(path.basename(filePath))
    if (!hasExportedAsyncFn || isConstantsFile) continue
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const regex of FORBIDDEN) {
        if (regex.test(line)) {
          // Make sure this isn't inside a comment
          const trimmed = line.trim()
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue

          violations.push({
            file: relPath,
            line: i + 1,
            message: `Forbidden export in 'use server' file: ${trimmed.slice(0, 80)}`
          })
        }
      }
    }
  }

  return violations
}

// ─── Check: No parseWithAI in private-data files (pb-no-cloud-ai-private) ────

function checkPrivacyBoundary(targetFiles) {
  const violations = []
  const constraint = loadConstraint('privacy-boundary.json')
  if (!constraint) return violations

  const rule = constraint.rules.find(r => r.id === 'pb-no-cloud-ai-private')
  if (!rule) return violations

  const forbiddenImports = rule.forbiddenImports || []
  const privateFiles = rule.inFiles || []

  for (const relFile of privateFiles) {
    const absPath = path.join(ROOT, relFile)

    // If we have a target file filter, skip files not in the filter
    if (targetFiles && !targetFiles.some(f => path.resolve(f) === path.resolve(absPath))) continue

    const content = readFile(absPath)
    if (!content) continue

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

      for (const forbidden of forbiddenImports) {
        if (line.includes(forbidden)) {
          violations.push({
            file: relFile,
            line: i + 1,
            message: `Forbidden import "${forbidden}" in private-data file`
          })
        }
      }
    }
  }

  return violations
}

// ─── Check: Migration safety — no destructive SQL (ms-no-drop) ───────────────

function checkMigrationSafety(targetFiles) {
  const violations = []
  const FORBIDDEN = ['DROP TABLE', 'DROP COLUMN', 'DELETE FROM', 'TRUNCATE']

  const migrationsDir = path.join(ROOT, 'supabase', 'migrations')
  let migrationFiles = findFiles(migrationsDir, '*.sql')

  if (targetFiles) {
    migrationFiles = migrationFiles.filter(f =>
      targetFiles.some(tf => path.resolve(tf) === path.resolve(f))
    )
  }

  for (const filePath of migrationFiles) {
    const content = readFile(filePath)
    if (!content) continue
    const relPath = relativePath(filePath)
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase()
      // Skip SQL comments
      if (line.trim().startsWith('--')) continue

      for (const forbidden of FORBIDDEN) {
        if (line.includes(forbidden)) {
          violations.push({
            file: relPath,
            line: i + 1,
            message: `Destructive SQL: "${forbidden}" found in migration`
          })
        }
      }
    }
  }

  return violations
}

// ─── Check: Migration timestamps strictly ascending (ms-timestamp-unique) ────

function checkMigrationTimestamps() {
  const migrationsDir = path.join(ROOT, 'supabase', 'migrations')
  if (!fs.existsSync(migrationsDir)) return []

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const violations = []
  const timestamps = []

  for (const file of files) {
    const match = file.match(/^(\d+)/)
    if (!match) continue
    const ts = match[1]

    if (timestamps.includes(ts)) {
      violations.push({
        file: `supabase/migrations/${file}`,
        line: 0,
        message: `Duplicate migration timestamp: ${ts}`
      })
    }
    timestamps.push(ts)
  }

  // Check ascending order
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] <= timestamps[i - 1]) {
      violations.push({
        file: `supabase/migrations/`,
        line: 0,
        message: `Non-ascending timestamp: ${timestamps[i]} <= ${timestamps[i - 1]}`
      })
    }
  }

  return violations
}

// ─── Check: FSM bypass — no direct status mutations (fsm-use-transition-fn) ──

function checkFsmBypass(targetFiles) {
  const violations = []
  // Pattern: .update({ ... status ... }) on events — outside of transitions.ts
  const SUSPICIOUS_PATTERNS = [
    /\.update\(\s*\{[^}]*status\s*:/,
    /UPDATE\s+events\s+SET\s+status/i,
  ]

  const tsFiles = targetFiles || findFiles(path.join(ROOT, 'lib'), '*.ts')
    .concat(findFiles(path.join(ROOT, 'app'), '*.ts'))

  for (const filePath of tsFiles) {
    const relPath = relativePath(filePath)

    // Skip the transition function itself
    if (relPath.includes('events/transitions')) continue
    // Skip migration files (they may set initial status)
    if (relPath.includes('migrations/')) continue
    // Skip type files
    if (relPath.endsWith('.d.ts')) continue

    const content = readFile(filePath)
    if (!content) continue

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(line)) {
          // Check if this is specifically targeting events table
          // Look at nearby lines for .from('events')
          const context = lines.slice(Math.max(0, i - 5), i + 1).join('\n')
          if (context.includes("from('events')") || context.includes('from("events")')) {
            violations.push({
              file: relPath,
              line: i + 1,
              message: `Direct status mutation on events table — must use transitionEvent()`
            })
          }
        }
      }
    }
  }

  return violations
}

// ─── Check: No AI ledger writes (fi-no-ai-ledger-writes) ────────────────────

function checkNoAiLedgerWrites(targetFiles) {
  const violations = []
  const FORBIDDEN = ['appendLedgerEntry']

  let aiFiles = findFiles(path.join(ROOT, 'lib', 'ai'), '*.ts')
  if (targetFiles) {
    aiFiles = aiFiles.filter(f =>
      targetFiles.some(tf => path.resolve(tf) === path.resolve(f))
    )
  }

  for (const filePath of aiFiles) {
    const content = readFile(filePath)
    if (!content) continue
    const relPath = relativePath(filePath)
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue

      for (const forbidden of FORBIDDEN) {
        if (line.includes(forbidden)) {
          violations.push({
            file: relPath,
            line: i + 1,
            message: `AI code importing/calling "${forbidden}" — violates AI_POLICY.md hard limit #2`
          })
        }
      }
    }
  }

  return violations
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function getServerActionFiles(targetFiles) {
  let files
  if (targetFiles) {
    files = targetFiles.filter(f => f.endsWith('.ts'))
  } else {
    files = findFiles(path.join(ROOT, 'lib'), '*.ts')
      .concat(findFiles(path.join(ROOT, 'app'), '*.ts'))
  }

  return files.filter(f => {
    const content = readFile(f)
    if (!content) return false
    // Check first 5 lines for 'use server' directive
    const firstLines = content.split('\n').slice(0, 5).join('\n')
    return firstLines.includes("'use server'") || firstLines.includes('"use server"')
  })
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' })
    return output.trim().split('\n')
      .filter(f => f.length > 0)
      .map(f => path.join(ROOT, f))
  } catch {
    return null
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  let targetFiles = null
  let mode = 'all'

  if (args.includes('--staged')) {
    mode = 'staged'
    targetFiles = getStagedFiles()
    if (!targetFiles || targetFiles.length === 0) {
      console.log('No staged files to check.')
      process.exit(0)
    }
  } else if (args.includes('--file')) {
    const fileIdx = args.indexOf('--file') + 1
    if (fileIdx < args.length) {
      const filePath = path.resolve(args[fileIdx])
      targetFiles = [filePath]
      mode = 'single'
    }
  }

  console.log('')
  console.log('ChefFlow Constraint Check')
  console.log('='.repeat(50))
  if (mode === 'staged') console.log('Mode: staged files only')
  if (mode === 'single') console.log(`Mode: single file — ${relativePath(targetFiles[0])}`)
  console.log('')

  const checks = [
    { id: 'sa-auth-guard', name: 'Auth guard in server actions', fn: () => checkAuthGuards(targetFiles) },
    { id: 'sa-no-export-const', name: 'No export const in server files', fn: () => checkNoExportConst(targetFiles) },
    { id: 'pb-no-cloud-ai', name: 'No parseWithAI in private files', fn: () => checkPrivacyBoundary(targetFiles) },
    { id: 'ms-no-drop', name: 'No destructive SQL in migrations', fn: () => checkMigrationSafety(targetFiles) },
    { id: 'ms-timestamps', name: 'Migration timestamps ascending', fn: () => mode !== 'single' ? checkMigrationTimestamps() : [] },
    { id: 'fsm-bypass', name: 'No direct event status mutations', fn: () => checkFsmBypass(targetFiles) },
    { id: 'fi-no-ai-ledger', name: 'No AI ledger writes', fn: () => checkNoAiLedgerWrites(targetFiles) },
  ]

  let totalPass = 0
  let totalFail = 0
  const allViolations = []

  for (const check of checks) {
    try {
      const violations = check.fn()
      if (violations.length === 0) {
        console.log(`  [PASS] ${check.id}: ${check.name}`)
        totalPass++
      } else {
        console.log(`  [FAIL] ${check.id}: ${check.name} (${violations.length} violation${violations.length > 1 ? 's' : ''})`)
        for (const v of violations) {
          console.log(`         ${v.file}${v.line ? ':' + v.line : ''} — ${v.message}`)
        }
        totalFail++
        allViolations.push(...violations)
      }
    } catch (err) {
      console.log(`  [ERR]  ${check.id}: ${err.message}`)
      totalFail++
    }
  }

  console.log('')
  console.log('-'.repeat(50))
  if (totalFail === 0) {
    console.log(`All ${totalPass} checks passed.`)
  } else {
    console.log(`${totalFail} check${totalFail > 1 ? 's' : ''} failed, ${totalPass} passed. ${allViolations.length} total violation${allViolations.length > 1 ? 's' : ''}.`)
  }
  console.log('')

  process.exit(totalFail > 0 ? 1 : 0)
}

main()
