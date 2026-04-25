import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const migrationPath = path.join(
  process.cwd(),
  'database',
  'migrations',
  '20260425000006_passive_store_sync_state.sql'
)
const bootstrapMigrationPath = path.join(
  process.cwd(),
  'database',
  'migrations',
  '20260425000007_passive_store_sync_state_bootstrap.sql'
)

test('passive store sync migration creates dirty-state table and source triggers', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8')

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.passive_product_sync_state/)
  assert.match(sql, /chef_id UUID PRIMARY KEY REFERENCES public\.chefs\(id\) ON DELETE CASCADE/)
  assert.match(sql, /dirty BOOLEAN NOT NULL DEFAULT TRUE/)
  assert.match(sql, /idx_passive_product_sync_state_dirty_requested/)
  assert.match(sql, /AFTER INSERT OR UPDATE OR DELETE ON public\.menus/)
  assert.match(sql, /AFTER INSERT OR UPDATE OR DELETE ON public\.recipes/)
  assert.match(sql, /AFTER INSERT OR UPDATE OR DELETE ON public\.events/)
})

test('passive store event dirty trigger is limited to completed event rows', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8')

  assert.match(sql, /old_completed := OLD\.status = 'completed'/)
  assert.match(sql, /new_completed := NEW\.status = 'completed'/)
  assert.match(sql, /IF NOT \(old_completed OR new_completed\) THEN/)
  assert.match(sql, /'completed_event_source_changed'/)
})

test('passive store sync bootstrap migration backfills dirty rows from existing sources', () => {
  const sql = fs.readFileSync(bootstrapMigrationPath, 'utf8')

  assert.match(sql, /INSERT INTO public\.passive_product_sync_state/)
  assert.match(sql, /SELECT\s+chefs\.id/i)
  assert.match(sql, /FROM public\.menus/)
  assert.match(sql, /COALESCE\(status, ''\) <> 'archived'/)
  assert.match(sql, /FROM public\.recipes/)
  assert.match(sql, /archived = FALSE/)
  assert.match(sql, /FROM public\.events/)
  assert.match(sql, /status = 'completed'/)
  assert.match(sql, /FROM public\.passive_products/)
  assert.match(sql, /ON CONFLICT \(chef_id\) DO UPDATE SET/)
  assert.match(sql, /last_reason = 'bootstrap_existing_passive_sources'/)
  assert.match(sql, /last_source_type = 'bootstrap'/)
})
