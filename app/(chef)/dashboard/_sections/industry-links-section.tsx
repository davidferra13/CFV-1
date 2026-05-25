'use client'

import { ExitLinkButton } from '@/components/exit-links/ExitLinkButton'

/**
 * Small "Industry & Research" cluster of exit links on the dashboard.
 * Exit 54: Read on Eater (+ Bon Appetit, Food & Wine sublinks)
 * Exit 85: Read industry news
 * Exit 10: Research market rates (+ Bark sublink)
 * Exit 76: Edit photos on Canva
 * Exit 45: Book commissary time (contextKeys: commissaryUrl)
 */
export function IndustryLinksSection() {
  const ctx: Record<string, string> = {}

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <ExitLinkButton exitId={92} context={ctx} />
        <ExitLinkButton exitId={54} context={ctx} />
        <ExitLinkButton exitId={85} context={ctx} />
        <ExitLinkButton exitId={10} context={ctx} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
          Creative & Kitchen
        </span>
        <ExitLinkButton exitId={76} context={ctx} />
        <ExitLinkButton exitId={45} context={ctx} />
      </div>
    </div>
  )
}
