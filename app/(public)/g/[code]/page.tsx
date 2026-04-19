// Guest Landing Page - /g/[code]
// Public, no auth required. Guests scan a QR code at a dinner event,
// land here, and can express interest in booking their own event.

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getChefByGuestCode } from '@/lib/guest-leads/actions'
import { GuestLeadForm } from '@/components/guest-leads/guest-lead-form'
import { checkRateLimit } from '@/lib/rateLimit'

type Props = { params: { code: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getChefByGuestCode(params.code)
  if (!data) return { title: 'Page Not Found' }

  return {
    title: `${data.chefName} | Private Chef`,
    description: `Enjoyed dinner by ${data.chefName}? Book your own private dining experience.`,
    openGraph: {
      title: `${data.chefName} | Private Chef`,
      description: `Book your own private dining experience with ${data.chefName}.`,
      type: 'website',
    },
  }
}

export default async function GuestLandingPage({ params }: Props) {
  // Rate limit guest code lookups to prevent enumeration (short codes are brute-forceable)
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  try {
    await checkRateLimit(`guest-code:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900">
        <p className="text-stone-400">Too many requests. Please try again later.</p>
      </div>
    )
  }

  const data = await getChefByGuestCode(params.code)
  if (!data) notFound()

  const primaryColor = data.primaryColor || '#1c1917'
  const backgroundColor = data.backgroundColor || '#fafaf9'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Hero */}
      <section className="pt-12 pb-8 px-6 bg-stone-900/70">
        <div className="max-w-lg mx-auto text-center">
          {data.chefPhoto ? (
            <Image
              src={data.chefPhoto}
              alt={data.chefName}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-5 ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-stone-700 flex items-center justify-center mx-auto mb-5 ring-4 ring-white shadow-lg">
              <span className="text-2xl font-bold text-stone-500">
                {data.chefName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-stone-100">{data.chefName}</h1>

          {data.tagline && <p className="text-lg text-stone-300 mt-2">{data.tagline}</p>}

          <p className="text-stone-500 mt-4 max-w-md mx-auto leading-relaxed">
            Enjoyed tonight? Leave your info and I'll reach out about cooking for you.
          </p>

          {data.chefSlug && (
            <Link
              href={`/chef/${data.chefSlug}`}
              className="inline-block mt-4 text-sm text-stone-400 hover:text-stone-200 transition-colors underline underline-offset-2"
            >
              View full profile
            </Link>
          )}
        </div>
      </section>

      {/* Form */}
      <section className="flex-1 py-8 px-6">
        <div className="max-w-lg mx-auto">
          <GuestLeadForm
            guestCode={params.code}
            chefName={data.chefName}
            primaryColor={primaryColor}
            chefSlug={data.chefSlug}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-xs text-stone-300">Powered by ChefFlow</p>
      </footer>
    </div>
  )
}
