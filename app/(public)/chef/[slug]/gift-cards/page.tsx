// Public Gift Card Store - /chef/[slug]/gift-cards
// Server component: resolves chef from slug and renders passive gift card products.
// No authentication required - open to anyone.

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicSecondaryEntryCluster } from '@/components/public/public-secondary-entry-cluster'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { getPassiveStorefrontBySlug } from '@/lib/passive-store/store'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '@/lib/public/public-secondary-entry-config'
import { formatCurrency } from '@/lib/utils/currency'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Gift Cards' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const title = `Gift a Private Chef Experience - ${data.chef.display_name}`
  const description = `Send prepaid chef credit for ${data.chef.display_name}. Gift card options are generated automatically from the chef's live pricing data.`

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/chef/${params.slug}/gift-cards`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/chef/${params.slug}/gift-cards`,
      type: 'website',
      ...(data.chef.profile_image_url ? { images: [data.chef.profile_image_url] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function GiftCardStorePage({ params }: Props) {
  const [data, storefront] = await Promise.all([
    getPublicChefProfile(params.slug),
    getPassiveStorefrontBySlug(params.slug),
  ])
  if (!data || !storefront) notFound()

  const { chef } = data
  const giftCards = storefront.products.filter((product) => product.product_type === 'gift_card')

  return (
    <div className="min-h-screen bg-stone-800 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          {chef.profile_image_url && (
            <Image
              src={chef.profile_image_url}
              alt={chef.display_name}
              width={64}
              height={64}
              className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-4 ring-white shadow"
            />
          )}
          <h1 className="text-3xl font-bold text-stone-100">Gift a private chef experience</h1>
          <p className="mt-2 text-stone-300">
            Prepaid credit is generated automatically from {chef.display_name}&apos;s live pricing.
            No manual setup or custom product creation is required.
          </p>
          <Link
            href={`/chef/${storefront.chefSlug}`}
            className="mt-2 inline-block text-sm text-brand-500 hover:text-brand-400"
          >
            Back to chef profile
          </Link>
        </div>

        {giftCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-600 bg-stone-900/60 px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-stone-100">Gift cards are not live yet</h2>
            <p className="mt-2 text-sm text-stone-400">
              Browse the chef&apos;s full store for current passive products.
            </p>
            <Link
              href={`/chef/${storefront.chefSlug}/store`}
              className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400"
            >
              Open full store
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {giftCards.map((product) => (
              <article
                key={product.product_id}
                className="flex h-full flex-col rounded-[1.6rem] border border-stone-700 bg-stone-900 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
                  Gift Card
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-stone-100">{product.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">{product.description}</p>
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Amount</p>
                  <p className="mt-1 text-3xl font-semibold text-stone-100">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <Link
                  href={`/chef/${storefront.chefSlug}/store/products/${product.product_id}`}
                  className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400"
                >
                  Buy gift card
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-stone-700 bg-stone-900/70 p-5 text-sm text-stone-300">
          Checkout is handled inside ChefFlow for this MVP. Gift card purchases generate stored
          credit codes immediately after completion.
        </div>

        <PublicSecondaryEntryCluster
          links={PUBLIC_SECONDARY_ENTRY_CONFIG.gift_cards}
          heading="Have questions?"
          theme="dark"
        />
      </div>
    </div>
  )
}
