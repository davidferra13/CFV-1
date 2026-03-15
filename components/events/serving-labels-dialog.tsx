'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type ServingLabelsDialogProps = {
  eventId: string
}

export function ServingLabelsDialog({ eventId }: ServingLabelsDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [labelSize, setLabelSize] = useState<'2x3' | '2x4' | '3x5'>('2x3')
  const [includeReheating, setIncludeReheating] = useState(true)
  const [includeAllergens, setIncludeAllergens] = useState(true)
  const [prepDate, setPrepDate] = useState(() => new Date().toISOString().split('T')[0])
  const [shelfLifeDays, setShelfLifeDays] = useState(3)

  function handleGenerate() {
    const params = new URLSearchParams({
      type: 'labels',
      labelSize,
      includeReheating: String(includeReheating),
      includeAllergens: String(includeAllergens),
      prepDate,
      shelfLifeDays: String(shelfLifeDays),
    })

    window.open(`/api/documents/${eventId}?${params.toString()}`, '_blank')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        Print Serving Labels
      </Button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsOpen(false)} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Serving Labels</h3>
            <p className="text-sm text-stone-500 mt-1">
              Generate printable labels for each dish component. Print on standard letter paper and
              cut along the marks.
            </p>
          </div>

          {/* Label Size */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Label Size</label>
            <div className="flex gap-2">
              {(['2x3', '2x4', '3x5'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setLabelSize(size)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    labelSize === size
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {size === '2x3' ? '2" x 3"' : size === '2x4' ? '2" x 4"' : '3" x 5"'}
                </button>
              ))}
            </div>
          </div>

          {/* Prep Date */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date Prepared</label>
            <input
              type="date"
              value={prepDate}
              onChange={(e) => setPrepDate(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>

          {/* Shelf Life */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Shelf Life (days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={shelfLifeDays}
              onChange={(e) => setShelfLifeDays(Math.max(1, parseInt(e.target.value) || 3))}
              className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
            <p className="text-xs text-stone-400 mt-1">Use-by date = prep date + shelf life</p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAllergens}
                onChange={(e) => setIncludeAllergens(e.target.checked)}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-500"
              />
              Include allergen warnings
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReheating}
                onChange={(e) => setIncludeReheating(e.target.checked)}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-500"
              />
              Include reheating instructions
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleGenerate}>
              Generate Labels
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
