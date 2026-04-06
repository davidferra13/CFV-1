import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { PublicPartnerSignupForm } from '@/components/partners/public-partner-signup-form'
import { Button } from '@/components/ui/button'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Partner Sign Up',
  description:
    'Join ChefFlow as a venue partner. Connect with reviewed private chefs and offer your space for private dining events.',
  alternates: {
    canonical: `${BASE_URL}/partner-signup`,
  },
}

type Props = {
  searchParams?: {
    chef?: string
  }
}

export default async function PartnerSignupPage({ searchParams }: Props) {
  const chefSlug = (searchParams?.chef || '').trim().toLowerCase()
  const data = chefSlug ? await getPublicChefProfile(chefSlug) : null

  if (!chefSlug || !data) {
    return (
      <div className="min-h-screen">
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold text-stone-100">Partner Sign Up</h1>
              <p className="text-stone-300">
                Venues, suppliers, and businesses partner with individual chefs on ChefFlow. Your
                chef will give you a direct link to connect with them.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-stone-200">Have a chef profile name?</h2>
              <form action="/partner-signup" method="get" className="space-y-3">
                <label className="block">
                  <span className="text-xs text-stone-400">
                    Enter the chef&apos;s profile name from their link
                  </span>
                  <input
                    type="text"
                    name="chef"
                    required
                    placeholder="chef-name"
                    className="mt-1 block w-full rounded-md border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </label>
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            </div>

            {chefSlug && !data && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-center">
                <p className="text-sm text-red-300">
                  No chef found for &ldquo;{chefSlug}&rdquo;. Double-check the link your chef shared
                  with you.
                </p>
              </div>
            )}

            <p className="text-center text-sm text-stone-500">
              Don&apos;t have a link? Ask the chef you work with to send you their partner signup
              URL.
            </p>
          </div>
        </section>
      </div>
    )
  }

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
            <p className="text-stone-300 mt-2">
              Submit your profile to be listed as a partner for {data.chef.display_name}.
            </p>
            <p className="text-sm mt-3">
              <Link href={`/chef/${chefSlug}`} className="text-brand-500 hover:underline">
                View chef profile
              </Link>
            </p>
          </div>

          <PublicPartnerSignupForm
            chefSlug={chefSlug}
            chefName={data.chef.display_name}
            primaryColor={primaryColor}
          />
        </div>
      </section>
    </div>
  )
}
