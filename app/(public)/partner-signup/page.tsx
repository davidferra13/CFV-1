import Link from 'next/link'
import { getPublicChefProfile } from '@/lib/profile/actions'
import { PublicPartnerSignupForm } from '@/components/partners/public-partner-signup-form'
import { Button } from '@/components/ui/button'

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
      <div className="min-h-screen bg-stone-800">
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-xl mx-auto text-center space-y-6">
            <h1 className="text-3xl font-bold text-stone-100">Partner Sign Up</h1>
            <p className="text-stone-300">
              Use your chef&apos;s partner link, or enter their profile slug to continue.
            </p>

            <form
              action="/partner-signup"
              method="get"
              className="bg-stone-900 border border-stone-700 rounded-lg p-5 text-left space-y-4"
            >
              <label className="block">
                <span className="text-sm font-medium text-stone-300">Chef Slug</span>
                <input
                  type="text"
                  name="chef"
                  required
                  placeholder="chef-slug"
                  className="mt-1 block w-full rounded-md border border-stone-600 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </label>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>

            {chefSlug && !data && (
              <p className="text-sm text-red-600">
                No chef profile found for slug <span className="font-mono">{chefSlug}</span>.
              </p>
            )}

            <p className="text-sm text-stone-500">
              Preferred format: <span className="font-mono">/chef/your-slug/partner-signup</span>
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
