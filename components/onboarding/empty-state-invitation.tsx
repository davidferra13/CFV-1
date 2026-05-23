// EmptyStateInvitation - Warm, inviting empty states that guide chefs to action.
// Replaces dead-end blank pages with encouragement and a clear next step.
// Wraps the existing EmptyState component with wizard-aware defaults.

import { EmptyState, type RemyMood } from '@/components/ui/empty-state'

type EmptyStateInvitationProps = {
  /** What type of thing is missing (e.g., "events", "clients", "menus") */
  thing: string
  /** Encouraging subtitle */
  encouragement: string
  /** Primary action button */
  ctaLabel: string
  ctaHref: string
  /** Optional secondary link */
  secondaryLabel?: string
  secondaryHref?: string
  /** Remy mood for the illustration */
  remy?: RemyMood
}

const INVITATION_COPY: Record<string, { title: string; encouragement: string }> = {
  events: {
    title: 'No events yet',
    encouragement:
      'Every great dinner starts here. Create your first event and watch your business come alive.',
  },
  clients: {
    title: 'No clients yet',
    encouragement:
      'Your client book is ready. Add your first client to start building relationships.',
  },
  menus: {
    title: 'No menus yet',
    encouragement: 'Your culinary vision starts with a menu. Create one and bring your dishes to life.',
  },
  recipes: {
    title: 'No recipes yet',
    encouragement:
      'Your recipes are your intellectual property. Start documenting them before they stay locked in your head forever.',
  },
}

export function EmptyStateInvitation({
  thing,
  encouragement,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
  remy = 'pondering',
}: EmptyStateInvitationProps) {
  const copy = INVITATION_COPY[thing]
  const title = copy?.title || `No ${thing} yet`
  const desc = encouragement || copy?.encouragement || `Add your first ${thing} to get started.`

  return (
    <EmptyState
      remy={remy}
      title={title}
      description={desc}
      action={{ label: ctaLabel, href: ctaHref }}
      secondaryAction={
        secondaryLabel && secondaryHref
          ? { label: secondaryLabel, href: secondaryHref }
          : undefined
      }
    />
  )
}
