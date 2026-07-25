// Make migrations re-runnable.
//
// These files apply once against a virgin database and then fail forever after,
// because they add columns, constraints, triggers, types and indexes without
// guards. That makes "did this migration run?" unanswerable on a database whose
// ledger was lost. Every transform here is shape-preserving: the object created
// is identical, only the guard is added.
//
//   node scripts/make-migrations-idempotent.mjs <file.sql> [...]   # rewrites in place
//   node scripts/make-migrations-idempotent.mjs --dry <file.sql>   # prints what would change
import { readFileSync, writeFileSync } from 'node:fs'

const DRY = process.argv.includes('--dry')
const files = process.argv.slice(2).filter((a) => a !== '--dry')

// ALTER TABLE ... ADD COLUMN foo  ->  ADD COLUMN IF NOT EXISTS foo
const addColumn = (sql) =>
  sql.replace(/\bADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)(?=["a-z_])/gi, 'ADD COLUMN IF NOT EXISTS ')

// CREATE [UNIQUE] INDEX foo  ->  CREATE [UNIQUE] INDEX IF NOT EXISTS foo
const createIndex = (sql) =>
  sql.replace(
    /\bCREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS|CONCURRENTLY)(?=["a-z_])/gi,
    (_m, unique) => `CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS `
  )

// CREATE TABLE foo  ->  CREATE TABLE IF NOT EXISTS foo
const createTable = (sql) =>
  sql.replace(/\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)(?=["a-z_])/gi, 'CREATE TABLE IF NOT EXISTS ')

// ALTER TABLE t ... ADD CONSTRAINT c  ->  drop c first, so the add always applies
function addConstraint(sql) {
  return sql.replace(
    /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z0-9_."]+)([^;]*?)\bADD\s+CONSTRAINT\s+([a-z0-9_"]+)/gis,
    (match, table, between, name) => {
      // Only safe for a single-clause ALTER: a DROP emitted ahead of a multi-clause
      // statement would not pair with the right table.
      if (/,\s*$/.test(between.trim()) || /\bADD\s+(COLUMN|CONSTRAINT)\b/i.test(between)) return match
      return `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${name};\n${match}`
    }
  )
}

// CREATE TRIGGER x ... ON t  ->  drop x on t first
function createTrigger(sql) {
  return sql.replace(
    /CREATE\s+TRIGGER\s+([a-z0-9_"]+)([\s\S]*?)\bON\s+([a-z0-9_."]+)/gi,
    (match, name, between, table) =>
      `DROP TRIGGER IF EXISTS ${name} ON ${table};\n${match}`
  )
}

// CREATE TYPE x AS ENUM (...)  ->  skipped when the type already exists
function createType(sql) {
  const wrap = (whole, name, values) => {
    const bare = name.replace(/"/g, '')
    // Already guarded on an earlier pass (or by hand).
    if (sql.includes(`typname = '${bare}'`)) return whole
    return `DO $idem$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${bare}') THEN\n    CREATE TYPE ${name} AS ENUM (${values});\n  END IF;\nEND\n$idem$;`
  }

  // Multi-line enum: value comments routinely contain ")", so the body cannot be matched
  // by "anything but a paren". It ends at the ");" sitting on its own line.
  let out = sql.replace(
    /CREATE\s+TYPE\s+([a-z0-9_"]+)\s+AS\s+ENUM\s*\(([\s\S]*?)\n\s*\)\s*;/gi,
    (whole, name, values) => wrap(whole, name, `${values}\n`)
  )
  // Single-line enum.
  out = out.replace(
    /CREATE\s+TYPE\s+([a-z0-9_"]+)\s+AS\s+ENUM\s*\(([^)\n]*)\)\s*;/gi,
    (whole, name, values) => wrap(whole, name, values)
  )
  return out
}

// CREATE POLICY x ON t  ->  drop x on t first
function createPolicy(sql) {
  return sql.replace(
    /CREATE\s+POLICY\s+("[^"]+"|[a-z0-9_]+)\s+ON\s+([a-z0-9_."]+)/gi,
    (match, name, table) => `DROP POLICY IF EXISTS ${name} ON ${table};\n${match}`
  )
}

const TRANSFORMS = [
  addColumn,
  createIndex,
  createTable,
  addConstraint,
  createTrigger,
  createType,
  createPolicy,
]

let changed = 0
for (const file of files) {
  const original = readFileSync(file, 'utf8')
  // A file with a function body may contain DDL as dynamic SQL inside that body, where a
  // guard emitted at file level would land outside the statement it is meant to protect.
  // Constraint guards are the risky ones, so only those are held back.
  const hasBody = /\$\$/.test(original)
  const active = hasBody ? TRANSFORMS.filter((t) => t !== addConstraint) : TRANSFORMS

  let out = original
  for (const t of active) out = t(out)

  if (out === original) {
    console.log(`unchanged  ${file}`)
    continue
  }
  changed++
  console.log(`rewritten  ${file}${hasBody ? '  (body present: constraint/type guards skipped)' : ''}`)
  if (!DRY) writeFileSync(file, out)
}
console.log(`\n${changed}/${files.length} files ${DRY ? 'would be ' : ''}rewritten`)
