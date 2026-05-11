'use server'

// Client Relationship Summary Server Actions
// Auth-gated, tenant-scoped actions for generating client summary reports.

import { requireChef } from '@/lib/auth/get-user'
import { generateClientSummary, type ClientSummaryReport } from './client-summary'

/**
 * Generate a full client relationship summary report.
 * Requires chef auth; tenant is derived from session.
 */
export async function getClientSummaryReport(
  clientId: string
): Promise<{ success: true; report: ClientSummaryReport } | { success: false; error: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (!clientId || typeof clientId !== 'string') {
    return { success: false, error: 'Invalid client ID' }
  }

  try {
    const report = await generateClientSummary(clientId, tenantId)
    return { success: true, report }
  } catch (err) {
    console.error('[client-summary] generateClientSummary failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate client summary',
    }
  }
}
