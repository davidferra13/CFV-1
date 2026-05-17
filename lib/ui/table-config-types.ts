// Dense Tables, Lists, Filters & Bulk Actions - Type Definitions

/** Display density for table views */
export type TableDensity = 'compact' | 'normal' | 'spacious'

/** Sort direction */
export type SortDirection = 'asc' | 'desc'

/** Column configuration for a table */
export type ColumnConfig = {
  key: string
  label: string
  visible: boolean
  width?: number
  sortable: boolean
  filterable: boolean
  order: number
}

/** Persisted table preference for a chef */
export type TablePreference = {
  id: string
  tenantId: string
  chefId: string
  tableId: string
  columns: ColumnConfig[]
  pageSize: number
  density: TableDensity
  sortColumn: string | null
  sortDirection: SortDirection | null
  createdAt: string
  updatedAt: string
}

/** Saved filter preset for a table */
export type FilterPreset = {
  id: string
  tenantId: string
  chefId: string
  tableId: string
  name: string
  filters: Record<string, unknown>
  isDefault: boolean
  createdAt: string
}

/** Log entry for a bulk action */
export type BulkActionLog = {
  id: string
  tenantId: string
  tableId: string
  action: string
  entityIds: string[]
  result: Record<string, unknown> | null
  performedBy: string
  performedAt: string
}

/** Aggregate stats for table configuration usage */
export type TableConfigSummary = {
  totalTables: number
  customized: number
  withFilters: number
  bulkActionsUsed: number
}
