// Public Client Lookup API
// Returning-client detection for the public inquiry form.
// This endpoint must never return stored client PII.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { findChefByPublicSlug } from '@/lib/profile/public-chef'
import { checkRateLimit } from '@/lib/rateLimit'

const ClientLookupSchema = z.object({
  email: z.string().email().max(320),
  chefSlug: z.string().trim().min(1).max(120),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = ClientLookupSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ found: false }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const normalizedChefSlug = parsed.data.chefSlug.trim()

    await checkRateLimit(`public-client-lookup:ip:${ip}`, 5, 5 * 60_000)
    await checkRateLimit(
      `public-client-lookup:email:${normalizedChefSlug}:${normalizedEmail}`,
      3,
      60 * 60_000
    )

    const supabase: any = createAdminClient()

    const lookup = await findChefByPublicSlug<{ id: string }>(supabase, normalizedChefSlug, 'id')
    const chef = lookup.data

    if (!chef) return NextResponse.json({ found: false })

    // Existence check only. Never return stored profile fields from an unauthenticated route.
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', chef.id)
      .ilike('email', normalizedEmail)
      .maybeSingle()

    return NextResponse.json({ found: !!client })
  } catch {
    return NextResponse.json({ found: false })
  }
}
