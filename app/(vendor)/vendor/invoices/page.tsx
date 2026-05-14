import { requireVendor } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { vendorInvoices } from '@/lib/db/schema/schema'
import { eq, desc } from 'drizzle-orm'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Invoices' }

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-900/50 text-amber-300 border-amber-700',
  matched: 'bg-green-900/50 text-green-300 border-green-700',
  disputed: 'bg-red-900/50 text-red-300 border-red-700',
}

function statusLabel(status: string): string {
  return status.replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function VendorInvoicesPage() {
  let user
  try {
    user = await requireVendor()
  } catch {
    redirect('/auth/signin?portal=vendor')
  }

  const invoices = await db
    .select({
      id: vendorInvoices.id,
      invoiceNumber: vendorInvoices.invoiceNumber,
      invoiceDate: vendorInvoices.invoiceDate,
      totalCents: vendorInvoices.totalCents,
      status: vendorInvoices.status,
    })
    .from(vendorInvoices)
    .where(eq(vendorInvoices.vendorId, user.vendorId))
    .orderBy(desc(vendorInvoices.invoiceDate))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Invoices</h1>
        <p className="text-sm text-stone-400 mt-1">Your submitted invoices</p>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-8 text-center">
          <p className="text-stone-400">No invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-lg border border-stone-700 bg-stone-900 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-100">
                    {inv.invoiceNumber ?? 'No number'}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{inv.invoiceDate}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-stone-200">
                    ${(inv.totalCents / 100).toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      STATUS_COLORS[inv.status] ?? 'bg-stone-800 text-stone-400 border-stone-600'
                    )}
                  >
                    {statusLabel(inv.status)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
