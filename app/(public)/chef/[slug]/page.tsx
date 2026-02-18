// Public Chef Profile & Partner Showcase
// No authentication required — accessible to anyone with the URL
// Shows chef bio, partner venues with seasonal photos, and booking links

import { getPublicChefProfile } from '@/lib/profile/actions'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PartnerShowcase } from '@/components/public/partner-showcase'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  return {
    title: `${data.chef.display_name} — Private Chef`,
    description: data.chef.tagline || data.chef.bio || `Book ${data.chef.display_name} for your next private dining experience`,
  }
}

export default async function ChefProfilePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const { chef, partners } = data

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-stone-50 to-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {chef.profile_image_url ? (
            <img
              src={chef.profile_image_url}
              alt={chef.display_name}
              className="w-28 h-28 rounded-full object-cover mx-auto mb-6 ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-6 ring-4 ring-white shadow-lg">
              <span className="text-3xl font-bold text-stone-500">
                {chef.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-stone-900">
            {chef.display_name}
          </h1>

          {chef.tagline && (
            <p className="text-lg md:text-xl text-stone-600 mt-3 max-w-2xl mx-auto">
              {chef.tagline}
            </p>
          )}

          {chef.bio && (
            <p className="text-stone-500 mt-6 max-w-xl mx-auto leading-relaxed">
              {chef.bio}
            </p>
          )}
        </div>
      </section>

      {/* Partner Showcase */}
      {partners.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-stone-900">
                Where I Cook
              </h2>
              <p className="text-stone-600 mt-3 max-w-xl mx-auto">
                Book one of these amazing venues and enjoy a private dining experience with a personal chef
              </p>
            </div>

            <PartnerShowcase partners={partners} chefName={chef.display_name} />
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-stone-50 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-stone-900">
            Ready to Book?
          </h2>
          <p className="text-stone-600 mt-3">
            Choose a venue above and hire {chef.display_name} for an unforgettable dining experience.
            Or get in touch to discuss your perfect event.
          </p>
          <a
            href="/contact"
            className="inline-block mt-6 px-8 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  )
}
