export type SeriesHostStatus = 'invited' | 'active' | 'removed'

export type SeriesHostPermissions = {
  canCreateEvents: boolean
  canPublishPosts: boolean
  canManageMembers: boolean
  canManageTickets: boolean
  canManageFinances: boolean
  canEditSeries: boolean
}

export type SeriesHost = {
  id: string
  seriesId: string
  userId: string | null
  tenantId: string | null
  externalName: string | null
  externalEmail: string | null
  externalBio: string | null
  externalAvatarUrl: string | null
  externalRole: string | null
  displayName: string
  displayRole: string
  bio: string | null
  avatarUrl: string | null
  websiteUrl: string | null
  permissions: SeriesHostPermissions
  status: SeriesHostStatus
  invitedAt: string
  acceptedAt: string | null
  removedAt: string | null
}

export type SeriesHostProfile = {
  hostId: string
  headshotUrl: string | null
  actionPhotos: string[]
  links: Array<{
    label: string
    url: string
    icon: string | null
    featured: boolean
  }>
  servicePackages: Array<{
    name: string
    description: string
    priceRange: string | null
    bookingUrl: string | null
    photoUrl: string | null
  }>
  highlights: string[]
}

export type SeriesFarmProfile = {
  farmName: string
  location: string
  foundedYear: number | null
  story: string
  coverPhotoUrl: string | null
  galleryPhotos: string[]
  googleMapsEmbedUrl: string | null
  streetViewEmbedUrl: string | null
  coordinates: { lat: number; lng: number } | null
  livestock: Array<{
    id: string
    name: string
    species: string | null
    breed: string | null
    count: number | null
    photoUrl: string | null
    notes: string | null
    onMenu: boolean
  }>
  gardenPlots: Array<{
    id: string
    name: string
    photoUrl: string | null
    crops: string[]
    notes: string | null
  }>
  recentHarvests: Array<{
    id: string
    itemName: string
    photoUrl: string | null
    pickedDate: string
    quantity: string | null
    destination: string | null
  }>
  historyTimeline: Array<{
    year: number
    title: string
    description: string
    photoUrl: string | null
  }>
  csaUrl: string | null
  farmStoreUrl: string | null
  farmWebsiteUrl: string | null
}

export type FarmInventoryCategory =
  | 'fresh_meat'
  | 'freezer'
  | 'garden'
  | 'herbs'
  | 'dairy_eggs'
  | 'pantry'
  | 'canned_preserved'
  | 'freeze_dried'
  | 'supplemental'
  | 'dishware_equipment'

export type FarmInventoryItem = {
  id: string
  name: string
  category: FarmInventoryCategory
  photoUrl: string | null
  seasonStart: number | null
  seasonEnd: number | null
  currentStatus: 'available' | 'coming_soon' | 'out_of_season' | 'limited'
  onUpcomingMenu: boolean
  sourceNotes: string | null
  variety: string | null
}

export type SeriesVenueProfile = {
  venueName: string | null
  settingDescription: string
  photos: Array<{
    url: string
    caption: string | null
    featured: boolean
  }>
  googleMapsEmbedUrl: string | null
  streetViewEmbedUrl: string | null
  seatedCapacity: number | null
  standingCapacity: number | null
  tableDescription: string | null
  seasonalNotes: Array<{
    season: 'spring' | 'summer' | 'fall' | 'winter'
    description: string
    photoUrl: string | null
  }>
  accessibilityNotes: string | null
}

export type SeriesMenuConfig = {
  showIngredientSourcing: boolean
  showDietaryIcons: boolean
  showBeveragePairings: boolean
  showChefNotes: boolean
  enablePostEventFeedback: boolean
  enablePreEventPolling: boolean
  enableOpenSuggestions: boolean
  enableDishRatings: boolean
  showMostRequested: boolean
}

export type SeriesEventExpectations = {
  dressCode: {
    enabled: boolean
    label: string
    description: string | null
    photoUrl: string | null
  } | null
  ageRequirement: {
    enabled: boolean
    minimumAge: number | null
    label: string
    notes: string | null
  } | null
  byobPolicy: {
    enabled: boolean
    allowed: boolean
    details: string | null
    whatsProvided: string | null
  } | null
  smokingPolicy: {
    enabled: boolean
    fourTwentyFriendly: boolean
    smokingAllowed: boolean
    designatedArea: string | null
    details: string | null
  } | null
  guestRules: Array<{
    rule: string
    icon: string | null
  }>
  whatToBring: Array<{
    item: string
    required: boolean
    notes: string | null
  }>
  timing: {
    arrivalTime: string | null
    dinnerStartTime: string | null
    expectedEndTime: string | null
    arrivalNotes: string | null
  }
  houseRules: Array<{
    rule: string
    important: boolean
  }>
  parking: {
    instructions: string
    photoUrl: string | null
    mapUrl: string | null
  } | null
  entryInstructions: {
    instructions: string
    photoUrl: string | null
    streetViewUrl: string | null
  } | null
  eventVibe: {
    tone: string
    description: string | null
    moodPhotos: string[]
    playlistUrl: string | null
  } | null
  weather: {
    showForecast: boolean
    rainPlan: string | null
    temperatureNotes: string | null
  }
}

export type SeriesModuleKey =
  | 'hero'
  | 'hosts'
  | 'farm'
  | 'farm_inventory'
  | 'venue'
  | 'menu'
  | 'event_expectations'
  | 'live_data'
  | 'news_feed'
  | 'past_events'
  | 'links'

export type SeriesModuleEntry = {
  key: SeriesModuleKey
  enabled: boolean
  sortOrder: number
  visibility: 'public' | 'members'
}

export type SeriesConfig = {
  tagline: string
  coverImageUrl: string | null
  heroGallery: string[]
  slug: string | null
  hostDisplayOrder: string[]
  hostProfiles: SeriesHostProfile[]
  approvalMode: 'auto' | 'manual'
  maxMembers: number | null
  earlyAccess: {
    enabled: boolean
    windowHours: number
    maxTicketsPerMember: number | null
    memberPricingEnabled: boolean
    memberDiscountPercent: number | null
  }
  transparency: {
    showSourcingStories: boolean
    showCostBreakdown: boolean
    showFarmUpdates: boolean
  }
  farm: SeriesFarmProfile | null
  farmInventory: FarmInventoryItem[]
  venue: SeriesVenueProfile | null
  menu: SeriesMenuConfig
  defaultExpectations: SeriesEventExpectations
  liveWidgets: {
    showCountdown: boolean
    showSeatsRemaining: boolean
    showWeather: boolean
    showRsvpPulse: boolean
    showMemberCount: boolean
    showLastEventRating: boolean
  }
  defaultNotifications: {
    newPosts: boolean
    newEvents: boolean
    eventReminders: boolean
    digestMode: 'instant' | 'daily' | 'weekly'
  }
  modules: SeriesModuleEntry[]
  publicPage: {
    enabled: boolean
    showPastEvents: boolean
    showMemberCount: boolean
    showUpcomingEvents: boolean
    story: string
  }
}

export type SeriesSummary = {
  id: string
  name: string
  description: string | null
  slug: string | null
  groupToken: string
  coverImageUrl: string | null
  tagline: string | null
  memberCount: number
  hostCount: number
  eventCount: number
  isActive: boolean
  createdAt: string
}

export type SeriesCreateInput = {
  name: string
  description?: string | null
  tagline?: string
  slug?: string | null
  visibility?: 'public' | 'private'
}

export type SeriesHostInviteInput = {
  seriesId: string
  email?: string | null
  externalName?: string | null
  externalEmail?: string | null
  externalRole?: string | null
  displayName: string
  displayRole: string
  bio?: string | null
}

export type SeriesOperationResult = {
  success: boolean
  seriesId?: string
  hostId?: string
  error?: string
}
