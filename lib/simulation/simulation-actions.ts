'use server'

// Simulation Server Actions
// Orchestrates the full sim-to-real loop: generate → run → evaluate → store.
// All operations tenant-scoped. Never touches real client data.

import { requireAdmin } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { generateScenarios } from './scenario-generator'
import { runScenario } from './pipeline-runner'
import { evaluateOutput } from './quality-evaluator'
import type { SimModule, SimRun, SimResult, SimSummary, SimRunConfig } from './types'

// ── Start a simulation run ────────────────────────────────────────────────────

export async function startSimulationRun(config: SimRunConfig): Promise<{
  success: boolean
  runId: string | null
  error: string | null
}> {
  const user = await requireAdmin()
  const supabase = createServerClient()
  const tenantId = user.tenantId!

  const modules = config.modules
  const scenariosPerModule = Math.min(config.scenariosPerModule ?? 5, 20)

  // Create the run record
  const { data: runData, error: runError } = await supabase
    .from('simulation_runs')
    .insert({
      tenant_id: tenantId,
      config: { modules, scenariosPerModule },
      status: 'running',
    })
    .select('id')
    .single()

  if (runError || !runData) {
    return { success: false, runId: null, error: runError?.message ?? 'Failed to create run' }
  }

  const runId = runData.id

  try {
    let totalScenarios = 0
    let totalPassed = 0
    const moduleBreakdown: Record<
      string,
      { count: number; passedCount: number; passRate: number }
    > = {}
    const fineTuningBuffer: Array<{
      tenant_id: string
      source: string
      module: string
      input_text: string
      output_json: unknown
      quality_score: number
    }> = []

    for (const module of modules) {
      // Generate scenarios for this module
      const scenarios = await generateScenarios(module, scenariosPerModule)
      if (scenarios.length === 0) {
        console.warn(`[sim] No scenarios generated for module: ${module}`)
        moduleBreakdown[module] = { count: 0, passedCount: 0, passRate: 0 }
        continue
      }

      let modulePassed = 0
      const resultRows: Array<{
        run_id: string
        tenant_id: string
        module: string
        scenario_payload: string
        raw_output: unknown
        score: number
        passed: boolean
        failures: unknown
        duration_ms: number
      }> = []

      for (const scenario of scenarios) {
        // Run the scenario through the pipeline
        const output = await runScenario(scenario)

        // Evaluate the output
        const evaluation = await evaluateOutput(scenario, output.rawOutput)

        resultRows.push({
          run_id: runId,
          tenant_id: tenantId,
          module,
          scenario_payload: scenario.inputText,
          raw_output: output.rawOutput,
          score: evaluation.score,
          passed: evaluation.passed,
          failures: evaluation.failures,
          duration_ms: output.durationMs,
        })

        if (evaluation.passed) {
          modulePassed++
          // High-quality results become fine-tuning examples
          if (evaluation.score >= 90) {
            fineTuningBuffer.push({
              tenant_id: tenantId,
              source: 'simulation',
              module,
              input_text: scenario.inputText,
              output_json: output.rawOutput,
              quality_score: evaluation.score,
            })
          }
        }

        totalScenarios++
        if (evaluation.passed) totalPassed++
      }

      // Batch-insert results for this module
      if (resultRows.length > 0) {
        await supabase.from('simulation_results').insert(resultRows)
      }

      moduleBreakdown[module] = {
        count: scenarios.length,
        passedCount: modulePassed,
        passRate: scenarios.length > 0 ? modulePassed / scenarios.length : 0,
      }
    }

    // Store fine-tuning examples (non-blocking)
    if (fineTuningBuffer.length > 0) {
      try {
        await supabase.from('fine_tuning_examples').insert(fineTuningBuffer)
      } catch (err) {
        console.warn('[sim] Failed to store fine-tuning examples:', err)
      }
    }

    const passRate = totalScenarios > 0 ? totalPassed / totalScenarios : 0

    // Mark run as completed
    await supabase
      .from('simulation_runs')
      .update({
        completed_at: new Date().toISOString(),
        scenario_count: totalScenarios,
        passed_count: totalPassed,
        pass_rate: Math.round(passRate * 10000) / 100,
        module_breakdown: moduleBreakdown,
        status: 'completed',
      })
      .eq('id', runId)

    return { success: true, runId, error: null }
  } catch (err) {
    // Mark run as failed
    await supabase
      .from('simulation_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId)

    const msg = err instanceof Error ? err.message : 'Simulation failed'
    console.error('[sim] Simulation run failed:', err)
    return { success: false, runId, error: msg }
  }
}

// ── Read runs ─────────────────────────────────────────────────────────────────

export async function getSimulationRuns(limit = 10): Promise<SimRun[]> {
  const user = await requireAdmin()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('simulation_runs')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
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
  const user = await requireAdmin()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('simulation_results')
    .select('*')
    .eq('run_id', runId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
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
  const user = await requireAdmin()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('simulation_results')
    .select('scenario_payload, score, failures')
    .eq('tenant_id', user.tenantId!)
    .eq('module', module)
    .eq('passed', false)
    .order('score', { ascending: true })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
    scenarioPayload: row.scenario_payload,
    score: row.score,
    failures: (row.failures ?? []) as string[],
  }))
}

// ── Overall summary ───────────────────────────────────────────────────────────

export async function getSimulationSummary(): Promise<SimSummary> {
  const user = await requireAdmin()
  const supabase = createServerClient()
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
  const totalPassed = allResults.filter((r) => r.passed).length
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
