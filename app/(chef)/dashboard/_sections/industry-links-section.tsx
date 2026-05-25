'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'

/**
 * Small "Industry & Research" cluster of exit links on the dashboard.
 * Exit 54: Read on Eater (+ Bon Appetit, Food & Wine sublinks)
 * Exit 85: Read industry news
 * Exit 10: Research market rates (+ Bark sublink)
 */
export function IndustryLinksSection() {
  const ctx: Record<string, string> = {}

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExitLinkButton exitId={54} context={ctx} />
      <ExitLinkButton exitId={85} context={ctx} />
      <ExitLinkButton exitId={10} context={ctx} />
    </div>
  )
}
