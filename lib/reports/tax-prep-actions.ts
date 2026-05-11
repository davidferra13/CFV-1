'use server'

import { requireChef } from '@/lib/auth/get-user'
import { generateTaxPrep, type TaxPrepReport } from './tax-prep'

/**
 * Server action: generate the full tax prep report for a given year.
 * Auth-gated and tenant-scoped.
 */
export async function getTaxPrepReport(year: number): Promise<TaxPrepReport> {
  const user = await requireChef()

  if (!Number.isInteger(year) || year < 2020 || year > 2040) {
    throw new Error('Invalid tax year')
  }

  return generateTaxPrep(user.tenantId!, year)
}
