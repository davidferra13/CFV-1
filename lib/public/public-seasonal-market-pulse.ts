import { z } from 'zod'
import {
  getActiveMicroWindows,
  getCurrentSeason,
  getEndingMicroWindows,
  getNextSeason,
  getUpcomingMicroWindows,
} from '@/lib/seasonal/helpers'
import type { MicroWindow, SeasonalPalette } from '@/lib/seasonal/types'
import {
  getPublicIngredientSpotlightsByNames,
  type PublicIngredientSpotlight,
} from '@/lib/openclaw/public-ingredient-queries'
import {
  createDerivedOutputProvenance,
  type DerivedOutputFreshnessStatus,
  type DerivedOutputProvenance,
} from '@/lib/analytics/source-provenance'
import {
  PublicMarketScopeSchema,
  appendPublicMarketScopeSearchParams,
  buildPublicMarketScopeNote,
  resolvePublicMarketScope,
  readPublicMarketScopeFromSearchParams,
  type PublicMarketScope,
} from '@/lib/public/public-market-scope'

const MARKET_CONTEXT_KEY = 'market_context'
const LEGACY_BOOKING_CONTEXT_KEY = 'booking_context'
const SEASONAL_MARKET_PULSE_CONTEXT = 'seasonal_market_pulse'
const PULSE_SEASON_KEY = 'pulse_season'
const PULSE_PEAK_KEY = 'pulse_peak'
const PULSE_ENDING_KEY = 'pulse_ending'
const PULSE_COMING_KEY = 'pulse_coming'
const PULSE_MODE_KEY = 'pulse_mode'
const PULSE_ID_KEY = 'pulse_id'
const PULSE_GENERATED_AT_KEY = 'pulse_generated_at'
const PULSE_MARKET_AS_OF_KEY = 'pulse_market_as_of'
const PULSE_MARKET_STATUS_KEY = 'pulse_market_status'
const PULSE_FALLBACK_REASON_KEY = 'pulse_fallback_reason'

const MARKET_EVIDENCE_FRESHNESS_WINDOW_MS = 72 * 60 * 60 * 1000

const MARKET_BACKED_SOURCE_NOTE = 'Seasonal calendar plus fresh public ingredient snapshots.'
const SEASONAL_FALLBACK_SOURCE_NOTE =
  'Seasonal calendar only today; public ingredient snapshots are unavailable or withheld.'

const PUBLIC_SEASONAL_MARKET_PALETTES: SeasonalPalette[] = [
  {
    id: 'public-spring',
    tenant_id: 'public',
    season_name: 'Spring',
    sort_order: 0,
    is_active: false,
    start_month_day: '03-01',
    end_month_day: '05-31',
    sensory_anchor: 'Greens, herbs, and bright acidity start pushing winter weight off the plate.',
    micro_windows: [
      {
        ingredient: 'Asparagus',
        start_date: '04-01',
        end_date: '05-15',
        notes: 'clean, grassy spears that make a menu read unmistakably spring',
      },
      {
        ingredient: 'Sugar Snap Peas',
        start_date: '04-10',
        end_date: '06-05',
        notes: 'sweet snap and freshness for lighter early courses',
      },
      {
        ingredient: 'Morels',
        start_date: '04-15',
        end_date: '05-31',
        notes: 'earthy mushrooms that make the season feel brief and worth catching',
      },
      {
        ingredient: 'Rhubarb',
        start_date: '04-01',
        end_date: '05-10',
        notes: 'sharp, tart fruit energy before summer berries take over dessert',
      },
      {
        ingredient: 'Radishes',
        start_date: '03-01',
        end_date: '05-10',
        notes: 'peppery crunch for starters, salads, and crudo garnishes',
      },
      {
        ingredient: 'Strawberries',
        start_date: '05-01',
        end_date: '06-20',
        notes: 'the handoff from early spring brightness into summer fruit',
      },
    ],
    proven_wins: [],
    created_at: '2026-04-21T00:00:00.000Z',
    updated_at: '2026-04-21T00:00:00.000Z',
  },
  {
    id: 'public-summer',
    tenant_id: 'public',
    season_name: 'Summer',
    sort_order: 1,
    is_active: false,
    start_month_day: '06-01',
    end_month_day: '08-31',
    sensory_anchor: 'Juice, smoke, char, and fruit sweetness take over the menu.',
    micro_windows: [
      {
        ingredient: 'Cherries',
        start_date: '06-01',
        end_date: '07-10',
        notes: 'the first sweet-fruit signal that summer is actually here',
      },
      {
        ingredient: 'Basil',
        start_date: '06-01',
        end_date: '08-31',
        notes: 'herbal lift for tomato courses, dressings, and late-light dinners',
      },
      {
        ingredient: 'Tomatoes',
        start_date: '07-01',
        end_date: '09-10',
        notes: 'the ingredient that makes a summer dinner feel immediate instead of generic',
      },
      {
        ingredient: 'Peaches',
        start_date: '07-10',
        end_date: '09-05',
        notes: 'savory-sweet range for salads, glazes, and dessert',
      },
      {
        ingredient: 'Sweet Corn',
        start_date: '07-15',
        end_date: '09-15',
        notes: 'peak sweetness for succotash, purees, and late-summer sides',
      },
      {
        ingredient: 'Melons',
        start_date: '07-20',
        end_date: '09-10',
        notes: 'cold, juicy relief for aperitif bites and dessert finishes',
      },
    ],
    proven_wins: [],
    created_at: '2026-04-21T00:00:00.000Z',
    updated_at: '2026-04-21T00:00:00.000Z',
  },
  {
    id: 'public-fall',
    tenant_id: 'public',
    season_name: 'Fall',
    sort_order: 2,
    is_active: false,
    start_month_day: '09-01',
    end_month_day: '11-30',
    sensory_anchor: 'The market turns savory, orchard-driven, and a little more fireside.',
    micro_windows: [
      {
        ingredient: 'Apples',
        start_date: '09-01',
        end_date: '11-20',
        notes: 'acid and sweetness for roasts, salads, and classic desserts',
      },
      {
        ingredient: 'Chanterelles',
        start_date: '09-01',
        end_date: '10-25',
        notes: 'wild mushroom depth that tightens the window on an autumn menu',
      },
      {
        ingredient: 'Figs',
        start_date: '08-20',
        end_date: '10-10',
        notes: 'soft sweetness for cheese courses, pork, and first-course plates',
      },
      {
        ingredient: 'Delicata Squash',
        start_date: '09-10',
        end_date: '12-05',
        notes: 'dense, caramelized comfort without winter heaviness yet',
      },
      {
        ingredient: 'Cranberries',
        start_date: '10-01',
        end_date: '11-30',
        notes: 'sharp fruit that keeps richer fall menus from dragging',
      },
      {
        ingredient: 'Persimmons',
        start_date: '10-15',
        end_date: '12-10',
        notes: 'late-fall fruit that signals the menu is about to turn for winter',
      },
    ],
    proven_wins: [],
    created_at: '2026-04-21T00:00:00.000Z',
    updated_at: '2026-04-21T00:00:00.000Z',
  },
  {
    id: 'public-winter',
    tenant_id: 'public',
    season_name: 'Winter',
    sort_order: 3,
    is_active: false,
    start_month_day: '12-01',
    end_month_day: '02-28',
    sensory_anchor: 'Bright citrus and cellar depth carry the menu through cold weather.',
    micro_windows: [
      {
        ingredient: 'Blood Oranges',
        start_date: '12-01',
        end_date: '03-15',
        notes: 'acid, perfume, and color when the rest of the market goes muted',
      },
      {
        ingredient: 'Chicories',
        start_date: '12-01',
        end_date: '02-15',
        notes: 'bitter greens that keep richer winter plates in balance',
      },
      {
        ingredient: 'Beets',
        start_date: '11-15',
        end_date: '03-31',
        notes: 'rooted sweetness that can go elegant or rustic',
      },
      {
        ingredient: 'Sunchokes',
        start_date: '11-15',
        end_date: '02-28',
        notes: 'nutty winter depth for soups, purees, and composed sides',
      },
      {
        ingredient: 'Meyer Lemons',
        start_date: '12-15',
        end_date: '03-01',
        notes: 'soft citrus lift before the market turns green again',
      },
      {
        ingredient: 'Spring Garlic',
        start_date: '02-15',
        end_date: '04-15',
        notes: 'the first allium hint that the market is about to turn toward spring',
      },
    ],
    proven_wins: [],
    created_at: '2026-04-21T00:00:00.000Z',
    updated_at: '2026-04-21T00:00:00.000Z',
  },
]

export type PublicOpenBookingPrefill = {
  occasion?: string
  service_type?: string
  additional_notes?: string
}

export type ResolvedPublicOpenBookingPrefill = {
  occasion: string
  service_type: string
  additional_notes: string
}

export type PublicSeasonalMarketPulseSourceMode = 'market-backed' | 'seasonal-fallback'

export type PublicSeasonalMarketPulseFallbackReason =
  | 'none'
  | 'market_data_unavailable'
  | 'stale_market_evidence'

export type PublicSeasonalPulseIngredient = {
  name: string
  note: string
  timing: 'peak_now' | 'ending_soon' | 'coming_next'
}

export type PublicSeasonalMarketPulseProvenance = {
  contractVersion: 'public-market-note.v1'
  derived: DerivedOutputProvenance
  scope: PublicMarketScope & {
    note: string
    shortLabel: string
  }
  freshness: {
    marketAsOf: string | null
    marketStatus: DerivedOutputFreshnessStatus
    marketAgeSeconds: number | null
    marketWindowSeconds: number | null
  }
  fallback: {
    isActive: boolean
    reason: PublicSeasonalMarketPulseFallbackReason
  }
  evidence: {
    availableIngredientCount: number
    leadIngredientNames: string[]
    requestedIngredientCount: number
  }
}

export const PublicSeasonalMarketPulseIntentSchema = z.object({
  source: z.literal('seasonal_market_pulse'),
  pulseId: z.string().min(1).max(200),
  season: z.string().min(1).max(50),
  leadIngredients: z.array(z.string().min(1).max(100)).min(1).max(6),
  endingSoon: z.string().max(100).nullable(),
  comingNext: z.string().max(100).nullable(),
  sourceMode: z.enum(['market-backed', 'seasonal-fallback']),
  scope: PublicMarketScopeSchema,
  provenance: z.object({
    generatedAt: z.string().datetime({ offset: true }),
    marketAsOf: z.string().datetime({ offset: true }).nullable(),
    marketStatus: z.enum(['fresh', 'stale', 'point-in-time']),
    fallbackReason: z.enum(['none', 'market_data_unavailable', 'stale_market_evidence']),
  }),
  requestScope: PublicMarketScopeSchema.optional(),
})

export type PublicSeasonalMarketPulseIntent = z.infer<typeof PublicSeasonalMarketPulseIntentSchema>

export type PublicSeasonalMarketPulse = {
  id: string
  generatedAt: string
  season: {
    name: string
    sensoryAnchor: string | null
  }
  scope: PublicMarketScope
  provenance: PublicSeasonalMarketPulseProvenance
  peakNow: PublicSeasonalPulseIngredient[]
  endingSoon: PublicSeasonalPulseIngredient | null
  comingNext: PublicSeasonalPulseIngredient | null
  marketSpotlights: PublicIngredientSpotlight[]
  source: {
    mode: PublicSeasonalMarketPulseSourceMode
    seasonality: 'curated_national_calendar'
    market: 'public_ingredient_queries' | 'unavailable'
    note: string
  }
  copy: {
    eyebrow: string
    headline: string
    body: string
    urgencyNote: string | null
    evidenceLine: string | null
    freshnessLine: string | null
    scopeLine: string
    primaryCtaLabel: string
  }
  booking: {
    href: string
    searchParams: Record<string, string>
    prefill: ResolvedPublicOpenBookingPrefill
    intent: PublicSeasonalMarketPulseIntent
  }
  ingredients: {
    href: string
    searchParams: Record<string, string>
  }
  analytics: {
    season: string
    source_mode: PublicSeasonalMarketPulseSourceMode
    market_scope: string
    market_scope_mode: PublicMarketScope['mode']
    lead_ingredients: string
    fallback_reason: string | null
    market_freshness_status: DerivedOutputFreshnessStatus
  }
}

export type PublicSeasonalMarketPulseContext = {
  entryContext: 'seasonal_market_pulse'
  pulseId: string
  season: string
  peakNow: string[]
  endingSoon: string | null
  comingNext: string | null
  sourceMode: PublicSeasonalMarketPulseSourceMode
  scope: PublicMarketScope
  intent: PublicSeasonalMarketPulseIntent
  summary: {
    eyebrow: string
    headline: string
    body: string
    sourceNote: string
    freshnessNote: string | null
    scopeNote: string
  }
  prefill: ResolvedPublicOpenBookingPrefill
}

export type PublicSeasonalMarketPulseBookingContext = PublicSeasonalMarketPulseContext

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>

type BuildPublicSeasonalMarketPulseOptions = {
  date?: Date
  ingredientSpotlightLoader?: (names: string[]) => Promise<PublicIngredientSpotlight[]>
  scope?: PublicMarketScope
}

export async function getPublicSeasonalMarketPulse(
  options: BuildPublicSeasonalMarketPulseOptions = {}
): Promise<PublicSeasonalMarketPulse> {
  const date = options.date ?? new Date()
  const generatedAt = date.toISOString()
  const scope = options.scope ?? resolvePublicMarketScope()
  const currentSeason = getCurrentSeason(PUBLIC_SEASONAL_MARKET_PALETTES, date)
  const season = currentSeason ?? PUBLIC_SEASONAL_MARKET_PALETTES[0]

  const activeWindows = uniqueIngredientWindows(getActiveMicroWindows(season, date))
  const peakWindows = activeWindows.slice(0, 3)
  const endingSoonWindow =
    uniqueIngredientWindows(getEndingMicroWindows(season, 21, date)).find(Boolean) ?? null

  let comingNextWindow: MicroWindow | null =
    uniqueIngredientWindows(getUpcomingMicroWindows(season, 35, date))[0] ?? null
  if (!comingNextWindow) {
    const nextSeason = getNextSeason(PUBLIC_SEASONAL_MARKET_PALETTES, date)
    comingNextWindow = nextSeason?.micro_windows[0] ?? null
  }

  const peakNow = peakWindows.map((window) => toPulseIngredient(window, 'peak_now'))
  const endingSoon = endingSoonWindow ? toPulseIngredient(endingSoonWindow, 'ending_soon') : null
  const comingNext = comingNextWindow ? toPulseIngredient(comingNextWindow, 'coming_next') : null

  const leadIngredients = peakNow.map((window) => window.name)
  const spotlightNames = [
    ...leadIngredients,
    endingSoon?.name ?? null,
    comingNext?.name ?? null,
  ].filter((name): name is string => Boolean(name))

  const ingredientSpotlightLoader =
    options.ingredientSpotlightLoader ?? getPublicIngredientSpotlightsByNames
  let rawSpotlights: PublicIngredientSpotlight[] = []

  try {
    rawSpotlights = await ingredientSpotlightLoader(spotlightNames)
  } catch (error) {
    console.error(
      '[public-seasonal-market-pulse] Ingredient spotlight lookup failed, falling back to seasonal-only mode:',
      error
    )
  }

  const leadSpotlight = pickLeadSpotlight(rawSpotlights, leadIngredients)
  const marketAsOf =
    leadSpotlight?.lastConfirmedAt ??
    rawSpotlights.find((spotlight) => spotlight.lastConfirmedAt)?.lastConfirmedAt ??
    null
  const freshness = createDerivedOutputProvenance({
    asOf: marketAsOf ?? generatedAt,
    derivationMethod: 'deterministic',
    derivationSource: 'getPublicSeasonalMarketPulse',
    freshnessWindowMs: marketAsOf ? MARKET_EVIDENCE_FRESHNESS_WINDOW_MS : null,
    generatedAt,
    inputs: [
      { kind: 'other', label: season.season_name },
      ...leadIngredients.map((name) => ({ kind: 'ingredient' as const, label: name })),
    ],
    moduleId: 'lib/public/public-seasonal-market-pulse.ts',
  }).freshness

  const fallbackReason = getFallbackReason({
    availableSpotlights: rawSpotlights.length,
    marketStatus: freshness.status,
  })
  const sourceMode: PublicSeasonalMarketPulseSourceMode =
    fallbackReason === 'none' ? 'market-backed' : 'seasonal-fallback'
  const marketSpotlights = sourceMode === 'market-backed' ? rawSpotlights : []
  const provenance: PublicSeasonalMarketPulseProvenance = {
    contractVersion: 'public-market-note.v1',
    derived: createDerivedOutputProvenance({
      asOf: marketAsOf ?? generatedAt,
      derivationMethod: 'deterministic',
      derivationSource: 'getPublicSeasonalMarketPulse',
      freshnessWindowMs: marketAsOf ? MARKET_EVIDENCE_FRESHNESS_WINDOW_MS : null,
      generatedAt,
      inputs: [
        { kind: 'other', label: season.season_name },
        ...leadIngredients.map((name) => ({ kind: 'ingredient' as const, label: name })),
      ],
      moduleId: 'lib/public/public-seasonal-market-pulse.ts',
    }),
    scope: {
      ...scope,
      note: buildPublicMarketScopeNote(scope),
      shortLabel: buildScopeMessage(scope),
    },
    freshness: {
      marketAsOf,
      marketStatus: freshness.status,
      marketAgeSeconds: marketAsOf ? freshness.ageSeconds : null,
      marketWindowSeconds: freshness.windowSeconds,
    },
    fallback: {
      isActive: sourceMode !== 'market-backed',
      reason: fallbackReason,
    },
    evidence: {
      availableIngredientCount: rawSpotlights.length,
      leadIngredientNames: leadIngredients,
      requestedIngredientCount: spotlightNames.length,
    },
  }

  const prefill = buildResolvedBookingPrefill({
    season: season.season_name,
    peakNow: leadIngredients,
    endingSoon: endingSoon?.name ?? null,
    comingNext: comingNext?.name ?? null,
  })
  const context = buildPublicSeasonalMarketPulseContext({
    pulseId: `public-seasonal-market-pulse-${formatPulseIdPart(season.season_name)}-${formatDateKey(date)}`,
    season: season.season_name,
    peakNow: leadIngredients,
    endingSoon: endingSoon?.name ?? null,
    comingNext: comingNext?.name ?? null,
    sourceMode,
    scope,
    generatedAt,
    marketAsOf,
    marketStatus: freshness.status,
    fallbackReason,
    prefill,
  })
  const searchParams = buildPublicSeasonalMarketPulseSearchParamsFromContext(context)

  return {
    id: context.pulseId,
    generatedAt,
    season: {
      name: season.season_name,
      sensoryAnchor: season.sensory_anchor,
    },
    scope,
    provenance,
    peakNow,
    endingSoon,
    comingNext,
    marketSpotlights,
    source: {
      mode: sourceMode,
      seasonality: 'curated_national_calendar',
      market: rawSpotlights.length > 0 ? 'public_ingredient_queries' : 'unavailable',
      note:
        sourceMode === 'market-backed'
          ? MARKET_BACKED_SOURCE_NOTE
          : buildFallbackSourceNote(fallbackReason),
    },
    copy: {
      eyebrow: 'Market note',
      headline: buildPulseHeadline({ peakNow: leadIngredients }),
      body: buildPulseBody({
        season: season.season_name,
        peakNow: leadIngredients,
      }),
      urgencyNote: buildUrgencyNote({
        endingSoon: endingSoon?.name ?? null,
        comingNext: comingNext?.name ?? null,
      }),
      evidenceLine: buildEvidenceLine({
        fallbackReason,
        leadSpotlight,
      }),
      freshnessLine: buildFreshnessLine({
        fallbackReason,
        marketAsOf,
        marketStatus: freshness.status,
      }),
      scopeLine: buildPublicMarketScopeNote(scope),
      primaryCtaLabel: buildPrimaryCtaLabel(leadIngredients),
    },
    booking: {
      href: `/book?${searchParams.toString()}`,
      searchParams: Object.fromEntries(searchParams.entries()),
      prefill,
      intent: context.intent,
    },
    ingredients: {
      href: `/ingredients?${searchParams.toString()}`,
      searchParams: Object.fromEntries(searchParams.entries()),
    },
    analytics: {
      season: season.season_name,
      source_mode: sourceMode,
      market_scope: scope.label,
      market_scope_mode: scope.mode,
      lead_ingredients: leadIngredients.join(' | '),
      fallback_reason: fallbackReason === 'none' ? null : fallbackReason,
      market_freshness_status: freshness.status,
    },
  }
}

export function readPublicOpenBookingPrefillFromSearchParams(
  input: SearchParamInput
): PublicOpenBookingPrefill {
  return {
    occasion: sanitizePrefillValue(getSearchParamValue(input, 'occasion'), 500),
    service_type: sanitizePrefillValue(getSearchParamValue(input, 'service_type'), 100),
    additional_notes: sanitizePrefillValue(getSearchParamValue(input, 'additional_notes'), 5000),
  }
}

export function mergePublicOpenBookingPrefill(
  ...prefills: Array<PublicOpenBookingPrefill | null | undefined>
): PublicOpenBookingPrefill {
  const merged: PublicOpenBookingPrefill = {}

  for (const prefill of prefills) {
    if (!prefill) continue
    if (prefill.occasion?.trim()) merged.occasion = prefill.occasion.trim()
    if (prefill.service_type?.trim()) merged.service_type = prefill.service_type.trim()
    if (prefill.additional_notes?.trim()) {
      merged.additional_notes = prefill.additional_notes.trim()
    }
  }

  return merged
}

export function readPublicSeasonalMarketPulseContext(
  input: SearchParamInput
): PublicSeasonalMarketPulseContext | null {
  const entryContext =
    getSearchParamValue(input, MARKET_CONTEXT_KEY) ??
    getSearchParamValue(input, LEGACY_BOOKING_CONTEXT_KEY)
  if (entryContext !== SEASONAL_MARKET_PULSE_CONTEXT) return null

  const season = sanitizePrefillValue(getSearchParamValue(input, PULSE_SEASON_KEY), 50)
  const peakNow = parseIngredientList(getSearchParamValue(input, PULSE_PEAK_KEY))
  if (!season || peakNow.length === 0) return null

  const endingSoon = sanitizePrefillValue(getSearchParamValue(input, PULSE_ENDING_KEY), 100) ?? null
  const comingNext = sanitizePrefillValue(getSearchParamValue(input, PULSE_COMING_KEY), 100) ?? null
  const pulseId =
    sanitizePrefillValue(getSearchParamValue(input, PULSE_ID_KEY), 200) ??
    `public-seasonal-market-pulse-${formatPulseIdPart(season)}`
  const modeRaw = getSearchParamValue(input, PULSE_MODE_KEY)
  const sourceMode: PublicSeasonalMarketPulseSourceMode =
    modeRaw === 'market-backed' ? 'market-backed' : 'seasonal-fallback'
  const generatedAt = coerceIsoString(getSearchParamValue(input, PULSE_GENERATED_AT_KEY))
  const marketAsOf = coerceIsoString(getSearchParamValue(input, PULSE_MARKET_AS_OF_KEY))
  const marketStatus = parseMarketStatus(getSearchParamValue(input, PULSE_MARKET_STATUS_KEY))
  const fallbackReason = parseFallbackReason(getSearchParamValue(input, PULSE_FALLBACK_REASON_KEY))
  const scope = readPublicMarketScopeFromSearchParams(input)

  const explicitPrefill = readPublicOpenBookingPrefillFromSearchParams(input)
  const prefill = {
    ...buildResolvedBookingPrefill({ season, peakNow, endingSoon, comingNext }),
    ...mergePublicOpenBookingPrefill(explicitPrefill),
  }

  return buildPublicSeasonalMarketPulseContext({
    pulseId,
    season,
    peakNow,
    endingSoon,
    comingNext,
    sourceMode,
    scope,
    generatedAt: generatedAt ?? new Date().toISOString(),
    marketAsOf,
    marketStatus,
    fallbackReason,
    prefill,
  })
}

export function readPublicSeasonalMarketPulseBookingContext(
  input: SearchParamInput
): PublicSeasonalMarketPulseBookingContext | null {
  return readPublicSeasonalMarketPulseContext(input)
}

export function buildPublicSeasonalMarketPulseSearchParamsFromContext(
  context: PublicSeasonalMarketPulseContext
): URLSearchParams {
  const params = new URLSearchParams({
    service_type: context.prefill.service_type,
    [MARKET_CONTEXT_KEY]: SEASONAL_MARKET_PULSE_CONTEXT,
    [PULSE_ID_KEY]: context.pulseId,
    [PULSE_SEASON_KEY]: context.season,
    [PULSE_PEAK_KEY]: context.peakNow.join(', '),
    [PULSE_MODE_KEY]: context.sourceMode,
    [PULSE_GENERATED_AT_KEY]: context.intent.provenance.generatedAt,
    [PULSE_MARKET_STATUS_KEY]: context.intent.provenance.marketStatus,
    [PULSE_FALLBACK_REASON_KEY]: context.intent.provenance.fallbackReason,
  })

  if (context.prefill.occasion) params.set('occasion', context.prefill.occasion)
  if (context.prefill.additional_notes) {
    params.set('additional_notes', context.prefill.additional_notes)
  }
  if (context.endingSoon) params.set(PULSE_ENDING_KEY, context.endingSoon)
  if (context.comingNext) params.set(PULSE_COMING_KEY, context.comingNext)
  if (context.intent.provenance.marketAsOf) {
    params.set(PULSE_MARKET_AS_OF_KEY, context.intent.provenance.marketAsOf)
  }

  appendPublicMarketScopeSearchParams(params, context.scope)
  return params
}

export function buildPublicSeasonalMarketPulseIntentFromContext(
  context: PublicSeasonalMarketPulseContext
): PublicSeasonalMarketPulseIntent {
  return context.intent
}

export function readPublicSeasonalMarketPulseIntentFromUnknownFields(
  raw: unknown
): PublicSeasonalMarketPulseIntent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const candidate = (raw as Record<string, unknown>).seasonal_market_intent
  const parsed = PublicSeasonalMarketPulseIntentSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function formatPublicSeasonalMarketPulseIntentLabel(
  intent: PublicSeasonalMarketPulseIntent
): string {
  return `${intent.season} market note, ${formatIngredientList(intent.leadIngredients)}`
}

export function buildPublicSeasonalMarketPulseSourceMessageLine(
  intent: PublicSeasonalMarketPulseIntent
): string {
  const parts = [
    `Market note: ${intent.season}`,
    `Lead ingredients: ${formatIngredientList(intent.leadIngredients)}`,
    `Scope: ${buildScopeMessage(intent.scope)}`,
    `Evidence: ${intent.sourceMode === 'market-backed' ? 'market-backed' : 'calendar fallback'}`,
  ]

  if (intent.requestScope) {
    parts.push(`Resolved request scope: ${intent.requestScope.label}`)
  }

  return parts.join(' | ')
}

function buildPublicSeasonalMarketPulseContext(input: {
  pulseId: string
  season: string
  peakNow: string[]
  endingSoon: string | null
  comingNext: string | null
  sourceMode: PublicSeasonalMarketPulseSourceMode
  scope: PublicMarketScope
  generatedAt: string
  marketAsOf: string | null
  marketStatus: DerivedOutputFreshnessStatus
  fallbackReason: PublicSeasonalMarketPulseFallbackReason
  prefill: ResolvedPublicOpenBookingPrefill
}): PublicSeasonalMarketPulseContext {
  const intent: PublicSeasonalMarketPulseIntent = {
    source: 'seasonal_market_pulse',
    pulseId: input.pulseId,
    season: input.season,
    leadIngredients: input.peakNow,
    endingSoon: input.endingSoon,
    comingNext: input.comingNext,
    sourceMode: input.sourceMode,
    scope: input.scope,
    provenance: {
      generatedAt: input.generatedAt,
      marketAsOf: input.marketAsOf,
      marketStatus: input.marketStatus,
      fallbackReason: input.fallbackReason,
    },
  }

  return {
    entryContext: 'seasonal_market_pulse',
    pulseId: input.pulseId,
    season: input.season,
    peakNow: input.peakNow,
    endingSoon: input.endingSoon,
    comingNext: input.comingNext,
    sourceMode: input.sourceMode,
    scope: input.scope,
    intent,
    summary: {
      eyebrow: 'Current market note',
      headline: buildPulseHeadline({ peakNow: input.peakNow }),
      body: buildBookingContextBody({
        endingSoon: input.endingSoon,
        comingNext: input.comingNext,
      }),
      sourceNote:
        buildEvidenceLine({
          fallbackReason: input.fallbackReason,
          leadSpotlight: null,
        }) ?? buildFallbackSourceNote(input.fallbackReason),
      freshnessNote: buildFreshnessLine({
        fallbackReason: input.fallbackReason,
        marketAsOf: input.marketAsOf,
        marketStatus: input.marketStatus,
      }),
      scopeNote: buildPublicMarketScopeNote(input.scope),
    },
    prefill: input.prefill,
  }
}

function getFallbackReason(input: {
  availableSpotlights: number
  marketStatus: DerivedOutputFreshnessStatus
}): PublicSeasonalMarketPulseFallbackReason {
  if (input.availableSpotlights === 0) return 'market_data_unavailable'
  if (input.marketStatus === 'stale') return 'stale_market_evidence'
  return 'none'
}

function buildFallbackSourceNote(reason: PublicSeasonalMarketPulseFallbackReason): string {
  if (reason === 'stale_market_evidence') {
    return 'Seasonal calendar only today; public ingredient snapshots are older than the freshness window and are withheld from this note.'
  }

  return SEASONAL_FALLBACK_SOURCE_NOTE
}

function buildResolvedBookingPrefill(input: {
  season: string
  peakNow: string[]
  endingSoon: string | null
  comingNext: string | null
}): ResolvedPublicOpenBookingPrefill {
  return {
    occasion: '',
    service_type: 'dinner_party',
    additional_notes: buildBookingAdditionalNotes(input),
  }
}

function buildBookingAdditionalNotes(input: {
  season: string
  peakNow: string[]
  endingSoon: string | null
  comingNext: string | null
}): string {
  const parts = [
    `Would like the menu to lean ${input.season.toLowerCase()} and ingredient-led, with ${formatIngredientList(input.peakNow)} at the center.`,
  ]

  if (input.endingSoon) {
    parts.push(`${input.endingSoon} is appealing if the window is still strong.`)
  }

  if (input.comingNext) {
    parts.push(`${input.comingNext} is the next move if timing is better.`)
  }

  return parts.join(' ')
}

function buildPulseHeadline(input: { peakNow: string[] }): string {
  if (input.peakNow.length === 0) {
    return 'The market is moving right now.'
  }

  const verb = input.peakNow.length === 1 ? 'is' : 'are'
  return `${formatIngredientList(input.peakNow)} ${verb} strongest right now.`
}

function buildPulseBody(input: { season: string; peakNow: string[] }): string {
  const lead = input.peakNow.slice(0, 2)
  if (lead.length === 0) {
    return `A chef can still shape the menu to the current ${input.season.toLowerCase()} market.`
  }

  return `Build around ${formatIngredientList(lead)} and the dinner reads unmistakably ${input.season.toLowerCase()} the moment it hits the table.`
}

function buildUrgencyNote(input: {
  endingSoon: string | null
  comingNext: string | null
}): string | null {
  if (input.endingSoon && input.comingNext) {
    return `${input.endingSoon} is nearly out, and ${input.comingNext} is next up.`
  }

  if (input.endingSoon) {
    return `${input.endingSoon} is nearly out.`
  }

  if (input.comingNext) {
    return `${input.comingNext} is next up.`
  }

  return null
}

function buildEvidenceLine(input: {
  fallbackReason: PublicSeasonalMarketPulseFallbackReason
  leadSpotlight: PublicIngredientSpotlight | null
}): string | null {
  if (input.fallbackReason === 'stale_market_evidence') {
    return 'Public ingredient snapshots are older than the freshness window, so this note is calendar-based today.'
  }

  if (input.fallbackReason === 'market_data_unavailable') {
    return 'Public ingredient snapshots are unavailable, so this note is calendar-based today.'
  }

  if (!input.leadSpotlight) {
    return 'Grounded in fresh public ingredient snapshots.'
  }

  return `${input.leadSpotlight.name} currently shows public grocery snapshots across ${input.leadSpotlight.storeCount} stores.`
}

function buildFreshnessLine(input: {
  fallbackReason: PublicSeasonalMarketPulseFallbackReason
  marketAsOf: string | null
  marketStatus: DerivedOutputFreshnessStatus
}): string | null {
  if (input.fallbackReason === 'stale_market_evidence') {
    return 'Freshness: available public ingredient snapshots are older than 72 hours.'
  }

  if (input.fallbackReason === 'market_data_unavailable') {
    return 'Freshness: no public ingredient snapshots were available for this note.'
  }

  if (!input.marketAsOf || input.marketStatus !== 'fresh') {
    return null
  }

  return `Freshness: public ingredient snapshots were last confirmed ${formatRelativeAge(input.marketAsOf)}.`
}

function buildPrimaryCtaLabel(peakNow: string[]): string {
  const featured = peakNow.slice(0, 2)
  if (featured.length === 0) {
    return 'Plan a dinner around this market'
  }

  return `Plan a dinner around ${formatIngredientList(featured)}`
}

function buildBookingContextBody(input: {
  endingSoon: string | null
  comingNext: string | null
}): string {
  const urgency = buildUrgencyNote(input)
  if (!urgency) {
    return 'This note will be carried into the request details chefs see.'
  }

  return `${urgency} This note will be carried into the request details chefs see.`
}

function pickLeadSpotlight(
  spotlights: PublicIngredientSpotlight[],
  preferredNames: string[]
): PublicIngredientSpotlight | null {
  const normalizedPreferredNames = preferredNames.map((name) => name.trim().toLowerCase())

  for (const preferredName of normalizedPreferredNames) {
    const match = spotlights.find(
      (spotlight) => spotlight.name.trim().toLowerCase() === preferredName
    )
    if (match) return match
  }

  return spotlights[0] ?? null
}

function toPulseIngredient(
  window: MicroWindow,
  timing: PublicSeasonalPulseIngredient['timing']
): PublicSeasonalPulseIngredient {
  return {
    name: window.ingredient,
    note: window.notes,
    timing,
  }
}

function uniqueIngredientWindows(windows: MicroWindow[]): MicroWindow[] {
  const seen = new Set<string>()
  return windows.filter((window) => {
    const key = window.ingredient.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatIngredientList(ingredients: string[]): string {
  if (ingredients.length === 0) return 'the market right now'
  if (ingredients.length === 1) return ingredients[0]
  if (ingredients.length === 2) return `${ingredients[0]} and ${ingredients[1]}`
  return `${ingredients.slice(0, -1).join(', ')}, and ${ingredients[ingredients.length - 1]}`
}

function parseIngredientList(value: string | null): string[] {
  if (!value) return []
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  )
}

function sanitizePrefillValue(value: string | null, maxLength: number): string | undefined {
  if (!value) return undefined
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  return normalized.slice(0, maxLength)
}

function getSearchParamValue(input: SearchParamInput, key: string): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key)
  }

  const raw = input[key]
  if (Array.isArray(raw)) return raw.find((value) => value.trim().length > 0) ?? null
  return typeof raw === 'string' ? raw : null
}

function coerceIsoString(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseMarketStatus(value: string | null): DerivedOutputFreshnessStatus {
  if (value === 'fresh' || value === 'stale' || value === 'point-in-time') {
    return value
  }

  return 'point-in-time'
}

function parseFallbackReason(value: string | null): PublicSeasonalMarketPulseFallbackReason {
  if (value === 'market_data_unavailable' || value === 'stale_market_evidence') {
    return value
  }

  return 'none'
}

function formatRelativeAge(iso: string): string {
  const diffSeconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (diffSeconds < 60) return 'moments ago'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 48) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function buildScopeMessage(scope: PublicMarketScope): string {
  return scope.isFallback ? `${scope.label} fallback` : scope.label
}

function formatPulseIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}
