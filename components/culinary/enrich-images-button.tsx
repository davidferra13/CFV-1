'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { enrichIngredientImages } from '@/lib/ingredients/image-actions'
import { useRouter } from 'next/navigation'

export function EnrichImagesButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  function handleEnrich() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await enrichIngredientImages()
        if (res.success) {
          if (res.matched === 0 && res.alreadyHaveImage > 0) {
            setResult(`All ${res.alreadyHaveImage} ingredients already have images`)
          } else if (res.matched === 0 && res.unmatched === 0) {
            setResult('No ingredients to enrich')
          } else {
            setResult(`${res.matched} images found, ${res.unmatched} unmatched`)
          }
          router.refresh()
        } else {
          setResult(res.error || 'Failed to enrich images')
        }
      } catch {
        setResult('Failed to connect to catalog')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleEnrich} disabled={isPending}>
        {isPending ? 'Finding images...' : 'Find Images'}
      </Button>
      {result && <span className="text-xs text-stone-400">{result}</span>}
    </div>
  )
}
