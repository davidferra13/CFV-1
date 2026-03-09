import { NextResponse } from 'next/server'
import { format, parseISO } from 'date-fns'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from '@/lib/documents/pdf-layout'
import { renderQuote, type QuoteDocumentData } from '@/lib/documents/generate-quote'

// Client-facing quote PDF.
// Reuses the same renderQuote() renderer as the chef route — only the
// data fetch differs: we scope by client_id instead of tenant_id.

async function fetchQuoteDataForClient(
  quoteId: string,
  entityId: string
): Promise<QuoteDocumentData | null> {
  const supabase: any = createServerClient()

  // Verify client owns this quote
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `
      id, created_at, pricing_model, total_quoted_cents, price_per_person_cents,
      guest_count_estimated, deposit_required, deposit_amount_cents,
      deposit_percentage, valid_until, pricing_notes, sent_at, show_cost_breakdown, exclusions_note,
      event_id, inquiry_id, tenant_id,
      client:clients(full_name, email, loyalty_tier, loyalty_points)
    `
    )
    .eq('id', quoteId)
    .eq('client_id', entityId)
    .single()

  if (!quote) return null

  // Fetch chef info + cancellation settings via tenant_id
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone, cancellation_cutoff_days, deposit_refundable')
    .eq('id', quote.tenant_id as string)
    .single()

  if (!chef) return null

  const clientData = quote.client as {
    full_name: string
    email: string | null
    loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null
    loyalty_points: number | null
  } | null

  // Resolve event details
  let eventDetails: QuoteDocumentData['event'] = {
    occasion: null,
    eventDate: null,
    guestCount: quote.guest_count_estimated,
    location: null,
    serviceStyle: null,
    dietaryRestrictions: [],
    allergies: [],
  }

  let menuCourses: QuoteDocumentData['menu'] = []
  let costBreakdown: QuoteDocumentData['costBreakdown'] = []

  if (quote.event_id) {
    const { data: event } = await supabase
      .from('events')
      .select(
        `
        occasion, event_date, guest_count, location_address, location_city,
        location_state, service_style, dietary_restrictions, allergies
      `
      )
      .eq('id', quote.event_id)
      .eq('client_id', entityId)
      .single()

    if (event) {
      const locationParts = [
        event.location_address,
        event.location_city,
        event.location_state,
      ].filter(Boolean)
      eventDetails = {
        occasion: event.occasion,
        eventDate: event.event_date,
        guestCount: event.guest_count,
        location: locationParts.length > 0 ? locationParts.join(', ') : null,
        serviceStyle: event.service_style,
        dietaryRestrictions: event.dietary_restrictions ?? [],
        allergies: event.allergies ?? [],
      }

      // Fetch menu courses (FOH only — no recipe details)
      const { data: menus } = await supabase
        .from('menus')
        .select('id')
        .eq('event_id', quote.event_id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (menus && menus.length > 0) {
        const { data: dishes } = await supabase
          .from('dishes')
          .select('course_number, course_name, description, id')
          .eq('menu_id', menus[0].id)
          .order('course_number', { ascending: true })
          .order('sort_order', { ascending: true })

        if (dishes && dishes.length > 0) {
          const courseMap = new Map<
            number,
            { name: string; description: string | null; dishIds: string[] }
          >()
          for (const dish of dishes) {
            const existing = courseMap.get(dish.course_number)
            if (existing) {
              if (dish.description && existing.description) {
                existing.description = existing.description + ' / ' + dish.description
              } else if (dish.description) {
                existing.description = dish.description
              }
              existing.dishIds.push(dish.id)
            } else {
              courseMap.set(dish.course_number, {
                name: dish.course_name,
                description: dish.description,
                dishIds: [dish.id],
              })
            }
          }

          const allDishIds = dishes.map((d: any) => d.id)
          const { data: components } = await supabase
            .from('components')
            .select('dish_id, name')
            .in('dish_id', allDishIds)
            .order('sort_order', { ascending: true })

          const compsByDish = new Map<string, string[]>()
          for (const comp of components || []) {
            const arr = compsByDish.get(comp.dish_id) || []
            arr.push(comp.name)
            compsByDish.set(comp.dish_id, arr)
          }

          menuCourses = Array.from(courseMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([courseNumber, data]) => ({
              courseNumber,
              courseName: data.name,
              description: data.description,
              componentNames: data.dishIds.flatMap((id) => compsByDish.get(id) || []),
            }))
        }
      }
    }
  } else if (quote.inquiry_id) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select(
        'confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_dietary_restrictions'
      )
      .eq('id', quote.inquiry_id)
      .eq('client_id', entityId)
      .single()

    if (inquiry) {
      eventDetails = {
        occasion: inquiry.confirmed_occasion,
        eventDate: inquiry.confirmed_date ? inquiry.confirmed_date.split('T')[0] : null,
        guestCount: inquiry.confirmed_guest_count ?? quote.guest_count_estimated,
        location: inquiry.confirmed_location,
        serviceStyle: null,
        dietaryRestrictions: inquiry.confirmed_dietary_restrictions ?? [],
        allergies: [],
      }
    }
  }

  const year = new Date(quote.created_at).getFullYear()
  const shortId = quoteId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const quoteRef = `QUOTE-${year}-${shortId}`

  if (quote.show_cost_breakdown) {
    const { data: lineItems } = await supabase
      .from('quote_line_items')
      .select('label, amount_cents, percentage, source_note')
      .eq('quote_id', quote.id)
      .eq('is_visible_to_client', true)
      .order('sort_order', { ascending: true })

    costBreakdown = ((lineItems ?? []) as any[]).map((item) => ({
      label: item.label,
      amountCents: item.amount_cents,
      percentage: item.percentage,
      sourceNote: item.source_note,
    }))
  }

  return {
    quote: {
      id: quote.id,
      quoteRef,
      pricingModel: quote.pricing_model as 'per_person' | 'flat_rate' | 'custom',
      totalQuotedCents: quote.total_quoted_cents,
      pricePerPersonCents: quote.price_per_person_cents,
      guestCountEstimated: quote.guest_count_estimated,
      depositRequired: quote.deposit_required,
      depositAmountCents: quote.deposit_amount_cents,
      depositPercentage: quote.deposit_percentage,
      validUntil: quote.valid_until,
      pricingNotes: quote.pricing_notes,
      sentAt: quote.sent_at,
      showCostBreakdown: quote.show_cost_breakdown ?? false,
      exclusionsNote: quote.exclusions_note ?? null,
    },
    chef: {
      businessName: chef.business_name,
      email: chef.email,
      phone: chef.phone,
    },
    client: {
      fullName: clientData?.full_name ?? 'Valued Guest',
      email: clientData?.email ?? null,
      loyaltyTier: clientData?.loyalty_tier ?? null,
      loyaltyPoints: clientData?.loyalty_points ?? null,
    },
    event: eventDetails,
    menu: menuCourses,
    costBreakdown,
    cancellationPolicy: {
      cutoffDays: (chef as any).cancellation_cutoff_days ?? 15,
      depositRefundable: (chef as any).deposit_refundable ?? false,
    },
  }
}

export async function GET(_request: Request, { params }: { params: { quoteId: string } }) {
  try {
    const user = await requireClient()

    const data = await fetchQuoteDataForClient(params.quoteId, user.entityId)
    if (!data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const pdf = new PDFLayout()
    renderQuote(pdf, data)
    const bytes = new Uint8Array(pdf.toBuffer())
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="quote-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate quote'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[quote-client-route] Error:', error)
    return NextResponse.json({ error: 'Failed to generate quote' }, { status: 500 })
  }
}
