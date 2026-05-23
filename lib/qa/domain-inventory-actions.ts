'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { promises as fs } from 'fs'
import path from 'path'
import type {
  DomainEntry,
  DomainExport,
  DuplicateExport,
  OrphanedDomain,
  DomainInventoryReport,
} from './domain-inventory-types'

const LIB_ROOT = path.join(process.cwd(), 'lib')
const APP_ROOT = path.join(process.cwd(), 'app')

// ---------------------------------------------------------------------------
// inventoryDomains
// Scans lib/ directories and reports file/export/action counts per domain.
// ---------------------------------------------------------------------------

export async function inventoryDomains(): Promise<DomainInventoryReport> {
  await requireAdmin()

  const runAt = new Date().toISOString()

  let domainDirs: string[] = []
  try {
    const entries = await fs.readdir(LIB_ROOT, { withFileTypes: true })
    domainDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return {
      totalDomains: 0,
      totalFiles: 0,
      totalExports: 0,
      totalServerActions: 0,
      domains: [],
      orphanedDomains: [],
      duplicateExports: [],
      runAt,
    }
  }

  const domains: DomainEntry[] = []

  for (const dir of domainDirs) {
    const domainPath = path.join(LIB_ROOT, dir)
    try {
      const files = await listTsFiles(domainPath)
      const exports: DomainExport[] = []

      for (const file of files.slice(0, 20)) {
        const fileExports = await extractExports(file.path)
        exports.push(...fileExports)
      }

      domains.push({
        name: dir,
        path: `lib/${dir}`,
        fileCount: files.length,
        exportCount: exports.length,
        actionCount: exports.filter((e) => e.isServerAction).length,
        files,
        exports: exports.slice(0, 50), // cap for JSON size
      })
    } catch {
      // Non-fatal: skip unreadable domains
    }
  }

  const orphanedDomains = await findOrphans(domains)
  const duplicateExports = findDuplicates(domains)

  const totals = domains.reduce(
    (acc, d) => ({
      files: acc.files + d.fileCount,
      exports: acc.exports + d.exportCount,
      actions: acc.actions + d.actionCount,
    }),
    { files: 0, exports: 0, actions: 0 }
  )

  return {
    totalDomains: domains.length,
    totalFiles: totals.files,
    totalExports: totals.exports,
    totalServerActions: totals.actions,
    domains,
    orphanedDomains,
    duplicateExports,
    runAt,
  }
}

// ---------------------------------------------------------------------------
// detectOrphanedDomains
// Domains with server actions but no route consumers in app/.
// ---------------------------------------------------------------------------

export async function detectOrphanedDomains(): Promise<OrphanedDomain[]> {
  await requireAdmin()

  const { domains } = await inventoryDomains()
  return findOrphans(domains)
}

// ---------------------------------------------------------------------------
// detectDuplicateDomains
// Finds overlapping exports across domains.
// ---------------------------------------------------------------------------

export async function detectDuplicateDomains(): Promise<DuplicateExport[]> {
  await requireAdmin()

  const { domains } = await inventoryDomains()
  return findDuplicates(domains)
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported as server actions)
// ---------------------------------------------------------------------------

async function findOrphans(domains: DomainEntry[]): Promise<OrphanedDomain[]> {
  const orphaned: OrphanedDomain[] = []
  const appImports = await collectAppImports()

  for (const domain of domains) {
    const domainKey = `lib/${domain.name}`
    const isConsumed = appImports.has(domainKey)
    if (!isConsumed && domain.actionCount > 0) {
      orphaned.push({
        domain: domain.name,
        path: domain.path,
        reason: `Domain has ${domain.actionCount} server actions but no app/ imports found`,
      })
    }
  }

  return orphaned
}

function findDuplicates(domains: DomainEntry[]): DuplicateExport[] {
  const exportMap = new Map<string, string[]>()

  for (const domain of domains) {
    for (const exp of domain.exports) {
      const key = exp.name.toLowerCase()
      const existing = exportMap.get(key) ?? []
      exportMap.set(key, [...existing, domain.name])
    }
  }

  const duplicates: DuplicateExport[] = []
  for (const [exportName, domainList] of exportMap.entries()) {
    if (domainList.length > 1) {
      duplicates.push({
        domains: [...new Set(domainList)],
        overlappingExports: [exportName],
        reason: `Export '${exportName}' found in multiple domains`,
      })
    }
  }

  // Merge entries that share the same domain pair
  const merged = new Map<string, DuplicateExport>()
  for (const dup of duplicates) {
    const key = dup.domains.sort().join('|')
    const existing = merged.get(key)
    if (existing) {
      existing.overlappingExports.push(...dup.overlappingExports)
    } else {
      merged.set(key, { ...dup })
    }
  }

  return Array.from(merged.values()).slice(0, 50)
}

async function listTsFiles(dir: string): Promise<{ path: string; name: string }[]> {
  const files: { path: string; name: string }[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push({ path: path.join(dir, entry.name), name: entry.name })
      }
    }
  } catch {
    // Ignore unreadable dirs
  }
  return files
}

async function extractExports(filePath: string): Promise<DomainExport[]> {
  const exports: DomainExport[] = []
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const isServerAction = content.includes("'use server'")

    const exportPattern =
      /^export\s+(async\s+function|function|class|const|let|type|interface)\s+(\w+)/gm
    let match
    while ((match = exportPattern.exec(content)) !== null) {
      const keyword = match[1].trim()
      const name = match[2]
      exports.push({
        name,
        type: keyword.includes('function')
          ? 'function'
          : keyword === 'class'
            ? 'class'
            : keyword === 'const' || keyword === 'let'
              ? 'const'
              : keyword === 'type'
                ? 'type'
                : keyword === 'interface'
                  ? 'interface'
                  : 'unknown',
        isServerAction,
      })
    }
  } catch {
    // Non-fatal
  }
  return exports
}

async function collectAppImports(): Promise<Set<string>> {
  const imports = new Set<string>()
  try {
    await walkDir(APP_ROOT, async (filePath) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const importPattern = /from\s+['"](@\/lib\/[\w/-]+)['"]/g
        let match
        while ((match = importPattern.exec(content)) !== null) {
          // Normalize: @/lib/events/actions -> lib/events
          const parts = match[1].replace('@/', '').split('/')
          if (parts.length >= 2) {
            imports.add(`${parts[0]}/${parts[1]}`)
          }
        }
      } catch {
        // Non-fatal
      }
    })
  } catch {
    // Non-fatal
  }
  return imports
}

async function walkDir(dir: string, callback: (filePath: string) => Promise<void>): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walkDir(fullPath, callback)
        } else {
          await callback(fullPath)
        }
      })
    )
  } catch {
    // Non-fatal
  }
}
