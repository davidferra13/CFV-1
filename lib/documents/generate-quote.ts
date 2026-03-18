// Quote/Proposal PDF Generator
// Client-facing document: menu first, price after - never lead with the number.
// Sections: Header → Menu → Pricing → Terms → CTA
// Warm, professional tone. Sent via link or PDF attachment.
// MUST fit on ONE page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuoteDocumentData = {
  quote: {
    id: string
    quoteRef: string // "QUOTE-{YYYY}-{NNNN}" derived from created_at + truncated id
    pricingModel: 'per_person' | 'flat_rate' | 'custom'
    totalQuotedCents: number
    pricePerPersonCents: number | null
    guestCountEstimated: number | null
    depositRequired: boolean
    depositAmountCents: number | null
    depositPercentage: number | null
    validUntil: string | null // ISO date string
    pricingNotes: string | null // "What's included" from chef's notes
    sentAt: string | null
  }
  chef: {
    businessName: string
    email: string
    phone: string | null
  }
  client: {
    fullName: string
    email: string | null
    loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum' | null
    loyaltyPoints: number | null
  }
  event: {
    occasion: string | null
    eventDate: string | null // ISO date string (from event or inquiry)
    guestCount: number | null
    location: string | null
    serviceStyle: string | null
    dietaryRestrictions: string[]
    allergies: string[]
  }
  menu: Array<{
    courseNumber: number
    courseName: string
    description: string | null // FOH description (dish.description)
    componentNames: string[] // Fallback if no description
  }>
  cancellationPolicy: {
    cutoffDays: number
    depositRefundable: boolean
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

export async function fetchQuoteDocumentData(quoteId: string): Promise<QuoteDocumentData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch quote with client
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      `
      id, created_at, pricing_model, total_quoted_cents, price_per_person_cents,
      guest_count_estimated, deposit_required, deposit_amount_cents,
      deposit_percentage, valid_until, pricing_notes, sent_at,
      event_id, inquiry_id,
      client:clients(full_name, email, loyalty_tier, loyalty_points)
    `
    )
    .eq('id', quoteId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!quote) return null

  // Fetch chef info + cancellation settings
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone, cancellation_cutoff_days, deposit_refundable')
    .eq('id', user.tenantId!)
    .single()

  if (!chef) return null

  const clientData = quote.client as {
    full_name: string
    email: string | null
    loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | null
    loyalty_points: number | null
  } | null

  // Resolve event details - either from the linked event or from the linked inquiry
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
      .eq('tenant_id', user.tenantId!)
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

      // Fetch menu for this event (FOH descriptions only)
      const { data: menus } = await supabase
        .from('menus')
        .select('id')
        .eq('event_id', quote.event_id)
        .eq('tenant_id', user.tenantId!)
        .order('created_at', { ascending: true })
        .limit(1)

      if (menus && menus.length > 0) {
        const { data: dishes } = await supabase
          .from('dishes')
          .select('course_number, course_name, description, id')
          .eq('menu_id', menus[0].id)
          .eq('tenant_id', user.tenantId!)
          .order('course_number', { ascending: true })
          .order('sort_order', { ascending: true })

        if (dishes && dishes.length > 0) {
          // Group by course number for FOH presentation
          const courseMap = new Map<
            number,
            { name: string; description: string | null; dishIds: string[] }
          >()
          for (const dish of dishes) {
            const existing = courseMap.get(dish.course_number)
            if (existing) {
              // Merge descriptions if multiple dishes in a course
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

          // Fetch component names as fallback for courses without descriptions
          const allDishIds = dishes.map((d: any) => d.id)
          const { data: components } = await supabase
            .from('components')
            .select('dish_id, name')
            .in('dish_id', allDishIds)
            .eq('tenant_id', user.tenantId!)
            .order('sort_order', { ascending: true })

          const compsByDish = new Map<string, string[]>()
          for (const comp of components || []) {
            const arr = compsByDish.get(comp.dish_id) || []
            arr.push(comp.name)
            compsByDish.set(comp.dish_id, arr)
          }

          menuCourses = Array.from(courseMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([courseNumber, data]) => {
              const allComponentNames = data.dishIds.flatMap((id) => compsByDish.get(id) || [])
              return {
                courseNumber,
                courseName: data.name,
                description: data.description,
                componentNames: allComponentNames,
              }
            })
        }
      }
    }
  } else if (quote.inquiry_id) {
    // Fallback: pull event details from inquiry
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select(
        'confirmed_date, confirmed_guest_count, confirmed_location, confirmed_occasion, confirmed_dietary_restrictions'
      )
      .eq('id', quote.inquiry_id)
      .eq('tenant_id', user.tenantId!)
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

  // Derive a human-readable quote reference from created_at + short ID
  const year = new Date(quote.created_at).getFullYear()
  const shortId = quoteId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const quoteRef = `QUOTE-${year}-${shortId}`

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
    cancellationPolicy: {
      cutoffDays: (chef as any).cancellation_cutoff_days ?? 15,
      depositRefundable: (chef as any).deposit_refundable ?? false,
    },
  }
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderQuote(pdf: PDFLayout, data: QuoteDocumentData) {
  const { quote, chef, client, event, menu, cancellationPolicy } = data

  // Density scaling for menus with many courses
  if (menu.length > 6) pdf.setFontScale(0.85)
  if (menu.length > 9) pdf.setFontScale(0.75)

  // ── SECTION 1: HEADER ──────────────────────────────────────────────────────
  pdf.title(chef.businessName, 14)
  pdf.space(1)

  // Quote metadata bar
  const dateStr = quote.sentAt
    ? format(new Date(quote.sentAt), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy')
  pdf.headerBar([
    ['Prepared for', client.fullName],
    ['Date', dateStr],
    ['Ref', quote.quoteRef],
  ])
  if (client.loyaltyTier) {
    const loyaltyLabel = `${client.loyaltyTier.charAt(0).toUpperCase()}${client.loyaltyTier.slice(1)} member`
    const pointsLabel =
      typeof client.loyaltyPoints === 'number'
        ? `${client.loyaltyPoints.toLocaleString()} points`
        : 'Loyalty account active'
    pdf.text(`Loyalty status: ${loyaltyLabel} - ${pointsLabel}`, 8, 'italic', 0)
    pdf.space(1)
  }

  if (quote.validUntil) {
    pdf.text(
      `This quote is valid until ${format(parseISO(quote.validUntil), 'MMMM d, yyyy')}.`,
      8,
      'italic',
      0
    )
    pdf.space(1)
  }

  pdf.space(3)

  // ── SECTION 2: MENU ───────────────────────────────────────────────────────
  // Always present menu before price - never lead with the number.
  pdf.sectionHeader('YOUR MENU', 11, true)

  if (event.occasion) {
    pdf.text(event.occasion, 10, 'bold', 0)
  }

  const eventMeta: string[] = []
  if (event.eventDate) {
    eventMeta.push(format(parseISO(event.eventDate), 'MMMM d, yyyy'))
  }
  const guestCount = event.guestCount ?? quote.guestCountEstimated
  if (guestCount) eventMeta.push(`${guestCount} guests`)
  if (event.location) eventMeta.push(event.location)
  if (event.serviceStyle) eventMeta.push(event.serviceStyle)

  if (eventMeta.length > 0) {
    pdf.text(eventMeta.join('  ·  '), 8, 'normal', 0)
  }

  pdf.space(2)

  if (menu.length > 0) {
    for (const course of menu) {
      pdf.courseHeader(`${course.courseNumber}. ${course.courseName}`)
      if (course.description) {
        pdf.text(course.description, 9, 'italic', 6)
      } else if (course.componentNames.length > 0) {
        pdf.text(course.componentNames.join(', '), 9, 'italic', 6)
      }
      pdf.space(1)
    }
  } else {
    pdf.text(
      "Menu to be finalized. I'll share the full menu details with you shortly.",
      9,
      'italic',
      0
    )
    pdf.space(1)
  }

  // Dietary note
  const allDietary = [...(event.dietaryRestrictions || []), ...(event.allergies || [])].filter(
    Boolean
  )
  if (allDietary.length > 0) {
    pdf.text(`Dietary accommodations: ${allDietary.join(', ')}`, 8, 'italic', 0)
    pdf.space(1)
  }

  // ── SECTION 3: INVESTMENT ─────────────────────────────────────────────────
  pdf.sectionHeader('YOUR INVESTMENT', 11, true)

  // Single line item - menu first means the number lands in context, not first
  const pricingLabel =
    quote.pricingModel === 'per_person' && quote.pricePerPersonCents
      ? `${formatCents(quote.pricePerPersonCents)} per person`
      : quote.pricingModel === 'flat_rate'
        ? 'Flat rate'
        : 'Custom pricing'

  const guestNote = guestCount ? ` (${guestCount} guests)` : ''
  pdf.keyValue(
    'Service total',
    `${formatCents(quote.totalQuotedCents)}${guestNote ? '  ·  ' + pricingLabel : ''}`
  )

  if (quote.depositRequired && quote.depositAmountCents) {
    const depositLabel = quote.depositPercentage
      ? `${quote.depositPercentage}% deposit to reserve`
      : 'Deposit to reserve'
    pdf.keyValue(depositLabel, formatCents(quote.depositAmountCents))
    const balance = quote.totalQuotedCents - quote.depositAmountCents
    pdf.keyValue('Balance due on day of service', formatCents(balance))
  }

  if (quote.pricingNotes) {
    pdf.space(2)
    pdf.text("What's included:", 9, 'bold', 0)
    const lines = quote.pricingNotes.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      pdf.bullet(line.replace(/^[-•]\s*/, ''), 9)
    }
  }

  pdf.space(2)

  // ── SECTION 4: TERMS ──────────────────────────────────────────────────────
  pdf.sectionHeader('TERMS', 10, true)

  const cutoff = cancellationPolicy.cutoffDays
  const depositRefundable = cancellationPolicy.depositRefundable

  const cancellationText =
    cutoff > 0
      ? `Cancellations ${cutoff}+ days before the event: full refund. Within ${cutoff} days: no refund on balance.${depositRefundable ? '' : ' Deposits are non-refundable.'}`
      : 'All payments are non-refundable once made. Please contact me if you need to reschedule.'

  pdf.text(cancellationText, 8, 'normal', 0)
  pdf.space(1)
  pdf.text(
    'Final guest count confirmed 48 hours prior to the event. Additional guests may incur extra charges.',
    8,
    'normal',
    0
  )
  pdf.space(2)

  // ── SECTION 5: CALL TO ACTION ─────────────────────────────────────────────
  pdf.sectionHeader('READY TO BOOK?', 10, true)
  pdf.text(
    `I'd love to cook for you. Reply to this email or reach me directly at ${chef.email}${chef.phone ? ' / ' + chef.phone : ''} to confirm your date.`,
    9,
    'normal',
    0
  )
  pdf.space(1)
  pdf.text(`Looking forward to it,`, 9, 'italic', 0)
  pdf.text(chef.businessName, 9, 'bold', 0)

  // Footer
  pdf.footer(`${quote.quoteRef}  ·  ${chef.businessName}  ·  ${chef.email}`)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function generateQuote(quoteId: string): Promise<Buffer> {
  const data = await fetchQuoteDocumentData(quoteId)
  if (!data) throw new Error('Cannot generate quote: quote not found or access denied')

  const pdf = new PDFLayout()
  renderQuote(pdf, data)
  return pdf.toBuffer()
}
