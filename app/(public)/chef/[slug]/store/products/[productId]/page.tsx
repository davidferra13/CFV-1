import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPassiveProductForPublicCheckout } from '@/lib/passive-store/store'
import type { PassiveProduct } from '@/lib/passive-store/types'
import { formatCurrency } from '@/lib/utils/currency'
import { PassiveCheckoutForm } from './checkout-form'

type Props = { params: { slug: string; productId: string } }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPassiveProductForPublicCheckout(params.slug, params.productId)
  if (!data) return { title: 'Checkout' }

  return {
    title: `${data.product.title} | Checkout`,
    robots: {
      index: false,
      follow: false,
    },
  }
}

function renderPreviewNotes(product: PassiveProduct) {
  const label = String(product.metadata.label ?? product.product_type)
  const sourceLabel = `${product.source_type} data`

  return [
    `${label} generated automatically from existing ${sourceLabel}.`,
    product.fulfillment_type === 'download'
      ? 'Digital access is available immediately after checkout.'
      : 'ChefFlow will issue prepaid credit automatically after checkout.',
    'No external payment service is required for this MVP flow.',
  ]
}

export default async function PassiveProductCheckoutPage({ params }: Props) {
  const data = await getPassiveProductForPublicCheckout(params.slug, params.productId)
  if (!data) notFound()

  const notes = renderPreviewNotes(data.product)

  return (
    <div className="min-h-screen bg-stone-900">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.8rem] border border-stone-800 bg-stone-950/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
            {String(data.product.metadata.label ?? data.product.product_type).replace('_', ' ')}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-stone-100 sm:text-4xl">
            {data.product.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-400 sm:text-base">
            {data.product.description}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Price</p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {formatCurrency(data.product.price)}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Fulfillment</p>
              <p className="mt-2 text-base font-medium capitalize text-stone-100">
                {data.product.fulfillment_type}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Source</p>
              <p className="mt-2 text-base font-medium capitalize text-stone-100">
                {data.product.source_type}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-stone-800 bg-stone-900/60 p-5">
            <h2 className="text-lg font-semibold text-stone-100">What happens next</h2>
            <div className="mt-4 grid gap-3">
              {notes.map((note) => (
                <div
                  key={note}
                  className="rounded-xl border border-stone-800 bg-stone-950/70 px-4 py-3 text-sm text-stone-300"
                >
                  {note}
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/chef/${data.chefSlug}/store`}
            className="mt-6 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-stone-700 px-4 py-2 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
          >
            Back to store
          </Link>
        </div>

        <PassiveCheckoutForm
          chefSlug={data.chefSlug}
          productId={data.product.product_id}
          productTitle={data.product.title}
          productPrice={data.product.price}
          requiresRecipient={data.product.product_type === 'gift_card'}
        />
      </div>
    </div>
  )
}
