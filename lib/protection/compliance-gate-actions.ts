'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getCertificationSummary } from '@/lib/compliance/certification-actions'
import { getInsuranceStats } from '@/lib/compliance/insurance-actions'
import { getExpiringPermits } from '@/lib/compliance/permit-actions'

// Compliance Gate - Pre-event compliance aggregation
// Module: protection
// Checks insurance validity, certifications, and permits.
// Deterministic: formula > AI.

export type ComplianceCheckItem = {
  key: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  route: string
}

export type ComplianceGateResult = {
  items: ComplianceCheckItem[]
  overallStatus: 'clear' | 'warnings' | 'blocked'
  passCount: number
  warnCount: number
  failCount: number
}

/**
 * Run full compliance gate check for the current chef.
 * Returns checklist items with pass/warn/fail for each compliance area.
 */
export async function checkComplianceGate(): Promise<ComplianceGateResult> {
  await requireChef()

  const items: ComplianceCheckItem[] = []

  // 1. Certifications
  try {
    const certSummary = await getCertificationSummary()
    if (certSummary.missingRequired > 0) {
      items.push({
        key: 'certs_missing',
        label: 'Required Certifications',
        status: 'fail',
        detail: `${certSummary.missingRequired} required certification${certSummary.missingRequired > 1 ? 's' : ''} missing (food handler, business license, or liability insurance)`,
        route: '/settings/protection/certifications',
      })
    } else if (certSummary.expired > 0) {
      items.push({
        key: 'certs_expired',
        label: 'Certifications',
        status: 'fail',
        detail: `${certSummary.expired} certification${certSummary.expired > 1 ? 's' : ''} expired`,
        route: '/settings/protection/certifications',
      })
    } else if (certSummary.expiringSoon > 0) {
      items.push({
        key: 'certs_expiring',
        label: 'Certifications',
        status: 'warn',
        detail: `${certSummary.expiringSoon} certification${certSummary.expiringSoon > 1 ? 's' : ''} expiring soon`,
        route: '/settings/protection/certifications',
      })
    } else if (certSummary.totalActive > 0) {
      items.push({
        key: 'certs_ok',
        label: 'Certifications',
        status: 'pass',
        detail: `${certSummary.totalActive} active certification${certSummary.totalActive > 1 ? 's' : ''}`,
        route: '/settings/protection/certifications',
      })
    } else {
      items.push({
        key: 'certs_none',
        label: 'Certifications',
        status: 'warn',
        detail: 'No certifications on file',
        route: '/settings/protection/certifications',
      })
    }
  } catch {
    // Non-blocking if certification system unavailable
  }

  // 2. Insurance
  try {
    const insuranceStats = await getInsuranceStats()
    if (insuranceStats.activeCount === 0) {
      items.push({
        key: 'insurance_none',
        label: 'Insurance',
        status: 'fail',
        detail: 'No active insurance policies',
        route: '/settings/protection/insurance',
      })
    } else if (insuranceStats.expiringSoonCount > 0) {
      items.push({
        key: 'insurance_expiring',
        label: 'Insurance',
        status: 'warn',
        detail: `${insuranceStats.expiringSoonCount} polic${insuranceStats.expiringSoonCount > 1 ? 'ies' : 'y'} expiring soon${insuranceStats.nextExpiryDate ? ` (next: ${insuranceStats.nextExpiryDate})` : ''}`,
        route: '/settings/protection/insurance',
      })
    } else {
      items.push({
        key: 'insurance_ok',
        label: 'Insurance',
        status: 'pass',
        detail: `${insuranceStats.activeCount} active polic${insuranceStats.activeCount > 1 ? 'ies' : 'y'}`,
        route: '/settings/protection/insurance',
      })
    }
  } catch {
    // Non-blocking
  }

  // 3. Permits
  try {
    const expiringPermits = await getExpiringPermits(30)
    if (expiringPermits.length > 0) {
      const expired = expiringPermits.filter((p: any) => new Date(p.expiry_date) < new Date())
      const expiringSoon = expiringPermits.filter((p: any) => new Date(p.expiry_date) >= new Date())
      if (expired.length > 0) {
        items.push({
          key: 'permits_expired',
          label: 'Permits',
          status: 'fail',
          detail: `${expired.length} permit${expired.length > 1 ? 's' : ''} expired`,
          route: '/settings/protection',
        })
      } else {
        items.push({
          key: 'permits_expiring',
          label: 'Permits',
          status: 'warn',
          detail: `${expiringSoon.length} permit${expiringSoon.length > 1 ? 's' : ''} expiring within 30 days`,
          route: '/settings/protection',
        })
      }
    } else {
      items.push({
        key: 'permits_ok',
        label: 'Permits',
        status: 'pass',
        detail: 'All permits current',
        route: '/settings/protection',
      })
    }
  } catch {
    // Non-blocking
  }

  const passCount = items.filter((i) => i.status === 'pass').length
  const warnCount = items.filter((i) => i.status === 'warn').length
  const failCount = items.filter((i) => i.status === 'fail').length

  return {
    items,
    overallStatus: failCount > 0 ? 'blocked' : warnCount > 0 ? 'warnings' : 'clear',
    passCount,
    warnCount,
    failCount,
  }
}
