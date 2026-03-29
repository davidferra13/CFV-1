import { Metadata } from 'next'
import { JoinForm } from './_components/join-form'
import { createServerClient } from '@/lib/db/server'
import { decryptRef } from '@/lib/discover/outreach-crypto'

export const metadata: Metadata = {
  title: 'Join the Food Directory',
  description: 'Get your food business featured for free.',
  robots: 'noindex', // Don't index outreach landing pages
}

type Props = {
  searchParams: Promise<{ ref?: string }>
}

export default async function JoinPage({ searchParams }: Props) {
  const params = await searchParams
  const ref = params.ref || ''

  // Pre-fill from ref if valid
  let prefill: { name?: string; city?: string; state?: string; businessType?: string } = {}

  if (ref) {
    const listingId = decryptRef(ref)
    if (listingId) {
      const db = createServerClient({ admin: true })
      const { data } = await db
        .from('directory_listings')
        .select('name, city, state, business_type')
        .eq('id', listingId)
        .maybeSingle()

      if (data) {
        prefill = {
          name: (data as any).name,
          city: (data as any).city,
          state: (data as any).state,
          businessType: (data as any).business_type,
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Get your business featured</h1>
          <p className="text-zinc-400">
            Join a free food directory. Add your menu, photos, and hours. People near you find you
            directly.
          </p>
        </div>
        <JoinForm ref_={ref} prefill={prefill} />
      </div>
    </div>
  )
}
