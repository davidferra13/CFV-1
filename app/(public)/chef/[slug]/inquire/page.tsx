// Public Inquiry Form Page
// No authentication required. Resolves chef by slug and renders the inquiry form.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'
import { resolveRequestedFeaturedMenuId } from '@/lib/booking/featured-menu-shared'
import { getPublicChefProfile } from '@/lib/profile/actions'

type Props = {
  params: { slug: string }
  searchParams?: { menu?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  return {
    title: `Inquire with ${data.chef.display_name}`,
    description: `Share your event details with ${data.chef.display_name}.`,
  }
}

export default async function InquirePage({ params, searchParams }: Props) {
  const data = await getPublicChefProfile(params.slug)
  if (!data) notFound()

  const selectedMenu =
    resolveRequestedFeaturedMenuId(
      data.chef.featured_booking_menu_id,
      typeof searchParams?.menu === 'string' ? searchParams.menu : null
    ) && data.featured_menu
      ? data.featured_menu
      : null
  const primaryColor = data.chef.portal_primary_color || '#1c1917'
  const backgroundColor = data.chef.portal_background_color || '#fafaf9'
  const backgroundImageUrl = data.chef.portal_background_image_url
  const featuredShowcase = data.featured_menu_showcase
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
        <div className="mx-auto max-w-2xl">
          <PublicInquiryForm
            chefSlug={params.slug}
            chefName={data.chef.display_name}
            primaryColor={primaryColor}
            selectedMenu={selectedMenu}
            selectedMenuShowcase={featuredShowcase}
            formTitle={
              selectedMenu ? featuredShowcase.title || `Request ${selectedMenu.name}` : undefined
            }
            formDescription={
              selectedMenu
                ? featuredShowcase.pitch ||
                  "We'll start from this ready-to-book menu instead of beginning from a blank custom brief."
                : undefined
            }
            submitLabel={selectedMenu ? 'Request this menu' : undefined}
          />
        </div>
      </section>
    </div>
  )
}
