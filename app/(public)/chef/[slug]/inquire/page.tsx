// Public Inquiry Form Page
// No authentication required - anyone can submit an inquiry to a chef
// Resolves chef by public slug or booking slug and renders the inquiry form with availability guards

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'
import { getPublicChefProfile } from '@/lib/profile/actions'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const slug = data.chef.inquiry_slug || data.chef.public_slug || params.slug

  return {
    title: `Inquire with ${data.chef.display_name}`,
    description: `Share your event details with ${data.chef.display_name}.`,
    alternates: {
      canonical: `${baseUrl}/chef/${slug}/inquire`,
    },
  }
}

export default async function InquirePage({ params }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const publicSlug = data.chef.public_slug || params.slug
  const inquirySlug = data.chef.inquiry_slug || publicSlug
  const primaryColor = data.chef.portal_primary_color || '#1c1917'
  const backgroundColor = data.chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = data.chef.portal_background_image_url
  const pageBackgroundStyle = backgroundImageUrl
    ? {
        backgroundColor,
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.92)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed' as const,
      }
    : { backgroundColor }

  return (
    <div className="min-h-screen" style={pageBackgroundStyle}>
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          {data.chef.discovery.accepting_inquiries ? (
            <PublicInquiryForm
              chefSlug={inquirySlug}
              chefName={data.chef.display_name}
              primaryColor={primaryColor}
            />
          ) : (
            <Card className="bg-stone-900/90 p-8 text-center">
              <h1 className="text-2xl font-semibold text-stone-100">Inquiries are paused</h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-300">
                {data.chef.display_name} is not currently accepting new public inquiries.
                {data.chef.discovery.next_available_date
                  ? ` Next opening: ${new Date(
                      `${data.chef.discovery.next_available_date}T00:00:00`
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}.`
                  : ' Please check back soon for updated availability.'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  href={`/chef/${publicSlug}`}
                  className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Back to profile
                </Link>
                <Link
                  href="/contact"
                  className="rounded-lg border border-stone-600 px-4 py-2.5 text-sm font-medium text-stone-300"
                >
                  Contact ChefFlow
                </Link>
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  )
}
