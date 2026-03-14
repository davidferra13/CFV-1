'use client'

import { Cpu, FlaskConical } from 'lucide-react'

/**
 * Subtle badge showing whether a result was produced by deterministic formula or AI.
 * Used in AI-enhanced panels (allergen risk, pricing, temp safety, etc.)
 */
export function AiSourceBadge({ source }: { source?: 'formula' | 'ai' }) {
  if (!source) return null

  if (source === 'formula') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-stone-500"
        title="Result produced by deterministic formula (no AI)"
      >
        <Cpu className="w-3 h-3" />
        Formula
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-violet-400"
      title="Result enhanced by local AI (Ollama)"
    >
      <FlaskConical className="w-3 h-3" />
      AI
    </span>
  )
}
