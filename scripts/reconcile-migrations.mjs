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
    if (missing.length === 0) satisfied++
    else out.push({ file, missing, body })
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
      // CREATE INDEX CONCURRENTLY is illegal inside a transaction block, so those
      // files run unwrapped and can leave an invalid index behind if they fail.
      if (/create\s+index\s+concurrently/i.test(m.body)) await sql.unsafe(m.body)
      else await sql.begin((tx) => [tx.unsafe(m.body)])
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

const after = await loadExistingTables()
console.log(`\napplied ${done.size} | tables ${before.size} -> ${after.size}`)

if (lastErrors.size) {
  console.log(`\n${lastErrors.size} migrations still failing:`)
  for (const [file, error] of lastErrors) console.log(`  ${file}: ${error}`)
}
process.exit(lastErrors.size ? 1 : 0)
