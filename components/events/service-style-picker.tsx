'use client'

// Service Style Picker - grid of service style cards for event creation/edit.
// Shows staffing recommendations based on guest count and suggested equipment.

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  SERVICE_STYLE_TEMPLATES,
  calculateStaffing,
  recommendServiceStyle,
  type ServiceStyleTemplate,
  type ServiceStyleId,
} from '@/lib/events/service-style-templates'
import { applyServiceStyleToEvent } from '@/lib/events/service-style-actions'

interface ServiceStylePickerProps {
  /** Current event guest count for staffing calculations */
  guestCount: number
  /** Event ID to apply style to (if in event context) */
  eventId?: string
  /** Current selected style */
  currentStyleId?: string
  /** Called when style is selected (for form integration without server action) */
  onSelect?: (styleId: ServiceStyleId) => void
  /** Whether to show the "Apply to Event" button (requires eventId) */
  showApplyButton?: boolean
}

const STYLE_ICONS: Record<ServiceStyleId, string> = {
  plated_dinner: '\u{1F37D}\uFE0F',
  buffet: '\u{1F372}',
  family_style: '\u{1F957}',
  cocktail_reception: '\u{1F378}',
  stations: '\u{1F3EA}',
  drop_off: '\u{1F69A}',
}

export function ServiceStylePicker({
  guestCount,
  eventId,
  currentStyleId,
  onSelect,
  showApplyButton = false,
}: ServiceStylePickerProps) {
  const [selectedId, setSelectedId] = useState<ServiceStyleId | null>(
    (currentStyleId as ServiceStyleId) ?? null
  )
  const [expandedId, setExpandedId] = useState<ServiceStyleId | null>(null)
  const [applying, startApply] = useTransition()
  const [applyResult, setApplyResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const recommended = recommendServiceStyle(guestCount)

  function handleSelect(styleId: ServiceStyleId) {
    setSelectedId(styleId)
    onSelect?.(styleId)
  }

  function handleApply(styleId: ServiceStyleId) {
    if (!eventId) return

    const previousSelected = selectedId
    setSelectedId(styleId)
    setApplyResult(null)

    startApply(async () => {
      try {
        const result = await applyServiceStyleToEvent(eventId, styleId)
        if (result.success) {
          setApplyResult({
            success: true,
            message: `Applied ${SERVICE_STYLE_TEMPLATES.find((s) => s.id === styleId)?.name}. Recommended: ${result.staffing?.totalStaff} total staff.`,
          })
        } else {
          setSelectedId(previousSelected)
          setApplyResult({ success: false, message: result.error ?? 'Failed to apply style' })
        }
      } catch {
        setSelectedId(previousSelected)
        setApplyResult({ success: false, message: 'Failed to apply service style' })
      }
    })
  }

  return (
    <div className="space-y-4">
      {applyResult && (
        <Alert variant={applyResult.success ? 'default' : 'destructive'}>
          {applyResult.message}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SERVICE_STYLE_TEMPLATES.map((style) => {
          const staffing = calculateStaffing(guestCount, style.staffRatio)
          const isRecommended = style.id === recommended.id
          const isSelected = style.id === selectedId
          const isExpanded = style.id === expandedId
          const fitsGuests = guestCount >= style.minGuests && guestCount <= style.maxGuests

          return (
            <div
              key={style.id}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-brand-500 bg-brand-950/30'
                  : 'border-stone-700 bg-stone-900/50 hover:border-stone-600'
              } ${!fitsGuests ? 'opacity-60' : ''}`}
              onClick={() => handleSelect(style.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{STYLE_ICONS[style.id]}</span>
                  <h3 className="text-sm font-semibold text-stone-100">{style.name}</h3>
                </div>
                {isRecommended && fitsGuests && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 bg-brand-950 border border-brand-700 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </div>

              <p className="text-xs text-stone-400 mb-3">{style.description}</p>

              {/* Staffing recommendation */}
              <div className="flex gap-4 text-xs mb-2">
                {staffing.servers > 0 && (
                  <div>
                    <span className="text-stone-500">Servers: </span>
                    <span className="text-stone-200 font-medium">{staffing.servers}</span>
                  </div>
                )}
                <div>
                  <span className="text-stone-500">Kitchen: </span>
                  <span className="text-stone-200 font-medium">{staffing.kitchenStaff}</span>
                </div>
                <div>
                  <span className="text-stone-500">Total: </span>
                  <span className="text-stone-200 font-medium">{staffing.totalStaff}</span>
                </div>
              </div>

              {/* Guest range */}
              <p className="text-xs text-stone-500 mb-2">
                {style.minGuests}-{style.maxGuests} guests
                {style.typicalCourses > 0 ? ` / ${style.typicalCourses} courses` : ''}
                {!fitsGuests && <span className="text-amber-400 ml-1">(outside range)</span>}
              </p>

              {/* Expandable details */}
              <button
                type="button"
                className="text-xs text-brand-500 hover:text-brand-400 font-medium"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedId(isExpanded ? null : style.id)
                }}
              >
                {isExpanded ? 'Less' : 'Details'}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-stone-700/50 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-stone-300 mb-1">Equipment</p>
                    <div className="flex flex-wrap gap-1">
                      {style.suggestedEquipment.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-300 mb-1">Service Notes</p>
                    <p className="text-xs text-stone-400">{style.serviceNotes}</p>
                  </div>
                </div>
              )}

              {/* Apply button */}
              {showApplyButton && eventId && isSelected && (
                <div className="mt-3">
                  <Button
                    variant="primary"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      handleApply(style.id)
                    }}
                    disabled={applying}
                    className="w-full text-xs"
                  >
                    {applying ? 'Applying...' : 'Apply to Event'}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
