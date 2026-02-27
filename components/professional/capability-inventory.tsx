'use client'

import { useTransition } from 'react'
import { upsertCapability } from '@/lib/professional/capability-actions'

interface CapabilityRow {
  capability_type: string
  capability_key: string
  confidence: string
  notes: string | null
}

interface CapabilityInventoryProps {
  capabilities: CapabilityRow[]
}

const SECTIONS: Array<{
  type: string
  label: string
  keys: string[]
}> = [
  {
    type: 'cuisine',
    label: 'Cuisine Styles',
    keys: [
      'Italian',
      'French',
      'Japanese',
      'Indian',
      'Mediterranean',
      'Mexican',
      'American',
      'Thai',
      'Chinese',
      'Latin American',
      'Middle Eastern',
      'Korean',
      'Other',
    ],
  },
  {
    type: 'dietary',
    label: 'Dietary Specialties',
    keys: [
      'Vegan',
      'Vegetarian',
      'Gluten-Free',
      'Kosher',
      'Halal',
      'Paleo',
      'Keto',
      'Nut-Free',
      'Dairy-Free',
    ],
  },
  {
    type: 'service_size',
    label: 'Service Size',
    keys: [
      'Intimate (1-8)',
      'Small Group (9-20)',
      'Medium (21-50)',
      'Large (51-100)',
      'Event (100+)',
    ],
  },
  {
    type: 'technique',
    label: 'Techniques',
    keys: [
      'Butchery',
      'Pastry & Baking',
      'Charcuterie',
      'Fermentation',
      'Molecular Gastronomy',
      'Fire/Grill',
      'Raw Fish/Sushi',
      'Sauce Work',
      'Foraging',
    ],
  },
]

const CONFIDENCE_OPTIONS = [
  {
    value: 'expert',
    label: 'Expert',
    color: 'bg-green-900 text-green-800 border-green-300 hover:bg-green-200',
  },
  {
    value: 'proficient',
    label: 'Proficient',
    color: 'bg-blue-900 text-blue-800 border-blue-300 hover:bg-blue-200',
  },
  {
    value: 'learning',
    label: 'Learning',
    color: 'bg-amber-900 text-amber-800 border-amber-300 hover:bg-amber-200',
  },
  {
    value: 'not_my_specialty',
    label: 'Not My Specialty',
    color: 'bg-stone-800 text-stone-300 border-stone-600 hover:bg-stone-700',
  },
]

function confidenceSelected(value: string): string {
  switch (value) {
    case 'expert':
      return 'bg-green-600 text-white border-green-700'
    case 'proficient':
      return 'bg-blue-600 text-white border-blue-700'
    case 'learning':
      return 'bg-amber-500 text-white border-amber-600'
    case 'not_my_specialty':
      return 'bg-stone-8000 text-white border-stone-600'
    default:
      return ''
  }
}

function CapabilityItem({
  capabilityType,
  capabilityKey,
  currentConfidence,
}: {
  capabilityType: string
  capabilityKey: string
  currentConfidence: string | undefined
}) {
  const [, startTransition] = useTransition()

  function handleSelect(confidence: string) {
    startTransition(async () => {
      await upsertCapability({
        capability_type: capabilityType,
        capability_key: capabilityKey,
        confidence,
      })
    })
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-stone-800 last:border-0">
      <span className="text-sm font-medium text-stone-300 sm:w-44 shrink-0">{capabilityKey}</span>
      <div className="flex flex-wrap gap-1">
        {CONFIDENCE_OPTIONS.map((opt) => {
          const isSelected = currentConfidence === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                isSelected ? confidenceSelected(opt.value) : opt.color
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CapabilityInventory({ capabilities }: CapabilityInventoryProps) {
  // Build lookup map
  const confidenceMap: Record<string, string> = {}
  for (const cap of capabilities) {
    confidenceMap[cap.capability_key] = cap.confidence
  }

  return (
    <div className="space-y-8">
      {SECTIONS.map((section) => (
        <div
          key={section.type}
          className="bg-stone-900 rounded-xl border border-stone-700 shadow-sm"
        >
          <div className="px-6 py-4 border-b border-stone-800">
            <h2 className="text-base font-semibold text-stone-100">{section.label}</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Click to rate your confidence level for each item.
            </p>
          </div>
          <div className="px-6 py-2 divide-y divide-stone-50">
            {section.keys.map((key) => (
              <CapabilityItem
                key={key}
                capabilityType={section.type}
                capabilityKey={key}
                currentConfidence={confidenceMap[key]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
