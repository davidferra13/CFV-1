// Guard Supabase-storage statements so they no-op on standalone Postgres.
//
// ChefFlow stores files on the local filesystem now, so schema "storage" (and
// Supabase's "extensions") never exists here. Migrations that touch them abort,
// and because each file runs in one transaction, real schema in the same file is
// rolled back with them: 20260510000017 creates ten regulated-batch tables and
// loses all of them to a trailing bucket INSERT.
//
// Each storage-touching statement is wrapped so it runs only where the schema
// exists, leaving every other statement in the file untouched.
//
//   node scripts/guard-storage-migrations.mjs <file.sql> [...]
import { readFileSync, writeFileSync } from 'node:fs'
import { splitStatements } from './sql-split.mjs'

const files = process.argv.slice(2)

const TOUCHES_STORAGE = /\b(storage|extensions)\s*\.\s*[a-z_]+/i

for (const file of files) {
  const original = readFileSync(file, 'utf8')
  const statements = splitStatements(original)
  let guarded = 0

  const rewritten = statements
    .map((stmt) => {
      if (!TOUCHES_STORAGE.test(stmt)) return stmt
      if (stmt.includes('$cfstorage$')) return stmt // already guarded
      guarded++
      const body = stmt.trim().replace(/;\s*$/, '')
      const schema = /\bextensions\s*\./i.test(stmt) ? 'extensions' : 'storage'
      return `\nDO $cfguard$\nBEGIN\n  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = '${schema}') THEN\n    EXECUTE $cfstorage$${body}$cfstorage$;\n  END IF;\nEND\n$cfguard$;`
    })
    .join('')

  if (!guarded) {
    console.log(`unchanged  ${file}`)
    continue
  }
  writeFileSync(file, rewritten)
  console.log(`guarded ${String(guarded).padStart(2)} stmt(s)  ${file}`)
}
