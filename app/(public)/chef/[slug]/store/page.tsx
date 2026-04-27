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

type SectionKey = 'digital' | 'service' | 'gift_card'

const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  digital: {
    title: 'Menu & Recipe Packs',
    description: "Auto-built from published menus and the chef's existing recipe library.",
  },
  service: {
    title: 'Prepaid Experiences',
    description: 'Credits derived from completed events and existing deposit logic.',
  },
  gift_card: {
    title: 'Gift Cards',
    description: "Instant prepaid credit sized from the chef's current pricing data.",
  },
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Store' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const title = `${data.chef.display_name} Store | ChefFlow`
  const description = `Shop menu packs, recipe collections, prepaid chef experiences, and gift cards from ${data.chef.display_name}.`

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/chef/${params.slug}/store`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/chef/${params.slug}/store`,
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

export default async function ChefStorePage({ params }: Props) {
  const [profile, storefront] = await Promise.all([
    getPublicChefProfile(params.slug),
    getPassiveStorefrontBySlug(params.slug),
  ])

  if (!profile || !storefront) notFound()

  const grouped = storefront.products.reduce<Record<SectionKey, typeof storefront.products>>(
    (acc, product) => {
      acc[product.product_type].push(product)
      return acc
    },
    { digital: [], service: [], gift_card: [] }
  )

  return (
    <div className="min-h-screen bg-stone-900">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[2rem] border border-stone-800 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.35)] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                {profile.chef.profile_image_url ? (
                  <Image
                    src={profile.chef.profile_image_url}
                    alt={profile.chef.display_name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-stone-700"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-800 text-xl font-semibold text-stone-300">
                    {profile.chef.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
                    Passive Store
                  </p>
                  <h1 className="text-3xl font-bold text-stone-100 sm:text-4xl">
                    {profile.chef.display_name}&apos;s Store
                  </h1>
                </div>
              </div>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-300 sm:text-base">
                ChefFlow generated these products automatically from existing menus, recipes,
                pricing, media, and completed events. Nothing new had to be created for this store
                to go live.
              </p>
            </div>

            <div className="grid gap-3 sm:min-w-[280px]">
              <div className="rounded-2xl border border-stone-700 bg-stone-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Live products
                </p>
                <p className="mt-2 text-3xl font-semibold text-stone-100">
                  {storefront.products.length}
                </p>
              </div>
              <Link
                href={`/chef/${storefront.chefSlug}`}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-800"
              >
                Back to chef profile
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {(Object.keys(SECTION_META) as SectionKey[]).map((sectionKey) => {
            const products = grouped[sectionKey]
            if (products.length === 0) return null

            return (
              <section key={sectionKey}>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-stone-100">
                    {SECTION_META[sectionKey].title}
                  </h2>
                  <p className="mt-1 text-sm text-stone-400">
                    {SECTION_META[sectionKey].description}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <article
                      key={product.product_id}
                      className="flex h-full flex-col rounded-[1.6rem] border border-stone-800 bg-stone-950/60 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300">
                            {String(product.metadata.label ?? product.product_type).replace(
                              '_',
                              ' '
                            )}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-stone-100">
                            {product.title}
                          </h3>
                        </div>
                        <div className="rounded-full bg-stone-800 px-3 py-1 text-xs font-medium text-stone-300">
                          {product.source_type}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-stone-400">
                        {product.description}
                      </p>

                      <div className="mt-5 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                            Price
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-stone-100">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <Link
                          href={`/chef/${storefront.chefSlug}/store/products/${product.product_id}`}
                          className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-brand-400"
                        >
                          Buy now
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <div className="mt-10">
          <PublicSecondaryEntryCluster
            links={PUBLIC_SECONDARY_ENTRY_CONFIG.gift_cards}
            heading="Need details before purchasing?"
            theme="dark"
          />
        </div>
      </div>
    </div>
  )
}
