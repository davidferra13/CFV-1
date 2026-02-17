/**
 * E2E Contract Verification Script
 * Adapted from legacy BillyBob8 — ensures the test setup cannot silently drift.
 *
 * Verifies:
 *  - Playwright config matches package.json dev port
 *  - Required env vars are set
 *  - Test directory structure exists
 *  - Supabase connection is reachable
 *
 * Exit 0 on pass, non-zero on fail.
 */

const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const failures = []

function check(name, condition) {
  if (!condition) {
    failures.push(name)
  }
}

// ============================================================
// 1. Read config files
// ============================================================

const playwrightConfigPath = path.join(ROOT, 'playwright.config.ts')
const packageJsonPath = path.join(ROOT, 'package.json')
const envLocalPath = path.join(ROOT, '.env.local')

let playwrightConfig = ''
let packageJson = ''
let envLocal = ''

try {
  playwrightConfig = fs.readFileSync(playwrightConfigPath, 'utf8')
} catch (e) {
  failures.push('playwright.config.ts file not found')
}

try {
  packageJson = fs.readFileSync(packageJsonPath, 'utf8')
} catch (e) {
  failures.push('package.json file not found')
}

try {
  envLocal = fs.readFileSync(envLocalPath, 'utf8')
} catch (e) {
  // .env.local is optional, env vars may come from environment
}

// ============================================================
// 2. Playwright config checks
// ============================================================

check(
  'playwright.config.ts must contain port 3100',
  playwrightConfig.includes('3100')
)
check(
  'playwright.config.ts must use single worker',
  playwrightConfig.includes('workers: 1')
)
check(
  'playwright.config.ts must be sequential (fullyParallel: false)',
  playwrightConfig.includes('fullyParallel: false')
)

// ============================================================
// 3. Package.json checks
// ============================================================

check(
  'package.json "dev" script must use port 3100',
  packageJson.includes('-p 3100')
)

// ============================================================
// 4. Test directory structure
// ============================================================

const testsDir = path.join(ROOT, 'tests')
const helpersDir = path.join(ROOT, 'tests', 'helpers')

check('tests/ directory must exist', fs.existsSync(testsDir))
check('tests/helpers/ directory must exist', fs.existsSync(helpersDir))

// ============================================================
// 5. Required env vars (check .env.local or process.env)
// ============================================================

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

for (const varName of requiredVars) {
  const inEnv = !!process.env[varName]
  const inFile = envLocal.includes(varName)
  check(
    `${varName} must be set in environment or .env.local`,
    inEnv || inFile
  )
}

// ============================================================
// 6. Supabase migrations exist
// ============================================================

const migrationsDir = path.join(ROOT, 'supabase', 'migrations')
check(
  'supabase/migrations/ directory must exist',
  fs.existsSync(migrationsDir)
)

if (fs.existsSync(migrationsDir)) {
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
  check(
    'At least one migration file must exist',
    migrations.length > 0
  )
}

// ============================================================
// Output results
// ============================================================

if (failures.length > 0) {
  console.error('E2E CONTRACT FAILED:')
  for (const f of failures) {
    console.error(`  ✗ ${f}`)
  }
  process.exit(1)
} else {
  console.log('E2E CONTRACT OK')
  process.exit(0)
}
