import type { ArchetypeId } from '@/lib/archetypes/presets'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'

export type SmartSuggestion = {
  id: string
  title: string
  description: string
  href: string
  relevance: 'high' | 'medium'
  reason: string
}

export function getSmartSuggestions(
  archetype: ArchetypeId | null,
  progress: OnboardingProgress
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  const { secondarySetup } = progress

  // Archetype-specific high-relevance suggestions
  if (archetype === 'private-chef' && !secondarySetup.recipesAdded) {
    suggestions.push({
      id: 'recipe-import',
      title: 'Add your first recipes',
      description: 'Document the dishes you cook most so menus and prep lists build themselves.',
      href: '/culinary/recipes/new',
      relevance: 'high',
      reason: 'Most private chefs set this up in their first week',
    })
  }

  if (archetype === 'caterer' && !secondarySetup.staffAdded) {
    suggestions.push({
      id: 'staff-setup',
      title: 'Add your team',
      description: 'Set up sous chefs, servers, and assistants with roles and rates.',
      href: '/onboarding/staff',
      relevance: 'high',
      reason: 'Caterers with staff save hours on event coordination',
    })
  }

  // Cross-archetype: has clients but no events
  if (
    secondarySetup.clientsCount > 0 &&
    progress.steps.find((s) => s.key === 'event_created' && !s.done)
  ) {
    suggestions.push({
      id: 'first-event',
      title: 'Create your first event',
      description: 'Turn a client relationship into a scheduled booking with prep and billing.',
      href: '/events/new',
      relevance: 'high',
      reason: `You have ${secondarySetup.clientsCount} client${secondarySetup.clientsCount > 1 ? 's' : ''} but no events yet`,
    })
  }

  // Loyalty suggestion when enough clients exist
  if (!secondarySetup.loyaltyConfigured && secondarySetup.clientsCount >= 3) {
    suggestions.push({
      id: 'loyalty-program',
      title: 'Set up loyalty rewards',
      description: 'Reward repeat clients automatically to increase retention.',
      href: '/onboarding/loyalty',
      relevance: 'medium',
      reason: `You have ${secondarySetup.clientsCount} clients; loyalty keeps them coming back`,
    })
  }

  // Meal-prep specific: recurring templates
  if (archetype === 'meal-prep') {
    suggestions.push({
      id: 'recurring-templates',
      title: 'Create recurring event templates',
      description: 'Set up weekly delivery schedules that auto-generate prep lists.',
      href: '/events/new',
      relevance: 'medium',
      reason: 'Meal prep chefs save time with repeating templates',
    })
  }

  // Calendar setup (if no events exist at all)
  const eventStep = progress.steps.find((s) => s.key === 'event_created')
  if (eventStep && !eventStep.done) {
    suggestions.push({
      id: 'calendar-setup',
      title: 'Set up your calendar',
      description: 'Configure availability windows so clients can see when you are bookable.',
      href: '/calendar',
      relevance: 'medium',
      reason: 'Chefs who set availability get booked faster',
    })
  }

  // Payment config (if no invoice exists)
  const invoiceStep = progress.steps.find((s) => s.key === 'invoice_ready')
  if (invoiceStep && !invoiceStep.done) {
    suggestions.push({
      id: 'payment-config',
      title: 'Configure payment settings',
      description: 'Set up invoicing defaults so you can bill clients in one click.',
      href: '/settings/payments',
      relevance: 'medium',
      reason: 'Get paid faster with pre-configured billing',
    })
  }

  // Sort by relevance (high first), then cap at 4
  suggestions.sort((a, b) => {
    if (a.relevance === 'high' && b.relevance === 'medium') return -1
    if (a.relevance === 'medium' && b.relevance === 'high') return 1
    return 0
  })

  return suggestions.slice(0, 4)
}
