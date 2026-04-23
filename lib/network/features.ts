import {
  NEUTRAL_NETWORK_AVAILABILITY_PLACEHOLDER,
  NEUTRAL_NETWORK_REFERRAL_OFFER_PLACEHOLDER,
  NEUTRAL_NETWORK_REFERRAL_REQUEST_PLACEHOLDER,
  NEUTRAL_NETWORK_URGENT_NEED_PLACEHOLDER,
} from '@/lib/site/national-brand-copy'

export const NETWORK_FEATURE_KEYS = [
  'availability',
  'referral_asks',
  'referral_offers',
  'collab_requests',
  'menu_spotlights',
  'sourcing_intel',
  'operational_tips',
  'equipment_feedback',
  'event_recap_learnings',
  'urgent_needs',
  'professional_proof',
  'questions_to_network',
] as const

export type NetworkFeatureKey = (typeof NETWORK_FEATURE_KEYS)[number]

export type NetworkFeatureDefinition = {
  key: NetworkFeatureKey
  label: string
  description: string
  placeholder: string
}

export const NETWORK_FEATURE_DEFINITIONS: Record<
  NetworkFeatureKey,
  Omit<NetworkFeatureDefinition, 'key'>
> = {
  availability: {
    label: 'Availability',
    description: 'Open dates, location, service type, and guest range.',
    placeholder: NEUTRAL_NETWORK_AVAILABILITY_PLACEHOLDER,
  },
  referral_asks: {
    label: 'Referral Asks',
    description: 'Ask for referrals you need help with right now.',
    placeholder: NEUTRAL_NETWORK_REFERRAL_REQUEST_PLACEHOLDER,
  },
  referral_offers: {
    label: 'Referral Offers',
    description: 'Offer referrals you cannot take yourself.',
    placeholder: NEUTRAL_NETWORK_REFERRAL_OFFER_PLACEHOLDER,
  },
  collab_requests: {
    label: 'Collab Requests',
    description: 'Find chefs for staffing, prep, pastry, or service support.',
    placeholder: 'Need a pastry-focused collaborator for a 4-course private dinner next Friday.',
  },
  menu_spotlights: {
    label: 'Menu Spotlights',
    description: 'Share dishes, tasting ideas, and seasonal concepts.',
    placeholder:
      'Testing a spring menu: charred asparagus, preserved lemon aioli, and herb-crusted halibut.',
  },
  sourcing_intel: {
    label: 'Sourcing Intel',
    description: 'Share vendor leads, ingredient quality, and price shifts.',
    placeholder:
      'Heads up: local sea scallops are excellent this week and priced lower than last month.',
  },
  operational_tips: {
    label: 'Operational Tips',
    description: 'Share process, prep, timing, and workflow wins.',
    placeholder: 'My event setup checklist now saves ~30 minutes on site. Happy to share template.',
  },
  equipment_feedback: {
    label: 'Equipment Feedback',
    description: 'Recommend or warn about gear and tools.',
    placeholder: 'Portable induction unit X held temp well for 3-hour service. Worth renting.',
  },
  event_recap_learnings: {
    label: 'Event Recap Learnings',
    description: 'Post practical lessons from recent events.',
    placeholder: 'Recap: 16-guest anniversary dinner. Biggest win was pre-plated amuse timing.',
  },
  urgent_needs: {
    label: 'Urgent Needs',
    description: 'Last-minute staffing, rental, or ingredient requests.',
    placeholder: NEUTRAL_NETWORK_URGENT_NEED_PLACEHOLDER,
  },
  professional_proof: {
    label: 'Professional Proof',
    description: 'Milestones, wins, press, certifications, testimonials.',
    placeholder:
      'Just completed food safety recertification and added two new vegan tasting menus.',
  },
  questions_to_network: {
    label: 'Questions To Network',
    description: 'Ask focused questions and get practical answers.',
    placeholder: 'What is your go-to method for keeping risotto texture stable for 12+ guests?',
  },
}

export function getNetworkFeatureList(): NetworkFeatureDefinition[] {
  return NETWORK_FEATURE_KEYS.map((key) => ({
    key,
    ...NETWORK_FEATURE_DEFINITIONS[key],
  }))
}
