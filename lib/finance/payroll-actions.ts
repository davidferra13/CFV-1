'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computePayrollTaxes } from '@/lib/finance/payroll-constants'
import { csvRowSafe } from '@/lib/security/csv-sanitize'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  chefId: string
  staffMemberId: string | null
  name: string
  ssnLast4: string | null
  email: string | null
  phone: string | null
  addressStreet: string | null
  addressCity: string | null
  addressState: string | null
  addressZip: string | null
  filingStatus: 'single' | 'married_filing_jointly' | 'head_of_household'
  allowances: number
  additionalWithholdingCents: number
  hireDate: string
  terminationDate: string | null
  status: 'active' | 'terminated' | 'on_leave'
  payType: 'hourly' | 'salary'
  hourlyRateCents: number | null
  annualSalaryCents: number | null
}

export interface PayrollRecord {
  id: string
  chefId: string
  employeeId: string
  employeeName?: string
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  regularHours: number
  overtimeHours: number
  regularPayCents: number
  overtimePayCents: number
  grossPayCents: number
  federalIncomeTaxCents: number
  employeeSsTaxCents: number
  employeeMedicareTaxCents: number
  stateIncomeTaxCents: number
  employerSsTaxCents: number
  employerMedicareTaxCents: number
  employerFutaCents: number
  netPayCents: number
  notes: string | null
}

export interface Payroll941Summary {
  id: string
  chefId: string
  taxYear: number
  quarter: number
  totalWagesCents: number
  federalIncomeTaxWithheldCents: number
  employeeSsTaxCents: number
  employeeMedicareTaxCents: number
  employerSsTaxCents: number
  employerMedicareTaxCents: number
  totalTaxesCents: number
  filed: boolean
  filedAt: string | null
  confirmationNumber: string | null
  notes: string | null
}

export interface PayrollW2Summary {
  id: string
  chefId: string
  employeeId: string
  employeeName?: string
  taxYear: number
  box1WagesCents: number
  box2FederalWithheldCents: number
  box3SsWagesCents: number
  box4SsWithheldCents: number
  box5MedicareWagesCents: number
  box6MedicareWithheldCents: number
  box17StateTaxCents: number
  generatedAt: string
}

// ─── Employee CRUD ────────────────────────────────────────────────────────────

export async function listEmployees(includeTerminated = false): Promise<Employee[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db.from('employees').select('*').eq('chef_id', user.entityId).order('name')

  if (!includeTerminated) {
    query = query.neq('status', 'terminated')
  }

  const { data } = await query
  return (data || []).map(mapEmployee)
}

export async function createEmployee(input: {
  name: string
  ssnLast4?: string | null
  email?: string | null
  phone?: string | null
  addressStreet?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZip?: string | null
  filingStatus: 'single' | 'married_filing_jointly' | 'head_of_household'
  allowances: number
  additionalWithholdingCents: number
  hireDate: string
  payType: 'hourly' | 'salary'
  hourlyRateCents?: number | null
  annualSalaryCents?: number | null
  staffMemberId?: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('employees').insert({
    chef_id: user.entityId,
    staff_member_id: input.staffMemberId ?? null,
    name: input.name,
    ssn_last4: input.ssnLast4 ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address_street: input.addressStreet ?? null,
    address_city: input.addressCity ?? null,
    address_state: input.addressState ?? null,
    address_zip: input.addressZip ?? null,
    filing_status: input.filingStatus,
    allowances: input.allowances,
    additional_withholding_cents: input.additionalWithholdingCents,
    hire_date: input.hireDate,
    pay_type: input.payType,
    hourly_rate_cents: input.hourlyRateCents ?? null,
    annual_salary_cents: input.annualSalaryCents ?? null,
  })
}

export async function updateEmployee(
  id: string,
  input: Partial<{
    name: string
    ssnLast4: string | null
    email: string | null
    phone: string | null
    addressStreet: string | null
    addressCity: string | null
    addressState: string | null
    addressZip: string | null
    filingStatus: 'single' | 'married_filing_jointly' | 'head_of_household'
    allowances: number
    additionalWithholdingCents: number
    payType: 'hourly' | 'salary'
    hourlyRateCents: number | null
    annualSalaryCents: number | null
  }>
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) patch.name = input.name
  if (input.ssnLast4 !== undefined) patch.ssn_last4 = input.ssnLast4
  if (input.email !== undefined) patch.email = input.email
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.addressStreet !== undefined) patch.address_street = input.addressStreet
  if (input.addressCity !== undefined) patch.address_city = input.addressCity
  if (input.addressState !== undefined) patch.address_state = input.addressState
  if (input.addressZip !== undefined) patch.address_zip = input.addressZip
  if (input.filingStatus !== undefined) patch.filing_status = input.filingStatus
  if (input.allowances !== undefined) patch.allowances = input.allowances
  if (input.additionalWithholdingCents !== undefined)
    patch.additional_withholding_cents = input.additionalWithholdingCents
  if (input.payType !== undefined) patch.pay_type = input.payType
  if (input.hourlyRateCents !== undefined) patch.hourly_rate_cents = input.hourlyRateCents
  if (input.annualSalaryCents !== undefined) patch.annual_salary_cents = input.annualSalaryCents

  await db.from('employees').update(patch).eq('id', id).eq('chef_id', user.entityId)
}

export async function terminateEmployee(id: string, terminationDate: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('employees')
    .update({
      status: 'terminated',
      termination_date: terminationDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)
}

// ─── Payroll Records ──────────────────────────────────────────────────────────

export async function recordPayroll(input: {
  employeeId: string
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  regularHours: number
  overtimeHours: number
  hourlyRateCents: number
  overtimeRateCents: number
  federalIncomeTaxCents: number
  stateIncomeTaxCents: number
  ytdWagesCents: number
  notes?: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const regularPayCents = Math.round(input.regularHours * input.hourlyRateCents)
  const overtimePayCents = Math.round(input.overtimeHours * input.overtimeRateCents)
  const grossPayCents = regularPayCents + overtimePayCents

  const taxes = computePayrollTaxes(grossPayCents, input.ytdWagesCents)

  const totalEmployeeDeductions =
    input.federalIncomeTaxCents +
    taxes.employeeSsTaxCents +
    taxes.employeeMedicareTaxCents +
    input.stateIncomeTaxCents

  const netPayCents = grossPayCents - totalEmployeeDeductions

  await db.from('payroll_records').insert({
    chef_id: user.entityId,
    employee_id: input.employeeId,
    pay_period_start: input.payPeriodStart,
    pay_period_end: input.payPeriodEnd,
    pay_date: input.payDate,
    regular_hours: input.regularHours,
    overtime_hours: input.overtimeHours,
    regular_pay_cents: regularPayCents,
    overtime_pay_cents: overtimePayCents,
    gross_pay_cents: grossPayCents,
    federal_income_tax_cents: input.federalIncomeTaxCents,
    employee_ss_tax_cents: taxes.employeeSsTaxCents,
    employee_medicare_tax_cents: taxes.employeeMedicareTaxCents,
    state_income_tax_cents: input.stateIncomeTaxCents,
    employer_ss_tax_cents: taxes.employerSsTaxCents,
    employer_medicare_tax_cents: taxes.employerMedicareTaxCents,
    employer_futa_cents: taxes.employerFutaCents,
    net_pay_cents: netPayCents,
    notes: input.notes ?? null,
  })
}

export async function getPayrollRecords(filters?: {
  employeeId?: string
  year?: number
}): Promise<PayrollRecord[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('payroll_records')
    .select('*, employees(name)')
    .eq('chef_id', user.entityId)
    .order('pay_date', { ascending: false })

  if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
  if (filters?.year) {
    query = query.gte('pay_date', `${filters.year}-01-01`).lte('pay_date', `${filters.year}-12-31`)
  }

  const { data } = await query
  return (data || []).map((r: any) => ({
    ...mapPayrollRecord(r),
    employeeName: r.employees?.name,
  }))
}

// ─── Form 941 ─────────────────────────────────────────────────────────────────

export async function compute941Summary(
  taxYear: number,
  quarter: number
): Promise<Payroll941Summary> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Quarter date ranges
  const quarterRanges: Record<number, [string, string]> = {
    1: [`${taxYear}-01-01`, `${taxYear}-03-31`],
    2: [`${taxYear}-04-01`, `${taxYear}-06-30`],
    3: [`${taxYear}-07-01`, `${taxYear}-09-30`],
    4: [`${taxYear}-10-01`, `${taxYear}-12-31`],
  }
  const [start, end] = quarterRanges[quarter]

  const { data } = await db
    .from('payroll_records')
    .select(
      'gross_pay_cents, federal_income_tax_cents, employee_ss_tax_cents, employee_medicare_tax_cents, employer_ss_tax_cents, employer_medicare_tax_cents'
    )
    .eq('chef_id', user.entityId)
    .gte('pay_date', start)
    .lte('pay_date', end)

  const rows: any[] = data || []

  const totalWagesCents = rows.reduce((s, r) => s + r.gross_pay_cents, 0)
  const federalIncomeTaxWithheldCents = rows.reduce((s, r) => s + r.federal_income_tax_cents, 0)
  const employeeSsTaxCents = rows.reduce((s, r) => s + r.employee_ss_tax_cents, 0)
  const employeeMedicareTaxCents = rows.reduce((s, r) => s + r.employee_medicare_tax_cents, 0)
  const employerSsTaxCents = rows.reduce((s, r) => s + r.employer_ss_tax_cents, 0)
  const employerMedicareTaxCents = rows.reduce((s, r) => s + r.employer_medicare_tax_cents, 0)

  const totalTaxesCents =
    federalIncomeTaxWithheldCents +
    employeeSsTaxCents +
    employeeMedicareTaxCents +
    employerSsTaxCents +
    employerMedicareTaxCents

  return {
    id: '',
    chefId: user.entityId,
    taxYear,
    quarter,
    totalWagesCents,
    federalIncomeTaxWithheldCents,
    employeeSsTaxCents,
    employeeMedicareTaxCents,
    employerSsTaxCents,
    employerMedicareTaxCents,
    totalTaxesCents,
    filed: false,
    filedAt: null,
    confirmationNumber: null,
    notes: null,
  }
}

export async function save941Summary(taxYear: number, quarter: number): Promise<void> {
  const summary = await compute941Summary(taxYear, quarter)
  const user = await requireChef()
  const db: any = createServerClient()

  await db.from('payroll_941_summaries').upsert(
    {
      chef_id: user.entityId,
      tax_year: taxYear,
      quarter,
      total_wages_cents: summary.totalWagesCents,
      federal_income_tax_withheld_cents: summary.federalIncomeTaxWithheldCents,
      employee_ss_tax_cents: summary.employeeSsTaxCents,
      employee_medicare_tax_cents: summary.employeeMedicareTaxCents,
      employer_ss_tax_cents: summary.employerSsTaxCents,
      employer_medicare_tax_cents: summary.employerMedicareTaxCents,
      total_taxes_cents: summary.totalTaxesCents,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,tax_year,quarter' }
  )
}

export async function mark941Filed(input: {
  taxYear: number
  quarter: number
  confirmationNumber: string | null
  notes: string | null
}): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('payroll_941_summaries')
    .update({
      filed: true,
      filed_at: new Date().toISOString(),
      confirmation_number: input.confirmationNumber,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('chef_id', user.entityId)
    .eq('tax_year', input.taxYear)
    .eq('quarter', input.quarter)
}

export async function get941Summaries(taxYear: number): Promise<Payroll941Summary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('payroll_941_summaries')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('tax_year', taxYear)
    .order('quarter')

  return (data || []).map(map941Summary)
}

// ─── W-2 ──────────────────────────────────────────────────────────────────────

export async function generateW2Summaries(taxYear: number): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: employees } = await db.from('employees').select('id').eq('chef_id', user.entityId)

  const { data: records } = await db
    .from('payroll_records')
    .select(
      'employee_id, gross_pay_cents, federal_income_tax_cents, employee_ss_tax_cents, employee_medicare_tax_cents, state_income_tax_cents'
    )
    .eq('chef_id', user.entityId)
    .gte('pay_date', `${taxYear}-01-01`)
    .lte('pay_date', `${taxYear}-12-31`)

  const allRecords: any[] = records || []

  for (const emp of employees || []) {
    const empRecords = allRecords.filter((r: any) => r.employee_id === emp.id)
    if (empRecords.length === 0) continue

    const box1 = empRecords.reduce((s: number, r: any) => s + r.gross_pay_cents, 0)
    const box2 = empRecords.reduce((s: number, r: any) => s + r.federal_income_tax_cents, 0)
    const box4 = empRecords.reduce((s: number, r: any) => s + r.employee_ss_tax_cents, 0)
    const box6 = empRecords.reduce((s: number, r: any) => s + r.employee_medicare_tax_cents, 0)
    const box17 = empRecords.reduce((s: number, r: any) => s + r.state_income_tax_cents, 0)

    await db.from('payroll_w2_summaries').upsert(
      {
        chef_id: user.entityId,
        employee_id: emp.id,
        tax_year: taxYear,
        box1_wages_cents: box1,
        box2_federal_withheld_cents: box2,
        box3_ss_wages_cents: box1,
        box4_ss_withheld_cents: box4,
        box5_medicare_wages_cents: box1,
        box6_medicare_withheld_cents: box6,
        box17_state_tax_cents: box17,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id,employee_id,tax_year' }
    )
  }
}

export async function getW2Summaries(taxYear: number): Promise<PayrollW2Summary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('payroll_w2_summaries')
    .select('*, employees(name)')
    .eq('chef_id', user.entityId)
    .eq('tax_year', taxYear)
    .order('employees(name)')

  return (data || []).map((r: any) => ({
    ...mapW2Summary(r),
    employeeName: r.employees?.name,
  }))
}

export async function exportW2ToCSV(taxYear: number): Promise<string> {
  const summaries = await getW2Summaries(taxYear)

  const lines = [
    '# W-2 Reference Data - NOT for filing. Use IRS-approved payroll software to file W-2s with the SSA.',
    `# Tax Year: ${taxYear}`,
    `# Generated: ${new Date().toISOString()}`,
    '',
    'Employee,Box 1 Wages,Box 2 Federal Tax,Box 3 SS Wages,Box 4 SS Tax,Box 5 Medicare Wages,Box 6 Medicare Tax,Box 17 State Tax',
    ...summaries.map((s) =>
      csvRowSafe([
        s.employeeName ?? s.employeeId,
        (s.box1WagesCents / 100).toFixed(2),
        (s.box2FederalWithheldCents / 100).toFixed(2),
        (s.box3SsWagesCents / 100).toFixed(2),
        (s.box4SsWithheldCents / 100).toFixed(2),
        (s.box5MedicareWagesCents / 100).toFixed(2),
        (s.box6MedicareWithheldCents / 100).toFixed(2),
        (s.box17StateTaxCents / 100).toFixed(2),
      ])
    ),
  ]

  return lines.join('\n')
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapEmployee(r: any): Employee {
  return {
    id: r.id,
    chefId: r.chef_id,
    staffMemberId: r.staff_member_id,
    name: r.name,
    ssnLast4: r.ssn_last4,
    email: r.email,
    phone: r.phone,
    addressStreet: r.address_street,
    addressCity: r.address_city,
    addressState: r.address_state,
    addressZip: r.address_zip,
    filingStatus: r.filing_status,
    allowances: r.allowances,
    additionalWithholdingCents: r.additional_withholding_cents,
    hireDate: r.hire_date,
    terminationDate: r.termination_date,
    status: r.status,
    payType: r.pay_type,
    hourlyRateCents: r.hourly_rate_cents,
    annualSalaryCents: r.annual_salary_cents,
  }
}

function mapPayrollRecord(r: any): PayrollRecord {
  return {
    id: r.id,
    chefId: r.chef_id,
    employeeId: r.employee_id,
    payPeriodStart: r.pay_period_start,
    payPeriodEnd: r.pay_period_end,
    payDate: r.pay_date,
    regularHours: parseFloat(r.regular_hours),
    overtimeHours: parseFloat(r.overtime_hours),
    regularPayCents: r.regular_pay_cents,
    overtimePayCents: r.overtime_pay_cents,
    grossPayCents: r.gross_pay_cents,
    federalIncomeTaxCents: r.federal_income_tax_cents,
    employeeSsTaxCents: r.employee_ss_tax_cents,
    employeeMedicareTaxCents: r.employee_medicare_tax_cents,
    stateIncomeTaxCents: r.state_income_tax_cents,
    employerSsTaxCents: r.employer_ss_tax_cents,
    employerMedicareTaxCents: r.employer_medicare_tax_cents,
    employerFutaCents: r.employer_futa_cents,
    netPayCents: r.net_pay_cents,
    notes: r.notes,
  }
}

function map941Summary(r: any): Payroll941Summary {
  return {
    id: r.id,
    chefId: r.chef_id,
    taxYear: r.tax_year,
    quarter: r.quarter,
    totalWagesCents: r.total_wages_cents,
    federalIncomeTaxWithheldCents: r.federal_income_tax_withheld_cents,
    employeeSsTaxCents: r.employee_ss_tax_cents,
    employeeMedicareTaxCents: r.employee_medicare_tax_cents,
    employerSsTaxCents: r.employer_ss_tax_cents,
    employerMedicareTaxCents: r.employer_medicare_tax_cents,
    totalTaxesCents: r.total_taxes_cents,
    filed: r.filed,
    filedAt: r.filed_at,
    confirmationNumber: r.confirmation_number,
    notes: r.notes,
  }
}

function mapW2Summary(r: any): PayrollW2Summary {
  return {
    id: r.id,
    chefId: r.chef_id,
    employeeId: r.employee_id,
    taxYear: r.tax_year,
    box1WagesCents: r.box1_wages_cents,
    box2FederalWithheldCents: r.box2_federal_withheld_cents,
    box3SsWagesCents: r.box3_ss_wages_cents,
    box4SsWithheldCents: r.box4_ss_withheld_cents,
    box5MedicareWagesCents: r.box5_medicare_wages_cents,
    box6MedicareWithheldCents: r.box6_medicare_withheld_cents,
    box17StateTaxCents: r.box17_state_tax_cents,
    generatedAt: r.generated_at,
  }
}
