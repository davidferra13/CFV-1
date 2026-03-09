'use client'

import { useEffect, useState } from 'react'
import { DownloadableQrCard } from '@/components/qr/downloadable-qr-card'

export type QrLinkSelectorOption = {
  id: string
  label: string
  description?: string | null
  url: string
  downloadBaseName: string
  printTitle?: string
  printSubtitle?: string
}

type QrLinkSelectorProps = {
  title: string
  description?: string | null
  fieldLabel: string
  options: QrLinkSelectorOption[]
  emptyMessage?: string
}

export function QrLinkSelector({
  title,
  description,
  fieldLabel,
  options,
  emptyMessage = 'Nothing is available to generate a QR code yet.',
}: QrLinkSelectorProps) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? '')

  useEffect(() => {
    if (!options.length) {
      setSelectedId('')
      return
    }

    const selectedStillExists = options.some((option) => option.id === selectedId)
    if (!selectedStillExists) {
      setSelectedId(options[0].id)
    }
  }, [options, selectedId])

  if (!options.length) {
    return (
      <div className="rounded-xl border border-dashed border-stone-700 bg-stone-900/40 p-5">
        <h3 className="text-base font-semibold text-stone-100">{title}</h3>
        {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
        <p className="mt-4 text-sm text-stone-500">{emptyMessage}</p>
      </div>
    )
  }

  const selected = options.find((option) => option.id === selectedId) ?? options[0]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-100">{title}</h3>
        {description && <p className="mt-1 text-sm text-stone-400">{description}</p>}
      </div>

      {options.length > 1 && (
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-stone-500">
            {fieldLabel}
          </span>
          <select
            value={selected.id}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <DownloadableQrCard
        url={selected.url}
        title={selected.label}
        description={selected.description}
        downloadBaseName={selected.downloadBaseName}
        printTitle={selected.printTitle}
        printSubtitle={selected.printSubtitle}
      />
    </div>
  )
}
