// IRS retirement contribution limits (2024/2025)
// These are informational - always verify current-year limits with the IRS.

export const SEP_IRA_RATE = 0.25 // 25% of net self-employment income
export const SEP_IRA_MAX_CENTS = 6900000 // $69,000 (2024)

export const SOLO_401K_EMPLOYEE_MAX_CENTS = 2300000 // $23,000 (2024) employee elective deferral
export const SOLO_401K_CATCHUP_CENTS = 760000 // $7,600 (2024, age 50+)
export const SOLO_401K_TOTAL_MAX_CENTS = 6900000 // $69,000 (2024) combined employee + employer

export const TRADITIONAL_IRA_MAX_CENTS = 700000 // $7,000 (2024)
export const TRADITIONAL_IRA_CATCHUP_CENTS = 100000 // $1,000 (2024, age 50+)

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  sep_ira: 'SEP-IRA',
  solo_401k: 'Solo 401(k)',
  simple_ira: 'SIMPLE IRA',
  traditional_ira: 'Traditional IRA',
}

export const PREMIUM_TYPE_LABELS: Record<string, string> = {
  self: 'Self',
  spouse: 'Spouse',
  dependents: 'Dependents',
  long_term_care: 'Long-Term Care Insurance',
}
