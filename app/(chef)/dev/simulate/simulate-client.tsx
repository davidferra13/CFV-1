'use client'

// Sim-to-Real Client Component
// Handles module selection, run triggering, loading state, and results display.

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SimulationResultsPanel } from '@/components/simulation/simulation-results-panel'
import { startSimulationRun } from '@/lib/simulation/simulation-actions'
import type { SimModule, SimRun, SimResult, SimSummary } from '@/lib/simulation/types'
import { ALL_SIM_MODULES, SIM_MODULE_LABELS } from '@/lib/simulation/types'

interface Props {
  summary: SimSummary
  recentRuns: SimRun[]
  latestRun: SimRun | null
  latestResults: SimResult[]
}

export function SimulateClient({ summary, recentRuns, latestRun, latestResults }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedModules, setSelectedModules] = useState<SimModule[]>([
    'inquiry_parse',
    'client_parse',
    'allergen_risk',
  ])
  const [scenariosPerModule, setScenariosPerModule] = useState(3)
  const [runError, setRunError] = useState<string | null>(null)
  const [runSuccess, setRunSuccess] = useState(false)

  function toggleModule(module: SimModule) {
    setSelectedModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    )
  }

  function handleRun() {
    if (selectedModules.length === 0) return
    setRunError(null)
    setRunSuccess(false)

    startTransition(async () => {
      try {
        const result = await startSimulationRun({
          modules: selectedModules,
          scenariosPerModule,
        })

        if (result.success) {
          setRunSuccess(true)
          router.refresh()
        } else {
          setRunError(result.error ?? 'Simulation failed - check that Ollama is running.')
        }
      } catch (err) {
        toast.error('Simulation failed unexpectedly')
      }
    })
  }

  const allTimePassPct =
    summary.allTimePassRate !== null ? Math.round(summary.allTimePassRate * 100) : null

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Simulation Lab</h1>
        <p className="text-stone-400 mt-1">
          Generates synthetic chef scenarios → runs through the pipeline → grades outputs. Failures
          surface here so you can improve prompts before they hit real users.
        </p>
      </div>

      {/* Summary cards */}
      {summary.totalScenariosRun > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div
                className={`text-2xl font-bold ${allTimePassPct !== null && allTimePassPct >= 80 ? 'text-emerald-600' : allTimePassPct !== null && allTimePassPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}
              >
                {allTimePassPct !== null ? `${allTimePassPct}%` : '-'}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">all-time pass rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-stone-100">{summary.totalScenariosRun}</div>
              <div className="text-xs text-stone-500 mt-0.5">scenarios run</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-stone-100">{recentRuns.length}</div>
              <div className="text-xs text-stone-500 mt-0.5">simulation runs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-stone-100">
                {summary.fineTuningExampleCount}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">fine-tuning examples</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module pass rates (if we have data) */}
      {Object.keys(summary.modulePassRates).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pass Rate by Module (all time)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_SIM_MODULES.filter((m) => summary.modulePassRates[m] !== undefined).map(
              (module) => {
                const rate = summary.modulePassRates[module]!
                const pct = Math.round(rate * 100)
                return (
                  <div key={module} className="flex items-center gap-3">
                    <div className="w-36 text-xs text-stone-400 shrink-0">
                      {SIM_MODULE_LABELS[module]}
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-stone-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium text-stone-300 w-10 text-right">{pct}%</div>
                  </div>
                )
              }
            )}
          </CardContent>
        </Card>
      )}

      {/* Run configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Run a Simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Module selection */}
          <div>
            <div className="text-sm font-medium text-stone-300 mb-2">Select modules to test</div>
            <div className="flex flex-wrap gap-2">
              {ALL_SIM_MODULES.map((module) => {
                const selected = selectedModules.includes(module)
                return (
                  <button
                    key={module}
                    onClick={() => toggleModule(module)}
                    disabled={isPending}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-brand-500 bg-brand-950 text-brand-400'
                        : 'border-stone-600 bg-stone-900 text-stone-400 hover:border-stone-400'
                    } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {SIM_MODULE_LABELS[module]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Scenarios per module */}
          <div>
            <div className="text-sm font-medium text-stone-300 mb-2">
              Scenarios per module: <span className="text-brand-400">{scenariosPerModule}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={scenariosPerModule}
              onChange={(e) => setScenariosPerModule(Number(e.target.value))}
              disabled={isPending}
              className="w-full max-w-xs accent-brand-600"
            />
            <div className="flex justify-between text-xs text-stone-400 max-w-xs mt-0.5">
              <span>1 (fast)</span>
              <span>10 (thorough)</span>
            </div>
          </div>

          {/* Estimate */}
          <div className="text-xs text-stone-500 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2">
            Estimated time: ~{Math.ceil((selectedModules.length * scenariosPerModule * 15) / 60)}{' '}
            min ({selectedModules.length} modules × {scenariosPerModule} scenarios × ~15s each).
            Ollama must be running. Keep this tab open during the run.
          </div>

          {/* Errors / success */}
          {runError && (
            <div className="rounded-lg border border-red-200 bg-red-950 px-3 py-2 text-sm text-red-800">
              {runError}
            </div>
          )}
          {runSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-950 px-3 py-2 text-sm text-emerald-800">
              Simulation complete - results updated below.
            </div>
          )}

          {/* Run button */}
          <Button
            variant="primary"
            onClick={handleRun}
            disabled={isPending || selectedModules.length === 0}
            className="min-w-32"
          >
            {isPending ? 'Running simulation…' : 'Run Simulation'}
          </Button>

          {isPending && (
            <p className="text-xs text-stone-500 animate-pulse">
              Ollama is generating scenarios and evaluating outputs. This may take several minutes…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Latest run results */}
      {latestRun && latestResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
              Latest Run Results
            </h2>
            <span className="text-xs text-stone-400">
              {new Date(latestRun.startedAt).toLocaleString()}
            </span>
          </div>
          <SimulationResultsPanel run={latestRun} results={latestResults} />
        </div>
      )}

      {/* Run history */}
      {recentRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Run History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRuns.map((run) => {
                const pct = Math.round(run.passRate * 100)
                return (
                  <div
                    key={run.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b border-stone-800 last:border-0"
                  >
                    <div className="text-stone-400 text-xs">
                      {new Date(run.startedAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-500">{run.scenarioCount} scenarios</span>
                      <span
                        className={`text-xs font-semibold ${
                          run.status === 'running'
                            ? 'text-blue-600'
                            : run.status === 'failed'
                              ? 'text-red-600'
                              : pct >= 80
                                ? 'text-emerald-600'
                                : pct >= 60
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                        }`}
                      >
                        {run.status === 'running'
                          ? 'Running…'
                          : run.status === 'failed'
                            ? 'Failed'
                            : `${pct}%`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {summary.totalScenariosRun === 0 && !isPending && (
        <div className="text-center py-12 text-stone-500">
          <div className="text-4xl mb-3">🧪</div>
          <p className="font-medium text-stone-300">No simulations run yet</p>
          <p className="text-sm mt-1">
            Select modules above and click Run Simulation to start the quality loop.
          </p>
        </div>
      )}
    </div>
  )
}
