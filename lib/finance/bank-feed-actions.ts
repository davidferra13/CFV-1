'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type BankConnection = {
  id: string
  provider: string
  institutionName: string
  accountName: string | null
  accountType: string
  isActive: boolean
  connectedAt: string
}

export type BankTransaction = {
  id: string
  bankConnectionId: string
  providerTransactionId: string | null
  amountCents: number
  date: string
  description: string | null
  vendorName: string | null
  suggestedCategory: string | null
  confirmedCategory: string | null
  matchedExpenseId: string | null
  status: 'pending' | 'confirmed' | 'ignored'
}

export type ReconciliationSummary = {
  pending: number
  confirmed: number
  ignored: number
  totalPendingCents: number
}

// ─── Schemas ─────────────────────────────────────────────────────

const ConnectBankSchema = z.object({
  provider: z.enum(['plaid', 'stripe']),
  providerAccountId: z.string().min(1),
  institutionName: z.string().min(1),
  accountName: z.string().optional(),
  accountType: z.enum(['checking', 'savings', 'credit_card', 'other']).default('checking'),
})

// ─── Actions ─────────────────────────────────────────────────────

export async function connectBankAccount(
  input: z.infer<typeof ConnectBankSchema>
): Promise<BankConnection> {
  const user = await requireChef()
  const parsed = ConnectBankSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('bank_connections')
    .upsert(
      {
        chef_id: user.tenantId!,
        provider: parsed.provider,
        provider_account_id: parsed.providerAccountId,
        institution_name: parsed.institutionName,
        account_name: parsed.accountName || null,
        account_type: parsed.accountType,
        is_active: true,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id,provider_account_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to connect bank account: ${error.message}`)

  revalidatePath('/finance/bank-feed')

  return {
    id: data.id,
    provider: data.provider,
    institutionName: data.institution_name,
    accountName: data.account_name,
    accountType: data.account_type,
    isActive: data.is_active,
    connectedAt: data.connected_at,
  }
}

export async function disconnectBankAccount(connectionId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('bank_connections')
    .update({ is_active: false })
    .eq('id', connectionId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to disconnect: ${error.message}`)
  revalidatePath('/finance/bank-feed')
}

export async function getBankConnections(): Promise<BankConnection[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('bank_connections')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .order('connected_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch connections: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    provider: row.provider,
    institutionName: row.institution_name,
    accountName: row.account_name,
    accountType: row.account_type,
    isActive: row.is_active,
    connectedAt: row.connected_at,
  }))
}

export async function getBankTransactions(filters?: {
  connectionId?: string
  status?: string
  startDate?: string
  endDate?: string
}): Promise<BankTransaction[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('bank_transactions')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('date', { ascending: false })
    .limit(200)

  if (filters?.connectionId) query = query.eq('bank_connection_id', filters.connectionId)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.startDate) query = query.gte('date', filters.startDate)
  if (filters?.endDate) query = query.lte('date', filters.endDate)

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`)

  return (data || []).map((row: any) => ({
    id: row.id,
    bankConnectionId: row.bank_connection_id,
    providerTransactionId: row.provider_transaction_id,
    amountCents: row.amount_cents,
    date: row.date,
    description: row.description,
    vendorName: row.vendor_name,
    suggestedCategory: row.suggested_category,
    confirmedCategory: row.confirmed_category,
    matchedExpenseId: row.matched_expense_id,
    status: row.status,
  }))
}

export async function confirmTransaction(
  transactionId: string,
  confirmedCategory: string,
  matchedExpenseId?: string
): Promise<BankTransaction> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('bank_transactions')
    .update({
      status: 'confirmed',
      confirmed_category: confirmedCategory,
      matched_expense_id: matchedExpenseId || null,
    })
    .eq('id', transactionId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to confirm transaction: ${error.message}`)

  revalidatePath('/finance/bank-feed')

  return {
    id: data.id,
    bankConnectionId: data.bank_connection_id,
    providerTransactionId: data.provider_transaction_id,
    amountCents: data.amount_cents,
    date: data.date,
    description: data.description,
    vendorName: data.vendor_name,
    suggestedCategory: data.suggested_category,
    confirmedCategory: data.confirmed_category,
    matchedExpenseId: data.matched_expense_id,
    status: data.status,
  }
}

export async function ignoreTransaction(transactionId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('bank_transactions')
    .update({ status: 'ignored' })
    .eq('id', transactionId)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to ignore transaction: ${error.message}`)
  revalidatePath('/finance/bank-feed')
}

/**
 * Add a manual (non-bank-imported) transaction for reconciliation tracking.
 */
export async function addManualTransaction(input: {
  description: string
  amountCents: number
  category: string
  date: string
}): Promise<BankTransaction> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('bank_transactions')
    .insert({
      chef_id: user.tenantId!,
      description: input.description,
      amount_cents: input.amountCents,
      suggested_category: input.category,
      date: input.date,
      status: 'pending',
      bank_connection_id: null,
      provider_transaction_id: null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add transaction: ${error.message}`)
  revalidatePath('/finance/bank-feed')

  return {
    id: data.id,
    bankConnectionId: data.bank_connection_id,
    providerTransactionId: data.provider_transaction_id,
    amountCents: data.amount_cents,
    date: data.date,
    description: data.description,
    vendorName: data.vendor_name,
    suggestedCategory: data.suggested_category,
    confirmedCategory: data.confirmed_category,
    matchedExpenseId: data.matched_expense_id,
    status: data.status,
  }
}

export async function getReconciliationSummary(): Promise<ReconciliationSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('bank_transactions')
    .select('status, amount_cents')
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to fetch summary: ${error.message}`)

  const rows = data || []
  const pending = rows.filter((r: any) => r.status === 'pending')
  const confirmed = rows.filter((r: any) => r.status === 'confirmed')
  const ignored = rows.filter((r: any) => r.status === 'ignored')

  return {
    pending: pending.length,
    confirmed: confirmed.length,
    ignored: ignored.length,
    totalPendingCents: pending.reduce((sum: number, r: any) => sum + Math.abs(r.amount_cents), 0),
  }
}
