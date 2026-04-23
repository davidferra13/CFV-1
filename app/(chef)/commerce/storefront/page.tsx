import type { Metadata } from 'next'
import Link from 'next/link'
import { getPassiveStorefrontOverviewForChef } from '@/lib/passive-store/store'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Passive Storefront' }

export const dynamic = 'force-dynamic'

export default async function ChefPassiveStorefrontPage() {
  const overview = await getPassiveStorefrontOverviewForChef()

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
            Passive Revenue
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-100">Storefront</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-400">
            ChefFlow is converting your current menus, recipes, event history, and pricing into
            sellable products automatically. No product setup is required.
          </p>
        </div>
        <Link
          href={`/chef/${overview.chefSlug}/store`}
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400"
        >
          Open public storefront
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.6rem] border border-stone-800 bg-stone-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Active products</p>
          <p className="mt-2 text-3xl font-semibold text-stone-100">
            {overview.metrics.activeProductCount}
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-stone-800 bg-stone-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Orders</p>
          <p className="mt-2 text-3xl font-semibold text-stone-100">
            {overview.metrics.orderCount}
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-stone-800 bg-stone-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Revenue</p>
          <p className="mt-2 text-3xl font-semibold text-stone-100">
            {formatCurrency(overview.metrics.revenueCents)}
          </p>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-stone-800 bg-stone-950/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-100">Generated catalog</h2>
            <p className="mt-1 text-sm text-stone-400">
              These products refresh automatically from current source data.
            </p>
          </div>
          <div className="rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-300">
            {overview.products.length} total
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {overview.products.map((product) => (
            <article
              key={product.product_id}
              className="rounded-[1.4rem] border border-stone-800 bg-stone-900/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
                    {String(product.metadata.label ?? product.product_type).replace('_', ' ')}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-stone-100">{product.title}</h3>
                </div>
                <div className="rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-300">
                  {formatCurrency(product.price)}
                </div>
              </div>
              <p className="mt-3 text-sm text-stone-400">{product.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-stone-800 bg-stone-950/60 p-6">
        <h2 className="text-xl font-semibold text-stone-100">Recent orders</h2>
        <div className="mt-5 grid gap-4">
          {overview.purchases.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-stone-700 bg-stone-900/40 px-5 py-8 text-sm text-stone-400">
              No orders yet. The storefront is live and ready to sell.
            </div>
          ) : (
            overview.purchases.map((purchase) => (
              <div
                key={purchase.purchase_id}
                className="flex flex-col gap-3 rounded-[1.4rem] border border-stone-800 bg-stone-900/60 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-stone-100">
                    {String(
                      (purchase.product_snapshot.title as string | undefined) ?? 'Store order'
                    )}
                  </p>
                  <p className="mt-1 text-sm text-stone-400">
                    {purchase.buyer_name} - {purchase.buyer_email}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-base font-semibold text-stone-100">
                    {formatCurrency(purchase.amount_cents)}
                  </p>
                  <Link
                    href={`/chef/${overview.chefSlug}/store/orders/${purchase.access_token}`}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                  >
                    View order
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
