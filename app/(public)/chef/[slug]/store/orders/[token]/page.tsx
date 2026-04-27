import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPassivePurchaseByToken } from '@/lib/passive-store/store'
import { formatCurrency } from '@/lib/utils/currency'

type Props = { params: { slug: string; token: string } }

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Order Ready',
    robots: {
      index: false,
      follow: false,
    },
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function renderDigitalPayload(payload: Record<string, unknown>) {
  const kind = readString(payload.kind)

  if (kind === 'menu_pack') {
    const dishes = Array.isArray(payload.dishes)
      ? payload.dishes.filter((dish): dish is Record<string, unknown> => Boolean(dish))
      : []

    return (
      <div className="rounded-[1.4rem] border border-stone-800 bg-stone-950/60 p-5">
        <h2 className="text-xl font-semibold text-stone-100">
          {readString(payload.menu_name) || 'Menu Pack'}
        </h2>
        <p className="mt-2 text-sm text-stone-400">
          Guest target:{' '}
          {readNumber(payload.guest_count) ? `${payload.guest_count} guests` : 'Flexible'}
        </p>
        <div className="mt-4 grid gap-3">
          {dishes.map((dish, index) => (
            <div
              key={`${readString(dish.id) || index}`}
              className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-3"
            >
              <p className="text-sm font-semibold text-stone-100">
                {readString(dish.name) || 'Dish'}
              </p>
              {readString(dish.description) && (
                <p className="mt-1 text-sm text-stone-400">{readString(dish.description)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (kind === 'recipe_collection') {
    const recipes = Array.isArray(payload.recipes)
      ? payload.recipes.filter((recipe): recipe is Record<string, unknown> => Boolean(recipe))
      : []

    return (
      <div className="rounded-[1.4rem] border border-stone-800 bg-stone-950/60 p-5">
        <h2 className="text-xl font-semibold text-stone-100">
          {readString(payload.collection_label) || 'Recipe Collection'}
        </h2>
        <div className="mt-4 grid gap-3">
          {recipes.map((recipe, index) => (
            <div
              key={`${readString(recipe.id) || index}`}
              className="rounded-xl border border-stone-800 bg-stone-900/70 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-stone-100">
                  {readString(recipe.name) || 'Recipe'}
                </p>
                {readNumber(recipe.cost_per_serving_cents) && (
                  <p className="text-xs text-stone-500">
                    {formatCurrency(readNumber(recipe.cost_per_serving_cents) ?? 0)}/serving
                  </p>
                )}
              </div>
              {readString(recipe.description) && (
                <p className="mt-1 text-sm text-stone-400">{readString(recipe.description)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[1.4rem] border border-stone-800 bg-stone-950/60 p-5 text-sm text-stone-400">
      Digital content is ready for immediate use.
    </div>
  )
}

export default async function PassiveOrderPage({ params }: Props) {
  const purchase = await getPassivePurchaseByToken(params.token)
  if (!purchase) notFound()

  const productSnapshot = purchase.product_snapshot
  const fulfillmentSnapshot = purchase.fulfillment_snapshot
  const orderChefSlug = readString(productSnapshot.chef_slug)

  if (orderChefSlug && orderChefSlug !== params.slug) {
    notFound()
  }

  const payload =
    (productSnapshot.generated_payload as Record<string, unknown> | undefined) ??
    (fulfillmentSnapshot.payload as Record<string, unknown> | undefined) ??
    {}

  const code = readString(fulfillmentSnapshot.code)
  const isDigital = purchase.fulfillment_type === 'download'

  return (
    <div className="min-h-screen bg-stone-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-[1.8rem] border border-stone-800 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            Order ready
          </p>
          <h1 className="mt-3 text-3xl font-bold text-stone-100 sm:text-4xl">
            {readString(productSnapshot.title) || 'Purchase complete'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-400 sm:text-base">
            {isDigital
              ? 'Your digital product is ready immediately below.'
              : 'Your prepaid credit has been generated and stored automatically.'}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Paid</p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {formatCurrency(purchase.amount_cents)}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Buyer</p>
              <p className="mt-2 text-base font-medium text-stone-100">{purchase.buyer_name}</p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Fulfillment</p>
              <p className="mt-2 text-base font-medium capitalize text-stone-100">
                {purchase.fulfillment_type}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {code && (
            <section className="rounded-[1.6rem] border border-stone-800 bg-stone-950/70 p-6">
              <h2 className="text-xl font-semibold text-stone-100">Credit code</h2>
              <div className="mt-4 inline-flex rounded-2xl border border-brand-400/40 bg-brand-500/10 px-5 py-4 text-2xl font-semibold tracking-[0.25em] text-brand-200">
                {code}
              </div>
              <p className="mt-3 text-sm text-stone-400">
                Use this code when booking with the chef. The full amount is already stored as
                credit.
              </p>
            </section>
          )}

          {isDigital && renderDigitalPayload(payload)}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/chef/${params.slug}/store`}
            className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400"
          >
            Back to store
          </Link>
          <Link
            href={`/chef/${params.slug}`}
            className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
          >
            Chef profile
          </Link>
        </div>
      </div>
    </div>
  )
}
