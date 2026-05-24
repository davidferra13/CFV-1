export type ChannelKey =
  | 'home'
  // People
  | 'whos-coming'
  | 'dietary-needs'
  | 'access-needs'
  | 'seating'
  | 'attendee-profiles'
  // The Meal
  | 'menu'
  | 'menu-vote'
  | 'shopping-sourcing'
  | 'what-to-bring'
  // The Event
  | 'getting-there'
  | 'theme-vibe'
  | 'group-decisions'
  | 'itinerary'
  | 'weather-plan'
  // Conversation
  | 'chat'
  | 'announcements'
  | 'celebration-wall'
  // Memories
  | 'photos'
  | 'past-dinners'
  // Chef Only
  | 'chef-notes'
  | 'chef-money'
  | 'client-intel'
  | 'change-log'

export type ChannelCategory = {
  id: string
  label: string
  channels: ChannelDef[]
}

export type ChannelDef = {
  key: ChannelKey
  label: string
  icon: string
  chefOnly?: boolean
  badge?: number
}

export const CHANNEL_CATEGORIES: ChannelCategory[] = [
  {
    id: 'people',
    label: 'People',
    channels: [
      { key: 'whos-coming', label: "Who's Coming", icon: '👥' },
      { key: 'dietary-needs', label: 'Dietary Needs', icon: '🥗' },
      { key: 'access-needs', label: 'Access Needs', icon: '♿' },
      { key: 'seating', label: 'Seating', icon: '🪑' },
      { key: 'attendee-profiles', label: 'Attendee Profiles', icon: '👤' },
    ],
  },
  {
    id: 'meal',
    label: 'The Meal',
    channels: [
      { key: 'menu', label: 'Menu', icon: '📋' },
      { key: 'menu-vote', label: 'Menu Vote', icon: '🗳️' },
      { key: 'shopping-sourcing', label: 'Shopping & Sourcing', icon: '🛒' },
      { key: 'what-to-bring', label: 'What to Bring', icon: '🧺' },
    ],
  },
  {
    id: 'event',
    label: 'The Event',
    channels: [
      { key: 'getting-there', label: 'Getting There', icon: '📍' },
      { key: 'theme-vibe', label: 'Theme & Vibe', icon: '🎨' },
      { key: 'group-decisions', label: 'Group Decisions', icon: '🤝' },
      { key: 'itinerary', label: 'Itinerary', icon: '📅' },
      { key: 'weather-plan', label: 'Weather Plan', icon: '🌤️' },
    ],
  },
  {
    id: 'conversation',
    label: 'Conversation',
    channels: [
      { key: 'chat', label: 'Chat', icon: '💬' },
      { key: 'announcements', label: 'Announcements', icon: '📢' },
      { key: 'celebration-wall', label: 'Celebration Wall', icon: '🎉' },
    ],
  },
  {
    id: 'memories',
    label: 'Memories',
    channels: [
      { key: 'photos', label: 'Photos', icon: '📸' },
      { key: 'past-dinners', label: 'Past Dinners', icon: '🍷' },
    ],
  },
  {
    id: 'chef-only',
    label: 'Chef Only',
    channels: [
      { key: 'chef-notes', label: 'Notes', icon: '📝', chefOnly: true },
      { key: 'chef-money', label: 'Money', icon: '💰', chefOnly: true },
      { key: 'client-intel', label: 'Client Intel', icon: '🔍', chefOnly: true },
      { key: 'change-log', label: 'Change Log', icon: '📜', chefOnly: true },
    ],
  },
]

/** Look up a channel definition by key across all categories */
export function findChannelDef(key: ChannelKey): ChannelDef | undefined {
  if (key === 'home') return { key: 'home', label: 'Home', icon: '🏠' }
  for (const cat of CHANNEL_CATEGORIES) {
    const found = cat.channels.find((ch) => ch.key === key)
    if (found) return found
  }
  return undefined
}
