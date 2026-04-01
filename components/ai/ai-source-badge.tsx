'use client'

import { Cpu, FlaskConical } from '@/components/ui/icons'

/**
 * Subtle badge showing whether a result was produced by deterministic formula or AI.
 * Used in AI-enhanced panels (allergen risk, pricing, temp safety, etc.)
 */
export function AiSourceBadge({ source }: { source?: 'formula' | 'ai' }) {
  if (!source) return null

  if (source === 'formula') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xxs text-stone-500"
        title="Result produced by deterministic formula (no AI)"
      >
        <Cpu className="w-3 h-3" />
        Formula
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xxs text-violet-400"
      title="Result enhanced by AI"
    >
      <FlaskConical className="w-3 h-3" />
      AI
    </span>
  )
}
