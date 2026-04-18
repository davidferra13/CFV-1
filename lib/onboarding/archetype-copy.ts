// Archetype-adaptive copy for onboarding wizard steps.
// Each step can have per-archetype overrides for title, description, and field labels.
// Falls back to defaults when no override exists for a given archetype.

import type { ArchetypeId } from '@/lib/archetypes/presets'

export type StepCopy = {
  title?: string
  description?: string
  placeholder?: string
  // Pricing-specific labels
  rateLabel?: string
  hourlyLabel?: string | null // null = hide this field
  minimumLabel?: string
  rateHint?: string
}

type StepCopyMap = Partial<Record<ArchetypeId, StepCopy>>

const STEP_COPY: Record<string, StepCopyMap> = {
  first_menu: {
    'private-chef': {
      title: 'Your First Menu',
      description:
        'Type in a menu name and a few dishes. Tasting menu, date night, holiday dinner; whatever you cook most.',
      placeholder: 'e.g. Pan-seared scallops',
    },
    caterer: {
      title: 'Your First Menu',
      description:
        'Build a sample catering menu for an upcoming event. You can add full courses and pricing later.',
      placeholder: 'e.g. Passed canapes, Plated entree',
    },
    restaurant: {
      title: 'Your Menu',
      description: 'Add your current restaurant menu. Start with your most popular items.',
      placeholder: 'e.g. House Burger, Caesar Salad',
    },
    bakery: {
      title: 'Your Product List',
      description: 'Add your signature baked goods. You can organize into categories later.',
      placeholder: 'e.g. Sourdough Boule, Chocolate Croissant',
    },
  },
  pricing: {
    'private-chef': {
      rateLabel: 'Per-Guest Rate',
      rateHint: 'Price per person for a standard dinner',
      hourlyLabel: 'Hourly Rate',
      minimumLabel: 'Minimum Booking',
    },
    caterer: {
      rateLabel: 'Per-Person Rate',
      rateHint: 'Base price per guest for catering events',
      hourlyLabel: 'Hourly Service Rate',
      minimumLabel: 'Minimum Event Size',
    },
    'meal-prep': {
      rateLabel: 'Per-Meal Rate',
      rateHint: 'Average price per individual meal',
      hourlyLabel: 'Weekly Package Rate',
      minimumLabel: 'Minimum Weekly Order',
    },
    restaurant: {
      rateLabel: 'Average Plate Price',
      rateHint: 'Typical entree price',
      hourlyLabel: null,
      minimumLabel: 'Minimum Party Size for Reservations',
    },
    'food-truck': {
      rateLabel: 'Average Item Price',
      rateHint: 'Typical menu item price',
      hourlyLabel: 'Event Booking Rate',
      minimumLabel: 'Minimum Catering Order',
    },
    bakery: {
      rateLabel: 'Average Item Price',
      rateHint: 'Typical item price',
      hourlyLabel: 'Custom Cake Consultation Rate',
      minimumLabel: 'Minimum Order',
    },
  },
  first_event: {
    'private-chef': {
      title: 'Your First Booking',
      description:
        'Add an upcoming dinner event. This creates a draft you can flesh out with menus and client details.',
    },
    caterer: {
      title: 'Your First Event',
      description:
        'Log an upcoming catering event. Add details like guest count, location, and timeline.',
    },
    'meal-prep': {
      title: 'Your First Prep Order',
      description:
        'Create your first weekly prep order. Track meals, clients, and delivery schedule.',
    },
    'food-truck': {
      title: 'Your Next Stop',
      description:
        'Add your next scheduled location or event booking. Track where you will be and when.',
    },
  },
}

const DEFAULTS: Record<string, StepCopy> = {
  first_menu: {
    title: 'Your First Menu',
    description:
      'Type in a menu name and a few dishes. You can edit everything later, add recipes, set pricing, and build out full courses.',
    placeholder: 'e.g. Seared scallops with lemon butter',
  },
  pricing: {
    rateLabel: 'Per-Guest Rate',
    rateHint: 'Price per person',
    hourlyLabel: 'Hourly Rate',
    minimumLabel: 'Minimum Booking Amount',
  },
  first_event: {
    title: 'Your First Booking',
    description:
      'Add an upcoming event or booking. This creates a draft you can flesh out later with menus, pricing, and client details.',
  },
}

/**
 * Get archetype-specific copy for a wizard step.
 * Falls back to defaults for any missing fields.
 */
export function getStepCopy(stepKey: string, archetype: ArchetypeId | null): StepCopy {
  const defaults = DEFAULTS[stepKey] ?? {}
  if (!archetype) return defaults

  const overrides = STEP_COPY[stepKey]?.[archetype] ?? {}
  return { ...defaults, ...overrides }
}

/**
 * Archetype-specific completion screen copy.
 */
export function getCompletionCopy(archetype: ArchetypeId | null): {
  heading: string
  subtext: string
  nextSteps: Array<{ label: string; href: string }>
} {
  const label = archetype
    ? ({
        'private-chef': 'Private Chef',
        caterer: 'Caterer',
        'meal-prep': 'Meal Prep',
        restaurant: 'Restaurant',
        'food-truck': 'Food Truck',
        bakery: 'Bakery',
      }[archetype] ?? 'Chef')
    : 'Chef'

  const nextSteps: Record<string, Array<{ label: string; href: string }>> = {
    'private-chef': [
      { label: 'Add your first client', href: '/clients/new' },
      { label: 'Build a tasting menu', href: '/menus/new' },
      { label: 'Check your inbox', href: '/inbox' },
    ],
    caterer: [
      { label: 'Add your team', href: '/staff' },
      { label: 'Create an event', href: '/events/new' },
      { label: 'Import clients', href: '/clients' },
    ],
    'meal-prep': [
      { label: 'Add your first client', href: '/clients/new' },
      { label: 'Set up your schedule', href: '/schedule' },
      { label: 'Create a prep order', href: '/events/new' },
    ],
    restaurant: [
      { label: 'Set up your stations', href: '/stations' },
      { label: 'Add your staff', href: '/staff' },
      { label: 'Open the register', href: '/commerce/register' },
    ],
    'food-truck': [
      { label: 'Plan your next stop', href: '/schedule' },
      { label: 'Set up your menu board', href: '/menus/new' },
      { label: 'Open the register', href: '/commerce/register' },
    ],
    bakery: [
      { label: 'Add your products', href: '/menus/new' },
      { label: 'Set up your schedule', href: '/schedule' },
      { label: 'Add your first client', href: '/clients/new' },
    ],
  }

  return {
    heading: `Your ${label} workspace is ready`,
    subtext: `ChefFlow is set up for your ${label.toLowerCase()} workflow. Here are some things you can do next, or explore on your own.`,
    nextSteps: (archetype && nextSteps[archetype]) || nextSteps['private-chef'],
  }
}
