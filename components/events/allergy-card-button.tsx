// Emergency Allergy Card Button
// Generates and opens a printable allergy card PDF in a new tab.
// Only renders if the event has allergy or dietary restriction data.

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type AllergyCardButtonProps = {
  eventId: string
  hasAllergyData: boolean
}

export function AllergyCardButton({ eventId, hasAllergyData }: AllergyCardButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!hasAllergyData) return null

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/documents/${eventId}?type=allergy-card`
      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.error ?? 'Failed to generate allergy card'
        setError(message)
        toast.error(message)
        return
      }

      // Open the PDF in a new tab
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate allergy card'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button variant="danger" size="sm" loading={loading} onClick={handleClick}>
        Print Allergy Card
      </Button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
