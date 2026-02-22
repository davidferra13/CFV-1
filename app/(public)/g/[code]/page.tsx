// Guest Landing Page — /g/[code]
// Public, no auth required. Guests scan a QR code at a dinner event,
// land here, and can express interest in booking their own event.

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getChefByGuestCode } from '@/lib/guest-leads/actions'
import { GuestLeadForm } from '@/components/guest-leads/guest-lead-form'

type Props = { params: { code: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getChefByGuestCode(params.code)
  if (!data) return { title: 'Page Not Found' }

  return {
    title: `${data.chefName} — Private Chef`,
    description: `Enjoyed dinner by ${data.chefName}? Book your own private dining experience.`,
    openGraph: {
      title: `${data.chefName} — Private Chef`,
      description: `Book your own private dining experience with ${data.chefName}.`,
      type: 'website',
    },
  }
}

export default async function GuestLandingPage({ params }: Props) {
  const data = await getChefByGuestCode(params.code)
  if (!data) notFound()

  const primaryColor = data.primaryColor || '#1c1917'
  const backgroundColor = data.backgroundColor || '#fafaf9'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Hero */}
      <section className="pt-12 pb-8 px-6 bg-white/70">
        <div className="max-w-lg mx-auto text-center">
          {data.chefPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.chefPhoto}
              alt={data.chefName}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-5 ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-stone-200 flex items-center justify-center mx-auto mb-5 ring-4 ring-white shadow-lg">
              <span className="text-2xl font-bold text-stone-500">
                {data.chefName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-stone-900">{data.chefName}</h1>

          {data.tagline && <p className="text-lg text-stone-600 mt-2">{data.tagline}</p>}

          <p className="text-stone-500 mt-4 max-w-md mx-auto leading-relaxed">
            Enjoyed tonight? Leave your info and I'll reach out about cooking for you.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 py-8 px-6">
        <div className="max-w-lg mx-auto">
          <GuestLeadForm
            guestCode={params.code}
            chefName={data.chefName}
            primaryColor={primaryColor}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-xs text-stone-400">Powered by ChefFlow</p>
      </footer>
    </div>
  )
}
