'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RegressionTestCase,
  SecurityAuditEntry,
  GraphSecuritySummary,
  TestResult,
  AuditType,
  AuditSeverity,
} from './graph-security-types'

// ---- helpers ----

function fromRegressionTests(db: any): any {
  return (db as any).from('regression_test_cases')
}

function fromSecurityAuditEntries(db: any): any {
  return (db as any).from('security_audit_entries')
}

function fromGraphDocEntries(db: any): any {
  return (db as any).from('graph_doc_entries')
}

// ---- actions ----

export async function getRegressionTests(
  stage?: string
): Promise<RegressionTestCase[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromRegressionTests(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load regression tests: ${error.message}`)
  return (data ?? []).map(mapTestCase)
}

export async function upsertRegressionTest(params: {
  name: string
  lifecycleStage: string
  inputState: Record<string, unknown>
  expectedOutput: Record<string, unknown>
  lastResult?: TestResult
}): Promise<RegressionTestCase> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    name: params.name,
    lifecycle_stage: params.lifecycleStage,
    input_state: params.inputState,
    expected_output: params.expectedOutput,
  }
  if (params.lastResult !== undefined) {
    payload.last_result = params.lastResult
    payload.last_run_at = new Date().toISOString()
  }

  const { data, error } = await fromRegressionTests(db)
    .upsert(payload, { onConflict: 'tenant_id,name' })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert regression test: ${error.message}`)
  return mapTestCase(data)
}

export async function getSecurityAuditEntries(
  stage?: string
): Promise<SecurityAuditEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = fromSecurityAuditEntries(db)
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })

  if (stage) {
    query = query.eq('lifecycle_stage', stage)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to load security audit entries: ${error.message}`)
  return (data ?? []).map(mapAuditEntry)
}

export async function createSecurityAuditEntry(params: {
  lifecycleStage: string
  auditType: AuditType
  finding: string
  severity: AuditSeverity
}): Promise<SecurityAuditEntry> {
  const user = await requireChef()
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {
    tenant_id: user.tenantId,
    lifecycle_stage: params.lifecycleStage,
    audit_type: params.auditType,
    finding: params.finding,
    severity: params.severity,
  }

  const { data, error } = await fromSecurityAuditEntries(db)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create security audit entry: ${error.message}`)
  return mapAuditEntry(data)
}

export async function mitigateSecurityEntry(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await fromSecurityAuditEntries(db)
    .update({ mitigated: true, mitigated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId)

  if (error) throw new Error(`Failed to mitigate security entry: ${error.message}`)
}

export async function getGraphSecuritySummary(): Promise<GraphSecuritySummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Test counts
  const { data: tests, error: testErr } = await fromRegressionTests(db)
    .select('last_result')
    .eq('tenant_id', user.tenantId)

  if (testErr) throw new Error(`Failed to load test summary: ${testErr.message}`)

  const testList = tests ?? []
  const passingTests = testList.filter((t: any) => t.last_result === 'pass').length
  const failingTests = testList.filter((t: any) => t.last_result === 'fail').length

  // Security finding counts
  const { data: findings, error: findErr } = await fromSecurityAuditEntries(db)
    .select('mitigated')
    .eq('tenant_id', user.tenantId)

  if (findErr) throw new Error(`Failed to load findings summary: ${findErr.message}`)

  const findingList = findings ?? []
  const unmitigatedFindings = findingList.filter((f: any) => !f.mitigated).length

  // Doc section count
  const { data: docs, error: docErr } = await fromGraphDocEntries(db)
    .select('id')
    .eq('tenant_id', user.tenantId)

  if (docErr) throw new Error(`Failed to load doc summary: ${docErr.message}`)

  return {
    totalTests: testList.length,
    passingTests,
    failingTests,
    totalFindings: findingList.length,
    unmitigatedFindings,
    docSections: (docs ?? []).length,
  }
}

// ---- mappers ----

function mapTestCase(row: any): RegressionTestCase {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    lifecycleStage: row.lifecycle_stage,
    inputState: row.input_state ?? {},
    expectedOutput: row.expected_output ?? {},
    lastResult: row.last_result ?? 'skip',
    lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
    createdAt: new Date(row.created_at),
  }
}

function mapAuditEntry(row: any): SecurityAuditEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    lifecycleStage: row.lifecycle_stage,
    auditType: row.audit_type,
    finding: row.finding,
    severity: row.severity,
    mitigated: row.mitigated ?? false,
    mitigatedAt: row.mitigated_at ? new Date(row.mitigated_at) : null,
    createdAt: new Date(row.created_at),
  }
}
