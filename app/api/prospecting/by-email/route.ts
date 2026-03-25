// GET /api/prospecting/by-email?email=someone@example.com
// Lookup a prospect by email address. Used by n8n reply handler to match
// Instantly replies back to ChefFlow prospect records.

import { NextRequest, NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/db/server'

export async function GET(request: NextRequest) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const email = url.searchParams.get('email')?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 })
  }

  const db = createServerClient({ admin: true })

  // Check both email and contact_direct_email
  const { data, error } = await db
    .from('prospects' as any)
    .select('*')
    .eq('chef_id', auth.tenantId)
    .or(`email.ilike.${email},contact_direct_email.ilike.${email}`)
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ prospect: null, found: false })
  }

  return NextResponse.json({ prospect: data, found: true })
}
