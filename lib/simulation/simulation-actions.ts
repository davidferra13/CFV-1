'use server'

// Simulation Server Actions
// Auth-gated wrappers around the internal simulation runner.
// Core logic lives in simulation-runner.ts (no 'use server') so it can also
// be called from the auto-scheduler and manual API route without a user session.

import { requireChefAdmin } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { runSimulationInternal } from './simulation-runner'
import type { SimModule, SimRun, SimResult, SimSummary, SimRunConfig } from './types'

// ── Start a simulation run ────────────────────────────────────────────────────

export async function startSimulationRun(config: SimRunConfig): Promise<{
  success: boolean
  runId: string | null
  error: string | null
}> {
  const user = await requireChefAdmin()
  return runSimulationInternal(user.tenantId!, config)
}

// ── Read runs ─────────────────────────────────────────────────────────────────

export async function getSimulationRuns(limit = 10): Promise<SimRun[]> {
  const user = await requireChefAdmin()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('simulation_runs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any) => ({
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    scenarioCount: row.scenario_count,
    passedCount: row.passed_count,
    passRate: Number(row.pass_rate ?? 0) / 100,
    moduleBreakdown: (row.module_breakdown ?? {}) as SimRun['moduleBreakdown'],
    status: row.status as SimRun['status'],
  }))
}

// ── Read results for a specific run ──────────────────────────────────────────

export async function getSimulationResults(runId: string): Promise<SimResult[]> {
  const user = await requireChefAdmin()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('simulation_results')
    .select('*')
    .eq('run_id', runId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row: any) => ({
    scenarioId: row.id,
    module: row.module as SimModule,
    rawOutput: row.raw_output,
    score: row.score,
    passed: row.passed,
    failures: (row.failures ?? []) as string[],
    durationMs: row.duration_ms ?? 0,
    createdAt: row.created_at,
  }))
}

// ── Get failure examples (worst performers for a module) ──────────────────────

export async function getFailureExamples(
  module: SimModule,
  limit = 5
): Promise<Array<{ scenarioPayload: string; score: number; failures: string[] }>> {
  const user = await requireChefAdmin()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('simulation_results')
    .select('scenario_payload, score, failures')
    .eq('tenant_id', user.tenantId!)
    .eq('module', module)
    .eq('passed', false)
    .order('score', { ascending: true })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: any) => ({
    scenarioPayload: row.scenario_payload,
    score: row.score,
    failures: (row.failures ?? []) as string[],
  }))
}

// ── Overall summary ───────────────────────────────────────────────────────────

export async function getSimulationSummary(): Promise<SimSummary> {
  const user = await requireChefAdmin()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const [runsRes, totalRes, ftRes] = await Promise.all([
    supabase
      .from('simulation_runs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false })
      .limit(1),
    supabase.from('simulation_results').select('module, passed').eq('tenant_id', tenantId),
    supabase
      .from('fine_tuning_examples')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  const latestRunRow = runsRes.data?.[0]
  const latestRun: SimRun | null = latestRunRow
    ? {
        id: latestRunRow.id,
        startedAt: latestRunRow.started_at,
        completedAt: latestRunRow.completed_at,
        scenarioCount: latestRunRow.scenario_count,
        passedCount: latestRunRow.passed_count,
        passRate: Number(latestRunRow.pass_rate ?? 0) / 100,
        moduleBreakdown: (latestRunRow.module_breakdown ?? {}) as SimRun['moduleBreakdown'],
        status: latestRunRow.status as SimRun['status'],
      }
    : null

  const allResults = totalRes.data ?? []
  const totalScenarios = allResults.length
  const totalPassed = allResults.filter((r: any) => r.passed).length
  const allTimePassRate = totalScenarios > 0 ? totalPassed / totalScenarios : null

  // Per-module pass rates across all runs
  const modulePassRates: Partial<Record<SimModule, number>> = {}
  const byModule = new Map<string, { total: number; passed: number }>()
  for (const row of allResults) {
    const m = byModule.get(row.module) ?? { total: 0, passed: 0 }
    m.total++
    if (row.passed) m.passed++
    byModule.set(row.module, m)
  }
  for (const [module, stats] of byModule.entries()) {
    modulePassRates[module as SimModule] = stats.total > 0 ? stats.passed / stats.total : 0
  }

  return {
    latestRun,
    allTimePassRate,
    totalScenariosRun: totalScenarios,
    modulePassRates,
    fineTuningExampleCount: ftRes.count ?? 0,
  }
}
