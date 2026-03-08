// Event Plating Guides Panel
// Shows all plating guides for recipes used in an event's menu

'use client'

import { Card } from '@/components/ui/card'
import { PlatingGuideCard } from '@/components/recipes/plating-guide'
import type { PlatingGuide } from '@/lib/recipes/plating-actions'

interface EventPlatingGuidesPanelProps {
  guides: PlatingGuide[]
}

export function EventPlatingGuidesPanel({ guides }: EventPlatingGuidesPanelProps) {
  if (guides.length === 0) return null

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Plating Guides</h2>
      <p className="text-sm text-stone-500 mb-4">
        Visual presentation instructions for this event's menu dishes.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {guides.map((guide) => (
          <PlatingGuideCard
            key={guide.id}
            guide={guide}
            showActions={false}
          />
        ))}
      </div>
    </Card>
  )
}
