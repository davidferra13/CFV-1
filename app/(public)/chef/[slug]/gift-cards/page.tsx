// Public Gift Card Store — /chef/[slug]/gift-cards
// Server component: resolves chef from slug, renders client form.
// No authentication required — open to anyone.

import { getPublicChefProfile } from '@/lib/profile/actions'
import { notFound } from 'next/navigation'
import { GiftCardPurchaseForm } from './gift-card-form'
import type { Metadata } from 'next'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Gift Cards' }
  return { title: `Gift Cards — ${data.chef.display_name}` }
}

export default async function GiftCardStorePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const { chef } = data

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {chef.profile_image_url && (
            <img
              src={chef.profile_image_url}
              alt={chef.display_name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow"
            />
          )}
          <h1 className="text-3xl font-bold text-stone-900">Gift a Private Chef Experience</h1>
          <p className="text-stone-600 mt-2">
            Send someone a gift card redeemable for {chef.display_name}&apos;s services.
          </p>
          <a
            href={`/chef/${params.slug}`}
            className="text-sm text-brand-600 hover:text-brand-700 mt-2 inline-block"
          >
            ← Back to chef profile
          </a>
        </div>

        <GiftCardPurchaseForm
          tenantId={chef.id}
          chefSlug={params.slug}
          chefName={chef.display_name}
        />
      </div>
    </div>
  )
}
