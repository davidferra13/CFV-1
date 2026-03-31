import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getRecurringInvoices } from '@/lib/finance/recurring-invoice-actions'
import { RecurringInvoiceForm } from '@/components/finance/recurring-invoice-form'

export const metadata: Metadata = { title: 'Recurring Invoices' }

export default async function RecurringInvoicesPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  const [invoices, clientsResult] = await Promise.all([
    getRecurringInvoices().catch(() => null),
    db.from('clients').select('id, full_name').eq('tenant_id', user.tenantId!).order('full_name'),
  ])

  const clients = clientsResult.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Finance
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Recurring Invoices</h1>
        <p className="text-stone-500 mt-1">
          Manage automated invoices for retainer clients and recurring services
        </p>
      </div>

      <RecurringInvoiceForm initialInvoices={invoices ?? []} clients={clients} />
    </div>
  )
}
