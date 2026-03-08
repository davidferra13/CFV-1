import { NextRequest, NextResponse } from 'next/server'
import { resolveChefByPublicSlug } from '@/lib/chefs/public-slug-resolver'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ClientLookupSchema = z.object({
  email: z.string().email(),
  chefSlug: z.string().min(1),
})

function formatTimeForFormInput(value: string | null | undefined) {
  if (!value) return ''
  if (/(am|pm)/i.test(value)) {
    return value.replace(/\s+/g, ' ').trim().toUpperCase()
  }

  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value

  let hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12

  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, chefSlug } = ClientLookupSchema.parse(body)
    const normalizedEmail = email.trim().toLowerCase()
    const supabase = createServerClient({ admin: true })

    const chef = await resolveChefByPublicSlug<{ id: string }>(supabase, chefSlug, 'id')
    if (!chef) {
      return NextResponse.json({ found: false }, { status: 404 })
    }

    const { data: client } = await supabase
      .from('clients')
      .select('id, full_name, phone, allergies, dietary_restrictions')
      .eq('tenant_id', chef.id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!client) {
      return NextResponse.json({ found: false })
    }

    const { data: lastEvent } = await supabase
      .from('events')
      .select(
        'occasion, guest_count, serve_time, location_address, location_city, location_state, location_zip'
      )
      .eq('tenant_id', chef.id)
      .eq('client_id', (client as any).id)
      .eq('status', 'completed')
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const address = [
      (lastEvent as any)?.location_address,
      (lastEvent as any)?.location_city,
      (lastEvent as any)?.location_state,
      (lastEvent as any)?.location_zip,
    ]
      .filter(Boolean)
      .join(', ')

    return NextResponse.json({
      found: true,
      prefill: {
        full_name: (client as any).full_name || '',
        phone: (client as any).phone || '',
        allergies: (client as any).allergies || [],
        dietary_restrictions: (client as any).dietary_restrictions || [],
        occasion: (lastEvent as any)?.occasion || '',
        guest_count: (lastEvent as any)?.guest_count ? String((lastEvent as any).guest_count) : '',
        serve_time: formatTimeForFormInput((lastEvent as any)?.serve_time || ''),
        address,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client lookup failed'
    return NextResponse.json({ found: false, error: message }, { status: 400 })
  }
}
