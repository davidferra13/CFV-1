'use server'

// Operations Intelligence — Portion Calculator, Packing List, Cross-Contamination Risk
// PRIVACY: Handles event/client data → local Ollama only.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { searchClientsByName } from '@/lib/clients/actions'

// ============================================
// 1. PORTION CALCULATOR (pure math — no Ollama)
// ============================================

export interface PortionResult {
  recipeName: string
  originalYield: number
  targetGuests: number
  scaleFactor: number
  ingredients: Array<{
    name: string
    originalQty: string
    scaledQty: string
    unit: string
  }>
  summary: string
}

export async function calculatePortions(
  recipeName: string,
  guestCount: number
): Promise<PortionResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find recipe by name
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, servings')
    .eq('tenant_id', user.tenantId!)
    .ilike('name', `%${recipeName}%`)
    .limit(1)

  if (!recipes || recipes.length === 0) {
    return {
      recipeName,
      originalYield: 0,
      targetGuests: guestCount,
      scaleFactor: 0,
      ingredients: [],
      summary: `No recipe found matching "${recipeName}". Try a different name.`,
    }
  }

  const recipe = recipes[0]
  const originalYield = recipe.servings ?? 4
  const scaleFactor = guestCount / originalYield

  // Load ingredients (recipe_ingredients → ingredients join for name)
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('quantity, unit, ingredient:ingredients(name)')
    .eq('recipe_id', recipe.id)
    .order('sort_order', { ascending: true })

  const scaled = (ingredients ?? []).map((ing: any) => {
    const origQty = parseFloat(ing.quantity) || 0
    const ingName = ing.ingredient?.name ?? ing.name ?? 'Unknown ingredient'
    const scaledQty = origQty * scaleFactor

    // Format nicely — round to reasonable precision
    const formatted =
      scaledQty >= 10
        ? Math.round(scaledQty).toString()
        : scaledQty >= 1
          ? scaledQty.toFixed(1).replace(/\.0$/, '')
          : scaledQty.toFixed(2).replace(/0$/, '')

    return {
      name: ingName,
      originalQty: ing.quantity?.toString() ?? '0',
      scaledQty: formatted,
      unit: ing.unit ?? '',
    }
  })

  return {
    recipeName: recipe.name,
    originalYield,
    targetGuests: guestCount,
    scaleFactor: Math.round(scaleFactor * 100) / 100,
    ingredients: scaled,
    summary: `Scaled "${recipe.name}" from ${originalYield} to ${guestCount} servings (${scaleFactor.toFixed(1)}x). ${scaled.length} ingredients adjusted.`,
  }
}

// ============================================
// 2. PACKING LIST GENERATOR (template-based — no Ollama)
// ============================================

export interface PackingListResult {
  eventName: string
  guestCount: number
  categories: Array<{
    name: string
    items: Array<{ item: string; quantity: string; notes?: string }>
  }>
  summary: string
}

export async function generatePackingList(eventName: string): Promise<PackingListResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find event — try occasion match first, then fuzzy match with client name
  let { data: events } = await supabase
    .from('events')
    .select('id, occasion, event_date, guest_count, location_type, location_address, status')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${eventName}%`)
    .order('event_date', { ascending: false })
    .limit(1)

  // If no match, try splitting: words might include client name + occasion keywords
  // e.g. "Henderson spring garden party" → client "Henderson", occasion "%spring%garden%party%"
  if (!events || events.length === 0) {
    const words = eventName.split(/\s+/).filter((w) => w.length > 2)
    for (const word of words) {
      const occasionWords = words.filter((w) => w.toLowerCase() !== word.toLowerCase()).join('%')
      if (!occasionWords) continue
      const { data: fuzzy } = await supabase
        .from('events')
        .select(
          'id, occasion, event_date, guest_count, location_type, location_address, status, client_id'
        )
        .eq('tenant_id', user.tenantId!)
        .ilike('occasion', `%${occasionWords}%`)
        .order('event_date', { ascending: false })
        .limit(5)

      // Check if any of these events belong to a client matching the word
      if (fuzzy && fuzzy.length > 0) {
        const clientIds = fuzzy.map((e: any) => e.client_id).filter(Boolean)
        if (clientIds.length > 0) {
          const { data: matchingClients } = await supabase
            .from('clients')
            .select('id')
            .in('id', clientIds)
            .ilike('full_name', `%${word}%`)
          if (matchingClients && matchingClients.length > 0) {
            const matchedIds = new Set(matchingClients.map((c: any) => c.id))
            events = fuzzy.filter((e: any) => matchedIds.has(e.client_id))
            if (events.length > 0) break
          }
        }
        // Fallback: just use the occasion match without client filter
        if (!events || events.length === 0) {
          events = fuzzy
          break
        }
      }
    }
  }

  if (!events || events.length === 0) {
    return {
      eventName,
      guestCount: 0,
      categories: [],
      summary: `No event found matching "${eventName}".`,
    }
  }

  const event = events[0]
  const guests = event.guest_count ?? 10
  const isOffsite = event.location_type === 'offsite' || !!event.location_address

  // Build packing list based on guest count and location
  const categories: PackingListResult['categories'] = []

  // Cooking equipment (always)
  categories.push({
    name: 'Cooking Equipment',
    items: [
      { item: 'Chef knives + knife roll', quantity: '1 set' },
      { item: 'Cutting boards', quantity: '2-3' },
      { item: 'Sheet pans', quantity: `${Math.ceil(guests / 6)}` },
      { item: 'Mixing bowls (assorted)', quantity: '4-6' },
      { item: 'Tongs, spatulas, ladles', quantity: '1 set' },
      { item: 'Instant-read thermometer', quantity: '1' },
      { item: 'Plastic wrap / foil', quantity: '1 each' },
    ],
  })

  // Service ware (scaled by guests)
  categories.push({
    name: 'Service Ware',
    items: [
      { item: 'Dinner plates', quantity: `${guests + 2}`, notes: '+ 2 backup' },
      { item: 'Salad/appetizer plates', quantity: `${guests + 2}` },
      { item: 'Flatware sets', quantity: `${guests + 2}` },
      { item: 'Glassware (water + wine)', quantity: `${(guests + 2) * 2}` },
      { item: 'Napkins (cloth or paper)', quantity: `${guests + 4}` },
      { item: 'Serving platters', quantity: `${Math.ceil(guests / 8) + 1}` },
      { item: 'Serving utensils', quantity: '4-6 pieces' },
    ],
  })

  // Transport (offsite events)
  if (isOffsite) {
    categories.push({
      name: 'Transport & Setup',
      items: [
        { item: 'Insulated food carriers', quantity: `${Math.ceil(guests / 10)}` },
        { item: 'Ice packs / cooler', quantity: '1-2' },
        { item: 'Chafing dishes + fuel', quantity: `${Math.ceil(guests / 12)}` },
        { item: 'Folding table (if needed)', quantity: '1' },
        { item: 'Extension cord', quantity: '1' },
        { item: 'Trash bags', quantity: '4-6' },
        { item: 'Hand towels / aprons', quantity: '2-3' },
      ],
    })
  }

  // Safety & sanitation (always)
  categories.push({
    name: 'Safety & Sanitation',
    items: [
      { item: 'Disposable gloves', quantity: '1 box' },
      { item: 'Sanitizer spray', quantity: '1 bottle' },
      { item: 'First aid kit', quantity: '1' },
      { item: 'Allergen labels / cards', quantity: `${Math.ceil(guests / 4)}` },
      { item: 'Food temp log sheet', quantity: '1' },
    ],
  })

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)

  return {
    eventName: event.occasion ?? eventName,
    guestCount: guests,
    categories,
    summary: `Packing list for "${event.occasion ?? eventName}" (${guests} guests${isOffsite ? ', offsite' : ''}): ${totalItems} items across ${categories.length} categories.`,
  }
}

// ============================================
// 3. CROSS-CONTAMINATION RISK ANALYSIS (rule-based — no Ollama)
// ============================================

export interface CrossContaminationResult {
  eventName: string
  clientName: string
  risks: Array<{
    severity: 'critical' | 'warning' | 'info'
    allergen: string
    menuItem: string
    message: string
  }>
  safePractices: string[]
  summary: string
}

const COMMON_CROSS_CONTAMINANTS: Record<string, string[]> = {
  peanut: ['tree nuts', 'peanut oil', 'satay', 'pad thai', 'pesto (some)'],
  'tree nut': ['peanuts', 'marzipan', 'praline', 'nut oils', 'pesto'],
  shellfish: ['fish sauce', 'oyster sauce', 'bouillabaisse', 'paella', 'caesar dressing'],
  dairy: ['butter', 'cream', 'cheese', 'whey', 'casein', 'ghee'],
  gluten: ['breadcrumbs', 'soy sauce', 'flour-thickened sauces', 'pasta', 'beer batter'],
  egg: ['mayonnaise', 'meringue', 'custard', 'pasta (fresh)', 'aioli'],
  soy: ['soy sauce', 'tofu', 'miso', 'edamame', 'teriyaki'],
  sesame: ['tahini', 'hummus', 'sesame oil', 'everything bagel'],
}

export async function analyzeCrossContamination(
  eventName: string
): Promise<CrossContaminationResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Find event with client
  const { data: events } = await supabase
    .from('events')
    .select('id, occasion, client_id, client:clients(full_name, dietary_restrictions, allergies)')
    .eq('tenant_id', user.tenantId!)
    .ilike('occasion', `%${eventName}%`)
    .order('event_date', { ascending: false })
    .limit(1)

  if (!events || events.length === 0) {
    return {
      eventName,
      clientName: '',
      risks: [],
      safePractices: [],
      summary: `No event found matching "${eventName}".`,
    }
  }

  const event = events[0] as any
  const client = event.client
  const clientName = client?.full_name ?? 'Unknown'
  const restrictions: string[] = client?.dietary_restrictions ?? []
  const allergies: string[] = client?.allergies ?? []

  if (restrictions.length === 0 && allergies.length === 0) {
    return {
      eventName: event.occasion ?? eventName,
      clientName,
      risks: [],
      safePractices: ['No dietary restrictions or allergies on file for this client.'],
      summary: `No restrictions/allergies on file for ${clientName}. Consider confirming directly.`,
    }
  }

  // Load menu items for this event's menus
  const { data: menuItems } = await (supabase
    .from('menu_items' as any)
    .select('name, description')
    .eq('tenant_id', user.tenantId!) as any)

  const menuItemNames = (menuItems ?? []).map((m: any) =>
    `${m.name ?? ''} ${m.description ?? ''}`.toLowerCase()
  )

  const risks: CrossContaminationResult['risks'] = []

  // Check allergies (critical severity)
  for (const allergy of allergies) {
    const allergenLower = allergy.toLowerCase()
    const contaminants = COMMON_CROSS_CONTAMINANTS[allergenLower] ?? []

    for (const menuText of menuItemNames) {
      // Direct match
      if (menuText.includes(allergenLower)) {
        const item = menuItems?.find(
          (m: any) => `${m.name ?? ''} ${m.description ?? ''}`.toLowerCase() === menuText
        )
        risks.push({
          severity: 'critical',
          allergen: allergy,
          menuItem: (item as any)?.name ?? menuText.substring(0, 40),
          message: `ALLERGY ALERT: "${(item as any)?.name ?? 'Menu item'}" may contain ${allergy}. Use separate prep surfaces, utensils, and storage.`,
        })
      }

      // Cross-contamination match
      for (const contaminant of contaminants) {
        if (menuText.includes(contaminant.toLowerCase())) {
          const item = menuItems?.find(
            (m: any) => `${m.name ?? ''} ${m.description ?? ''}`.toLowerCase() === menuText
          )
          risks.push({
            severity: 'warning',
            allergen: allergy,
            menuItem: (item as any)?.name ?? menuText.substring(0, 40),
            message: `Cross-contamination risk: "${(item as any)?.name ?? 'Menu item'}" contains ${contaminant}, which can cross-contaminate with ${allergy}.`,
          })
        }
      }
    }
  }

  // Safe practices based on detected risks
  const safePractices: string[] = [
    'Use color-coded cutting boards for allergen-free prep',
    'Prepare allergen-free dishes FIRST, before other items',
    'Store allergen-free items separately and clearly labeled',
    'Wash hands and change gloves between allergen and non-allergen items',
  ]

  if (allergies.some((a) => ['peanut', 'tree nut'].includes(a.toLowerCase()))) {
    safePractices.push('Clean all surfaces with hot soapy water — nuts leave residue oils')
  }
  if (allergies.some((a) => a.toLowerCase() === 'gluten')) {
    safePractices.push('Use dedicated gluten-free cookware — shared fryers are a top risk')
  }

  return {
    eventName: event.occasion ?? eventName,
    clientName,
    risks,
    safePractices,
    summary:
      risks.length > 0
        ? `${risks.filter((r) => r.severity === 'critical').length} critical and ${risks.filter((r) => r.severity === 'warning').length} warning risks found for ${clientName}'s event.`
        : `No cross-contamination risks detected in current menu items for ${clientName}. Always verify with the client.`,
  }
}
