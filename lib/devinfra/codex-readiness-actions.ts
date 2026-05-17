'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'
import type {
  ReadinessStatus,
  CodexTask,
  ReadinessReport,
  CodexDispatchRecord,
} from './codex-readiness-types'

// ---------------------------------------------------------------------------
// 1. getReadinessReport - aggregate readiness across all tracked areas
// ---------------------------------------------------------------------------
export async function getReadinessReport(): Promise<ReadinessReport> {
  await requireAdmin()
  const db: any = createServerClient()

  const { data: tasks } = await db
    .from('codex_tasks')
    .select('readiness,area,description')

  const rows: { readiness: string; area: string; description: string | null }[] = tasks || []

  const counts = { ready: 0, needs_spec: 0, needs_tests: 0, complex: 0, blocked: 0 }
  const blockers: string[] = []

  for (const row of rows) {
    const status = row.readiness as ReadinessStatus
    if (status in counts) counts[status]++
    if (status === 'blocked') {
      blockers.push(row.area + (row.description ? `: ${row.description}` : ''))
    }
  }

  const total = rows.length
  return {
    totalAreas: total,
    ready: counts.ready,
    needsSpec: counts.needs_spec,
    needsTests: counts.needs_tests,
    complex: counts.complex,
    blocked: counts.blocked,
    readinessPercent: total > 0 ? Math.round((counts.ready / total) * 100) : 0,
    topBlockers: blockers.slice(0, 10),
  }
}

// ---------------------------------------------------------------------------
// 2. getCodexTasks - list tasks filtered by readiness status
// ---------------------------------------------------------------------------
export async function getCodexTasks(status?: ReadinessStatus): Promise<CodexTask[]> {
  await requireAdmin()
  const db: any = createServerClient()

  let query = db.from('codex_tasks').select('*').order('last_assessed', { ascending: false })

  if (status) {
    query = query.eq('readiness', status)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch codex tasks: ${error.message}`)

  return (data || []).map((r: any) => ({
    id: r.id,
    area: r.area,
    description: r.description || '',
    readiness: r.readiness as ReadinessStatus,
    specPath: r.spec_path,
    testPath: r.test_path,
    complexity: r.complexity,
    dependencies: r.dependencies || [],
    lastAssessed: r.last_assessed,
  }))
}

// ---------------------------------------------------------------------------
// 3. assessArea - upsert readiness assessment for an area
// ---------------------------------------------------------------------------
export async function assessArea(
  area: string,
  readiness: ReadinessStatus,
  specPath?: string,
  testPath?: string,
  complexity?: string
): Promise<{ success: boolean; id: string }> {
  await requireAdmin()
  const db: any = createServerClient()

  // Check if area already exists
  const { data: existing } = await db
    .from('codex_tasks')
    .select('id')
    .eq('area', area)
    .single()

  if (existing) {
    const { error } = await db
      .from('codex_tasks')
      .update({
        readiness,
        spec_path: specPath ?? null,
        test_path: testPath ?? null,
        complexity: complexity ?? 'medium',
        last_assessed: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw new Error(`Failed to update area assessment: ${error.message}`)
    return { success: true, id: existing.id }
  }

  const { data, error } = await db
    .from('codex_tasks')
    .insert({
      area,
      readiness,
      spec_path: specPath ?? null,
      test_path: testPath ?? null,
      complexity: complexity ?? 'medium',
      last_assessed: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create area assessment: ${error.message}`)
  return { success: true, id: data.id }
}

// ---------------------------------------------------------------------------
// 4. recordDispatch - log a Codex dispatch
// ---------------------------------------------------------------------------
export async function recordDispatch(
  taskDescription: string,
  area: string
): Promise<{ success: boolean; id: string }> {
  await requireAdmin()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('codex_dispatch_records')
    .insert({
      task_description: taskDescription,
      area,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to record dispatch: ${error.message}`)
  return { success: true, id: data.id }
}

// ---------------------------------------------------------------------------
// 5. recordDispatchResult - log result of a Codex dispatch
// ---------------------------------------------------------------------------
export async function recordDispatchResult(
  dispatchId: string,
  success: boolean,
  notes?: string
): Promise<{ success: boolean }> {
  await requireAdmin()
  const db: any = createServerClient()

  const { error } = await db
    .from('codex_dispatch_records')
    .update({
      completed_at: new Date().toISOString(),
      success,
      notes: notes ?? null,
    })
    .eq('id', dispatchId)

  if (error) throw new Error(`Failed to record dispatch result: ${error.message}`)
  return { success: true }
}

// ---------------------------------------------------------------------------
// 6. getDispatchHistory - recent dispatch records
// ---------------------------------------------------------------------------
export async function getDispatchHistory(limit?: number): Promise<CodexDispatchRecord[]> {
  await requireAdmin()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('codex_dispatch_records')
    .select('*')
    .order('dispatched_at', { ascending: false })
    .limit(limit ?? 50)

  if (error) throw new Error(`Failed to fetch dispatch history: ${error.message}`)

  return (data || []).map((r: any) => ({
    id: r.id,
    taskDescription: r.task_description,
    area: r.area,
    dispatchedAt: r.dispatched_at,
    completedAt: r.completed_at,
    success: r.success,
    notes: r.notes,
  }))
}
