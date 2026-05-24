export interface TenantContext {
  tenantId: string
  chefId: string
}

export interface TenantScopedRecord {
  tenantId: string
}

export interface TenantValidationResult {
  valid: boolean
  invalidRecords: Array<{ id: string; tenantId: string }>
}

export type TenantScopedQuery<T> = T & { tenantId: string }
