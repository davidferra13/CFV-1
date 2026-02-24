import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { PublicPartnerSignupForm } from '@/components/partners/public-partner-signup-form'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPublicChefProfile(params.slug)
  if (!data) return { title: 'Chef Not Found' }

  return {
    title: `Partner With ${data.chef.display_name}`,
    description: `Create your partner profile with ${data.chef.display_name}.`,
  }
}

export default async function PartnerSignupPage({ params }: Props) {
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
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-stone-100">Create Partner Profile</h1>
            <p className="text-stone-400 mt-2">
              Submit your profile to be listed as a referral partner for {data.chef.display_name}.
            </p>
          </div>

          <PublicPartnerSignupForm
            chefSlug={params.slug}
            chefName={data.chef.display_name}
            primaryColor={primaryColor}
          />
        </div>
      </section>
    </div>
  )
}
