'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import {
  generateServingLabels,
  getServingLabelCount,
} from '@/lib/documents/generate-serving-labels'
import type { LabelSize } from '@/lib/documents/generate-serving-labels'
import { toast } from 'sonner'

type ServingLabelsDialogProps = {
  eventId: string
  menuName?: string
  open: boolean
  onClose: () => void
}

const LABEL_SIZE_OPTIONS: { value: LabelSize; label: string; description: string }[] = [
  { value: '2x3', label: '2" x 3"', description: '6 labels per page' },
  { value: '2x4', label: '2" x 4"', description: '4 labels per page' },
  { value: 'full-page', label: 'Full Page', description: '1 label per page (large print)' },
]

export function ServingLabelsDialog({
  eventId,
  menuName,
  open,
  onClose,
}: ServingLabelsDialogProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>('2x3')
  const [labelCount, setLabelCount] = useState<number | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLoadingCount, setIsLoadingCount] = useState(false)

  // Fetch label count when dialog opens
  useEffect(() => {
    if (!open) return
    setIsLoadingCount(true)
    setCountError(null)

    getServingLabelCount(eventId)
      .then((result) => {
        if ('error' in result) {
          setCountError(result.error)
          setLabelCount(null)
        } else {
          setLabelCount(result.count)
          setCountError(null)
        }
      })
      .catch(() => {
        setCountError('Failed to load label count.')
        setLabelCount(null)
      })
      .finally(() => setIsLoadingCount(false))
  }, [open, eventId])

  function handleGenerate() {
    startTransition(async () => {
      try {
        const result = await generateServingLabels(eventId, labelSize)

        if ('error' in result) {
          toast.error(result.error)
          return
        }

        // Trigger download
        const link = document.createElement('a')
        link.href = result.pdf
        link.download = `serving-labels-${labelSize}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success(
          `Generated ${result.labelCount} serving label${result.labelCount === 1 ? '' : 's'}`
        )
        onClose()
      } catch (err) {
        toast.error('Failed to generate serving labels. Please try again.')
      }
    })
  }

  const selectedOption = LABEL_SIZE_OPTIONS.find((o) => o.value === labelSize)
  const pagesNeeded =
    labelCount !== null && selectedOption
      ? Math.ceil(labelCount / (labelSize === '2x3' ? 6 : labelSize === '2x4' ? 4 : 1))
      : null

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      title="Serving Labels"
      description={
        menuName
          ? `Generate labels for: ${menuName}`
          : 'Generate printable serving labels for this event'
      }
      widthClassName="max-w-sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleGenerate}
            disabled={isPending || labelCount === null || labelCount === 0}
          >
            {isPending ? 'Generating...' : 'Generate PDF'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Label count preview */}
        <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          {isLoadingCount ? (
            <span>Loading dish count...</span>
          ) : countError ? (
            <span className="text-red-600">{countError}</span>
          ) : labelCount !== null ? (
            <span>
              <strong>{labelCount}</strong> label{labelCount === 1 ? '' : 's'} will be generated
              {pagesNeeded !== null && (
                <>
                  {' '}
                  ({pagesNeeded} page{pagesNeeded === 1 ? '' : 's'})
                </>
              )}
            </span>
          ) : null}
        </div>

        {/* Label size selector */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-700">Label Size</legend>
          <div className="space-y-2">
            {LABEL_SIZE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  labelSize === option.value
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="labelSize"
                  value={option.value}
                  checked={labelSize === option.value}
                  onChange={() => setLabelSize(option.value)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    labelSize === option.value
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-stone-300'
                  }`}
                >
                  {labelSize === option.value && (
                    <div className="mx-auto mt-0.5 h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-stone-800">{option.label}</div>
                  <div className="text-xs text-stone-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Info note */}
        <p className="text-xs text-stone-400">
          Labels include dish name, course, allergens, prep date, and reheating notes (when
          available). Print on adhesive label sheets or plain paper and cut along the dashed lines.
        </p>
      </div>
    </AccessibleDialog>
  )
}
