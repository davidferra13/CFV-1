/**
 * Unit tests for executeWithIdempotency in lib/mutations/idempotency.ts.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { executeWithIdempotency } from '../../lib/mutations/idempotency.js'

type IdempotencyState = {
  existingResponse: unknown
  mutationUpserts: Array<{ payload: any; options: any }>
  metricInserts: any[]
}

function createMockSupabase(existingResponse: unknown = null) {
  const state: IdempotencyState = {
    existingResponse,
    mutationUpserts: [],
    metricInserts: [],
  }

  return {
    state,
    from(table: string) {
      if (table === 'mutation_idempotency') {
        const chain = {
          select(_columns: string) {
            return chain
          },
          eq(_column: string, _value: unknown) {
            return chain
          },
          async maybeSingle() {
            return {
              data:
                state.existingResponse === null
                  ? null
                  : {
                      response_data: state.existingResponse,
                    },
            }
          },
          async upsert(payload: any, options: any) {
            state.mutationUpserts.push({ payload, options })
            return { data: null, error: null }
          },
        }
        return chain
      }

      if (table === 'qol_metric_events') {
        return {
          async insert(payload: any) {
            state.metricInserts.push(payload)
            return { data: null, error: null }
          },
        }
      }

      throw new Error(`Unexpected table in mock: ${table}`)
    },
  }
}

describe('mutations/idempotency - executeWithIdempotency', () => {
  it('runs execute directly when no idempotency key provided', async () => {
    const supabase = createMockSupabase()
    let executeCalls = 0

    const result = await executeWithIdempotency({
      supabase,
      tenantId: 'tenant-1',
      actionName: 'updateEvent',
      execute: async () => {
        executeCalls += 1
        return { ok: true, id: 'e1' }
      },
    })

    assert.equal(executeCalls, 1)
    assert.deepEqual(result, { ok: true, id: 'e1' })
    assert.equal(supabase.state.mutationUpserts.length, 0)
  })

  it('returns cached response for duplicate key and skips execute', async () => {
    const supabase = createMockSupabase({ ok: true, fromCache: true })
    let executeCalls = 0

    const result = await executeWithIdempotency({
      supabase,
      tenantId: 'tenant-1',
      actionName: 'updateEvent',
      idempotencyKey: 'idem-1',
      execute: async () => {
        executeCalls += 1
        return { ok: true, fromCache: false }
      },
    })

    assert.equal(executeCalls, 0)
    assert.deepEqual(result, { ok: true, fromCache: true })
    assert.equal(supabase.state.mutationUpserts.length, 0)
  })

  it('records duplicate_create_prevented metric for duplicate create action', async () => {
    const supabase = createMockSupabase({ id: 'new-item' })

    const result = await executeWithIdempotency({
      supabase,
      tenantId: 'tenant-1',
      actorId: 'actor-1',
      actionName: 'createInvoice',
      idempotencyKey: 'idem-2',
      execute: async () => ({ shouldNotRun: true }),
    })

    assert.deepEqual(result, { id: 'new-item' })
    assert.equal(supabase.state.metricInserts.length, 1)
    assert.equal(supabase.state.metricInserts[0].tenant_id, 'tenant-1')
    assert.equal(supabase.state.metricInserts[0].actor_id, 'actor-1')
    assert.equal(supabase.state.metricInserts[0].metric_key, 'duplicate_create_prevented')
  })

  it('executes and persists response when key is new', async () => {
    const supabase = createMockSupabase(null)
    let executeCalls = 0

    const result = await executeWithIdempotency({
      supabase,
      tenantId: 'tenant-2',
      actionName: 'updateInvoice',
      idempotencyKey: 'idem-3',
      execute: async () => {
        executeCalls += 1
        return { success: true, version: 2 }
      },
    })

    assert.equal(executeCalls, 1)
    assert.deepEqual(result, { success: true, version: 2 })
    assert.equal(supabase.state.mutationUpserts.length, 1)
    assert.equal(
      supabase.state.mutationUpserts[0].options.onConflict,
      'tenant_id,action_name,idempotency_key'
    )
    assert.equal(supabase.state.mutationUpserts[0].payload.tenant_id, 'tenant-2')
    assert.equal(supabase.state.mutationUpserts[0].payload.actor_id, null)
    assert.equal(supabase.state.mutationUpserts[0].payload.action_name, 'updateInvoice')
    assert.equal(supabase.state.mutationUpserts[0].payload.idempotency_key, 'idem-3')
    assert.deepEqual(supabase.state.mutationUpserts[0].payload.response_data, {
      success: true,
      version: 2,
    })
  })
})
