import { NextRequest, NextResponse } from 'next/server'
import { resolveChefByPublicSlug } from '@/lib/chefs/public-slug-resolver'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
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
    // Rate limit: 5 lookups per minute per IP to prevent client enumeration
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    try {
      await checkRateLimit(`client-lookup:${ip}`, 5, 60_000)
    } catch {
      return NextResponse.json(
        { found: false, error: 'Too many requests. Try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, chefSlug } = ClientLookupSchema.parse(body)
    const normalizedEmail = email.trim().toLowerCase()
    const supabase = createServerClient({ admin: true })

    const chef = await resolveChefByPublicSlug<{ id: string }>(supabase, chefSlug, 'id')
    if (!chef) {
      // Return same shape as "client not found" to prevent chef enumeration
      return NextResponse.json({ found: false })
    }

    // SECURITY: Only select the client ID to confirm existence.
    // PII (name, phone, allergies, dietary restrictions) must NOT be returned
    // without authentication. See security-audit-2026-03-11.md finding #4/#9.
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', chef.id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!client) {
      return NextResponse.json({ found: false })
    }

    // SECURITY: Only return non-sensitive event prefill data.
    // Location data is excluded (physical safety concern, finding #9).
    const { data: lastEvent } = await supabase
      .from('events')
      .select('occasion, guest_count, serve_time')
      .eq('tenant_id', chef.id)
      .eq('client_id', (client as any).id)
      .eq('status', 'completed')
      .order('event_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      found: true,
      prefill: {
        occasion: (lastEvent as any)?.occasion || '',
        guest_count: (lastEvent as any)?.guest_count ? String((lastEvent as any).guest_count) : '',
        serve_time: formatTimeForFormInput((lastEvent as any)?.serve_time || ''),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client lookup failed'
    return NextResponse.json({ found: false, error: message }, { status: 400 })
  }
}
