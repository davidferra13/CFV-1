import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/dietary-confirm/[token]
 * Returns current guest dietary info for pre-filling the confirmation form.
 * No auth required (token-based access).
 */
export async function GET(_request: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params
  const db: any = createServerClient()

  // Look up outreach record by token
  const { data: outreach, error } = await db
    .from('dietary_outreach')
    .select('id, guest_id, event_id, status, expires_at')
    .eq('token', token)
    .single()

  if (error || !outreach) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  // Check expiry
  if (new Date(outreach.expires_at) < new Date()) {
    // Mark as expired if not already
    if (outreach.status !== 'expired') {
      await db.from('dietary_outreach').update({ status: 'expired' }).eq('id', outreach.id)
    }
    return NextResponse.json(
      { error: 'This link has expired. Please contact your host for a new one.' },
      { status: 410 }
    )
  }

  // Mark as opened if first view
  if (outreach.status === 'sent') {
    await db
      .from('dietary_outreach')
      .update({ status: 'opened', opened_at: new Date().toISOString() })
      .eq('id', outreach.id)
  }

  // Fetch guest dietary info
  const { data: guest } = await db
    .from('event_guests')
    .select('id, full_name, dietary_restrictions, allergies, allergy_severity, spice_tolerance')
    .eq('id', outreach.guest_id)
    .single()

  if (!guest) {
    return NextResponse.json({ error: 'Guest record not found' }, { status: 404 })
  }

  return NextResponse.json({
    guest_name: guest.full_name,
    dietary_restrictions: guest.dietary_restrictions || [],
    allergies: guest.allergies || [],
    allergy_severity: guest.allergy_severity || null,
    spice_tolerance: guest.spice_tolerance || null,
    already_responded: outreach.status === 'responded',
  })
}

/**
 * POST /api/dietary-confirm/[token]
 * Accepts dietary confirmation from a guest.
 * Updates guest record and marks outreach as responded.
 * No auth required (token-based access).
 */
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params
  const db: any = createServerClient()

  // Look up outreach record
  const { data: outreach, error } = await db
    .from('dietary_outreach')
    .select('id, guest_id, event_id, status, expires_at, tenant_id')
    .eq('token', token)
    .single()

  if (error || !outreach) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
  }

  // Check expiry
  if (new Date(outreach.expires_at) < new Date()) {
    if (outreach.status !== 'expired') {
      await db.from('dietary_outreach').update({ status: 'expired' }).eq('id', outreach.id)
    }
    return NextResponse.json(
      { error: 'This link has expired. Please contact your host for a new one.' },
      { status: 410 }
    )
  }

  // Parse request body
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate input
  const dietaryRestrictions = Array.isArray(body.dietary_restrictions)
    ? body.dietary_restrictions
        .filter((s: any) => typeof s === 'string' && s.length <= 100)
        .slice(0, 50)
    : []

  const allergies = Array.isArray(body.allergies)
    ? body.allergies.filter((s: any) => typeof s === 'string' && s.length <= 100).slice(0, 50)
    : []

  const validSeverities = ['preference', 'intolerance', 'allergy', 'life_threatening']
  const allergySeverity = validSeverities.includes(body.allergy_severity)
    ? body.allergy_severity
    : null

  const validSpice = ['none', 'mild', 'medium', 'hot', 'extra_hot']
  const spiceTolerance = validSpice.includes(body.spice_tolerance) ? body.spice_tolerance : null

  const responseData = {
    dietary_restrictions: dietaryRestrictions,
    allergies,
    allergy_severity: allergySeverity,
    spice_tolerance: spiceTolerance,
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
  }

  // Update guest record
  const { error: guestErr } = await db
    .from('event_guests')
    .update({
      dietary_restrictions: dietaryRestrictions,
      allergies,
      allergy_severity: allergySeverity,
      spice_tolerance: spiceTolerance,
      dietary_confirmed_at: new Date().toISOString(),
      dietary_confirmed_via: 'email_outreach',
    })
    .eq('id', outreach.guest_id)

  if (guestErr) {
    return NextResponse.json({ error: 'Failed to save dietary information' }, { status: 500 })
  }

  // Mark outreach as responded
  await db
    .from('dietary_outreach')
    .update({
      status: 'responded',
      responded_at: new Date().toISOString(),
      response_data: responseData,
    })
    .eq('id', outreach.id)

  return NextResponse.json({ success: true })
}
