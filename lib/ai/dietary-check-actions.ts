'use server'

// Dietary / Allergy Cross-Check
// PRIVACY: Client allergies + menu items = PII → must stay local via Ollama.
// Validates a menu or recipe against a client's known dietary restrictions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { DietaryFlag, DietaryCheckResult } from './dietary-check-types'

// Common allergen keywords mapped to ingredient terms
const ALLERGEN_MAP: Record<string, string[]> = {
  'gluten-free': [
    'wheat',
    'flour',
    'bread',
    'pasta',
    'barley',
    'rye',
    'couscous',
    'orzo',
    'soy sauce',
    'panko',
    'breadcrumb',
    'crouton',
    'tortilla',
    'pita',
    'naan',
  ],
  'dairy-free': [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'ghee',
    'mascarpone',
    'ricotta',
    'mozzarella',
    'parmesan',
    'béchamel',
    'brie',
    'gouda',
  ],
  'nut-free': [
    'almond',
    'walnut',
    'pecan',
    'cashew',
    'pistachio',
    'hazelnut',
    'macadamia',
    'pine nut',
    'peanut',
    'praline',
    'marzipan',
    'frangipane',
    'nutella',
  ],
  'shellfish-free': [
    'shrimp',
    'crab',
    'lobster',
    'crawfish',
    'prawn',
    'oyster',
    'mussel',
    'clam',
    'scallop',
    'langoustine',
  ],
  'fish-free': [
    'salmon',
    'tuna',
    'cod',
    'halibut',
    'anchovy',
    'sardine',
    'bass',
    'trout',
    'swordfish',
    'mahi',
    'branzino',
    'snapper',
  ],
  'egg-free': [
    'egg',
    'meringue',
    'custard',
    'aioli',
    'hollandaise',
    'mayonnaise',
    'béarnaise',
    'soufflé',
    'quiche',
    'frittata',
  ],
  'soy-free': ['soy', 'tofu', 'edamame', 'tempeh', 'miso', 'soy sauce', 'tamari', 'teriyaki'],
  vegan: [
    'meat',
    'chicken',
    'beef',
    'pork',
    'lamb',
    'duck',
    'veal',
    'bacon',
    'prosciutto',
    'salami',
    'sausage',
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'egg',
    'honey',
    'gelatin',
    'fish',
    'shrimp',
    'crab',
    'lobster',
    'anchovy',
  ],
  vegetarian: [
    'meat',
    'chicken',
    'beef',
    'pork',
    'lamb',
    'duck',
    'veal',
    'bacon',
    'prosciutto',
    'salami',
    'sausage',
    'fish',
    'shrimp',
    'crab',
    'lobster',
    'anchovy',
    'gelatin',
  ],
  kosher: ['pork', 'bacon', 'shellfish', 'shrimp', 'crab', 'lobster', 'oyster', 'clam', 'mussel'],
  halal: ['pork', 'bacon', 'gelatin', 'lard'],
}

/**
 * Cross-check a client's dietary restrictions against menu items.
 * Pure logic - no LLM needed. Fast, reliable, no hallucination risk.
 */
export async function checkDietaryConflicts(
  clientId: string,
  menuItemNames: string[]
): Promise<DietaryCheckResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load client dietary restrictions
  const { data: client } = await db
    .from('clients')
    .select('full_name, dietary_restrictions, allergies')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    return {
      clientName: 'Unknown',
      restrictions: [],
      flags: [],
      safeItems: menuItemNames,
      summary: 'Client not found.',
    }
  }

  const clientName = client.full_name ?? 'Client'
  const rawRestrictions = [client.dietary_restrictions, client.allergies]
    .filter(Boolean)
    .join(', ')
    .toLowerCase()

  if (!rawRestrictions.trim()) {
    return {
      clientName,
      restrictions: [],
      flags: [],
      safeItems: menuItemNames,
      summary: `No dietary restrictions on file for ${clientName}. All items appear safe.`,
    }
  }

  // Parse restrictions into categories
  const restrictions: string[] = []
  const allergenTerms: string[] = []

  for (const [category, terms] of Object.entries(ALLERGEN_MAP)) {
    const normalizedCategory = category.replace(/-/g, ' ').replace('free', '').trim()
    if (
      rawRestrictions.includes(category) ||
      rawRestrictions.includes(normalizedCategory) ||
      rawRestrictions.includes(category.replace('-free', ''))
    ) {
      restrictions.push(category)
      allergenTerms.push(...terms)
    }
  }

  // Also pick up specific ingredient allergies mentioned directly
  const specificAllergies = rawRestrictions
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !Object.keys(ALLERGEN_MAP).some((k) => s.includes(k)))

  for (const allergy of specificAllergies) {
    if (allergy && !restrictions.includes(allergy)) {
      restrictions.push(allergy)
      allergenTerms.push(allergy)
    }
  }

  // Cross-check each menu item
  const flags: DietaryFlag[] = []
  const safeItems: string[] = []

  for (const item of menuItemNames) {
    const itemLower = item.toLowerCase()
    let flagged = false

    for (const term of allergenTerms) {
      if (itemLower.includes(term.toLowerCase())) {
        // Determine severity
        const isAllergy = rawRestrictions.includes('allerg')
        flags.push({
          severity: isAllergy ? 'danger' : 'warning',
          item,
          restriction: term,
          message: isAllergy
            ? `ALLERGEN ALERT: "${item}" contains "${term}" - ${clientName} has an allergy`
            : `"${item}" contains "${term}" - may conflict with ${clientName}'s dietary restrictions`,
        })
        flagged = true
      }
    }

    if (!flagged) {
      safeItems.push(item)
    }
  }

  // Build summary
  const dangerCount = flags.filter((f) => f.severity === 'danger').length
  const warningCount = flags.filter((f) => f.severity === 'warning').length
  let summary: string

  if (flags.length === 0) {
    summary = `All ${menuItemNames.length} items look safe for ${clientName}'s dietary needs (${restrictions.join(', ')}).`
  } else if (dangerCount > 0) {
    summary = `ALLERGY ALERT: ${dangerCount} item${dangerCount > 1 ? 's' : ''} flagged as dangerous for ${clientName}. ${warningCount > 0 ? `Plus ${warningCount} additional warning${warningCount > 1 ? 's' : ''}.` : ''} Review the flags below carefully.`
  } else {
    summary = `${warningCount} item${warningCount > 1 ? 's' : ''} may conflict with ${clientName}'s restrictions (${restrictions.join(', ')}). ${safeItems.length} items are clear.`
  }

  return {
    clientName,
    restrictions,
    flags,
    safeItems,
    summary,
  }
}

/**
 * Quick check: load a client + event's menu items and cross-check.
 */
export async function checkEventDietaryConflicts(
  eventId: string,
  clientId: string
): Promise<DietaryCheckResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load menus linked to this event
  const { data: eventMenus } = await (db
    .from('event_menus' as any)
    .select('menu_id')
    .eq('event_id', eventId) as any)

  const menuIds = ((eventMenus ?? []) as Array<{ menu_id: string }>).map((em) => em.menu_id)

  if (menuIds.length === 0) {
    return {
      clientName: '',
      restrictions: [],
      flags: [],
      safeItems: [],
      summary: 'No menus linked to this event. Add a menu first, then run the dietary check.',
    }
  }

  // Load dishes with allergen data (dishes table has allergen_flags + dietary_tags)
  const { data: menuItems } = await (db
    .from('dishes' as any)
    .select('name, allergen_flags, dietary_tags')
    .eq('tenant_id', user.tenantId!)
    .in('menu_id', menuIds)
    .not('name', 'is', null) as any)

  const itemNames = ((menuItems ?? []) as Array<{ name: string }>).map((mi) => mi.name)

  if (itemNames.length === 0) {
    return {
      clientName: '',
      restrictions: [],
      flags: [],
      safeItems: [],
      summary: 'No menu items found for this event. Add a menu first, then run the dietary check.',
    }
  }

  return checkDietaryConflicts(clientId, itemNames)
}

/**
 * Check dietary restrictions for a client by name (for Remy command).
 * Always returns the client's known restrictions/allergies first (safety-critical),
 * then optionally cross-checks against their most recent event menu if one exists.
 */
export async function checkDietaryByClientName(clientName: string): Promise<DietaryCheckResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Find clients - include dietary fields directly
  // Use limit(5) to catch family members (e.g. "Garcia" matches David Garcia + Maria Garcia)
  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, dietary_restrictions, allergies, vibe_notes')
    .eq('tenant_id', user.tenantId!)
    .ilike('full_name', `%${clientName}%`)
    .limit(5)

  if (!clients || clients.length === 0) {
    return {
      clientName,
      restrictions: [],
      flags: [],
      safeItems: [],
      summary: `No client found matching "${clientName}". Check the name and try again.`,
    }
  }

  // Process each matching client and merge results
  const allFlags: DietaryFlag[] = []
  const allRestrictions: string[] = []
  const summaryParts: string[] = []

  for (const client of clients) {
    const rawAllergies = client.allergies ?? ''
    const rawDietary = client.dietary_restrictions ?? ''
    const vibeNotes = client.vibe_notes ?? ''

    // Parse allergies array or string
    let allergyList: string[] = []
    if (Array.isArray(rawAllergies)) {
      allergyList = rawAllergies.filter(Boolean)
    } else if (typeof rawAllergies === 'string' && rawAllergies.trim()) {
      allergyList = rawAllergies
        .split(/[,;]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    }

    // Parse dietary restrictions array or string
    let dietaryList: string[] = []
    if (Array.isArray(rawDietary)) {
      dietaryList = rawDietary.filter(Boolean)
    } else if (typeof rawDietary === 'string' && rawDietary.trim()) {
      dietaryList = rawDietary
        .split(/[,;]/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    }

    // Extract safety notes from vibe_notes
    let safetyNote = ''
    const vibeUpper = vibeNotes.toUpperCase()
    if (
      vibeUpper.includes('ALLERGY') ||
      vibeUpper.includes('EPIPEN') ||
      vibeUpper.includes('SEVERE') ||
      vibeUpper.includes('ANAPHYL')
    ) {
      const sentences = vibeNotes.split(/[.!]\s+/)
      const safetySentences = sentences.filter((s: string) => {
        const su = s.toUpperCase()
        return (
          su.includes('ALLERGY') ||
          su.includes('EPIPEN') ||
          su.includes('SEVERE') ||
          su.includes('ANAPHYL') ||
          su.includes('CROSS-CONTAM')
        )
      })
      if (safetySentences.length > 0) {
        safetyNote = safetySentences.join('. ').trim()
      }
    }

    // Build per-client summary
    let clientSummary = ''
    if (allergyList.length > 0) {
      clientSummary += `⚠️ ALLERGIES: ${allergyList.join(', ').toUpperCase()}`
      if (safetyNote) {
        clientSummary += `\n🚨 ${safetyNote}`
      }
    }
    if (dietaryList.length > 0) {
      clientSummary += `${clientSummary ? '\n' : ''}Dietary restrictions: ${dietaryList.join(', ')}`
    }
    if (!clientSummary) {
      clientSummary = 'No dietary restrictions or allergies on file.'
    }

    // Check kitchen notes from most recent event
    const { data: events } = await db
      .from('events')
      .select('id, occasion, event_date, kitchen_notes')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', client.id)
      .not('status', 'eq', 'cancelled')
      .order('event_date', { ascending: false })
      .limit(1)

    if (events && events.length > 0 && events[0].kitchen_notes) {
      const kitchenUpper = (events[0].kitchen_notes as string).toUpperCase()
      if (
        kitchenUpper.includes('ALLERGY') ||
        kitchenUpper.includes('CRITICAL') ||
        kitchenUpper.includes('SEVERE')
      ) {
        clientSummary += `\n📋 Kitchen notes: ${events[0].kitchen_notes}`
      }
    }

    summaryParts.push(`${client.full_name} - ${clientSummary}`)

    // Accumulate flags and restrictions
    for (const a of allergyList) {
      allFlags.push({
        severity: 'danger' as const,
        item: '',
        restriction: a,
        message: `ALLERGY: ${client.full_name} has a ${a} allergy`,
      })
      if (!allRestrictions.includes(a)) allRestrictions.push(a)
    }
    for (const d of dietaryList) {
      if (!allRestrictions.includes(d)) allRestrictions.push(d)
    }
  }

  // If only one client, try menu cross-check
  if (clients.length === 1) {
    const client = clients[0]
    const { data: events } = await db
      .from('events')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', client.id)
      .not('status', 'eq', 'cancelled')
      .order('event_date', { ascending: false })
      .limit(1)

    if (events && events.length > 0) {
      const menuResult = await checkEventDietaryConflicts(events[0].id, client.id)
      if (menuResult.restrictions.length > 0) {
        return {
          ...menuResult,
          summary: `${summaryParts[0]}\n\n${menuResult.summary}`,
        }
      }
    }
  }

  const eventNote =
    clients.length > 1
      ? ''
      : '\n\nNo finalized menu to cross-check yet, but these restrictions MUST be respected.'

  return {
    clientName: clients.map((c: any) => c.full_name).join(', '),
    restrictions: allRestrictions,
    flags: allFlags,
    safeItems: [],
    summary: summaryParts.join('\n\n') + eventNote,
  }
}
