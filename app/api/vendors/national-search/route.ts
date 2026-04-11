/**
 * National Vendor Search
 *
 * Searches the national_vendors table (OpenStreetMap specialty food data).
 * Returns vendors matching name/city query, optionally filtered by type.
 * Auth-gated: chefs only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function GET(req: NextRequest) {
  try {
    await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const q = (searchParams.get('q') || '').trim()
  const type = searchParams.get('type') || ''
  const state = searchParams.get('state') || ''

  if (q.length < 2 && !state) {
    return NextResponse.json({ vendors: [] })
  }

  const db: any = createServerClient()

  // Build query dynamically
  let query = db
    .from('national_vendors')
    .select('id, name, vendor_type, address, city, state, zip, phone, website, lat, lng')

  if (q.length >= 2) {
    // Search name and city
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`)
  }
  if (type) {
    query = query.eq('vendor_type', type)
  }
  if (state) {
    query = query.eq('state', state.toUpperCase())
  }

  // Prioritize vendors with phone numbers
  query = query
    .order('phone', { ascending: false, nullsFirst: false })
    .order('name', { ascending: true })
    .limit(30)

  const { data, error } = await query

  if (error) {
    console.error('[national-search]', error)
    return NextResponse.json({ vendors: [] })
  }

  return NextResponse.json({ vendors: data || [] })
}
