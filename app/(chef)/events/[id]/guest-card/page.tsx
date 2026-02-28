// Printable Guest Table Card — /events/[id]/guest-card
// Print-optimized page showing chef name + QR code.
// Chef prints these and places them on the dinner table.

import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { PrintableCard } from '@/components/guest-leads/printable-card'
import { createServerClient } from '@/lib/supabase/server'

type Props = { params: { id: string } }

export default async function GuestCardPage({ params }: Props) {
  const user = await requireChef()

  const event = await getEventById(params.id)
  if (!event) notFound()

  // Get chef display info
  const supabase: any = createServerClient()
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name, tagline, profile_image_url')
    .eq('id', user.tenantId!)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your Chef'
  const tagline = chef?.tagline || 'Private Chef'
  const profileImage = chef?.profile_image_url || null
  const guestCode = (event as any).guest_code

  if (!guestCode) notFound()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const landingUrl = `${baseUrl}/g/${guestCode}`

  return (
    <PrintableCard
      chefName={chefName}
      tagline={tagline}
      profileImage={profileImage}
      landingUrl={landingUrl}
      occasion={(event as any).occasion || null}
      eventDate={(event as any).event_date || null}
    />
  )
}
