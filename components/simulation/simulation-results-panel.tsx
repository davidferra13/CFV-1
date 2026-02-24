'use client'

// Simulation Results Panel
// Shows pass/fail breakdown by module and failure drill-downs.

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SimRun, SimResult, SimModule } from '@/lib/simulation/types'
import { SIM_MODULE_LABELS } from '@/lib/simulation/types'

interface Props {
  run: SimRun
  results: SimResult[]
}

export function SimulationResultsPanel({ run, results }: Props) {
  const [expandedModule, setExpandedModule] = useState<SimModule | null>(null)

  const byModule = new Map<SimModule, SimResult[]>()
  for (const r of results) {
    const list = byModule.get(r.module) ?? []
    list.push(r)
    byModule.set(r.module, list)
  }

  const passRatePct = Math.round(run.passRate * 100)

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-stone-700 bg-stone-800">
        <div className="text-center">
          <div
            className={`text-3xl font-bold ${passRatePct >= 80 ? 'text-emerald-600' : passRatePct >= 60 ? 'text-amber-600' : 'text-red-600'}`}
          >
            {passRatePct}%
          </div>
          <div className="text-xs text-stone-500">pass rate</div>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-100">{run.scenarioCount}</div>
            <div className="text-xs text-stone-500">scenarios run</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-700">{run.passedCount}</div>
            <div className="text-xs text-stone-500">passed</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-red-600">
              {run.scenarioCount - run.passedCount}
            </div>
            <div className="text-xs text-stone-500">failed</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-300">
              {run.completedAt
                ? Math.round(
                    (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) /
                      60000
                  ) + 'm'
                : '—'}
            </div>
            <div className="text-xs text-stone-500">duration</div>
          </div>
        </div>
      </div>

      {/* Module breakdown */}
      <div className="space-y-2">
        {Array.from(byModule.entries()).map(([module, moduleResults]) => {
          const passed = moduleResults.filter((r) => r.passed).length
          const total = moduleResults.length
          const pct = total > 0 ? Math.round((passed / total) * 100) : 0
          const isExpanded = expandedModule === module
          const failures = moduleResults.filter((r) => !r.passed)

          return (
            <Card key={module} className="overflow-hidden">
              <CardHeader
                className="py-3 cursor-pointer select-none"
                onClick={() => setExpandedModule(isExpanded ? null : module)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        pct >= 80 ? 'bg-emerald-9500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-9500'
                      }`}
                    />
                    <CardTitle className="text-sm font-medium">
                      {SIM_MODULE_LABELS[module]}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-stone-300">
                      {passed}/{total} passed ({pct}%)
                    </span>
                    <span className="text-xs text-stone-400">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-stone-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-9500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-9500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 border-t border-stone-800">
                  {failures.length === 0 ? (
                    <p className="text-sm text-emerald-700 py-2">
                      All scenarios passed for this module.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                        Failures ({failures.length})
                      </p>
                      {failures.map((r) => (
                        <div
                          key={r.scenarioId}
                          className="rounded-lg border border-red-100 bg-red-950 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-red-700">
                              Score: {r.score}/100
                            </span>
                            <span className="text-xs text-stone-400">{r.durationMs}ms</span>
                          </div>
                          <div className="text-xs text-stone-400 font-medium">Scenario:</div>
                          <pre className="text-xs text-stone-300 bg-surface rounded border border-stone-700 p-2 overflow-x-auto whitespace-pre-wrap max-h-24">
                            {r.scenarioId ?? 'No scenario text'}
                          </pre>
                          {r.failures.length > 0 && (
                            <div>
                              <div className="text-xs text-stone-400 font-medium mb-1">
                                Issues found:
                              </div>
                              <ul className="space-y-0.5">
                                {r.failures.map((f, i) => (
                                  <li key={i} className="text-xs text-red-700 flex gap-1.5">
                                    <span className="shrink-0">•</span>
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sample passing result */}
                  {moduleResults.find((r) => r.passed) && (
                    <details className="mt-3">
                      <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-300">
                        Show a passing example
                      </summary>
                      <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-950 p-3">
                        <div className="text-xs font-medium text-emerald-700 mb-1">
                          Score: {moduleResults.find((r) => r.passed)?.score}/100
                        </div>
                        <pre className="text-xs text-stone-300 bg-surface rounded border border-stone-700 p-2 overflow-x-auto whitespace-pre-wrap max-h-32">
                          {JSON.stringify(moduleResults.find((r) => r.passed)?.rawOutput, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
