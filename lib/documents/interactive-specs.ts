// Interactive Document Spec Types + Converters
// Normalizes all document data shapes into one common structure for the interactive viewer.
// One converter per document type — reuses existing fetch*Data() return values directly.
// No new DB queries — all data comes from the generators that already power the PDFs.

import type { GroceryListData } from './generate-grocery-list'
import type { PrepSheetData } from './generate-prep-sheet'
import type { ChecklistData } from './generate-checklist'
import type { ResetChecklistData } from './generate-reset-checklist'
import type { ContentShotListData } from './generate-content-shot-list'
import type { EventSummaryData } from './generate-event-summary'
import type { ExecutionSheetData } from './generate-execution-sheet'
import type { FrontOfHouseMenuData } from './generate-front-of-house-menu'
import type { TravelLegWithIngredients } from '@/lib/travel/types'
import { format, parseISO } from 'date-fns'

// ─── Core Types ───────────────────────────────────────────────────────────────

export type ItemState = 0 | 1 | 2
// 0 = untouched (blank square)
// 1 = working on (amber → icon, normal text)
// 2 = done (green ✓ icon, strikethrough text)

export type InteractiveItem = {
  id: string
  label: string
  sublabel?: string
  checkable: boolean      // false = rendered as text/info, no tap target
  initialState?: ItemState  // used for pre-crossed items (e.g. pre-sourced groceries)
}

export type InteractiveSection = {
  id: string
  title: string
  subtitle?: string
  warning?: string        // amber/red warning box shown above items
  items: InteractiveItem[]
}

export type InteractiveDocSpec = {
  title: string
  subtitle?: string
  headerPills: { label: string; value: string }[]
  alerts: string[]        // red safety/allergy banners above all sections
  sections: InteractiveSection[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try { return format(parseISO(dateStr), 'EEE, MMM d, yyyy') } catch { return dateStr }
}

function fmtQty(qty: number, unit: string): string {
  const rounded = qty === Math.floor(qty) ? qty : parseFloat(qty.toFixed(2))
  return `${rounded} ${unit}`
}

// ─── Grocery List ─────────────────────────────────────────────────────────────

export function groceryListToSpec(data: GroceryListData): InteractiveDocSpec {
  const { event, clientName, groceryStoreName, liquorStoreName,
    stop1Sections, stop2Items, presourcedItems, unrecipedComponents, budget } = data

  const headerPills: { label: string; value: string }[] = [
    { label: 'Client', value: clientName },
    { label: 'Guests', value: String(event.guest_count) },
    { label: 'Date', value: fmtDate(event.event_date) },
  ]
  if (budget.ceilingCents != null) {
    headerPills.push({ label: 'Budget', value: `$${Math.round(budget.ceilingCents / 100)}` })
  }

  const sections: InteractiveSection[] = []

  // Stop 1 — grocery sections (PROTEINS, PRODUCE, DAIRY/FATS, PANTRY, SPECIALTY)
  if (stop1Sections.length > 0) {
    for (const storeSection of stop1Sections) {
      const sId = storeSection.sectionName.toLowerCase().replace(/[\s/]+/g, '-')
      sections.push({
        id: `s1-${sId}`,
        title: `${groceryStoreName} — ${storeSection.sectionName}`,
        items: storeSection.items.map((item, i) => ({
          id: `s1-${sId}-${i}`,
          label: `${item.ingredientName} — ${fmtQty(item.quantity, item.unit)}${item.isOptional ? ' (optional)' : ''}`,
          sublabel: item.courseLabel,
          checkable: true,
        })),
      })
    }
  } else {
    sections.push({
      id: 's1-empty',
      title: `${groceryStoreName}`,
      items: [{ id: 's1-empty-0', label: 'No ingredients with linked recipes — see Verify Manually below.', checkable: false }],
    })
  }

  // Stop 2 — liquor store
  if (stop2Items.length > 0) {
    sections.push({
      id: 's2',
      title: liquorStoreName,
      items: stop2Items.map((item, i) => ({
        id: `s2-${i}`,
        label: `${item.ingredientName} — ${fmtQty(item.quantity, item.unit)}`,
        sublabel: item.courseLabel,
        checkable: true,
      })),
    })
  }

  // Pre-sourced — arrives crossed out (state 2)
  if (presourcedItems.length > 0) {
    sections.push({
      id: 'presourced',
      title: '✓ Pre-Sourced (specialty run)',
      subtitle: 'Already sourced — verify on arrival',
      items: presourcedItems.map((item, i) => {
        const qty = item.quantity != null ? `${item.quantity} ${item.unit ?? ''}`.trim() : ''
        const store = item.storeName ? ` @ ${item.storeName}` : ''
        return {
          id: `pre-${i}`,
          label: `${item.ingredientName}${qty ? ` — ${qty}` : ''}${store}`,
          checkable: true,
          initialState: 2 as ItemState,
        }
      }),
    })
  }

  // Verify manually — no recipe linked, informational
  if (unrecipedComponents.length > 0) {
    sections.push({
      id: 'manual',
      title: '⚠ Verify Manually (no recipe linked)',
      warning: 'These components have no linked recipe — quantities unknown.',
      items: unrecipedComponents.map((comp, i) => ({
        id: `manual-${i}`,
        label: `${comp.componentName} — Course ${comp.courseNumber} (${comp.courseName})`,
        checkable: false,
      })),
    })
  }

  return { title: 'Grocery List', headerPills, alerts: [], sections }
}

// ─── Prep Sheet ───────────────────────────────────────────────────────────────

type PrepComp = PrepSheetData['components'][0]
type PrepDish = PrepSheetData['dishes'][0]

function classifyDep(comp: PrepComp): 'prep_now' | 'prep_after_shopping' {
  if (!comp.recipe) return 'prep_after_shopping'
  const required = comp.recipe.recipe_ingredients.filter(ri => !ri.is_optional)
  if (required.length === 0) return 'prep_now'
  return required.every(ri => ri.ingredient.is_staple) ? 'prep_now' : 'prep_after_shopping'
}

function groupByCourse(
  comps: PrepComp[],
  dishById: Map<string, PrepDish>
): [number, { courseName: string; components: PrepComp[] }][] {
  const map = new Map<number, { courseName: string; components: PrepComp[] }>()
  for (const comp of comps) {
    const dish = dishById.get(comp.dish_id)
    if (!dish) continue
    const existing = map.get(dish.course_number)
    if (existing) existing.components.push(comp)
    else map.set(dish.course_number, { courseName: dish.course_name, components: [comp] })
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
}

function prepItemsFromGroups(
  groups: [number, { courseName: string; components: PrepComp[] }][],
  dishById: Map<string, PrepDish>,
  prefix: string,
  useExecution = false
): InteractiveItem[] {
  return groups.flatMap(([courseNum, course]) =>
    course.components.map((comp, i) => {
      const dish = dishById.get(comp.dish_id)
      const allergens = dish?.allergen_flags ?? []
      let label = comp.name
      const note = useExecution ? comp.execution_notes : comp.storage_notes
      if (note) label += ` — ${note}`
      if (allergens.length > 0) label += ` [ALLERGEN: ${allergens.join(', ')}]`
      return {
        id: `${prefix}-${courseNum}-${i}`,
        label,
        sublabel: `Course ${courseNum} — ${course.courseName}`,
        checkable: true,
      }
    })
  )
}

export function prepSheetToSpec(data: PrepSheetData): InteractiveDocSpec {
  const { event, clientName, dishes, components } = data
  const dishById = new Map(dishes.map(d => [d.id, d]))
  const atHome = components.filter(c => c.is_make_ahead)
  const onSite = components.filter(c => !c.is_make_ahead)
  const makeAheadNow = atHome.filter(c => classifyDep(c) === 'prep_now')
  const makeAheadShopping = atHome.filter(c => classifyDep(c) === 'prep_after_shopping')

  const leaveBy = event.departure_time
    ? format(new Date(event.departure_time), 'h:mm a')
    : 'TBD'

  const sections: InteractiveSection[] = []

  if (makeAheadNow.length > 0) {
    sections.push({
      id: 'prep-now',
      title: 'AT HOME — Prep Now',
      subtitle: 'All required ingredients are on hand — start immediately',
      items: prepItemsFromGroups(groupByCourse(makeAheadNow, dishById), dishById, 'prep-now', false),
    })
  }

  if (makeAheadShopping.length > 0) {
    sections.push({
      id: 'prep-shop',
      title: 'AT HOME — Prep After Shopping',
      subtitle: 'Blocked until groceries arrive',
      items: prepItemsFromGroups(groupByCourse(makeAheadShopping, dishById), dishById, 'prep-shop', false),
    })
  }

  sections.push({
    id: 'leaving',
    title: 'Before Leaving',
    items: [
      { id: 'leaving-0', label: 'Pack all components — frozen items LAST', checkable: true },
      { id: 'leaving-1', label: 'Non-negotiables check', checkable: true },
      { id: 'leaving-2', label: `Depart by ${leaveBy}`, checkable: true },
    ],
  })

  if (onSite.length > 0) {
    const siteLocation = [event.location_city, event.location_state].filter(Boolean).join(', ')
    sections.push({
      id: 'on-site',
      title: siteLocation ? `On Site — ${siteLocation}` : 'On Site',
      items: prepItemsFromGroups(groupByCourse(onSite, dishById), dishById, 'site', true),
    })
  }

  return {
    title: 'Prep Sheet',
    headerPills: [
      { label: 'Client', value: clientName },
      { label: 'Date', value: fmtDate(event.event_date) },
      { label: 'Guests', value: String(event.guest_count) },
      { label: 'Serve', value: event.serve_time || 'TBD' },
      { label: 'Leave By', value: leaveBy },
    ],
    alerts: [],
    sections,
  }
}

// ─── Non-Negotiables Checklist ────────────────────────────────────────────────

export function checklistToSpec(data: ChecklistData): InteractiveDocSpec {
  const { event, clientName, permanentItems, eventSpecificItems, learnedItems } = data
  const leaveBy = event.departure_time
    ? format(new Date(event.departure_time), 'h:mm a')
    : null

  const sections: InteractiveSection[] = [
    {
      id: 'always',
      title: 'Always',
      items: permanentItems.map((item, i) => ({
        id: `perm-${i}`,
        label: item.item,
        checkable: true,
      })),
    },
  ]

  if (eventSpecificItems.length > 0) {
    sections.push({
      id: 'this-event',
      title: 'This Event',
      items: eventSpecificItems.map((item, i) => ({
        id: `event-${i}`,
        label: item.item,
        checkable: true,
      })),
    })
  }

  if (learnedItems.length > 0) {
    sections.push({
      id: 'learned',
      title: 'Learned (forgotten before)',
      items: learnedItems.map((item, i) => ({
        id: `learned-${i}`,
        label: item.item,
        sublabel: item.forgottenCount ? `forgotten ${item.forgottenCount}x` : undefined,
        checkable: true,
      })),
    })
  }

  return {
    title: 'Non-Negotiables Checklist',
    subtitle: 'Check before leaving',
    headerPills: [
      { label: 'Client', value: clientName },
      { label: 'Date', value: fmtDate(event.event_date) },
      ...(leaveBy ? [{ label: 'Leave By', value: leaveBy }] : []),
    ],
    alerts: [],
    sections,
  }
}

// ─── Reset Checklist ──────────────────────────────────────────────────────────

export function resetChecklistToSpec(data: ResetChecklistData): InteractiveDocSpec {
  const { event, clientName, specialtyEquipment, paymentReceived, paymentAmountCents } = data

  const paymentLabel = paymentReceived
    ? `Payment received — $${Math.round(paymentAmountCents / 100)}`
    : 'Payment collected or Venmo / payment request sent'

  const specialtyC = specialtyEquipment.length > 0
    ? `Specialty items returned to place (${specialtyEquipment.join(', ')})`
    : 'Specialty items returned to place (ice cream machine, sous vide, etc.)'

  const sections: InteractiveSection[] = [
    {
      id: 'a',
      title: 'A — Bring Everything Inside',
      items: [
        { id: 'a-0', label: 'All equipment bags brought inside from car', checkable: true },
        { id: 'a-1', label: 'Cooler brought inside from car', checkable: true },
        ...specialtyEquipment.map((eq, i) => ({
          id: `a-spec-${i}`,
          label: `${eq} brought inside`,
          checkable: true as const,
        })),
        { id: 'a-2', label: 'Any extra bags / dry goods brought inside', checkable: true },
        { id: 'a-3', label: 'Car completely cleared — nothing left in vehicle', checkable: true },
      ],
    },
    {
      id: 'b',
      title: 'B — Cooler + Cold Storage',
      items: [
        { id: 'b-0', label: 'Cooler emptied completely', checkable: true },
        { id: 'b-1', label: 'Cooler wiped down and dried', checkable: true },
        { id: 'b-2', label: 'Cooler lid left open to air out', checkable: true },
        { id: 'b-3', label: 'Leftover food sorted: keep vs toss', checkable: true },
        { id: 'b-4', label: 'Kept leftovers stored in fridge with labels (item + date)', checkable: true },
        { id: 'b-5', label: 'Fridge has space — cleared out old items if needed', checkable: true },
      ],
    },
    {
      id: 'c',
      title: 'C — Equipment + Tools',
      items: [
        { id: 'c-0', label: 'Equipment bags emptied', checkable: true },
        { id: 'c-1', label: 'Dirty tools separated for washing', checkable: true },
        { id: 'c-2', label: 'Clean tools put back in storage', checkable: true },
        { id: 'c-3', label: 'Equipment bags collapsed / stored', checkable: true },
        { id: 'c-4', label: specialtyC, checkable: true },
      ],
    },
    {
      id: 'd',
      title: 'D — Dishes + Laundry',
      items: [
        { id: 'd-0', label: 'All dishes in dishwasher or hand washed', checkable: true },
        { id: 'd-1', label: 'Deli containers washed and dried', checkable: true },
        { id: 'd-2', label: 'Towels in washing machine', checkable: true },
        { id: 'd-3', label: 'Chef uniform in washing machine', checkable: true },
        { id: 'd-4', label: 'Apron in washing machine', checkable: true },
        { id: 'd-5', label: 'Wash cycle started', checkable: true },
      ],
    },
    {
      id: 'e',
      title: 'E — Financial + Records',
      items: [
        {
          id: 'e-0',
          label: paymentLabel,
          checkable: true,
          initialState: paymentReceived ? 2 as ItemState : 0 as ItemState,
        },
        { id: 'e-1', label: 'All receipts photographed and uploaded', checkable: true },
        { id: 'e-2', label: 'Tip recorded (if applicable)', checkable: true },
      ],
    },
    {
      id: 'f',
      title: 'F — Next Day (by noon tomorrow)',
      items: [
        { id: 'f-0', label: 'Laundry moved to dryer or hung', checkable: true },
        { id: 'f-1', label: 'Follow-up / thank you message sent to client', checkable: true },
        { id: 'f-2', label: 'After Action Review completed', checkable: true },
        { id: 'f-3', label: 'Unused ingredients flagged (kept / tossed / returned)', checkable: true },
      ],
    },
  ]

  return {
    title: 'Post-Service Reset Checklist',
    headerPills: [
      { label: 'Client', value: clientName },
      { label: 'Date', value: fmtDate(event.event_date) },
    ],
    alerts: ['Complete tonight or by noon tomorrow. Event cannot close until every box is checked.'],
    sections,
  }
}

// ─── Content Shot List ────────────────────────────────────────────────────────

export function contentShotListToSpec(data: ContentShotListData): InteractiveDocSpec {
  const sections: InteractiveSection[] = [
    {
      id: 'pre-event',
      title: 'Pre-Event — Grocery & Prep',
      items: [
        { id: 'pre-0', label: 'Grocery haul flat lay — overhead, all ingredients spread out, vertical 9:16', checkable: true },
        { id: 'pre-1', label: 'Hero ingredient close-up — primary protein, specialty produce, or imported item', sublabel: 'macro', checkable: true },
        { id: 'pre-2', label: 'Knife roll / tools laid out — overhead or 45° before cooking begins', checkable: true },
        { id: 'pre-3', label: 'Mise en place spread — everything prepped, portioned, and arranged', sublabel: 'overhead', checkable: true },
      ],
    },
    {
      id: 'cooking',
      title: 'Active Cooking',
      items: [
        { id: 'cook-0', label: 'Knife work — overhead phone mount, clean board, 10–15 sec', sublabel: 'pre-mount before service starts', checkable: true },
        { id: 'cook-1', label: 'Pan sizzle / sear — side angle at counter height, 8–10 sec', sublabel: 'do not narrate, let the sound carry', checkable: true },
        { id: 'cook-2', label: 'Sauce or reduction — overhead close-up, glossy spoon, 5–8 sec', checkable: true },
        { id: 'cook-3', label: 'Hands seasoning or finishing touch — pinch of salt, torn herb, 3–5 sec slow-mo', checkable: true },
        { id: 'cook-4', label: 'Raw → finished time-lapse — fixed mount, 10+ frames, strong caramelization or sear', checkable: true },
      ],
    },
    {
      id: 'plating',
      title: 'Plating — plate one dish for camera before service plates leave the pass',
      items: [
        { id: 'plate-0', label: 'Hero plate — overhead flat lay', sublabel: 'shoot vertical 9:16 then crop to 1:1 square for feed', checkable: true },
        { id: 'plate-1', label: 'Hero plate — low 30° restaurant angle', sublabel: 'shows height, sauce work, and garnish depth', checkable: true },
        { id: 'plate-2', label: 'Hands placing final garnish — the last touch, 3–5 sec', sublabel: 'slow-mo if phone supports', checkable: true },
        { id: 'plate-3', label: 'Full table at service — all courses set, candlelight if present, wide horizontal', checkable: true },
        { id: 'plate-4', label: 'Texture detail / close-up cross-section — demonstrates technique at macro level', checkable: true },
      ],
    },
    {
      id: 'service',
      title: 'Service & Wrap',
      items: [
        { id: 'svc-0', label: 'Empty plate after course — overhead, social proof without showing client faces', checkable: true },
        { id: 'svc-1', label: 'Client reaction — candid only, faces optional', sublabel: 'GET PERMISSION before posting · 3–5 sec', checkable: true },
        { id: 'svc-2', label: 'Chef self-capture at the pass — builds face recognition and brand identity', sublabel: 'optional', checkable: true },
        { id: 'svc-3', label: 'Clean kitchen at wrap — wide shot, proves you left it better than you found it', checkable: true },
      ],
    },
    {
      id: 'brand',
      title: 'Brand Consistency',
      subtitle: 'Repeat these decisions at every event',
      items: [
        { id: 'brand-0', label: 'Same plate angle every event — choose ONE: overhead OR low 30° — commit to it forever', checkable: true },
        { id: 'brand-1', label: 'Same 2–3 surface props in every photo: cutting board, linen napkin, slate tile — bring them', checkable: true },
        { id: 'brand-2', label: 'Same editing preset applied to every photo before posting — one preset = one visual identity', checkable: true },
        { id: 'brand-3', label: 'Same opening shot type to start every Reel/TikTok — your audience will learn to recognize it', checkable: true },
      ],
    },
    {
      id: 'platform',
      title: 'Platform Specs',
      subtitle: 'Shoot everything vertical 9:16 first — crop down from there',
      items: [
        { id: 'plat-0', label: 'TikTok + Instagram Reels: 9:16 vertical (1080×1920) | 15–60 sec | Hook in first 3 sec | Let sizzle audio play', checkable: false },
        { id: 'plat-1', label: 'Instagram Feed: 4:5 portrait or 1:1 square | Bright clean plates | Same edit preset on every post', checkable: false },
        { id: 'plat-2', label: 'Instagram Stories: 9:16 vertical | Keep text out of top/bottom 14% | Add poll or sticker', checkable: false },
        { id: 'plat-3', label: 'Facebook: 1:1 square or 4:5 portrait | Photos and behind-the-scenes video', checkable: false },
      ],
    },
    {
      id: 'solo',
      title: 'Solo Setup — mount phone before service starts, never during it',
      items: [
        { id: 'solo-0', label: '3 positions: (1) Overhead arm above cutting board  (2) Side mount beside stove  (3) Tabletop stand for plating — rotate between these', checkable: false },
        { id: 'solo-1', label: 'Gear: overhead boom arm + flexible Gorilla Pod + bluetooth remote shutter (~$50 total) — film first, review after guests leave', checkable: false },
      ],
    },
  ]

  return {
    title: 'Content Shot List',
    headerPills: [
      { label: 'Event', value: data.eventName },
      { label: 'Date', value: fmtDate(data.eventDate) },
      { label: 'Client', value: data.clientName },
      { label: 'Target', value: '20+ assets' },
    ],
    alerts: [],
    sections,
  }
}

// ─── Travel Route ─────────────────────────────────────────────────────────────

type TravelRouteDataShape = {
  event: { occasion: string | null; event_date: string; location_address: string | null; location_city: string | null }
  clientName: string
  chefName: string
  legs: TravelLegWithIngredients[]
}

export function travelRouteToSpec(data: TravelRouteDataShape): InteractiveDocSpec {
  const { event, clientName, chefName, legs } = data

  const sections: InteractiveSection[] = []

  if (legs.length === 0) {
    sections.push({
      id: 'empty',
      title: 'No travel legs planned',
      items: [{ id: 'empty-0', label: 'Open the Travel Plan tab on the event page to start planning your routes.', checkable: false }],
    })
  }

  for (let li = 0; li < legs.length; li++) {
    const leg = legs[li]
    const typeLabel = (leg.leg_type as string).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const legId = `leg-${li}`
    const legItems: InteractiveItem[] = []

    if (leg.departure_time) {
      const origin = [leg.origin_label, leg.origin_address].filter(Boolean).join(' — ')
      legItems.push({
        id: `${legId}-depart`,
        label: `Depart: ${leg.departure_time}`,
        sublabel: origin || undefined,
        checkable: false,
      })
    }

    const sortedStops = [...((leg.stops as { order: number; name: string; address?: string; purpose?: string; estimated_minutes?: number; notes?: string }[]) || [])].sort((a, b) => a.order - b.order)
    for (let si = 0; si < sortedStops.length; si++) {
      const stop = sortedStops[si]
      legItems.push({
        id: `${legId}-stop-${si}`,
        label: `${si + 1}. ${stop.name}${stop.purpose ? ` — ${stop.purpose}` : ''}`,
        sublabel: [stop.address, stop.estimated_minutes ? `~${stop.estimated_minutes} min` : null].filter(Boolean).join(' · ') || undefined,
        checkable: false,
      })
    }

    const dest = [leg.destination_label, leg.destination_address].filter(Boolean).join(' — ')
    legItems.push({
      id: `${legId}-arrive`,
      label: `Arrive: ${dest || 'Destination'}`,
      checkable: false,
    })

    // Specialty sourcing ingredients — checkable
    const ings = (leg as TravelLegWithIngredients).ingredients ?? []
    if ((leg.leg_type as string) === 'specialty_sourcing' && ings.length > 0) {
      for (let ii = 0; ii < ings.length; ii++) {
        const ing = ings[ii]
        const qty = ing.quantity != null ? `${ing.quantity} ${ing.unit ?? ''}`.trim() : ''
        const store = ing.store_name ? ` @ ${ing.store_name}` : ''
        legItems.push({
          id: `${legId}-ing-${ii}`,
          label: `Source: ${(ing as { ingredient_name?: string }).ingredient_name ?? 'Unknown'}${qty ? ` — ${qty}` : ''}${store}`,
          checkable: true,
          initialState: (ing.status === 'sourced' ? 2 : 0) as ItemState,
        })
      }
    }

    sections.push({
      id: legId,
      title: `Leg ${li + 1} — ${typeLabel}`,
      subtitle: leg.leg_date ? format(parseISO(leg.leg_date as string), 'EEEE, MMM d') : undefined,
      items: legItems,
    })
  }

  return {
    title: 'Travel Route',
    headerPills: [
      { label: 'Client', value: clientName },
      { label: 'Date', value: fmtDate(event.event_date) },
      { label: 'Chef', value: chefName },
    ],
    alerts: [],
    sections,
  }
}

// ─── Event Summary (informational) ────────────────────────────────────────────

export function eventSummaryToSpec(data: EventSummaryData): InteractiveDocSpec {
  const { event, client, courses } = data

  const alerts: string[] = []
  const allAllergens = event.allergies ?? []
  if (allAllergens.length > 0) alerts.push(`ALLERGENS: ${allAllergens.join(', ')}`)
  const dietary = event.dietary_restrictions ?? []
  if (dietary.length > 0) alerts.push(`DIETARY: ${dietary.join(', ')}`)

  const sections: InteractiveSection[] = []

  // Client
  sections.push({
    id: 'client',
    title: 'Client',
    items: [
      { id: 'client-name', label: client.full_name, sublabel: client.preferred_name ? `Prefers: ${client.preferred_name}` : undefined, checkable: false },
      ...(client.house_rules ? [{ id: 'client-rules', label: `House rules: ${client.house_rules}`, checkable: false as const }] : []),
      ...(client.vibe_notes ? [{ id: 'client-vibe', label: `Vibe: ${client.vibe_notes}`, checkable: false as const }] : []),
    ],
  })

  // Event
  const location = [event.location_address, event.location_city, event.location_state].filter(Boolean).join(', ')
  sections.push({
    id: 'event',
    title: 'Event Details',
    items: [
      { id: 'ev-date', label: `Date: ${fmtDate(event.event_date)}`, checkable: false },
      { id: 'ev-guests', label: `Guests: ${event.guest_count}`, checkable: false },
      { id: 'ev-serve', label: `Serve time: ${event.serve_time ?? 'TBD'}`, checkable: false },
      ...(location ? [{ id: 'ev-location', label: `Location: ${location}`, checkable: false as const }] : []),
      { id: 'ev-status', label: `Status: ${event.status}`, checkable: false },
      ...(event.payment_status ? [{ id: 'ev-payment', label: `Payment: ${event.payment_status}`, checkable: false as const }] : []),
    ],
  })

  // Courses
  for (const course of courses) {
    const items: InteractiveItem[] = []
    if (course.dishDescription) {
      items.push({ id: `c${course.courseNumber}-desc`, label: course.dishDescription, checkable: false })
    }
    items.push({ id: `c${course.courseNumber}-comps`, label: `${course.componentCount} component${course.componentCount !== 1 ? 's' : ''}`, checkable: false })
    if (course.dishAllergenFlags.length > 0) {
      items.push({ id: `c${course.courseNumber}-allergen`, label: `Allergens: ${course.dishAllergenFlags.join(', ')}`, checkable: false })
    }
    sections.push({
      id: `course-${course.courseNumber}`,
      title: `Course ${course.courseNumber} — ${course.courseName}`,
      items,
    })
  }

  return {
    title: 'Event Summary',
    headerPills: [
      { label: 'Client', value: client.full_name },
      { label: 'Date', value: fmtDate(event.event_date) },
      { label: 'Guests', value: String(event.guest_count) },
      { label: 'Status', value: event.status },
    ],
    alerts,
    sections,
  }
}

// ─── Execution Sheet (informational) ──────────────────────────────────────────

export function executionSheetToSpec(data: ExecutionSheetData): InteractiveDocSpec {
  const { event, client, courses, arrivalTasks } = data

  const allAllergens = [...new Set([...(event.allergies ?? []), ...(client.allergies ?? [])])]
  const allDietary = [...new Set([...(event.dietary_restrictions ?? []), ...(client.dietary_restrictions ?? [])])]

  const alerts: string[] = []
  if (allAllergens.length > 0) alerts.push(`ALLERGENS: ${allAllergens.join(', ')}`)
  if (allDietary.length > 0) alerts.push(`DIETARY: ${allDietary.join(', ')}`)
  if (event.special_requests) alerts.push(`SPECIAL REQUESTS: ${event.special_requests}`)

  const sections: InteractiveSection[] = []

  if (arrivalTasks.length > 0) {
    sections.push({
      id: 'arrival',
      title: 'On Arrival — Start Immediately',
      subtitle: 'Long-cook or extended prep tasks — start these the moment you walk in',
      items: arrivalTasks.map((task, i) => ({
        id: `arrival-${i}`,
        label: task.name,
        sublabel: [task.execution_notes, task.courseName].filter(Boolean).join(' · ') || undefined,
        checkable: false,
      })),
    })
  }

  for (const course of courses) {
    sections.push({
      id: `course-${course.courseNumber}`,
      title: `Course ${course.courseNumber} — ${course.courseName}`,
      subtitle: course.dishDescription ?? undefined,
      items: course.components.map((comp, i) => ({
        id: `course-${course.courseNumber}-${i}`,
        label: comp.name,
        sublabel: [comp.execution_notes, comp.is_make_ahead ? 'pre-made' : null].filter(Boolean).join(' · ') || undefined,
        checkable: false,
      })),
    })
  }

  return {
    title: 'Execution Sheet',
    headerPills: [
      { label: 'Client', value: client.full_name },
      { label: 'Date', value: fmtDate(event.event_date) },
      { label: 'Guests', value: String(event.guest_count) },
      { label: 'Arrive', value: event.arrival_time || 'TBD' },
      { label: 'Serve', value: event.serve_time },
    ],
    alerts,
    sections,
  }
}

// ─── Front-of-House Menu (informational) ──────────────────────────────────────

export function fohMenuToSpec(data: FrontOfHouseMenuData): InteractiveDocSpec {
  const { event, clientName, courses } = data

  return {
    title: event.occasion ? `${event.occasion} Menu` : 'Seasonal Menu',
    headerPills: [
      { label: 'For', value: clientName },
      { label: 'Date', value: fmtDate(event.event_date) },
      { label: 'Guests', value: String(event.guest_count) },
    ],
    alerts: [],
    sections: courses.map(course => ({
      id: `course-${course.courseNumber}`,
      title: course.courseName,
      items: [
        ...(course.dishDescription ? [{ id: `foh-${course.courseNumber}-desc`, label: course.dishDescription, checkable: false as const }] : []),
        ...(course.dietaryTags.length > 0 ? [{ id: `foh-${course.courseNumber}-dietary`, label: course.dietaryTags.join(', '), checkable: false as const }] : []),
        ...(course.allergenFlags.length > 0 ? [{ id: `foh-${course.courseNumber}-allergen`, label: `Contains: ${course.allergenFlags.join(', ')}`, checkable: false as const }] : []),
      ],
    })),
  }
}
