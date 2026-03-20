'use server'

// Tax Deduction Identifier
// Scans the expense ledger and flags potentially missed or miscategorized deductions.
// Routed to Ollama (financial PII).
// Output is INSIGHT ONLY - never modifies ledger entries.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { withAiFallback } from './with-ai-fallback'
import { identifyDeductionsFormula } from '@/lib/formulas/tax-categories'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const DeductionFlagSchema = z.object({
  category: z.string(), // e.g. "Mileage", "Home Office", "Equipment"
  description: z.string(), // what was missed or misclassified
  estimatedAnnualValueCents: z.number().nullable(),
  affectedEntries: z.array(z.string()), // descriptions of the affected expenses
  action: z.string(), // what the chef should do
  priority: z.enum(['high', 'medium', 'low']),
})

const TaxDeductionResultSchema = z.object({
  flags: z.array(DeductionFlagSchema),
  totalEstimatedMissedCents: z.number(),
  summary: z.string(),
  disclaimer: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type TaxDeductionResult = z.infer<typeof TaxDeductionResultSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function identifyMissedDeductions(
  taxYearStart?: string,
  taxYearEnd?: string
): Promise<TaxDeductionResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const start = taxYearStart ?? `${new Date().getFullYear()}-01-01`
  const end = taxYearEnd ?? `${new Date().getFullYear()}-12-31`

  const { data: expenses } = await supabase
    .from('expenses')
    .select('description, amount_cents, category, expense_date, notes')
    .eq('tenant_id', user.tenantId!)
    .gte('expense_date', start)
    .lte('expense_date', end)
    .order('expense_date', { ascending: true })
    .limit(200)

  const expenseList = expenses ?? []

  // Also check mileage logs
  const { data: mileageLogs } = await supabase
    .from('mileage_logs')
    .select('miles, purpose, log_date')
    .eq('tenant_id', user.tenantId!)
    .gte('log_date', start)
    .lte('log_date', end)
    .limit(50)

  const systemPrompt = `You are a tax advisor specializing in self-employed private chef businesses.
Review this chef's expense list for the tax year and identify:
1. Potentially missed deductions (expenses that should be tracked but aren't showing)
2. Miscategorized expenses (e.g. "knife" under "supplies" instead of "equipment" for depreciation)
3. Patterns suggesting uncaptured deductions (mileage, home office, professional development)

Common missed deductions for private chefs:
- Vehicle mileage to grocery stores, events, and supply runs
- Home office deduction (if they do planning/admin at home)
- Professional development (cooking classes, books, subscriptions)
- Equipment depreciation (items >$500 should typically be depreciated)
- Business meals with clients
- Marketing and photography costs
- Health insurance premiums

Return valid JSON only. Always include the disclaimer about consulting a CPA.`

  const userContent = `
Tax year: ${start} to ${end}

Expenses logged (${expenseList.length} entries):
${
  expenseList
    .slice(0, 80)
    .map(
      (e: any) =>
        `- ${e.expense_date}: ${e.description} | $${((e.amount_cents ?? 0) / 100).toFixed(2)} | category: ${e.category ?? 'uncategorized'}${e.notes ? ' | ' + e.notes : ''}`
    )
    .join('\n') || '- No expenses found for this period'
}

Mileage logged: ${mileageLogs?.length ?? 0} entries
${(mileageLogs ?? [])
  .slice(0, 10)
  .map((m: any) => `- ${m.log_date}: ${m.miles ?? 0} miles, ${m.purpose ?? 'purpose unknown'}`)
  .join('\n')}

Return JSON: {
  "flags": [{ "category": "...", "description": "...", "estimatedAnnualValueCents": number|null, "affectedEntries": ["..."], "action": "...", "priority": "high|medium|low" }],
  "totalEstimatedMissedCents": number,
  "summary": "2-3 sentence overall summary",
  "disclaimer": "Always ends with recommendation to consult a CPA",
  "confidence": "high|medium|low"
}`

  // Map DB column names to formula type field names
  const formulaExpenses = expenseList.map((e: any) => ({
    description: e.description,
    amount_cents: e.amount_cents,
    category: e.category,
    date: e.expense_date,
    notes: e.notes,
  }))
  const formulaMileage = (mileageLogs ?? []).map((m: any) => ({
    miles: m.miles,
    purpose: m.purpose,
    date: m.log_date,
  }))

  const { result, source } = await withAiFallback(
    // Formula: IRS rule-based analysis - deterministic
    () => identifyDeductionsFormula(formulaExpenses, formulaMileage),
    // AI: enhanced analysis with contextual suggestions (when Ollama is online)
    () => parseWithOllama(systemPrompt, userContent, TaxDeductionResultSchema)
  )

  return { ...result, _aiSource: source } as TaxDeductionResult
}
