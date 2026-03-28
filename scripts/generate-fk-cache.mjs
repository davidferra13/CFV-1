#!/usr/bin/env node

// Generates lib/db/fk-map.ts from the current database schema.
// Run after any migration that adds or changes foreign keys.
// Usage: npm run db:fk-cache

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CONTAINER = 'chefflow_postgres'
const OUTPUT = resolve('lib/db/fk-map.ts')

const sql = `
SELECT DISTINCT ON (tc.table_name, ccu.table_name)
  tc.table_name || '::' || ccu.table_name || '::' || kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, ccu.table_name;
`.trim()

const raw = execSync(`docker exec ${CONTAINER} psql -U postgres -t -A -c "${sql}"`, {
  encoding: 'utf-8',
  timeout: 120_000,
}).trim()

const lines = raw.split('\n').filter(Boolean)
const entries = []

for (const line of lines) {
  const [source, target, column] = line.split('::')
  if (source && target && column) {
    entries.push(`  "${source}::${target}": "${column}",`)
  }
}

const content = [
  '// Auto-generated FK map - run `npm run db:fk-cache` to regenerate after schema changes',
  `// Generated: ${new Date().toISOString()}`,
  '//',
  '// Maps "source_table::target_table" -> fk_column_name',
  '// Used by lib/db/compat.ts to resolve JOIN columns without querying information_schema at runtime.',
  '',
  'export const FK_MAP: Record<string, string> = {',
  ...entries,
  '}',
  '',
].join('\n')

writeFileSync(OUTPUT, content, 'utf-8')
console.log(`[fk-cache] Generated ${entries.length} FK mappings -> ${OUTPUT}`)
