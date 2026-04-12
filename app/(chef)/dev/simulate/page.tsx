// AI Simulation Control Panel
// Runs the sim-to-real quality loop: Ollama generates scenarios → pipeline runs them
// → Ollama grades outputs → failures surface here for prompt improvement.
// Route: /dev/simulate - chef-only, protected by layout

import type { Metadata } from 'next'
import { requireChefAdmin } from '@/lib/auth/get-user'
import {
  getSimulationRuns,
  getSimulationResults,
  getSimulationSummary,
} from '@/lib/simulation/simulation-actions'
import { SimulateClient } from './simulate-client'

export const metadata: Metadata = { title: 'Simulation Lab' }

export default async function SimulatePage() {
  await requireChefAdmin()

  const [summary, recentRuns] = await Promise.all([getSimulationSummary(), getSimulationRuns(5)])

  // Load results for the most recent completed run
  const latestCompletedRun = recentRuns.find((r) => r.status === 'completed')
  const latestResults = latestCompletedRun ? await getSimulationResults(latestCompletedRun.id) : []

  return (
    <SimulateClient
      summary={summary}
      recentRuns={recentRuns}
      latestRun={latestCompletedRun ?? null}
      latestResults={latestResults}
    />
  )
}
