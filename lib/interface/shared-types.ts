/**
 * Cross-cutting action-layer types used by multiple domains.
 * Domain-specific task types and resolvers live in their source domains.
 */

export type SurfaceActionTone = 'brand' | 'sky' | 'emerald' | 'rose' | 'amber' | 'slate'

export type SurfaceActionTask = {
  id: string
  badge: string
  title: string
  description: string
  href: string
  ctaLabel: string
  tone: SurfaceActionTone
  context: string[]
  remainingCount: number
  remainingLabel?: string | null
}
