// Public Client Lookup API
// When a returning client enters their email on the public inquiry form,
// this endpoint checks if they're a known client for this chef and returns
// their preferences (allergies, dietary restrictions, name, phone) so the
// form can pre-fill. No auth required, but scoped to chef slug.
// Only returns non-sensitive preference data, not financial or event history.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, chefSlug } = body

    if (!email || !chefSlug) {
      return NextResponse.json({ found: false })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Look up chef by slug
    const { data: chef } = await supabase
      .from('chefs')
      .select('id')
      .eq('booking_slug', chefSlug)
      .single()

    if (!chef) return NextResponse.json({ found: false })

    // Look up client by email for this chef
    const { data: client } = await supabase
      .from('clients')
      .select('full_name, phone, dietary_restrictions, allergies')
      .eq('tenant_id', chef.id)
      .ilike('email', email.toLowerCase().trim())
      .maybeSingle()

    if (!client) return NextResponse.json({ found: false })

    return NextResponse.json({
      found: true,
      prefill: {
        full_name: client.full_name ?? '',
        phone: client.phone ?? '',
        dietary_restrictions: (client.dietary_restrictions ?? []).join(', '),
        allergies: (client.allergies ?? []).join(', '),
      },
    })
  } catch {
    return NextResponse.json({ found: false })
  }
}
