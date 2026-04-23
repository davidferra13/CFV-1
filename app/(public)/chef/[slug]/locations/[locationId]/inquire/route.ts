import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/db/server'
import { findChefByPublicSlug } from '@/lib/profile/public-chef'
import { buildPublicLocationExperiences } from '@/lib/partners/location-experiences'
import { recordPlatformEvent } from '@/lib/platform-observability/events'
import { extractRequestMetadata } from '@/lib/platform-observability/context'
import { resolveAuthRequestOrigin } from '@/lib/auth/request-origin'

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

function buildInquiryDestination(
  request: NextRequest,
  slug: string,
  partnerId: string,
  locationId: string
) {
  const url = buildAppUrl(request, `/chef/${slug}/inquire`)
  url.searchParams.set('ref', partnerId)
  url.searchParams.set('loc', locationId)
  return url
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
  const [{ data: location }, { data: locationLink }] = await Promise.all([
    db
      .from('partner_locations')
      .select(
        `
        id, partner_id, name, address, city, state, zip, booking_url, description, max_guest_count,
        experience_tags, best_for, service_types, is_active
      `
      )
      .eq('tenant_id', chef.id)
      .eq('id', params.locationId)
      .maybeSingle(),
    db
      .from('chef_location_links')
      .select('location_id, relationship_type, is_public, is_featured, sort_order')
      .eq('chef_id', chef.id)
      .eq('location_id', params.locationId)
      .maybeSingle(),
  ])

  const resolvedPartnerId = location?.partner_id ?? null
  if (!location || !resolvedPartnerId) {
    return NextResponse.redirect(buildAppUrl(request, `/chef/${params.slug}`), 307)
  }

  const { data: resolvedPartner } = await db
    .from('referral_partners')
    .select(
      `
      id, name, partner_type, booking_url, description, cover_image_url, is_showcase_visible, status,
      partner_images(id, image_url, caption, season, display_order, location_id)
    `
    )
    .eq('tenant_id', chef.id)
    .eq('id', resolvedPartnerId)
    .maybeSingle()

  if (
    !resolvedPartner ||
    resolvedPartner.status !== 'active' ||
    resolvedPartner.is_showcase_visible === false
  ) {
    return NextResponse.redirect(buildAppUrl(request, `/chef/${params.slug}/inquire`), 307)
  }

  const publicLocations = buildPublicLocationExperiences(
    [
      {
        ...resolvedPartner,
        partner_locations: [location],
      },
    ],
    locationLink ? [locationLink] : []
  )
  const publicLocation = publicLocations.find((item) => item.id === params.locationId) ?? null

  if (!publicLocation) {
    return NextResponse.redirect(buildAppUrl(request, `/chef/${params.slug}/inquire`), 307)
  }

  const destination = buildInquiryDestination(
    request,
    params.slug,
    resolvedPartner.id,
    publicLocation.id
  )

  try {
    await recordPlatformEvent({
      eventKey: 'conversion.location_inquiry_link_clicked',
      source: 'public_location_page',
      actorType: 'anonymous',
      tenantId: chef.id,
      subjectType: 'location',
      subjectId: publicLocation.id,
      summary: `${chef.display_name || 'Chef'} location inquiry link clicked`,
      details: `${publicLocation.name} via ${resolvedPartner.name || 'partner'}`,
      metadata: {
        ...extractRequestMetadata(request.headers),
        chef_slug: params.slug,
        referral_partner_id: resolvedPartner.id,
        referral_partner_name: resolvedPartner.name ?? null,
        partner_location_id: publicLocation.id,
        partner_location_name: publicLocation.name ?? null,
      },
    })
  } catch (error) {
    console.error('[public-location-inquire] event logging failed:', error)
  }

  return NextResponse.redirect(destination, 307)
}
