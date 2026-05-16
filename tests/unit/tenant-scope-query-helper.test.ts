import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createTenantScope } from '../../lib/db/tenant-scope.js'

type RecordedCall = {
  method: string
  args: unknown[]
}

class QueryRecorder {
  calls: RecordedCall[] = []

  eq(column: string, value: unknown) {
    this.calls.push({ method: 'eq', args: [column, value] })
    return this
  }

  insert(values: Record<string, unknown>) {
    this.calls.push({ method: 'insert', args: [values] })
    return this
  }

  upsert(values: Record<string, unknown>) {
    this.calls.push({ method: 'upsert', args: [values] })
    return this
  }

  update(values: Record<string, unknown>) {
    this.calls.push({ method: 'update', args: [values] })
    return this
  }

  delete() {
    this.calls.push({ method: 'delete', args: [] })
    return this
  }
}

describe('tenant-safe query helper', () => {
  it('requires a non-null tenant id', () => {
    assert.throws(
      () => createTenantScope({ tenantId: null as unknown as string, scopeColumn: 'chef_id' }),
      /missing tenant context/
    )
  })

  it('stamps insert values with the explicit scope column', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })

    assert.deepEqual(scope.stamp({ name: 'Market' }), {
      name: 'Market',
      chef_id: 'chef-1',
    })
  })

  it('rejects conflicting caller-provided scope values', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })

    assert.throws(() => scope.stamp({ name: 'Market', chef_id: 'chef-2' }), /Conflicting/)
    assert.throws(() => scope.stamp({ name: 'Market', tenant_id: 'tenant-2' }), /Unexpected/)
  })

  it('adds tenant scope to reads', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })
    const query = new QueryRecorder()

    scope.apply(query)

    assert.deepEqual(query.calls, [{ method: 'eq', args: ['chef_id', 'chef-1'] }])
  })

  it('scopes byId with id plus tenant scope', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })
    const query = new QueryRecorder()

    scope.byId(query, 'vendor-1')

    assert.deepEqual(query.calls, [
      { method: 'eq', args: ['id', 'vendor-1'] },
      { method: 'eq', args: ['chef_id', 'chef-1'] },
    ])
  })

  it('stamps insert and upsert helper writes', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })
    const insertQuery = new QueryRecorder()
    const upsertQuery = new QueryRecorder()

    scope.insert(insertQuery, { name: 'Market' })
    scope.upsert(upsertQuery, { name: 'Market' })

    assert.deepEqual(insertQuery.calls, [
      { method: 'insert', args: [{ name: 'Market', chef_id: 'chef-1' }] },
    ])
    assert.deepEqual(upsertQuery.calls, [
      { method: 'upsert', args: [{ name: 'Market', chef_id: 'chef-1' }] },
    ])
  })

  it('scopes updateById and strips scope columns from update payloads', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })
    const query = new QueryRecorder()

    scope.updateById(query, 'vendor-1', { name: 'Market', chef_id: 'chef-1' })

    assert.deepEqual(query.calls, [
      { method: 'update', args: [{ name: 'Market' }] },
      { method: 'eq', args: ['id', 'vendor-1'] },
      { method: 'eq', args: ['chef_id', 'chef-1'] },
    ])
  })

  it('scopes deleteById with id plus tenant scope', () => {
    const scope = createTenantScope({ tenantId: 'chef-1', scopeColumn: 'chef_id' })
    const query = new QueryRecorder()

    scope.deleteById(query, 'vendor-1')

    assert.deepEqual(query.calls, [
      { method: 'delete', args: [] },
      { method: 'eq', args: ['id', 'vendor-1'] },
      { method: 'eq', args: ['chef_id', 'chef-1'] },
    ])
  })
})
