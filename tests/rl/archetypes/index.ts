// Archetype Definitions - Behavioral profiles for simulated users.
// Each archetype has goals, workflows, viewport, and behavioral modifiers.

import type { ArchetypeProfile, BehavioralModifiers } from '../types'

export const ARCHETYPES: ArchetypeProfile[] = [
  {
    id: 'private-chef',
    role: 'chef',
    description: 'Solo private chef managing 5-15 clients',
    technicalProficiency: 'medium',
    usageFrequency: 'daily',
    primaryWorkflows: [
      'dashboard_review',
      'inquiry_response',
      'event_creation',
      'quote_building',
      'menu_planning',
      'client_communication',
      'financial_review',
      'calendar_check',
    ],
    goalSet: [
      'navigate_to_inquiries',
      'navigate_to_events',
      'navigate_to_clients',
      'navigate_to_quotes',
      'navigate_to_financials',
      'navigate_to_calendar',
      'navigate_to_settings',
      'explore_dashboard_widgets',
      'create_new_event',
      'view_client_list',
      'check_financial_summary',
    ],
    viewport: { width: 1440, height: 900 },
    sessionDurationMinutes: 15,
  },
  {
    id: 'caterer',
    role: 'chef',
    description: 'Catering company handling 20+ events/month',
    technicalProficiency: 'high',
    usageFrequency: 'daily',
    primaryWorkflows: [
      'bulk_event_management',
      'staff_scheduling',
      'multi_event_calendar',
      'financial_reporting',
    ],
    goalSet: [
      'navigate_to_events',
      'navigate_to_staff',
      'navigate_to_calendar',
      'navigate_to_analytics',
      'navigate_to_financials',
      'view_event_list',
      'check_staff_schedule',
    ],
    viewport: { width: 1920, height: 1080 },
    sessionDurationMinutes: 30,
  },
  {
    id: 'meal-prep',
    role: 'chef',
    description: 'Weekly meal prep for recurring clients',
    technicalProficiency: 'low',
    usageFrequency: 'weekly',
    primaryWorkflows: ['recipe_management', 'dietary_restriction_tracking', 'simple_invoicing'],
    goalSet: [
      'navigate_to_recipes',
      'navigate_to_clients',
      'navigate_to_financials',
      'view_recipe_book',
      'check_client_dietary',
    ],
    viewport: { width: 768, height: 1024 },
    sessionDurationMinutes: 10,
  },
  {
    id: 'client-hiring',
    role: 'client',
    description: 'Client booking a private dinner',
    technicalProficiency: 'low',
    usageFrequency: 'occasional',
    primaryWorkflows: ['view_event_details', 'submit_dietary_info', 'message_chef'],
    goalSet: ['view_my_events', 'view_event_detail', 'navigate_to_profile'],
    viewport: { width: 375, height: 667 },
    sessionDurationMinutes: 5,
  },
  {
    id: 'restaurant',
    role: 'chef',
    description: 'Restaurant using ChefFlow for catering side-business',
    technicalProficiency: 'medium',
    usageFrequency: 'weekly',
    primaryWorkflows: [
      'analytics_review',
      'staff_management',
      'menu_management',
      'expense_tracking',
    ],
    goalSet: [
      'navigate_to_analytics',
      'navigate_to_staff',
      'navigate_to_menus',
      'navigate_to_expenses',
      'view_analytics_dashboard',
    ],
    viewport: { width: 1024, height: 768 },
    sessionDurationMinutes: 20,
  },
  {
    id: 'new-user',
    role: 'chef',
    description: 'First-time user exploring the platform',
    technicalProficiency: 'low',
    usageFrequency: 'first-time',
    primaryWorkflows: ['explore_dashboard', 'navigate_all_sections', 'try_settings'],
    goalSet: [
      'explore_all_nav_sections',
      'navigate_to_settings',
      'navigate_to_events',
      'navigate_to_clients',
      'navigate_to_dashboard',
    ],
    viewport: { width: 1440, height: 900 },
    sessionDurationMinutes: 20,
  },
]

/**
 * Get an archetype by ID.
 */
export function getArchetype(id: string): ArchetypeProfile | undefined {
  return ARCHETYPES.find((a) => a.id === id)
}

/**
 * Generate random behavioral modifiers for an archetype instance.
 * Uses the archetype's proficiency level to bias the modifiers.
 */
export function generateModifiers(archetype: ArchetypeProfile): BehavioralModifiers {
  const profBias =
    archetype.technicalProficiency === 'high'
      ? 0.3
      : archetype.technicalProficiency === 'medium'
        ? 0
        : -0.3

  return {
    patience: clamp(0.5 + profBias + (Math.random() - 0.5) * 0.6),
    attentionSpan: clamp(0.5 + profBias + (Math.random() - 0.5) * 0.6),
    technicalSkill: clamp(0.5 + profBias + (Math.random() - 0.5) * 0.6),
    errorRecovery: clamp(0.5 + profBias + (Math.random() - 0.5) * 0.6),
    explorationTendency: clamp(0.5 + (Math.random() - 0.5) * 0.8),
  }
}

/**
 * Select an archetype using weighted round-robin.
 * Private chef gets the most weight since it's the primary persona.
 */
export function selectArchetype(episodeNumber: number): ArchetypeProfile {
  const weights: Record<string, number> = {
    'private-chef': 30,
    caterer: 15,
    'meal-prep': 10,
    'client-hiring': 20,
    restaurant: 10,
    'new-user': 15,
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = (episodeNumber * 7 + Math.random() * totalWeight) % totalWeight

  for (const archetype of ARCHETYPES) {
    roll -= weights[archetype.id] || 10
    if (roll <= 0) return archetype
  }

  return ARCHETYPES[0] // Fallback
}

/**
 * Select a random goal from the archetype's goal set.
 */
export function selectGoal(archetype: ArchetypeProfile): string {
  const goals = archetype.goalSet
  return goals[Math.floor(Math.random() * goals.length)]
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}
