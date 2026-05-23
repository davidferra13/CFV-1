// lib/qa/domain-inventory-types.ts
// Types for domain inventory tooling

export interface DomainFile {
  path: string
  name: string
}

export interface DomainExport {
  name: string
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'unknown'
  isServerAction: boolean
}

export interface DomainEntry {
  /** Directory name under lib/ */
  name: string
  /** Relative path, e.g. lib/events */
  path: string
  fileCount: number
  exportCount: number
  actionCount: number
  files: DomainFile[]
  exports: DomainExport[]
}

export interface OrphanedDomain {
  domain: string
  path: string
  reason: string
}

export interface DuplicateExport {
  domains: string[]
  overlappingExports: string[]
  reason: string
}

export interface DomainInventoryReport {
  totalDomains: number
  totalFiles: number
  totalExports: number
  totalServerActions: number
  domains: DomainEntry[]
  orphanedDomains: OrphanedDomain[]
  duplicateExports: DuplicateExport[]
  runAt: string
}
