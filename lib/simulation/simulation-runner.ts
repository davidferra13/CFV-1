// Simulation Runner - Internal (No Auth)
// Extracted from simulation-actions.ts so it can be called by both:
//   • startSimulationRun() server action (UI trigger, auth-gated)
//   • /api/scheduled/simulation cron route (automated, CRON_SECRET-gated)
//
// This file has NO 'use server' directive - it is a plain server-side module.
// Never import this from a client component.

import { createServerClient } from '@/lib/db/server'
import { generateScenarios } from './scenario-generator'
import { runScenario } from './pipeline-runner'
import { evaluateOutput } from './quality-evaluator'
import { generatePostRunReport } from './report-generator'
import type { SimModule, SimRunConfig } from './types'
import type { Json } from '@/types/database'

export async function runSimulationInternal(
  tenantId: string,
  config: SimRunConfig
): Promise<{ success: boolean; runId: string | null; error: string | null }> {
  const db = createServerClient({ admin: true })
  const modules = config.modules
  const scenariosPerModule = Math.min(config.scenariosPerModule ?? 5, 20)

  // Create the run record
  const { data: runData, error: runError } = await db
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
    const moduleSampleFailures: Record<string, string[]> = {}
    const fineTuningBuffer: Array<{
      tenant_id: string
      source: string
      module: string
      input_text: string
      output_json: Json
      quality_score: number
    }> = []

    for (const module of modules) {
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
        raw_output: Json
        score: number
        passed: boolean
        failures: Json
        duration_ms: number
      }> = []

      for (const scenario of scenarios) {
        const output = await runScenario(scenario)
        const evaluation = await evaluateOutput(scenario, output.rawOutput)

        resultRows.push({
          run_id: runId,
          tenant_id: tenantId,
          module,
          scenario_payload: scenario.inputText,
          raw_output: output.rawOutput as Json,
          score: evaluation.score,
          passed: evaluation.passed,
          failures: evaluation.failures as Json,
          duration_ms: output.durationMs,
        })

        if (!evaluation.passed && evaluation.failures.length > 0) {
          // Collect up to 3 sample failure strings per module for the report
          if (!moduleSampleFailures[module]) moduleSampleFailures[module] = []
          if (moduleSampleFailures[module].length < 3) {
            moduleSampleFailures[module].push(...evaluation.failures.slice(0, 2))
          }
        }

        if (evaluation.passed) {
          modulePassed++
          if (evaluation.score >= 90) {
            fineTuningBuffer.push({
              tenant_id: tenantId,
              source: 'simulation',
              module,
              input_text: scenario.inputText,
              output_json: output.rawOutput as Json,
              quality_score: evaluation.score,
            })
          }
        }

        totalScenarios++
        if (evaluation.passed) totalPassed++
      }

      if (resultRows.length > 0) {
        await db.from('simulation_results').insert(resultRows)
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
        await db.from('fine_tuning_examples').insert(fineTuningBuffer)
      } catch (err) {
        console.warn('[sim] Failed to store fine-tuning examples:', err)
      }
    }

    const passRate = totalScenarios > 0 ? totalPassed / totalScenarios : 0
    const completedAt = new Date().toISOString()

    await db
      .from('simulation_runs')
      .update({
        completed_at: completedAt,
        scenario_count: totalScenarios,
        passed_count: totalPassed,
        pass_rate: Math.round(passRate * 10000) / 100,
        module_breakdown: moduleBreakdown,
        status: 'completed',
      })
      .eq('id', runId)

    // Generate an AI fix report - non-blocking, runs after run is marked complete.
    // Ollama analyzes failures and writes docs/simulation-report.md.
    const failingModules = Object.entries(moduleBreakdown)
      .filter(([, stats]) => stats.passRate < 1)
      .map(([module]) => module as SimModule)

    generatePostRunReport({
      runId,
      tenantId,
      completedAt,
      overallPassRate: passRate,
      moduleBreakdown,
      topFailures: failingModules.map((module) => ({
        module,
        passRate: moduleBreakdown[module]?.passRate ?? 0,
        sampleFailures: moduleSampleFailures[module] ?? [],
      })),
    }).catch((err: unknown) => {
      console.warn('[sim] Post-run report generation failed (non-blocking):', err)
    })

    return { success: true, runId, error: null }
  } catch (err) {
    await db
      .from('simulation_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', runId)

    const msg = err instanceof Error ? err.message : 'Simulation failed'
    console.error('[sim] Simulation run failed:', err)
    return { success: false, runId, error: msg }
  }
}
