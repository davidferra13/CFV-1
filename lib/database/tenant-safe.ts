import { eq, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import type { TenantValidationResult } from './tenant-safe-types'

type TableWithTenant = { tenantId: PgColumn }

export function withTenant<T extends TableWithTenant>(table: T, tenantId: string): SQL {
  return eq(table.tenantId, tenantId)
}

export function assertTenantOwnership(record: { tenantId: string | null }, tenantId: string): void {
  if (record.tenantId !== tenantId) {
    throw new Error('Tenant access denied')
  }
}

export function validateTenantAccess(
  records: Array<{ tenantId: string | null; id?: string }>,
  tenantId: string
): TenantValidationResult {
  const invalidRecords: Array<{ id: string; tenantId: string }> = []
  for (const record of records) {
    if (record.tenantId !== tenantId) {
      invalidRecords.push({
        id: record.id ?? 'unknown',
        tenantId: record.tenantId ?? 'null',
      })
    }
  }
  return { valid: invalidRecords.length === 0, invalidRecords }
}
