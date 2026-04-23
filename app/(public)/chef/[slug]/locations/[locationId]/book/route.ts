import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { findChefByPublicSlug } from '@/lib/profile/public-chef'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'
import { resolveAuthRequestOrigin } from '@/lib/auth/request-origin'

function buildInquiryFallback(request: NextRequest, slug: string, partnerId: string, locationId: string) {
  const url = buildAppUrl(request, `/chef/${slug}/inquire`)
  url.searchParams.set('ref', partnerId)
  url.searchParams.set('loc', locationId)
  return url
}

function resolveRequestOrigin(request: NextRequest) {
  return (
    resolveAuthRequestOrigin({
      requestOrigin: request.nextUrl.origin,
      forwardedProto: request.headers.get('x-forwarded-proto'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      host: request.headers.get('host'),
    }) ?? request.nextUrl.origin
  )
}

function buildAppUrl(request: NextRequest, pathname: string) {
  return new URL(pathname, resolveRequestOrigin(request))
}

function normalizeDestination(request: NextRequest, destination: string | null | undefined) {
  if (!destination) return null

  try {
    return new URL(destination).toString()
  } catch {
    try {
      return new URL(destination, resolveRequestOrigin(request)).toString()
    } catch {
      return null
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; locationId: string } }
) {
  const db: any = createServerClient({ admin: true })
  const chefLookup = await findChefByPublicSlug<{ id: string; display_name: string | null }>(
    db,
    params.slug,
    'id, display_name'
  )

  if (!chefLookup.data) {
    return NextResponse.redirect(buildAppUrl(request, `/chef/${params.slug}`), 307)
  }

  const chef = chefLookup.data
  const { data: location } = await db
    .from('partner_locations')
    .select('id, partner_id, name, booking_url, is_active')
    .eq('id', params.locationId)
    .eq('tenant_id', chef.id)
    .maybeSingle()

  if (!location || location.is_active === false) {
    return NextResponse.redirect(buildAppUrl(request, `/chef/${params.slug}`), 307)
  }

  const { data: partner } = await db
    .from('referral_partners')
    .select('id, name, booking_url, is_showcase_visible, status')
    .eq('id', location.partner_id)
    .eq('tenant_id', chef.id)
    .maybeSingle()

  const inquiryFallback = buildInquiryFallback(request, params.slug, location.partner_id, location.id)

  if (!partner || partner.status !== 'active' || partner.is_showcase_visible === false) {
    return NextResponse.redirect(inquiryFallback, 307)
  }

  const destination = normalizeDestination(request, location.booking_url || partner.booking_url)
  if (!destination) {
    return NextResponse.redirect(inquiryFallback, 307)
  }

  try {
    await recordPlatformEvent({
      eventKey: 'conversion.location_booking_link_clicked',
      source: 'public_location_card',
      actorType: 'anonymous',
      tenantId: chef.id,
      subjectType: 'location',
      subjectId: location.id,
      summary: `${chef.display_name || 'Chef'} location booking link clicked`,
      details: `${location.name || 'Location'} via ${partner.name || 'partner'}`,
      metadata: {
        ...extractRequestMetadata(request.headers),
        chef_slug: params.slug,
        referral_partner_id: partner.id,
        referral_partner_name: partner.name ?? null,
        partner_location_id: location.id,
        partner_location_name: location.name ?? null,
        redirect_destination: destination,
      },
    })
  } catch (error) {
    console.error('[public-location-book] event logging failed:', error)
  }

  return NextResponse.redirect(destination, 307)
}
