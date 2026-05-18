import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

type DbClient = {
  from: (table: string) => any
}

type QueryResult<T> = {
  data: T[] | T | null
  error?: { message?: string } | null
  count?: number | null
}

type ClientSourceRecord = {
  id: string
  tenant_id: string | null
  full_name: string
  preferred_name: string | null
  email: string | null
  phone: string | null
  status: string | null
  preferred_contact_method: string | null
  communication_style_notes: string | null
  communication_preference: Record<string, unknown> | null
  dietary_restrictions: string[] | null
  dietary_protocols: string[] | null
  allergies: string[] | null
  dislikes: string[] | null
  favorite_cuisines: string[] | null
  favorite_dishes: string[] | null
  spice_tolerance: string | null
  preferred_service_style: string | null
  typical_guest_count: string | null
  preferred_event_days: string[] | null
  budget_range_min_cents: number | null
  budget_range_max_cents: number | null
  payment_behavior: string | null
  tipping_pattern: string | null
  vibe_notes: string | null
  what_they_care_about: string | null
  red_flags: string | null
  last_event_date: string | null
  first_event_date: string | null
  total_events_count: number | null
  total_events_completed: number | null
  lifetime_value_cents: number | null
  average_spend_cents: number | null
  updated_at: string | null
  created_at: string | null
}

type EventSourceRecord = {
  id: string
  event_date: string | null
  occasion: string | null
  status: string | null
  quoted_price_cents: number | null
  guest_count: number | null
  service_style: string | null
  menu_id: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  special_requests: string | null
  chef_outcome_rating: number | null
  chef_outcome_notes: string | null
  menu_approval_status: string | null
  updated_at: string | null
  created_at: string | null
}

type MenuSourceRecord = {
  id: string
  name: string | null
  cuisine_type: string | null
  simple_mode: boolean | null
  simple_mode_content: string | null
}

type PreferenceSourceRecord = {
  id: string
  item_type: string | null
  item_name: string | null
  rating: string | null
  notes: string | null
  event_id: string | null
  observed_at: string | null
  updated_at: string | null
  created_at: string | null
}

type AllergySourceRecord = {
  id: string
  allergen: string
  severity: string | null
  source: string | null
  confirmed_by_chef: boolean | null
  confirmed_at: string | null
  notes: string | null
  updated_at: string | null
  created_at: string | null
}

type SurveySourceRecord = {
  id: string
  event_id: string
  food_quality: number | null
  communication_rating: number | null
  presentation: number | null
  overall: number | null
  what_they_loved: string | null
  what_could_improve: string | null
  would_book_again: boolean | null
  additional_comments: string | null
  dish_feedback: unknown
  completed_at: string | null
  created_at: string | null
}

type TasteProfileSourceRecord = {
  favorite_cuisines: string[] | null
  disliked_ingredients: string[] | null
  spice_tolerance: number | null
  texture_preferences: string[] | null
  flavor_notes: string | null
  preferred_proteins: string[] | null
  avoids: string[] | null
  ambiance_preferences: string | null
  updated_at: string | null
}

type ServedDishSourceRecord = {
  id: string
  dish_name: string
  served_date: string
  event_id: string | null
  client_reaction: string | null
  notes: string | null
  client_feedback_at: string | null
  created_at: string | null
}

type CommunicationSourceRecord = {
  channel: string | null
  source: string | null
  direction: string | null
  created_at: string | null
  timestamp: string | null
}

type FinancialSourceRecord = {
  lifetime_value_cents: number | null
  total_events_count: number | null
  total_events_completed: number | null
  average_spend_per_event: number | null
  last_event_date: string | null
  first_event_date: string | null
  days_since_last_event: number | null
  is_dormant: boolean | null
}

export type AmbientClientContextSources = {
  client: ClientSourceRecord
  events: EventSourceRecord[]
  menus: MenuSourceRecord[]
  preferences: PreferenceSourceRecord[]
  allergyRecords: AllergySourceRecord[]
  surveys: SurveySourceRecord[]
  tasteProfile: TasteProfileSourceRecord | null
  servedDishes: ServedDishSourceRecord[]
  communicationSignals: CommunicationSourceRecord[]
  financialSummary: FinancialSourceRecord | null
  sourceWarnings: string[]
  now: Date
}

export type ClientContextEventHistoryEntry = {
  id: string
  eventDate: string
  status: string | null
  occasion: string | null
  guestCount: number | null
  serviceStyle: string | null
  quotedPriceCents: number | null
  menuId: string | null
  menuName: string | null
  cuisineType: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  satisfactionRating: number | null
}

export type ClientContextMenuServed = {
  eventId: string | null
  eventDate: string | null
  menuId: string | null
  menuName: string | null
  cuisineType: string | null
  dishes: string[]
  clientReaction: string | null
}

export type ClientContextDietaryChange = {
  observedAt: string
  source: 'client_profile' | 'event' | 'allergy_record'
  added: string[]
  removed: string[]
  current: string[]
}

export type ClientContextSeasonalPattern = {
  monthCounts: Array<{ month: number; label: string; count: number }>
  quarterCounts: Array<{ quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'; count: number }>
  strongestMonths: string[]
  strongestQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null
  repeatedOccasions: Array<{ occasion: string; count: number }>
}

export type ClientContextSatisfactionSignals = {
  surveyCount: number
  averageOverall: number | null
  averageFoodQuality: number | null
  averageCommunication: number | null
  averagePresentation: number | null
  wouldBookAgainRate: number | null
  latestSurvey: {
    completedAt: string | null
    overall: number | null
    whatTheyLoved: string | null
    whatCouldImprove: string | null
    wouldBookAgain: boolean | null
  } | null
  chefOutcomeAverage: number | null
  positiveSignals: string[]
  riskSignals: string[]
}

export type ClientContextBookingFrequency = {
  eventCount: number
  completedEventCount: number
  averageDaysBetweenEvents: number | null
  eventsPerYear: number | null
  daysSinceLastEvent: number | null
  firstEventDate: string | null
  lastEventDate: string | null
  cadenceLabel: 'new' | 'occasional' | 'regular' | 'frequent' | 'dormant'
}

export type ClientPreferredCommunicationChannel = {
  preferred: string | null
  profilePreference: string | null
  inferredFromSignals: string | null
  counts: Array<{ channel: string; count: number }>
  confidence: 'none' | 'low' | 'medium' | 'high'
}

export type ClientAmbientIntelligenceContext = {
  client: {
    id: string
    tenantId: string | null
    fullName: string
    preferredName: string | null
    email: string | null
    phone: string | null
    status: string | null
    communicationStyleNotes: string | null
  }
  sourceWarnings: string[]
  eventHistory: ClientContextEventHistoryEntry[]
  menusServed: ClientContextMenuServed[]
  dietaryRestrictions: string[]
  allergies: Array<{
    allergen: string
    severity: string | null
    confirmed: boolean
    source: string | null
    lastObservedAt: string | null
  }>
  dietaryChangesOverTime: ClientContextDietaryChange[]
  preferences: {
    loved: string[]
    liked: string[]
    disliked: string[]
    favoriteCuisines: string[]
    favoriteDishes: string[]
    avoids: string[]
    spiceTolerance: string | number | null
    serviceStyle: string | null
    vibeNotes: string | null
    whatTheyCareAbout: string | null
    redFlags: string | null
  }
  spend: {
    totalSpendCents: number
    averageSpendCents: number
    completedEventSpendCents: number
    completedEventAverageCents: number
    budgetRangeMinCents: number | null
    budgetRangeMaxCents: number | null
    paymentBehavior: string | null
    tippingPattern: string | null
  }
  bookingFrequency: ClientContextBookingFrequency
  satisfactionSignals: ClientContextSatisfactionSignals
  preferredCommunicationChannel: ClientPreferredCommunicationChannel
  seasonalPatterns: ClientContextSeasonalPattern
  drafting: ClientContextForDrafting
}

export type ClientContextForDrafting = {
  clientId: string
  clientName: string
  preferredName: string | null
  preferredCommunicationChannel: string | null
  communicationStyleNotes: string | null
  lastEventDate: string | null
  bookingCadence: ClientContextBookingFrequency['cadenceLabel']
  dietaryMustMention: string[]
  allergyMustMention: string[]
  lovedItems: string[]
  dislikedItems: string[]
  recentlyServed: string[]
  satisfactionTone: 'warm' | 'neutral' | 'repair'
  budgetContext: {
    averageSpendCents: number
    budgetRangeMinCents: number | null
    budgetRangeMaxCents: number | null
  }
  deterministicSummary: string
}

const DIRECT_CHANNEL_ALIASES: Record<string, string | null> = {
  email: 'email',
  sms: 'text',
  text: 'text',
  whatsapp: 'text',
  phone: 'phone',
  instagram: 'instagram',
  manual_log: null,
  website_form: null,
  takeachef: null,
  yhangry: null,
  facebook: 'social',
  theknot: null,
  thumbtack: null,
  bark: null,
  cozymeal: null,
  google_business: null,
  gigsalad: null,
  app: 'app',
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export async function getClientContext(
  clientId: string,
  tenantId?: string
): Promise<ClientAmbientIntelligenceContext | null> {
  if (tenantId) {
    return getClientContextForTenant(clientId, tenantId)
  }

  const user = await requireChef()
  return getClientContextForTenant(clientId, user.tenantId!)
}

export async function getClientContextAction(
  clientId: string
): Promise<ClientAmbientIntelligenceContext | null> {
  'use server'

  const user = await requireChef()
  return getClientContextForTenant(clientId, user.tenantId!)
}

export async function getClientContextForTenant(
  clientId: string,
  tenantId: string,
  dbClient?: DbClient,
  now = new Date()
): Promise<ClientAmbientIntelligenceContext | null> {
  const db = dbClient ?? createServerClient()
  const sourceWarnings: string[] = []

  const clientResult = (await db
    .from('clients')
    .select(
      [
        'id',
        'tenant_id',
        'full_name',
        'preferred_name',
        'email',
        'phone',
        'status',
        'preferred_contact_method',
        'communication_style_notes',
        'communication_preference',
        'dietary_restrictions',
        'dietary_protocols',
        'allergies',
        'dislikes',
        'favorite_cuisines',
        'favorite_dishes',
        'spice_tolerance',
        'preferred_service_style',
        'typical_guest_count',
        'preferred_event_days',
        'budget_range_min_cents',
        'budget_range_max_cents',
        'payment_behavior',
        'tipping_pattern',
        'vibe_notes',
        'what_they_care_about',
        'red_flags',
        'last_event_date',
        'first_event_date',
        'total_events_count',
        'total_events_completed',
        'lifetime_value_cents',
        'average_spend_cents',
        'updated_at',
        'created_at',
      ].join(', ')
    )
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .maybeSingle()) as QueryResult<ClientSourceRecord>

  if (clientResult.error) {
    throw new Error(`Failed to load client ambient context: ${clientResult.error.message}`)
  }

  const client = (clientResult.data as ClientSourceRecord | null) ?? null
  if (!client) return null

  const [events, preferences, allergyRecords, surveys, tasteProfileRows, servedDishes, financial] =
    await Promise.all([
      optionalRows<EventSourceRecord>(
        db
          .from('events')
          .select(
            [
              'id',
              'event_date',
              'occasion',
              'status',
              'quoted_price_cents',
              'guest_count',
              'service_style',
              'menu_id',
              'dietary_restrictions',
              'allergies',
              'special_requests',
              'chef_outcome_rating',
              'chef_outcome_notes',
              'menu_approval_status',
              'updated_at',
              'created_at',
            ].join(', ')
          )
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .is('deleted_at' as any, null)
          .order('event_date', { ascending: false })
          .limit(100),
        'events',
        sourceWarnings
      ),
      optionalRows<PreferenceSourceRecord>(
        db
          .from('client_preferences')
          .select(
            'id, item_type, item_name, rating, notes, event_id, observed_at, updated_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .order('observed_at', { ascending: false })
          .limit(200),
        'client_preferences',
        sourceWarnings
      ),
      optionalRows<AllergySourceRecord>(
        db
          .from('client_allergy_records')
          .select(
            'id, allergen, severity, source, confirmed_by_chef, confirmed_at, notes, updated_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false })
          .limit(100),
        'client_allergy_records',
        sourceWarnings
      ),
      optionalRows<SurveySourceRecord>(
        db
          .from('post_event_surveys')
          .select(
            [
              'id',
              'event_id',
              'food_quality',
              'communication_rating',
              'presentation',
              'overall',
              'what_they_loved',
              'what_could_improve',
              'would_book_again',
              'additional_comments',
              'dish_feedback',
              'completed_at',
              'created_at',
            ].join(', ')
          )
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .order('completed_at', { ascending: false })
          .limit(50),
        'post_event_surveys',
        sourceWarnings
      ),
      optionalRows<TasteProfileSourceRecord>(
        db
          .from('client_taste_profiles')
          .select(
            [
              'favorite_cuisines',
              'disliked_ingredients',
              'spice_tolerance',
              'texture_preferences',
              'flavor_notes',
              'preferred_proteins',
              'avoids',
              'ambiance_preferences',
              'updated_at',
            ].join(', ')
          )
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .limit(1),
        'client_taste_profiles',
        sourceWarnings
      ),
      optionalRows<ServedDishSourceRecord>(
        db
          .from('served_dish_history')
          .select(
            'id, dish_name, served_date, event_id, client_reaction, notes, client_feedback_at, created_at'
          )
          .eq('chef_id', tenantId)
          .eq('client_id', clientId)
          .order('served_date', { ascending: false })
          .limit(200),
        'served_dish_history',
        sourceWarnings
      ),
      optionalRows<FinancialSourceRecord>(
        db
          .from('client_financial_summary')
          .select(
            [
              'lifetime_value_cents',
              'total_events_count',
              'total_events_completed',
              'average_spend_per_event',
              'last_event_date',
              'first_event_date',
              'days_since_last_event',
              'is_dormant',
            ].join(', ')
          )
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .limit(1),
        'client_financial_summary',
        sourceWarnings
      ),
    ])

  const menuIds = uniqueStrings(events.map((event) => event.menu_id).filter(isString))
  const menus =
    menuIds.length > 0
      ? await optionalRows<MenuSourceRecord>(
          db
            .from('menus')
            .select('id, name, cuisine_type, simple_mode, simple_mode_content')
            .eq('tenant_id', tenantId)
            .in('id', menuIds),
          'menus',
          sourceWarnings
        )
      : []

  const communicationSignals = await loadCommunicationSignals(
    db,
    tenantId,
    clientId,
    sourceWarnings
  )

  return aggregateClientContextFromSources({
    client,
    events,
    menus,
    preferences,
    allergyRecords,
    surveys,
    tasteProfile: tasteProfileRows[0] ?? null,
    servedDishes,
    communicationSignals,
    financialSummary: financial[0] ?? null,
    sourceWarnings,
    now,
  })
}

export function aggregateClientContextFromSources(
  sources: AmbientClientContextSources
): ClientAmbientIntelligenceContext {
  const sortedEvents = sortByDateDesc(sources.events, (event) => event.event_date)
  const menuById = new Map(sources.menus.map((menu) => [menu.id, menu]))
  const surveysByEventId = new Map(sources.surveys.map((survey) => [survey.event_id, survey]))
  const completedEvents = sortedEvents.filter((event) => event.status === 'completed')
  const pricedCompletedEvents = completedEvents.filter(
    (event) => numberOrZero(event.quoted_price_cents) > 0
  )
  const pricedEvents = sortedEvents.filter((event) => numberOrZero(event.quoted_price_cents) > 0)

  const eventHistory = sortedEvents.map((event) => {
    const menu = event.menu_id ? menuById.get(event.menu_id) : undefined
    const survey = surveysByEventId.get(event.id)

    return {
      id: event.id,
      eventDate: event.event_date ?? '',
      status: event.status,
      occasion: event.occasion,
      guestCount: event.guest_count,
      serviceStyle: event.service_style,
      quotedPriceCents: event.quoted_price_cents,
      menuId: event.menu_id,
      menuName: menu?.name ?? null,
      cuisineType: menu?.cuisine_type ?? null,
      dietaryRestrictions: cleanList(event.dietary_restrictions),
      allergies: cleanList(event.allergies),
      satisfactionRating: survey?.overall ?? event.chef_outcome_rating ?? null,
    }
  })

  const menusServed = buildMenusServed(sortedEvents, menuById, sources.servedDishes)
  const dietaryRestrictions = uniqueStrings([
    ...cleanList(sources.client.dietary_restrictions),
    ...cleanList(sources.client.dietary_protocols),
    ...(sources.tasteProfile ? cleanList(sources.tasteProfile.avoids) : []),
  ])

  const allergyMap = new Map<string, ClientAmbientIntelligenceContext['allergies'][number]>()
  for (const allergy of cleanList(sources.client.allergies)) {
    allergyMap.set(normalizeKey(allergy), {
      allergen: allergy,
      severity: null,
      confirmed: false,
      source: 'client_profile',
      lastObservedAt: sources.client.updated_at,
    })
  }
  for (const record of sources.allergyRecords) {
    const key = normalizeKey(record.allergen)
    const current = allergyMap.get(key)
    const lastObservedAt = record.updated_at ?? record.confirmed_at ?? record.created_at
    if (!current || dateMs(lastObservedAt) >= dateMs(current.lastObservedAt)) {
      allergyMap.set(key, {
        allergen: record.allergen,
        severity: record.severity,
        confirmed: Boolean(record.confirmed_by_chef),
        source: record.source,
        lastObservedAt,
      })
    }
  }

  const lovedPreferences = preferenceLabels(sources.preferences, ['loved'])
  const likedPreferences = preferenceLabels(sources.preferences, ['liked'])
  const dislikedPreferences = uniqueStrings([
    ...cleanList(sources.client.dislikes),
    ...preferenceLabels(sources.preferences, ['disliked']),
    ...(sources.tasteProfile ? cleanList(sources.tasteProfile.disliked_ingredients) : []),
  ])

  const spend = buildSpendSummary(
    sources.client,
    sources.financialSummary,
    pricedEvents,
    pricedCompletedEvents
  )
  const bookingFrequency = buildBookingFrequency(sortedEvents, completedEvents, sources, spend)
  const satisfactionSignals = buildSatisfactionSignals(sources.surveys, sortedEvents)
  const preferredCommunicationChannel = buildPreferredCommunicationChannel(
    sources.client,
    sources.communicationSignals
  )
  const seasonalPatterns = buildSeasonalPatterns(sortedEvents)
  const contextWithoutDrafting = {
    client: {
      id: sources.client.id,
      tenantId: sources.client.tenant_id,
      fullName: sources.client.full_name,
      preferredName: sources.client.preferred_name,
      email: sources.client.email,
      phone: sources.client.phone,
      status: sources.client.status,
      communicationStyleNotes: sources.client.communication_style_notes,
    },
    sourceWarnings: [...sources.sourceWarnings].sort(),
    eventHistory,
    menusServed,
    dietaryRestrictions,
    allergies: [...allergyMap.values()].sort((left, right) =>
      left.allergen.localeCompare(right.allergen)
    ),
    dietaryChangesOverTime: buildDietaryChangesOverTime(sources),
    preferences: {
      loved: uniqueStrings([...cleanList(sources.client.favorite_dishes), ...lovedPreferences]),
      liked: likedPreferences,
      disliked: dislikedPreferences,
      favoriteCuisines: uniqueStrings([
        ...cleanList(sources.client.favorite_cuisines),
        ...(sources.tasteProfile ? cleanList(sources.tasteProfile.favorite_cuisines) : []),
      ]),
      favoriteDishes: cleanList(sources.client.favorite_dishes),
      avoids: sources.tasteProfile ? cleanList(sources.tasteProfile.avoids) : [],
      spiceTolerance: sources.tasteProfile?.spice_tolerance ?? sources.client.spice_tolerance,
      serviceStyle: sources.client.preferred_service_style,
      vibeNotes: sources.client.vibe_notes,
      whatTheyCareAbout: sources.client.what_they_care_about,
      redFlags: sources.client.red_flags,
    },
    spend,
    bookingFrequency,
    satisfactionSignals,
    preferredCommunicationChannel,
    seasonalPatterns,
  }

  const context = {
    ...contextWithoutDrafting,
    drafting: {} as ClientContextForDrafting,
  } satisfies ClientAmbientIntelligenceContext

  context.drafting = buildClientContextForDrafting(context)
  return context
}

export function buildClientContextForDrafting(
  context: Omit<ClientAmbientIntelligenceContext, 'drafting'> | ClientAmbientIntelligenceContext
): ClientContextForDrafting {
  const recentDishes = uniqueStrings(
    context.menusServed.flatMap((menu) => menu.dishes).filter(Boolean)
  ).slice(0, 8)
  const satisfactionTone = determineSatisfactionTone(context.satisfactionSignals)

  return {
    clientId: context.client.id,
    clientName: context.client.fullName,
    preferredName: context.client.preferredName,
    preferredCommunicationChannel: context.preferredCommunicationChannel.preferred,
    communicationStyleNotes: context.client.communicationStyleNotes,
    lastEventDate: context.bookingFrequency.lastEventDate,
    bookingCadence: context.bookingFrequency.cadenceLabel,
    dietaryMustMention: context.dietaryRestrictions.slice(0, 8),
    allergyMustMention: context.allergies.map((allergy) => allergy.allergen).slice(0, 8),
    lovedItems: uniqueStrings([...context.preferences.loved, ...context.preferences.liked]).slice(
      0,
      8
    ),
    dislikedItems: context.preferences.disliked.slice(0, 8),
    recentlyServed: recentDishes,
    satisfactionTone,
    budgetContext: {
      averageSpendCents: context.spend.averageSpendCents,
      budgetRangeMinCents: context.spend.budgetRangeMinCents,
      budgetRangeMaxCents: context.spend.budgetRangeMaxCents,
    },
    deterministicSummary: summarizeClientContextDeterministically(context),
  }
}

export function summarizeClientContextDeterministically(
  context: Omit<ClientAmbientIntelligenceContext, 'drafting'> | ClientAmbientIntelligenceContext
): string {
  const lines: string[] = []
  lines.push(`Client: ${context.client.preferredName ?? context.client.fullName}`)
  lines.push(
    `History: ${context.bookingFrequency.eventCount} events, ${context.bookingFrequency.completedEventCount} completed, last event ${context.bookingFrequency.lastEventDate ?? 'none'}`
  )
  lines.push(
    `Spend: avg ${formatCents(context.spend.averageSpendCents)}, total ${formatCents(
      context.spend.totalSpendCents
    )}`
  )
  lines.push(`Cadence: ${context.bookingFrequency.cadenceLabel}`)

  if (context.preferredCommunicationChannel.preferred) {
    lines.push(`Channel: ${context.preferredCommunicationChannel.preferred}`)
  }

  if (context.dietaryRestrictions.length > 0) {
    lines.push(`Dietary: ${context.dietaryRestrictions.join(', ')}`)
  }

  if (context.allergies.length > 0) {
    lines.push(`Allergies: ${context.allergies.map((allergy) => allergy.allergen).join(', ')}`)
  }

  if (context.preferences.loved.length > 0) {
    lines.push(`Likes: ${context.preferences.loved.slice(0, 6).join(', ')}`)
  }

  if (context.preferences.disliked.length > 0) {
    lines.push(`Avoids: ${context.preferences.disliked.slice(0, 6).join(', ')}`)
  }

  const recentMenus = context.menusServed
    .slice(0, 3)
    .map((menu) => menu.menuName ?? menu.dishes[0])
    .filter(isString)
  if (recentMenus.length > 0) {
    lines.push(`Recent menus: ${recentMenus.join(', ')}`)
  }

  if (context.satisfactionSignals.averageOverall !== null) {
    lines.push(
      `Satisfaction: ${context.satisfactionSignals.averageOverall}/5 overall across ${context.satisfactionSignals.surveyCount} surveys`
    )
  }

  if (context.seasonalPatterns.strongestQuarter) {
    lines.push(`Seasonality: strongest in ${context.seasonalPatterns.strongestQuarter}`)
  }

  return lines.join('\n')
}

async function loadCommunicationSignals(
  db: DbClient,
  tenantId: string,
  clientId: string,
  warnings: string[]
): Promise<CommunicationSourceRecord[]> {
  const [events, messages, logs] = await Promise.all([
    optionalRows<CommunicationSourceRecord>(
      db
        .from('communication_events')
        .select('source, direction, timestamp')
        .eq('tenant_id', tenantId)
        .eq('resolved_client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(200),
      'communication_events',
      warnings
    ),
    optionalRows<CommunicationSourceRecord>(
      db
        .from('messages')
        .select('channel, direction, created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(200),
      'messages',
      warnings
    ),
    optionalRows<CommunicationSourceRecord>(
      db
        .from('communication_log')
        .select('channel, direction, created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(200),
      'communication_log',
      warnings
    ),
  ])

  return [...events, ...messages, ...logs]
}

async function optionalRows<T>(
  query: Promise<QueryResult<T>>,
  sourceName: string,
  warnings: string[]
): Promise<T[]> {
  try {
    const result = await query
    if (result.error) {
      warnings.push(`${sourceName}: ${result.error.message ?? 'query failed'}`)
      return []
    }

    if (!result.data) return []
    return Array.isArray(result.data) ? (result.data as T[]) : [result.data as T]
  } catch (error) {
    warnings.push(`${sourceName}: ${error instanceof Error ? error.message : 'query failed'}`)
    return []
  }
}

function buildMenusServed(
  events: EventSourceRecord[],
  menuById: Map<string, MenuSourceRecord>,
  servedDishes: ServedDishSourceRecord[]
): ClientContextMenuServed[] {
  const dishesByEvent = groupBy(servedDishes, (dish) => dish.event_id ?? 'unknown')
  const menus: ClientContextMenuServed[] = []
  const seen = new Set<string>()

  for (const event of events) {
    const menu = event.menu_id ? menuById.get(event.menu_id) : null
    const dishes = dishesByEvent.get(event.id) ?? []

    if (!menu && dishes.length === 0) continue

    const key = `event:${event.id}`
    seen.add(key)
    menus.push({
      eventId: event.id,
      eventDate: event.event_date,
      menuId: event.menu_id,
      menuName: menu?.name ?? null,
      cuisineType: menu?.cuisine_type ?? null,
      dishes: uniqueStrings(dishes.map((dish) => dish.dish_name)),
      clientReaction: dominantReaction(dishes.map((dish) => dish.client_reaction)),
    })
  }

  for (const dish of servedDishes) {
    const key = `event:${dish.event_id ?? 'unknown'}`
    if (dish.event_id && seen.has(key)) continue
    menus.push({
      eventId: dish.event_id,
      eventDate: dish.served_date,
      menuId: null,
      menuName: null,
      cuisineType: null,
      dishes: [dish.dish_name],
      clientReaction: dish.client_reaction,
    })
  }

  return menus.sort((left, right) => dateMs(right.eventDate) - dateMs(left.eventDate))
}

function buildSpendSummary(
  client: ClientSourceRecord,
  financial: FinancialSourceRecord | null,
  pricedEvents: EventSourceRecord[],
  pricedCompletedEvents: EventSourceRecord[]
): ClientAmbientIntelligenceContext['spend'] {
  const eventSpend = sum(pricedEvents.map((event) => event.quoted_price_cents))
  const completedSpend = sum(pricedCompletedEvents.map((event) => event.quoted_price_cents))
  const totalSpend =
    numberOrZero(financial?.lifetime_value_cents ?? client.lifetime_value_cents) || eventSpend
  const averageSpend =
    numberOrZero(financial?.average_spend_per_event ?? client.average_spend_cents) ||
    (pricedEvents.length > 0 ? Math.round(eventSpend / pricedEvents.length) : 0)

  return {
    totalSpendCents: totalSpend,
    averageSpendCents: averageSpend,
    completedEventSpendCents: completedSpend,
    completedEventAverageCents:
      pricedCompletedEvents.length > 0
        ? Math.round(completedSpend / pricedCompletedEvents.length)
        : 0,
    budgetRangeMinCents: client.budget_range_min_cents,
    budgetRangeMaxCents: client.budget_range_max_cents,
    paymentBehavior: client.payment_behavior,
    tippingPattern: client.tipping_pattern,
  }
}

function buildBookingFrequency(
  events: EventSourceRecord[],
  completedEvents: EventSourceRecord[],
  sources: AmbientClientContextSources,
  spend: ClientAmbientIntelligenceContext['spend']
): ClientContextBookingFrequency {
  const datedEvents = events
    .filter((event) => event.event_date)
    .sort((left, right) => dateMs(left.event_date) - dateMs(right.event_date))
  const eventDates = datedEvents.map((event) => event.event_date).filter(isString)
  const intervals: number[] = []

  for (let index = 1; index < eventDates.length; index++) {
    const gap = Math.round((dateMs(eventDates[index]) - dateMs(eventDates[index - 1])) / 86400000)
    if (gap > 0) intervals.push(gap)
  }

  const firstEventDate =
    sources.financialSummary?.first_event_date ??
    sources.client.first_event_date ??
    eventDates[0] ??
    null
  const lastEventDate =
    sources.financialSummary?.last_event_date ??
    sources.client.last_event_date ??
    eventDates[eventDates.length - 1] ??
    null
  const averageDaysBetweenEvents =
    intervals.length > 0 ? Math.round(sum(intervals) / intervals.length) : null
  const daysSinceLastEvent =
    sources.financialSummary?.days_since_last_event ??
    (lastEventDate
      ? Math.max(0, Math.floor((sources.now.getTime() - dateMs(lastEventDate)) / 86400000))
      : null)
  const totalSpanDays =
    firstEventDate && lastEventDate
      ? Math.max(1, Math.round((dateMs(lastEventDate) - dateMs(firstEventDate)) / 86400000))
      : null
  const eventCount =
    sources.financialSummary?.total_events_count ??
    sources.client.total_events_count ??
    events.length
  const eventsPerYear =
    totalSpanDays && totalSpanDays >= 30 ? roundTo((eventCount / totalSpanDays) * 365, 1) : null

  return {
    eventCount,
    completedEventCount:
      sources.financialSummary?.total_events_completed ??
      sources.client.total_events_completed ??
      completedEvents.length,
    averageDaysBetweenEvents,
    eventsPerYear,
    daysSinceLastEvent,
    firstEventDate,
    lastEventDate,
    cadenceLabel: classifyCadence(
      eventCount,
      daysSinceLastEvent,
      eventsPerYear,
      spend.averageSpendCents
    ),
  }
}

function buildSatisfactionSignals(
  surveys: SurveySourceRecord[],
  events: EventSourceRecord[]
): ClientContextSatisfactionSignals {
  const completedSurveys = surveys.filter(
    (survey) =>
      survey.completed_at ||
      survey.overall !== null ||
      survey.food_quality !== null ||
      survey.communication_rating !== null
  )
  const latestSurvey = sortByDateDesc(
    completedSurveys,
    (survey) => survey.completed_at ?? survey.created_at
  )[0]
  const wouldBookResponses = completedSurveys.filter((survey) => survey.would_book_again !== null)
  const chefOutcomeRatings = events.map((event) => event.chef_outcome_rating).filter(isNumber)
  const positiveSignals: string[] = []
  const riskSignals: string[] = []
  const averageOverall = average(completedSurveys.map((survey) => survey.overall))
  const averageCommunication = average(
    completedSurveys.map((survey) => survey.communication_rating)
  )
  const wouldBookAgainRate =
    wouldBookResponses.length > 0
      ? roundTo(
          (wouldBookResponses.filter((survey) => survey.would_book_again).length /
            wouldBookResponses.length) *
            100,
          1
        )
      : null

  if (averageOverall !== null && averageOverall >= 4.5)
    positiveSignals.push('High overall survey scores')
  if (wouldBookAgainRate !== null && wouldBookAgainRate >= 80)
    positiveSignals.push('Strong rebooking intent')
  if (averageOverall !== null && averageOverall < 3.5)
    riskSignals.push('Below-target overall survey scores')
  if (averageCommunication !== null && averageCommunication < 3.5) {
    riskSignals.push('Communication rating needs attention')
  }
  if (wouldBookAgainRate !== null && wouldBookAgainRate < 70)
    riskSignals.push('Weak rebooking intent')

  return {
    surveyCount: completedSurveys.length,
    averageOverall,
    averageFoodQuality: average(completedSurveys.map((survey) => survey.food_quality)),
    averageCommunication,
    averagePresentation: average(completedSurveys.map((survey) => survey.presentation)),
    wouldBookAgainRate,
    latestSurvey: latestSurvey
      ? {
          completedAt: latestSurvey.completed_at,
          overall: latestSurvey.overall,
          whatTheyLoved: latestSurvey.what_they_loved,
          whatCouldImprove: latestSurvey.what_could_improve,
          wouldBookAgain: latestSurvey.would_book_again,
        }
      : null,
    chefOutcomeAverage: average(chefOutcomeRatings),
    positiveSignals,
    riskSignals,
  }
}

function buildPreferredCommunicationChannel(
  client: ClientSourceRecord,
  communicationSignals: CommunicationSourceRecord[]
): ClientPreferredCommunicationChannel {
  const counts = new Map<string, number>()

  for (const signal of communicationSignals) {
    const rawChannel = signal.channel ?? signal.source
    if (!rawChannel) continue
    const channel = DIRECT_CHANNEL_ALIASES[rawChannel] ?? rawChannel
    if (!channel) continue
    const weight = signal.direction === 'inbound' ? 2 : 1
    counts.set(channel, (counts.get(channel) ?? 0) + weight)
  }

  const sortedCounts = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([channel, count]) => ({ channel, count }))
  const inferredFromSignals = sortedCounts[0]?.channel ?? null
  const maxCount = sortedCounts[0]?.count ?? 0

  let confidence: ClientPreferredCommunicationChannel['confidence'] = 'none'
  if (client.preferred_contact_method) confidence = 'high'
  else if (maxCount >= 6) confidence = 'high'
  else if (maxCount >= 3) confidence = 'medium'
  else if (maxCount > 0) confidence = 'low'

  return {
    preferred: client.preferred_contact_method ?? inferredFromSignals,
    profilePreference: client.preferred_contact_method,
    inferredFromSignals,
    counts: sortedCounts,
    confidence,
  }
}

function buildSeasonalPatterns(events: EventSourceRecord[]): ClientContextSeasonalPattern {
  const monthCounts = MONTH_LABELS.map((label, index) => ({ month: index + 1, label, count: 0 }))
  const quarterCounts: ClientContextSeasonalPattern['quarterCounts'] = [
    { quarter: 'Q1', count: 0 },
    { quarter: 'Q2', count: 0 },
    { quarter: 'Q3', count: 0 },
    { quarter: 'Q4', count: 0 },
  ]
  const occasionCounts = new Map<string, number>()

  for (const event of events) {
    if (event.event_date) {
      const month = new Date(event.event_date).getUTCMonth()
      monthCounts[month].count += 1
      quarterCounts[Math.floor(month / 3)].count += 1
    }

    if (event.occasion) {
      const occasion = event.occasion.trim().toLowerCase()
      if (occasion) occasionCounts.set(occasion, (occasionCounts.get(occasion) ?? 0) + 1)
    }
  }

  const strongestMonths = [...monthCounts]
    .filter((month) => month.count > 0)
    .sort((left, right) => right.count - left.count || left.month - right.month)
    .slice(0, 3)
    .map((month) => month.label)
  const strongestQuarterEntry = [...quarterCounts].sort(
    (left, right) => right.count - left.count || left.quarter.localeCompare(right.quarter)
  )[0]

  return {
    monthCounts,
    quarterCounts,
    strongestMonths,
    strongestQuarter:
      strongestQuarterEntry && strongestQuarterEntry.count >= 2
        ? strongestQuarterEntry.quarter
        : null,
    repeatedOccasions: [...occasionCounts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([occasion, count]) => ({ occasion, count })),
  }
}

function buildDietaryChangesOverTime(
  sources: AmbientClientContextSources
): ClientContextDietaryChange[] {
  const snapshots: Array<{
    observedAt: string
    source: ClientContextDietaryChange['source']
    values: string[]
  }> = []

  for (const event of [...sources.events].sort(
    (left, right) => dateMs(left.event_date) - dateMs(right.event_date)
  )) {
    const values = uniqueStrings([
      ...cleanList(event.dietary_restrictions),
      ...cleanList(event.allergies),
    ])
    if (event.event_date && values.length > 0) {
      snapshots.push({ observedAt: event.event_date, source: 'event', values })
    }
  }

  for (const record of [...sources.allergyRecords].sort(
    (left, right) =>
      dateMs(left.created_at ?? left.updated_at ?? left.confirmed_at) -
      dateMs(right.created_at ?? right.updated_at ?? right.confirmed_at)
  )) {
    const observedAt = record.created_at ?? record.updated_at ?? record.confirmed_at
    if (observedAt) {
      snapshots.push({
        observedAt,
        source: 'allergy_record',
        values: [record.allergen],
      })
    }
  }

  const profileValues = uniqueStrings([
    ...cleanList(sources.client.dietary_restrictions),
    ...cleanList(sources.client.dietary_protocols),
    ...cleanList(sources.client.allergies),
  ])
  if (sources.client.updated_at && profileValues.length > 0) {
    snapshots.push({
      observedAt: sources.client.updated_at,
      source: 'client_profile',
      values: profileValues,
    })
  }

  snapshots.sort((left, right) => dateMs(left.observedAt) - dateMs(right.observedAt))

  const changes: ClientContextDietaryChange[] = []
  let previous: string[] = []

  for (const snapshot of snapshots) {
    const current = uniqueStrings([...previous, ...snapshot.values])
    const added = current.filter((value) => !hasNormalized(previous, value))
    const removed = previous.filter((value) => !hasNormalized(current, value))

    if (added.length > 0 || removed.length > 0) {
      changes.push({
        observedAt: snapshot.observedAt,
        source: snapshot.source,
        added,
        removed,
        current,
      })
    }

    previous = current
  }

  return changes
}

function classifyCadence(
  eventCount: number,
  daysSinceLastEvent: number | null,
  eventsPerYear: number | null,
  averageSpendCents: number
): ClientContextBookingFrequency['cadenceLabel'] {
  if (eventCount === 0) return 'new'
  if (daysSinceLastEvent !== null && daysSinceLastEvent > 180 && eventCount > 1) return 'dormant'
  if ((eventsPerYear ?? 0) >= 6 || eventCount >= 8 || averageSpendCents >= 200000) return 'frequent'
  if ((eventsPerYear ?? 0) >= 2.5 || eventCount >= 3) return 'regular'
  if (eventCount >= 1) return 'occasional'
  return 'new'
}

function determineSatisfactionTone(
  signals: ClientContextSatisfactionSignals
): ClientContextForDrafting['satisfactionTone'] {
  if (signals.riskSignals.length > 0) return 'repair'
  if ((signals.averageOverall ?? 0) >= 4.5 || signals.positiveSignals.length > 0) return 'warm'
  return 'neutral'
}

function dominantReaction(reactions: Array<string | null>): string | null {
  const weights: Record<string, number> = {
    loved: 4,
    liked: 3,
    neutral: 2,
    disliked: 1,
  }
  const counts = new Map<string, number>()
  for (const reaction of reactions.filter(isString)) {
    counts.set(reaction, (counts.get(reaction) ?? 0) + 1)
  }

  return (
    [...counts.entries()].sort(
      (left, right) =>
        right[1] - left[1] ||
        (weights[right[0]] ?? 0) - (weights[left[0]] ?? 0) ||
        left[0].localeCompare(right[0])
    )[0]?.[0] ?? null
  )
}

function preferenceLabels(preferences: PreferenceSourceRecord[], ratings: string[]): string[] {
  const ratingSet = new Set(ratings)
  return uniqueStrings(
    preferences
      .filter(
        (preference) =>
          preference.item_name && preference.rating && ratingSet.has(preference.rating)
      )
      .map((preference) => preference.item_name!)
  )
}

function average(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter(isNumber)
  if (numbers.length === 0) return null
  return roundTo(sum(numbers) / numbers.length, 1)
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + numberOrZero(value), 0)
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function formatCents(value: number): string {
  return `$${Math.round(value / 100).toLocaleString('en-US')}`
}

function cleanList(values: string[] | null | undefined): string[] {
  return uniqueStrings(values ?? [])
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = raw.trim()
    const key = normalizeKey(value)
    if (!value || seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result.sort((left, right) => left.localeCompare(right))
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function hasNormalized(values: string[], value: string): boolean {
  const key = normalizeKey(value)
  return values.some((candidate) => normalizeKey(candidate) === key)
}

function groupBy<T>(values: T[], keyFn: (value: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const value of values) {
    const key = keyFn(value)
    const list = map.get(key) ?? []
    list.push(value)
    map.set(key, list)
  }
  return map
}

function sortByDateDesc<T>(values: T[], getDate: (value: T) => string | null | undefined): T[] {
  return [...values].sort((left, right) => dateMs(getDate(right)) - dateMs(getDate(left)))
}

function dateMs(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
