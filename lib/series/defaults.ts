import type { SeriesConfig, SeriesModuleKey, SeriesModuleEntry } from './types'

const DEFAULT_MODULE_ORDER: SeriesModuleKey[] = [
  'hero',
  'hosts',
  'farm',
  'farm_inventory',
  'venue',
  'menu',
  'event_expectations',
  'live_data',
  'news_feed',
  'past_events',
  'links',
]

export function createDefaultSeriesConfig(
  overrides?: Partial<Pick<SeriesConfig, 'tagline' | 'slug'>>
): SeriesConfig {
  const modules: SeriesModuleEntry[] = DEFAULT_MODULE_ORDER.map((key, i) => ({
    key,
    enabled: true,
    sortOrder: i,
    visibility: key === 'news_feed' ? ('members' as const) : ('public' as const),
  }))

  return {
    tagline: overrides?.tagline ?? '',
    coverImageUrl: null,
    heroGallery: [],
    slug: overrides?.slug ?? null,
    hostDisplayOrder: [],
    hostProfiles: [],
    approvalMode: 'auto',
    maxMembers: null,
    earlyAccess: {
      enabled: true,
      windowHours: 48,
      maxTicketsPerMember: null,
      memberPricingEnabled: false,
      memberDiscountPercent: null,
    },
    transparency: {
      showSourcingStories: true,
      showCostBreakdown: false,
      showFarmUpdates: true,
    },
    farm: null,
    farmInventory: [],
    venue: null,
    menu: {
      showIngredientSourcing: true,
      showDietaryIcons: true,
      showBeveragePairings: false,
      showChefNotes: true,
      enablePostEventFeedback: true,
      enablePreEventPolling: false,
      enableOpenSuggestions: false,
      enableDishRatings: true,
      showMostRequested: false,
    },
    defaultExpectations: {
      dressCode: null,
      ageRequirement: null,
      byobPolicy: null,
      smokingPolicy: null,
      guestRules: [],
      whatToBring: [],
      timing: {
        arrivalTime: null,
        dinnerStartTime: null,
        expectedEndTime: null,
        arrivalNotes: null,
      },
      houseRules: [],
      parking: null,
      entryInstructions: null,
      eventVibe: null,
      weather: {
        showForecast: true,
        rainPlan: null,
        temperatureNotes: null,
      },
    },
    liveWidgets: {
      showCountdown: true,
      showSeatsRemaining: true,
      showWeather: true,
      showRsvpPulse: false,
      showMemberCount: true,
      showLastEventRating: false,
    },
    defaultNotifications: {
      newPosts: true,
      newEvents: true,
      eventReminders: true,
      digestMode: 'instant',
    },
    modules,
    publicPage: {
      enabled: true,
      showPastEvents: true,
      showMemberCount: true,
      showUpcomingEvents: true,
      story: '',
    },
  }
}
