// Payroll tax constants - NOT 'use server'; safe to import in both client and server contexts

/** Employee + employer share */
export const SS_TAX_RATE = 0.062 // 6.2% each side
export const MEDICARE_TAX_RATE = 0.0145 // 1.45% each side
/** Additional Medicare on wages over $200,000 (employee only) */
export const ADDITIONAL_MEDICARE_RATE = 0.009

/** 2025 SS wage base: $176,100 */
export const SS_WAGE_BASE_2025_CENTS = 17610000

/** FUTA: 0.6% net rate (after state credit) on first $7,000 */
export const FUTA_RATE = 0.006
export const FUTA_WAGE_BASE_CENTS = 700000

export const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  salary: 'Salaried',
}

export const FILING_STATUS_LABELS: Record<string, string> = {
  single: 'Single',
  married_filing_jointly: 'Married Filing Jointly',
  head_of_household: 'Head of Household',
}

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  terminated: 'Terminated',
  on_leave: 'On Leave',
}

export const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (Jan – Mar)',
  2: 'Q2 (Apr – Jun)',
  3: 'Q3 (Jul – Sep)',
  4: 'Q4 (Oct – Dec)',
}

export const QUARTER_DUE_DATES: Record<number, string> = {
  1: 'April 30',
  2: 'July 31',
  3: 'October 31',
  4: 'January 31',
}

/**
 * Compute payroll taxes for a single pay run.
 * Returns all withholding and employer tax amounts in cents.
 *
 * grossPayCents: employee gross wages for this pay period
 * ytdWagesCents: year-to-date wages BEFORE this pay period (for wage base limits)
 */
export function computePayrollTaxes(
  grossPayCents: number,
  ytdWagesCents: number
): {
  employeeSsTaxCents: number
  employeeMedicareTaxCents: number
  employerSsTaxCents: number
  employerMedicareTaxCents: number
  employerFutaCents: number
} {
  // SS: applies up to wage base
  const ssEligible = Math.max(0, Math.min(grossPayCents, SS_WAGE_BASE_2025_CENTS - ytdWagesCents))
  const employeeSsTaxCents = Math.round(ssEligible * SS_TAX_RATE)
  const employerSsTaxCents = employeeSsTaxCents // matching

  // Medicare: no wage cap
  const employeeMedicareTaxCents = Math.round(grossPayCents * MEDICARE_TAX_RATE)
  const employerMedicareTaxCents = employeeMedicareTaxCents // matching

  // FUTA: employer only, on first $7,000
  const futaEligible = Math.max(0, Math.min(grossPayCents, FUTA_WAGE_BASE_CENTS - ytdWagesCents))
  const employerFutaCents = Math.round(futaEligible * FUTA_RATE)

  return {
    employeeSsTaxCents,
    employeeMedicareTaxCents,
    employerSsTaxCents,
    employerMedicareTaxCents,
    employerFutaCents,
  }
}
