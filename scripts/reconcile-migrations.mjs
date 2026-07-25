// Reconcile local Postgres against database/migrations/.
//
// The drizzle ledger (drizzle.__drizzle_migrations) is empty because this DB was
// built from a dump, so "applied" is decided by object existence, not bookkeeping:
// a migration is outstanding when a table it CREATEs is missing.
//
//   node scripts/reconcile-migrations.mjs           # dry run, prints the drift report
//   node scripts/reconcile-migrations.mjs --apply   # applies outstanding migrations
//
// Each file runs in its own transaction. A file that fails rolls back alone and is
// reported; the run continues so one bad file cannot block the rest.
import postgres from 'postgres'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { splitStatements } from './sql-split.mjs'

const DIR = path.join(process.cwd(), 'database', 'migrations')
const APPLY = process.argv.includes('--apply')
const CONN =
  process.env.DATABASE_URL ??
  'postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres'

const sql = postgres(CONN, { max: 1 })

async function loadExistingTables() {
  const rows = await sql`
    select table_schema, table_name from information_schema.tables
    where table_schema in ('public', 'auth', 'openclaw')
  `
  return new Set(rows.map((r) => `${r.table_schema}.${r.table_name}`))
}

const qualify = (name) => {
  const n = name.toLowerCase().replace(/"/g, '')
  return n.includes('.') ? n : `public.${n}`
}

function createdTables(body) {
  const stripped = body.replace(/--[^\n]*/g, '')
  const matches = [
    ...stripped.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/gi),
  ]
  return [...new Set(matches.map((m) => qualify(m[1])))]
}

// Files that create no tables (ALTERs, functions, policies) can only be judged by
// running them, so --include-noncreating opts them into the candidate set.
const INCLUDE_NONCREATING = process.argv.includes('--include-noncreating')

const before = await loadExistingTables()
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()

function outstandingSet(existing, done) {
  const out = []
  let satisfied = 0
  let noCreate = 0
  for (const file of files) {
    if (done.has(file)) continue
    const body = readFileSync(path.join(DIR, file), 'utf8')
    const creates = createdTables(body)
    if (creates.length === 0) {
      noCreate++
      if (INCLUDE_NONCREATING) out.push({ file, missing: [], body })
      continue
    }
    const missing = creates.filter((t) => !existing.has(t))
    if (missing.length > 0) {
      out.push({ file, missing, body })
      continue
    }
    // A file whose tables all exist can still be carrying functions that were never
    // created: that is how get_menu_total_component_count went missing while the menus
    // tables it belongs to were present. CREATE OR REPLACE FUNCTION is safe to re-run.
    if (INCLUDE_NONCREATING && /\bCREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b/i.test(body)) {
      out.push({ file, missing: [], body })
      continue
    }
    satisfied++
  }
  return { out, satisfied, noCreate }
}

const first = outstandingSet(before, new Set())
console.log(
  `${files.length} migrations | ${first.satisfied} satisfied | ${first.noCreate} create no tables | ${first.out.length} candidates`
)

if (!APPLY) {
  for (const m of first.out) {
    console.log(`  OUTSTANDING ${m.file}${m.missing.length ? ` -> ${m.missing.join(', ')}` : ''}`)
  }
  console.log('\nDry run. Re-run with --apply to execute.')
  process.exit(0)
}

// Fixed point: a migration that fails on a dependency may succeed once an earlier
// round creates it, so keep going until a full round applies nothing new.
const done = new Set()
let lastErrors = new Map()

for (let round = 1; ; round++) {
  const existing = await loadExistingTables()
  const { out } = outstandingSet(existing, done)
  if (out.length === 0) break

  let appliedThisRound = 0
  const errors = new Map()

  for (const m of out) {
    try {
      // CREATE INDEX CONCURRENTLY is illegal inside a transaction block, and a
      // multi-statement query is itself one implicit transaction, so these files are
      // split and sent a statement at a time. A failure mid-file can leave an invalid
      // index behind, which is the trade CONCURRENTLY always makes.
      if (/create\s+index\s+concurrently/i.test(m.body)) {
        for (const stmt of splitStatements(m.body)) {
          if (stmt.trim()) await sql.unsafe(stmt)
        }
      } else await sql.begin((tx) => [tx.unsafe(m.body)])
      done.add(m.file)
      appliedThisRound++
    } catch (err) {
      errors.set(m.file, err.message.split('\n')[0])
    }
  }

  console.log(`round ${round}: applied ${appliedThisRound}, failing ${errors.size}`)
  lastErrors = errors
  if (appliedThisRound === 0) break
}

// The retry loop breaks timestamp order: a file that fails in round 1 and succeeds in
// round 2 lands after files that supersede it. event_financial_summary is defined three
// times across the history, so whichever ran last wins, and that has to be the newest.
// Every applied file is idempotent, so one final pass in filename order settles it.
if (done.size > 0) {
  let resettled = 0
  for (const file of files) {
    if (!done.has(file)) continue
    const body = readFileSync(path.join(DIR, file), 'utf8')
    if (/create\s+index\s+concurrently/i.test(body)) continue // not transactional, already applied
    try {
      await sql.begin((tx) => [tx.unsafe(body)])
      resettled++
    } catch {
      // A file that will not re-apply cannot be reordered; it already had its effect.
    }
  }
  console.log(`settle pass: re-applied ${resettled} in filename order`)
}

const after = await loadExistingTables()
console.log(`\napplied ${done.size} | tables ${before.size} -> ${after.size}`)

if (lastErrors.size) {
  console.log(`\n${lastErrors.size} migrations still failing:`)
  for (const [file, error] of lastErrors) console.log(`  ${file}: ${error}`)
}
process.exit(lastErrors.size ? 1 : 0)
