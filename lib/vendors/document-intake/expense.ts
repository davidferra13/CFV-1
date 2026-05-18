import type { DraftExpenseRow, DraftExpenseSummary, ParsedCsv } from './types'
import {
  detectColumnIndex,
  inferPriceFormat,
  normalizeCategory,
  parseDateGuess,
  parseNumberish,
  toCents,
} from './shared'

export function parseExpenseDraftFromTabular(parsed: ParsedCsv): DraftExpenseSummary {
  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    throw new Error('Expense sheet must include a header row and data rows')
  }

  const descriptionIdx = detectColumnIndex(parsed.headers, [
    'description',
    'item',
    'expense',
    'memo',
  ])
  const amountIdx = detectColumnIndex(parsed.headers, ['amount', 'total', 'price', 'cost'])
  const dateIdx = detectColumnIndex(parsed.headers, ['date', 'purchase date', 'expense date'])
  const categoryIdx = detectColumnIndex(parsed.headers, ['category', 'type', 'tag'])

  if (descriptionIdx < 0 || amountIdx < 0) {
    throw new Error('Could not detect expense columns (description + amount)')
  }

  const rawAmounts = parsed.rows
    .map((row) => parseNumberish(row[amountIdx] ?? ''))
    .filter((value): value is number => value != null && value >= 0)
  const format = inferPriceFormat(rawAmounts)
  const warnings: string[] = []

  const rows: DraftExpenseRow[] = []
  for (const row of parsed.rows) {
    const description = (row[descriptionIdx] ?? '').trim()
    const amountRaw = parseNumberish(row[amountIdx] ?? '')
    if (!description || amountRaw == null) continue

    const amountCents = toCents(amountRaw, format)
    if (amountCents <= 0) {
      warnings.push(`Skipped row "${description}" due to non-positive amount`)
      continue
    }

    rows.push({
      description,
      amount_cents: amountCents,
      expense_date: dateIdx >= 0 ? parseDateGuess(row[dateIdx] ?? '') : null,
      category: categoryIdx >= 0 ? normalizeCategory(row[categoryIdx] ?? '') : 'other',
    })
  }

  const inferredTotalCents = rows.reduce((sum, row) => sum + row.amount_cents, 0)

  return {
    expense_rows_count: rows.length,
    inferred_total_cents: inferredTotalCents,
    inferred_price_format: format,
    rows,
    rows_preview: rows.slice(0, 12),
    warnings,
  }
}

export function normalizeCompareText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

export function expenseRowKey(input: {
  expense_date: string
  amount_cents: number
  description: string
}): string {
  return `${input.expense_date}|${input.amount_cents}|${normalizeCompareText(input.description)}`
}

export async function findPotentialExpenseDuplicates(params: {
  db: any
  tenantId: string
  vendorName: string | null
  rows: Array<{
    expense_date: string
    amount_cents: number
    description: string
  }>
}): Promise<
  Array<{
    rowDescription: string
    existingExpenseId: string
    reason: string
    expenseDate: string
    amountCents: number
    normalizedDescription: string
  }>
> {
  if (params.rows.length === 0) return []

  const uniqueDates = Array.from(new Set(params.rows.map((row) => row.expense_date))).slice(0, 100)
  const uniqueAmounts = Array.from(new Set(params.rows.map((row) => row.amount_cents))).slice(
    0,
    200
  )

  let query = params.db
    .from('expenses')
    .select('id, expense_date, amount_cents, description, vendor_name')
    .eq('tenant_id', params.tenantId)
    .in('expense_date', uniqueDates)
    .in('amount_cents', uniqueAmounts)
    .limit(1000)

  if (params.vendorName) {
    query = query.eq('vendor_name', params.vendorName)
  }

  const { data: existingRows } = await query
  const duplicates: Array<{
    rowDescription: string
    existingExpenseId: string
    reason: string
    expenseDate: string
    amountCents: number
    normalizedDescription: string
  }> = []

  for (const row of params.rows) {
    const normalizedIncoming = normalizeCompareText(row.description)
    const matches = (existingRows ?? []).filter((existing: any) => {
      if (existing.expense_date !== row.expense_date) return false
      if (Number(existing.amount_cents) !== row.amount_cents) return false

      const normalizedExisting = normalizeCompareText(existing.description)
      return normalizedExisting === normalizedIncoming
    })

    for (const match of matches) {
      duplicates.push({
        rowDescription: row.description,
        existingExpenseId: match.id,
        reason: `same date + amount + description (${row.expense_date}, $${(row.amount_cents / 100).toFixed(2)})`,
        expenseDate: row.expense_date,
        amountCents: row.amount_cents,
        normalizedDescription: normalizedIncoming,
      })
    }
  }

  return duplicates
}
