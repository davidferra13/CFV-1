import type { Metadata } from 'next'
import Link from 'next/link'
import { getPassivePurchasesForCurrentClient } from '@/lib/passive-store/store'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'My Purchases' }

export const dynamic = 'force-dynamic'

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export default async function MyHubPurchasesPage() {
  const purchases = await getPassivePurchasesForCurrentClient()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">My Purchases</h1>
          <p className="mt-1 text-stone-400">
            Orders from chef storefronts, including instant digital products and stored credit.
          </p>
        </div>
        <Link
          href="/my-hub"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
        >
          Back to My Circles
        </Link>
      </div>

      <div className="grid gap-4">
        {purchases.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-stone-700 bg-stone-900/40 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-stone-100">No storefront purchases yet</h2>
            <p className="mt-2 text-sm text-stone-400">
              Orders you complete from chef storefronts will appear here automatically.
            </p>
          </div>
        ) : (
          purchases.map((purchase) => {
            const title = readString(purchase.product_snapshot.title) || 'Storefront purchase'
            const chefSlug = readString(purchase.product_snapshot.chef_slug)
            return (
              <article
                key={purchase.purchase_id}
                className="rounded-[1.6rem] border border-stone-800 bg-stone-950/60 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-stone-100">{title}</p>
                    <p className="mt-1 text-sm text-stone-400">{purchase.buyer_email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-base font-semibold text-stone-100">
                      {formatCurrency(purchase.amount_cents)}
                    </p>
                    {chefSlug ? (
                      <Link
                        href={`/chef/${chefSlug}/store/orders/${purchase.access_token}`}
                        className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400"
                      >
                        View order
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
