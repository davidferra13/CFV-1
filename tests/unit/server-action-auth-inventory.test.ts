import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildServerActionAuthInventory,
  buildServerActionMutationInventory,
  discoverServerActionFiles,
} from '@/lib/auth/server-action-inventory'

function createFixtureRoot() {
  return mkdtempSync(path.join(tmpdir(), 'cf-server-action-inventory-'))
}

function writeFixtureFile(rootDir: string, relativePath: string, source: string) {
  const targetPath = path.join(rootDir, relativePath)
  mkdirSync(path.dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, source)
}

function withFixtureRoot(run: (rootDir: string) => void) {
  const rootDir = createFixtureRoot()

  try {
    run(rootDir)
  } finally {
    rmSync(rootDir, { force: true, recursive: true })
  }
}

test('discoverServerActionFiles only returns module-level use-server files for the selected roots', () => {
  withFixtureRoot((rootDir) => {
    writeFixtureFile(
      rootDir,
      'lib/secure/actions.ts',
      `'use server'\n\nexport async function guardedAction() {\n  await requireChef()\n}\n`
    )
    writeFixtureFile(
      rootDir,
      'app/demo/actions.tsx',
      `'use server'\n\nexport async function demoAction() {\n  return true\n}\n`
    )
    writeFixtureFile(
      rootDir,
      'lib/ignore/utility.ts',
      `export async function ignoredAction() {\n  return true\n}\n`
    )

    const libOnly = discoverServerActionFiles(rootDir, ['lib']).map((filePath) =>
      path.relative(rootDir, filePath).replace(/\\/g, '/')
    )
    const allRoots = discoverServerActionFiles(rootDir).map((filePath) =>
      path.relative(rootDir, filePath).replace(/\\/g, '/')
    )

    assert.deepEqual(libOnly, ['lib/secure/actions.ts'])
    assert.deepEqual(allRoots, ['app/demo/actions.tsx', 'lib/secure/actions.ts'])
  })
})

test('buildServerActionAuthInventory classifies guarded, public, exempt, late, and missing actions', () => {
  withFixtureRoot((rootDir) => {
    writeFixtureFile(
      rootDir,
      'lib/secure/actions.ts',
      `'use server'\n\nexport async function guardedAction() {\n  await requireChef()\n  return true\n}\n`
    )
    writeFixtureFile(
      rootDir,
      'lib/public/actions.ts',
      `'use server'\n\n// public: landing-page handshake\nexport async function publicAction() {\n  return true\n}\n`
    )
    writeFixtureFile(
      rootDir,
      'lib/auth/actions.ts',
      `'use server'\n\nexport async function signInAction() {\n  return true\n}\n`
    )
    writeFixtureFile(
      rootDir,
      'lib/late/actions.ts',
      `'use server'\n\nexport async function lateAction() {\n  const first = 1\n  const second = 2\n  const third = 3\n  const fourth = 4\n  const fifth = 5\n  const sixth = 6\n  const seventh = 7\n  const eighth = 8\n  const ninth = 9\n  const tenth = 10\n  await requireAdmin()\n  return first + second + third + fourth + fifth + sixth + seventh + eighth + ninth + tenth\n}\n`
    )
    writeFixtureFile(
      rootDir,
      'app/demo/actions.tsx',
      `'use server'\n\nexport async function missingAction() {\n  return true\n}\n`
    )

    const inventory = buildServerActionAuthInventory({ rootDir })
    const byName = new Map(inventory.entries.map((entry) => [entry.functionName, entry]))

    assert.equal(inventory.totalFiles, 5)
    assert.equal(inventory.totalFunctions, 5)
    assert.equal(inventory.authGuardedFunctionCount, 2)
    assert.equal(inventory.earlyAuthFunctionCount, 1)
    assert.equal(inventory.lateAuthFunctionCount, 1)
    assert.equal(inventory.documentedPublicFunctionCount, 1)
    assert.equal(inventory.fileExemptFunctionCount, 1)
    assert.equal(inventory.missingAuthFunctionCount, 1)

    assert.equal(byName.get('guardedAction')?.classification, 'auth-guarded')
    assert.equal(byName.get('guardedAction')?.guardTiming, 'early')
    assert.equal(byName.get('publicAction')?.classification, 'documented-public')
    assert.equal(byName.get('signInAction')?.classification, 'file-exempt')
    assert.equal(byName.get('lateAction')?.classification, 'auth-guarded')
    assert.equal(byName.get('lateAction')?.guardTiming, 'late')
    assert.equal(byName.get('missingAction')?.classification, 'missing-auth')

    assert.deepEqual(inventory.rootSummary.lib, {
      authGuarded: 2,
      documentedPublic: 1,
      fileExempt: 1,
      files: 4,
      functions: 4,
      lateAuth: 1,
      missingAuth: 0,
    })
    assert.deepEqual(inventory.rootSummary.app, {
      authGuarded: 0,
      documentedPublic: 0,
      fileExempt: 0,
      files: 1,
      functions: 1,
      lateAuth: 0,
      missingAuth: 1,
    })
    assert.ok(inventory.lateAuthFunctionIds.some((id) => id.endsWith('lateAction')))
    assert.ok(inventory.missingAuthFunctionIds.some((id) => id.endsWith('missingAction')))
  })
})

test('buildServerActionMutationInventory classifies page-facing, audit-only, and exempt writes', () => {
  withFixtureRoot((rootDir) => {
    writeFixtureFile(
      rootDir,
      'lib/orders/actions.ts',
      `'use server'
import { revalidatePath } from 'next/cache'

export async function createOrder(input: { amount: number }) {
  const user = await requireChef()
  const parsed = OrderSchema.parse(input)
  await db.from('orders').insert({ tenant_id: user.tenantId, amount: parsed.amount })
  await recordPlatformEvent('order.created')
  revalidatePath('/orders')
  return { ok: true }
}

export async function updateOrderDraft(input: { tenantId: string; expected_updated_at: string; idempotencyKey: string }) {
  const user = await requireChef()
  const parsed = OrderUpdateSchema.safeParse(input)
  await executeWithIdempotency('update-order-draft', input.idempotencyKey, async () => {
    return db
      .from('orders')
      .update({ tenant_id: input.tenantId, updated_by: user.id })
      .eq('updated_at', input.expected_updated_at)
  })
  if (!parsed.success) return { ok: false }
  return redirect('/orders')
}
`
    )
    writeFixtureFile(
      rootDir,
      'lib/clients/actions.ts',
      `'use server'

export async function createClient(input: { name: string }) {
  const user = await requireChef()
  const parsed = ClientSchema.parse(input)
  await db.from('clients').insert({ tenant_id: user.tenantId, name: parsed.name })
  return { ok: true }
}
`
    )
    writeFixtureFile(
      rootDir,
      'lib/admin/audit.ts',
      `'use server'

export async function logAdminAudit() {
  await requireAdmin()
  await db.from('activity_log').insert({ action: 'audit' })
}
`
    )
    writeFixtureFile(
      rootDir,
      'lib/cron/sync-actions.ts',
      `'use server'

export async function syncOrderCache() {
  await requireAdmin()
  await db.from('orders').update({ synced_at: new Date().toISOString() })
}
`
    )

    const inventory = buildServerActionMutationInventory({ rootDir })
    const byName = new Map(inventory.entries.map((entry) => [entry.functionName, entry]))

    assert.equal(inventory.totalFilesScanned, 4)
    assert.equal(inventory.totalMutationFunctions, 5)
    assert.equal(inventory.pageFacingMutationFunctionCount, 3)
    assert.equal(inventory.auditOnlyMutationFunctionCount, 1)
    assert.equal(inventory.pathExemptMutationFunctionCount, 1)
    assert.equal(inventory.contractCompliantFunctionCount, 1)
    assert.equal(inventory.contractWarningFunctionCount, 0)
    assert.equal(inventory.contractRequiredViolationFunctionCount, 2)
    assert.equal(inventory.missingAuthFunctionCount, 0)
    assert.equal(inventory.missingValidationFunctionCount, 0)
    assert.equal(inventory.missingRevalidationFunctionCount, 2)
    assert.equal(inventory.missingObservabilityFunctionCount, 2)
    assert.equal(inventory.missingExplicitOutcomeFunctionCount, 0)
    assert.equal(inventory.conflictGuardedFunctionCount, 1)
    assert.equal(inventory.idempotencyGuardedFunctionCount, 1)
    assert.equal(inventory.observabilityInstrumentedFunctionCount, 1)
    assert.equal(inventory.sessionTenantMutationFunctionCount, 2)
    assert.equal(inventory.inputTenantMutationFunctionCount, 1)
    assert.equal(inventory.redirectOutcomeFunctionCount, 1)
    assert.equal(inventory.structuredReturnFunctionCount, 3)
    assert.equal(inventory.missingRevalidationImportFileCount, 1)
    assert.deepEqual(inventory.filesWithoutRevalidationImport, ['lib/clients/actions.ts'])
    assert.deepEqual(inventory.filesWithPageFacingMutations, [
      'lib/clients/actions.ts',
      'lib/orders/actions.ts',
    ])

    assert.equal(byName.get('createOrder')?.classification, 'page-facing')
    assert.equal(byName.get('createOrder')?.hasRevalidation, true)
    assert.equal(byName.get('createOrder')?.hasObservability, true)
    assert.equal(byName.get('createOrder')?.tenantScopeSignal, 'session-derived')
    assert.equal(byName.get('createOrder')?.outcomeStyle, 'structured-return')
    assert.equal(byName.get('createOrder')?.contract.status, 'compliant')
    assert.deepEqual(byName.get('createOrder')?.contract.requiredViolationCodes, [])
    assert.deepEqual(byName.get('createOrder')?.contract.warningCodes, [])
    assert.equal(byName.get('createOrder')?.privilegedPolicy.level, 'standard')
    assert.equal(byName.get('createOrder')?.privilegedPolicy.status, 'not-privileged')
    assert.deepEqual(byName.get('createOrder')?.tableReferences, ['orders'])

    assert.equal(byName.get('updateOrderDraft')?.classification, 'page-facing')
    assert.equal(byName.get('updateOrderDraft')?.hasConflictGuard, true)
    assert.equal(byName.get('updateOrderDraft')?.hasIdempotencyGuard, true)
    assert.equal(byName.get('updateOrderDraft')?.hasRevalidation, false)
    assert.equal(byName.get('updateOrderDraft')?.tenantScopeSignal, 'input-derived')
    assert.equal(byName.get('updateOrderDraft')?.outcomeStyle, 'redirect')
    assert.equal(byName.get('updateOrderDraft')?.contract.status, 'required-violations')
    assert.deepEqual(byName.get('updateOrderDraft')?.contract.requiredViolationCodes, [
      'revalidation',
    ])
    assert.deepEqual(byName.get('updateOrderDraft')?.contract.warningCodes, [
      'tenant-scope',
      'observability',
    ])

    assert.equal(byName.get('createClient')?.classification, 'page-facing')
    assert.equal(byName.get('createClient')?.hasRevalidation, false)
    assert.equal(byName.get('createClient')?.hasValidation, true)
    assert.equal(byName.get('createClient')?.contract.status, 'required-violations')
    assert.deepEqual(byName.get('createClient')?.contract.requiredViolationCodes, [
      'revalidation',
      'revalidation-import',
    ])
    assert.deepEqual(byName.get('createClient')?.contract.warningCodes, ['observability'])
    assert.equal(byName.get('createClient')?.privilegedPolicy.level, 'sensitive')
    assert.equal(byName.get('createClient')?.privilegedPolicy.status, 'violations')
    assert.deepEqual(byName.get('createClient')?.privilegedPolicy.violationCodes, [
      'missing-observability',
    ])

    assert.equal(byName.get('logAdminAudit')?.classification, 'audit-only')
    assert.equal(byName.get('logAdminAudit')?.contract.status, 'exempt')
    assert.equal(byName.get('logAdminAudit')?.contract.exemption?.code, 'audit-only-table')
    assert.equal(byName.get('logAdminAudit')?.privilegedPolicy.status, 'exempt')
    assert.deepEqual(byName.get('logAdminAudit')?.contract.exemption?.matchedAuditTables, [
      'activity_log',
    ])
    assert.equal(byName.get('syncOrderCache')?.classification, 'path-exempt')
    assert.equal(byName.get('syncOrderCache')?.contract.status, 'exempt')
    assert.equal(byName.get('syncOrderCache')?.contract.exemption?.code, 'path-prefix')
    assert.equal(byName.get('syncOrderCache')?.privilegedPolicy.status, 'exempt')
    assert.equal(byName.get('syncOrderCache')?.contract.exemption?.matchedPathPrefix, 'lib/cron/')

    assert.deepEqual(inventory.rootSummary.lib, {
      auditOnlyMutations: 1,
      conflictGuardedMutations: 1,
      contractCompliantPageFacingMutations: 1,
      contractRequiredViolationMutations: 2,
      contractWarningPageFacingMutations: 0,
      filesWithMutations: 4,
      idempotencyGuardedMutations: 1,
      inputTenantMutations: 1,
      missingAuth: 0,
      missingExplicitOutcome: 0,
      missingObservability: 2,
      missingRevalidation: 2,
      missingValidation: 0,
      mutationFunctions: 5,
      observabilityInstrumented: 1,
      pageFacingMutations: 3,
      pathExemptMutations: 1,
      redirectOutcomeMutations: 1,
      sessionTenantMutations: 2,
      structuredReturnMutations: 3,
    })
    assert.deepEqual(inventory.rootSummary.app, {
      auditOnlyMutations: 0,
      conflictGuardedMutations: 0,
      contractCompliantPageFacingMutations: 0,
      contractRequiredViolationMutations: 0,
      contractWarningPageFacingMutations: 0,
      filesWithMutations: 0,
      idempotencyGuardedMutations: 0,
      inputTenantMutations: 0,
      missingAuth: 0,
      missingExplicitOutcome: 0,
      missingObservability: 0,
      missingRevalidation: 0,
      missingValidation: 0,
      mutationFunctions: 0,
      observabilityInstrumented: 0,
      pageFacingMutations: 0,
      pathExemptMutations: 0,
      redirectOutcomeMutations: 0,
      sessionTenantMutations: 0,
      structuredReturnMutations: 0,
    })
  })
})

test('buildServerActionMutationInventory classifies critical privileged actions separately from standard writes', () => {
  withFixtureRoot((rootDir) => {
    writeFixtureFile(
      rootDir,
      'lib/admin/actions.ts',
      `'use server'

import { recordPlatformEvent } from '@/lib/platform-observability/events'

export async function compChef() {
  await requireAdmin()
  await recordPlatformEvent('admin.comped')
  await db.from('platform_admins').update({ is_active: false })
  return { ok: true }
}
`
    )
    writeFixtureFile(
      rootDir,
      'lib/clients/actions.ts',
      `'use server'

export async function deleteClient() {
  const user = await requireChef()
  await db.from('clients').delete().eq('tenant_id', user.tenantId)
  return { ok: true }
}
`
    )
    writeFixtureFile(
      rootDir,
      'lib/orders/actions.ts',
      `'use server'

import { recordPlatformEvent } from '@/lib/platform-observability/events'

export async function createOrder() {
  const user = await requireChef()
  await recordPlatformEvent('order.created')
  await db.from('orders').insert({ tenant_id: user.tenantId })
  return { ok: true }
}
`
    )

    const inventory = buildServerActionMutationInventory({ rootDir })
    const byName = new Map(inventory.entries.map((entry) => [entry.functionName, entry]))

    assert.equal(inventory.privilegedMutationFunctionCount, 2)
    assert.equal(inventory.criticalMutationFunctionCount, 1)
    assert.equal(inventory.sensitiveMutationFunctionCount, 1)
    assert.equal(inventory.privilegedPolicyViolationFunctionCount, 1)

    assert.equal(byName.get('compChef')?.privilegedPolicy.level, 'critical')
    assert.equal(byName.get('compChef')?.privilegedPolicy.status, 'compliant')
    assert.deepEqual(byName.get('compChef')?.privilegedPolicy.enforcedControls, [
      'observability',
      'early-auth',
    ])
    assert.deepEqual(byName.get('compChef')?.privilegedPolicy.futureControls, [
      'strong-confirmation',
      'step-up-auth',
    ])
    assert.deepEqual(byName.get('compChef')?.privilegedPolicy.violationCodes, [])
    assert.ok(byName.get('compChef')?.privilegedPolicy.triggerCodes.includes('admin-surface'))
    assert.ok(byName.get('compChef')?.privilegedPolicy.triggerCodes.includes('identity-table'))

    assert.equal(byName.get('deleteClient')?.privilegedPolicy.level, 'sensitive')
    assert.equal(byName.get('deleteClient')?.privilegedPolicy.status, 'violations')
    assert.deepEqual(byName.get('deleteClient')?.privilegedPolicy.violationCodes, [
      'missing-observability',
    ])
    assert.ok(
      byName.get('deleteClient')?.privilegedPolicy.triggerCodes.includes('client-data-surface')
    )
    assert.ok(
      byName.get('deleteClient')?.privilegedPolicy.triggerCodes.includes('destructive-mutation')
    )

    assert.equal(byName.get('createOrder')?.privilegedPolicy.level, 'standard')
    assert.equal(byName.get('createOrder')?.privilegedPolicy.status, 'not-privileged')
    assert.deepEqual(byName.get('createOrder')?.privilegedPolicy.triggerCodes, [])
  })
})
