'use server'

import { requireChef } from '@/lib/auth/get-user'
import { generateVendorComparison, type VendorComparisonReport } from './vendor-comparison'

/**
 * Server action: generate vendor comparison report for a given month.
 * Auth-gated and tenant-scoped.
 */
export async function getVendorComparisonReport(
  month?: string
): Promise<VendorComparisonReport> {
  const user = await requireChef()

  // Validate month format if provided
  if (month) {
    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(month)) {
      throw new Error('Invalid month format. Use YYYY-MM.')
    }
  }

  return generateVendorComparison(user.tenantId!, month)
}
