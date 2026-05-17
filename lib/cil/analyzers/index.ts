// CIL Domain Analyzers - Orchestrator
// Runs all 8 domain analyzers in parallel, collects ProactiveSignal results.
// Each analyzer queries Postgres for the tenant's business data.

import type { ProactiveSignal } from '../types'

/**
 * Run all domain analyzers for a tenant. Returns combined signals.
 * Non-throwing: individual analyzer failures don't block others.
 */
export async function runAllAnalyzers(tenantId: string): Promise<ProactiveSignal[]> {
  const results = await Promise.allSettled([
    import('./finance').then((m) => m.analyzeFinance(tenantId)),
    import('./clients').then((m) => m.analyzeClients(tenantId)),
    import('./calendar').then((m) => m.analyzeCalendar(tenantId)),
    import('./inventory').then((m) => m.analyzeInventory(tenantId)),
    import('./reputation').then((m) => m.analyzeReputation(tenantId)),
    import('./pipeline').then((m) => m.analyzePipeline(tenantId)),
    import('./cannabis').then((m) => m.analyzeCannabis(tenantId)),
    import('./commitment').then((m) => m.analyzeCommitment(tenantId)),
  ])

  const signals: ProactiveSignal[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      signals.push(...result.value)
    } else {
      console.error('[CIL/Analyzers] One analyzer failed:', result.reason)
    }
  }

  return signals
}
