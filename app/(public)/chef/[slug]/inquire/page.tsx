// Public Inquiry Form Page
// No authentication required — anyone can submit an inquiry to a chef
// Resolves chef by slug, renders inquiry form with chef display info

import { getPublicChefProfile } from '@/lib/profile/actions'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  return {
    title: `Book ${data.chef.display_name} — Private Chef Inquiry`,
    description: `Submit an inquiry to book ${data.chef.display_name} for your next private dining experience.`,
  }
}

export default async function InquirePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            {data.chef.profile_image_url ? (
              <img
                src={data.chef.profile_image_url}
                alt={data.chef.display_name}
                className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-4 ring-4 ring-white shadow-lg">
                <span className="text-2xl font-bold text-stone-500">
                  {data.chef.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-stone-900">
              Book {data.chef.display_name}
            </h1>
            <p className="text-stone-600 mt-2">
              Tell us about your event and we&apos;ll be in touch within 24 hours.
            </p>
          </div>

          {/* Form */}
          <PublicInquiryForm
            chefSlug={params.slug}
            chefName={data.chef.display_name}
          />
        </div>
      </section>
    </div>
  )
}
