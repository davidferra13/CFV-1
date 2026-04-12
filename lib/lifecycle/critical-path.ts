'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Critical Path Tracker
// Computes 10 hard-block items from existing inquiry/event/ledger data.
// Pure computation, no new tables or columns.
// ---------------------------------------------------------------------------

export type CriticalPathStatus = 'confirmed' | 'missing' | 'partial'

export interface CriticalPathItem {
  key: string
  label: string
  status: CriticalPathStatus
  value: string | null
  source: 'email' | 'form' | 'manual' | 'system' | null
  blocking_stage: 'quote' | 'shopping' | 'menu_lock' | 'service_day'
}

export interface CriticalPathResult {
  items: CriticalPathItem[]
  complete: boolean
  completedCount: number
  nextBlocker: string | null
}

export interface GuestCriticalPathItem {
  label: string
  status: 'confirmed' | 'missing' | 'partial'
  value: string | null
}

export interface GuestCriticalPathResult {
  confirmed: GuestCriticalPathItem[]
  missing: GuestCriticalPathItem[]
  groupName: string | null
  chefName: string | null
  discussedDishes: string[] | null
}

// ---------------------------------------------------------------------------
// Address quality heuristic
// ---------------------------------------------------------------------------

function assessAddress(location: string | null): CriticalPathStatus {
  if (!location || location.trim() === '') return 'missing'
  const trimmed = location.trim()
  const hasStreetNumber = /\d+/.test(trimmed)
  const hasZip = /\d{5}/.test(trimmed)
  const commaCount = (trimmed.match(/,/g) || []).length

  if (hasStreetNumber && (hasZip || commaCount >= 2)) return 'confirmed'
  if (hasStreetNumber || commaCount >= 1) return 'partial'
  return 'partial'
}

// ---------------------------------------------------------------------------
// getCriticalPath (chef-facing, all 10 items)
// ---------------------------------------------------------------------------

export async function getCriticalPath(input: {
  inquiryId?: string
  eventId?: string
}): Promise<CriticalPathResult> {
  const user = await requireChef()
  const db = createServerClient()

  const items: CriticalPathItem[] = []

  // Fetch inquiry data
  let inquiry: Record<string, any> | null = null
  if (input.inquiryId) {
    const { data } = await db
      .from('inquiries')
      .select('*')
      .eq('id', input.inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single()
    inquiry = data
  }

  // Fetch event data if we have an eventId or the inquiry converted
  let eventId = input.eventId || inquiry?.converted_to_event_id || null
  let event: Record<string, any> | null = null
  if (eventId) {
    const { data } = await db
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    event = data
  }

  // 1. Host name
  const hostName = inquiry?.contact_name || null
  items.push({
    key: 'host_name',
    label: 'Host name',
    status: hostName ? 'confirmed' : 'missing',
    value: hostName,
    source: hostName ? 'form' : null,
    blocking_stage: 'quote',
  })

  // 2. Host contact (email OR phone satisfies)
  const hasEmail = !!inquiry?.contact_email
  const hasPhone = !!inquiry?.contact_phone
  items.push({
    key: 'host_contact',
    label: 'Contact method (email or phone)',
    status: hasEmail || hasPhone ? 'confirmed' : 'missing',
    value: inquiry?.contact_email || inquiry?.contact_phone || null,
    source: hasEmail || hasPhone ? 'form' : null,
    blocking_stage: 'quote',
  })

  // 3. Confirmed date
  const confirmedDate = inquiry?.confirmed_date || event?.serve_time || null
  items.push({
    key: 'event_date',
    label: 'Confirmed date',
    status: confirmedDate ? 'confirmed' : 'missing',
    value: confirmedDate ? new Date(confirmedDate).toLocaleDateString() : null,
    source: confirmedDate ? 'form' : null,
    blocking_stage: 'quote',
  })

  // 4. Exact address
  const location = inquiry?.confirmed_location || null
  const addressStatus = assessAddress(location)
  items.push({
    key: 'event_address',
    label: 'Exact address',
    status: addressStatus,
    value: location,
    source: location ? 'form' : null,
    blocking_stage: 'shopping',
  })

  // 5. Final guest count
  const guestCount = inquiry?.confirmed_guest_count ?? null
  items.push({
    key: 'guest_count',
    label: 'Final guest count',
    status: guestCount && guestCount > 0 ? 'confirmed' : 'missing',
    value: guestCount && guestCount > 0 ? `${guestCount} guests` : null,
    source: guestCount ? 'form' : null,
    blocking_stage: 'quote',
  })

  // 6. Life-threatening allergies confirmed
  // 7. Dietary restrictions
  const dietary = inquiry?.confirmed_dietary_restrictions
  const hasDietary = Array.isArray(dietary) ? dietary.length > 0 : !!dietary
  const dietaryIsNull = dietary === null || dietary === undefined

  items.push({
    key: 'allergies',
    label: 'Life-threatening allergies confirmed',
    status: hasDietary ? 'confirmed' : dietaryIsNull ? 'missing' : 'partial',
    value: hasDietary ? (Array.isArray(dietary) ? dietary.join(', ') : String(dietary)) : null,
    source: hasDietary ? 'form' : null,
    blocking_stage: 'menu_lock',
  })

  items.push({
    key: 'dietary',
    label: 'Dietary restrictions',
    status: hasDietary ? 'confirmed' : dietaryIsNull ? 'missing' : 'partial',
    value: hasDietary ? (Array.isArray(dietary) ? dietary.join(', ') : String(dietary)) : null,
    source: hasDietary ? 'form' : null,
    blocking_stage: 'menu_lock',
  })

  // 8. Menu confirmed by host
  let menuConfirmed = false
  if (eventId) {
    const { data: menus } = await db
      .from('event_menus')
      .select('id, status')
      .eq('event_id', eventId)
      .limit(1)
    if (menus && menus.length > 0) {
      const menuStatus = menus[0].status
      menuConfirmed = menuStatus === 'confirmed' || menuStatus === 'locked'
    }
  }
  // Also check if inquiry has a selected menu
  if (!menuConfirmed && inquiry?.selected_menu_id) {
    menuConfirmed = false // selected but not confirmed
  }

  items.push({
    key: 'menu_confirmed',
    label: 'Menu confirmed by host',
    status: menuConfirmed ? 'confirmed' : 'missing',
    value: menuConfirmed ? 'Confirmed' : null,
    source: menuConfirmed ? 'system' : null,
    blocking_stage: 'shopping',
  })

  // 9. Service time
  const hasTime = !!(
    (inquiry?.confirmed_date && new Date(inquiry.confirmed_date).getHours() > 0) ||
    event?.serve_time
  )
  items.push({
    key: 'service_time',
    label: 'Dinner time / chef arrival',
    status: hasTime ? 'confirmed' : 'missing',
    value: hasTime
      ? new Date(event?.serve_time || inquiry?.confirmed_date).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null,
    source: hasTime ? 'form' : null,
    blocking_stage: 'service_day',
  })

  // 10. Deposit or payment received
  let depositReceived = false
  if (eventId) {
    const { data: ledger } = await db
      .from('ledger_entries')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .in('category', ['deposit', 'payment'])
      .limit(1)
    depositReceived = !!(ledger && ledger.length > 0)
  }

  items.push({
    key: 'deposit_received',
    label: 'Deposit or payment received',
    status: depositReceived ? 'confirmed' : 'missing',
    value: depositReceived ? 'Received' : null,
    source: depositReceived ? 'system' : null,
    blocking_stage: 'shopping',
  })

  const completedCount = items.filter((i) => i.status === 'confirmed').length
  const firstBlocker = items.find((i) => i.status !== 'confirmed')

  return {
    items,
    complete: completedCount === 10,
    completedCount,
    nextBlocker: firstBlocker?.label || null,
  }
}

// ---------------------------------------------------------------------------
// getCriticalPathForGuest (public, token-auth, items 1-9 only)
// ---------------------------------------------------------------------------

export async function getCriticalPathForGuest(
  groupToken: string
): Promise<GuestCriticalPathResult | null> {
  const db = createServerClient({ admin: true })

  // Look up group by token
  const { data: group } = await db
    .from('hub_groups')
    .select('id, name, inquiry_id, event_id, tenant_id')
    .eq('group_token', groupToken)
    .eq('is_active', true)
    .single()

  if (!group) return null

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', group.tenant_id)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your chef'

  // Get inquiry data
  let inquiry: Record<string, any> | null = null
  if (group.inquiry_id) {
    const { data } = await db.from('inquiries').select('*').eq('id', group.inquiry_id).single()
    inquiry = data
  }

  // Get event data
  let event: Record<string, any> | null = null
  const eventId = group.event_id || inquiry?.converted_to_event_id || null
  if (eventId) {
    const { data } = await db.from('events').select('*').eq('id', eventId).single()
    event = data
  }

  const confirmed: GuestCriticalPathItem[] = []
  const missing: GuestCriticalPathItem[] = []

  // Helper to categorize items
  function addItem(label: string, status: CriticalPathStatus, value: string | null) {
    const item = { label, status, value }
    if (status === 'confirmed') {
      confirmed.push(item)
    } else {
      missing.push(item)
    }
  }

  // Items 1-9 (deposit/payment is item 10, never shown to guests)
  const hostName = inquiry?.contact_name || null
  addItem('Host name', hostName ? 'confirmed' : 'missing', hostName)

  const hasContact = !!(inquiry?.contact_email || inquiry?.contact_phone)
  addItem('Contact info', hasContact ? 'confirmed' : 'missing', hasContact ? 'On file' : null)

  const confirmedDate = inquiry?.confirmed_date || event?.serve_time || null
  addItem(
    'Date',
    confirmedDate ? 'confirmed' : 'missing',
    confirmedDate ? new Date(confirmedDate).toLocaleDateString() : null
  )

  const location = inquiry?.confirmed_location || null
  const addrStatus = assessAddress(location)
  addItem(
    'Address',
    addrStatus,
    addrStatus === 'confirmed' ? location : addrStatus === 'partial' ? 'Need exact address' : null
  )

  const guestCount = inquiry?.confirmed_guest_count ?? null
  addItem(
    'Guest count',
    guestCount && guestCount > 0 ? 'confirmed' : 'missing',
    guestCount && guestCount > 0 ? `${guestCount} guests` : null
  )

  const dietary = inquiry?.confirmed_dietary_restrictions
  const hasDietary = Array.isArray(dietary) ? dietary.length > 0 : !!dietary
  addItem(
    'Allergies confirmed',
    hasDietary ? 'confirmed' : 'missing',
    hasDietary ? (Array.isArray(dietary) ? dietary.join(', ') : String(dietary)) : null
  )
  addItem(
    'Dietary restrictions',
    hasDietary ? 'confirmed' : 'missing',
    hasDietary ? (Array.isArray(dietary) ? dietary.join(', ') : String(dietary)) : null
  )

  // Menu status
  let menuLabel = 'Menu coming soon'
  let menuStatus: CriticalPathStatus = 'missing'
  if (eventId) {
    const { data: menus } = await db
      .from('event_menus')
      .select('id, status')
      .eq('event_id', eventId)
      .limit(1)
    if (menus && menus.length > 0) {
      const s = menus[0].status
      if (s === 'confirmed' || s === 'locked') {
        menuStatus = 'confirmed'
        menuLabel = 'Menu confirmed'
      } else {
        menuStatus = 'partial'
        menuLabel = 'Menu in progress'
      }
    }
  }
  addItem('Menu', menuStatus, menuLabel)

  // Service time
  const hasTime = !!(
    (inquiry?.confirmed_date && new Date(inquiry.confirmed_date).getHours() > 0) ||
    event?.serve_time
  )
  addItem(
    'Dinner time',
    hasTime ? 'confirmed' : 'missing',
    hasTime
      ? new Date(event?.serve_time || inquiry?.confirmed_date).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  )

  // Include discussed dishes if available (informational, not a blocking item)
  const dishes = (inquiry as any)?.discussed_dishes as string[] | null
  const discussedDishes = Array.isArray(dishes) && dishes.length > 0 ? dishes : null

  return {
    confirmed,
    missing,
    groupName: group.name,
    chefName,
    discussedDishes,
  }
}
