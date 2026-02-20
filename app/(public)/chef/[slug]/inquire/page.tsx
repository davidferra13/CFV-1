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
          <PublicInquiryForm
            chefSlug={params.slug}
            chefName={data.chef.display_name}
            primaryColor={primaryColor}
          />
        </div>
      </section>
    </div>
  )
}
