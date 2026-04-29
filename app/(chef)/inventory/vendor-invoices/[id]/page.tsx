import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getVendorInvoices } from '@/lib/inventory/vendor-invoice-actions'
import { getIngredients } from '@/lib/recipes/actions'
import { VendorInvoiceMatcher } from '@/components/inventory/vendor-invoice-matcher'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Vendor Invoice Match' }

type Props = {
  params: Promise<{ id: string }>
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export default async function VendorInvoiceDetailPage({ params }: Props) {
  await requireChef()
  const { id } = await params

  let invoices: Awaited<ReturnType<typeof getVendorInvoices>>
  let ingredients: Awaited<ReturnType<typeof getIngredients>>

  try {
    ;[invoices, ingredients] = await Promise.all([getVendorInvoices(), getIngredients()])
  } catch (err) {
    console.error('[vendor-invoices] failed to load invoice detail', err)
    return (
      <div className="space-y-6">
        <Link
          href="/inventory/vendor-invoices"
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          Back to vendor invoices
        </Link>
        <Card className="p-6">
          <h1 className="text-xl font-semibold text-stone-100">Could not load invoice</h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            ChefFlow could not load the invoice or ingredient price list. No matching changes were
            made.
          </p>
        </Card>
      </div>
    )
  }

  const invoice = invoices.find((item) => item.id === id)
  if (!invoice) notFound()

  const knownPrices = ingredients
    .filter(
      (ingredient: any) => typeof ingredient.id === 'string' && typeof ingredient.name === 'string'
    )
    .map((ingredient: any) => ({
      ingredientId: ingredient.id,
      name: ingredient.name,
      lastPriceCents: Number(ingredient.last_price_cents ?? 0),
    }))

  const matcherInvoice = {
    id: invoice.id,
    vendorName: invoice.vendorId ? `Vendor ${invoice.vendorId.slice(0, 8)}` : undefined,
    invoiceNumber: invoice.invoiceNumber || 'No invoice number',
    invoiceDate: invoice.invoiceDate,
    totalCents: invoice.totalCents,
    status: invoice.status,
    items: invoice.items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
      matchedIngredientId: item.matchedIngredientId ?? undefined,
      priceChanged: item.priceChanged,
    })),
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventory/vendor-invoices"
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          Back to vendor invoices
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Match Vendor Invoice</h1>
        <p className="mt-1 text-stone-500">
          Review {matcherInvoice.invoiceNumber} from {invoice.invoiceDate},{' '}
          {formatMoney(invoice.totalCents)}.
        </p>
      </div>

      {knownPrices.length === 0 ? (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-stone-100">No ingredient prices available</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Add ingredients with prices before matching invoice line items. The invoice is still
            available here for review.
          </p>
          <Link
            href="/culinary/ingredients"
            className="mt-3 inline-flex text-sm font-medium text-brand-400"
          >
            Open ingredients
          </Link>
        </Card>
      ) : null}

      <VendorInvoiceMatcher invoice={matcherInvoice} knownPrices={knownPrices} />
    </div>
  )
}
