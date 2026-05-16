// Quote From Menu Button
// Displayed when a client has selected a menu, allowing chef to review/send the auto-generated quote.
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from '@/components/ui/icons'

interface QuoteFromMenuButtonProps {
  inquiryId: string
  menuId: string
  menuTitle: string
  quoteId?: string | null
}

export function QuoteFromMenuButton({
  inquiryId,
  menuId,
  menuTitle,
  quoteId,
}: QuoteFromMenuButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuoteId, setGeneratedQuoteId] = useState<string | null>(quoteId || null)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/quotes/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, menuId }),
      })
      const data = await res.json()
      if (data.quoteId) {
        setGeneratedQuoteId(data.quoteId)
      }
    } catch {
      // Error handling
    } finally {
      setIsGenerating(false)
    }
  }

  if (generatedQuoteId) {
    return (
      <a href={`/quotes/${generatedQuoteId}`}>
        <Button variant="primary" size="sm" className="gap-1.5">
          <ArrowRight className="h-3.5 w-3.5" />
          Review Quote Draft
        </Button>
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Client selected: {menuTitle}</span>
      <Button
        variant="primary"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isGenerating ? 'Generating...' : 'Auto-Generate Quote'}
      </Button>
    </div>
  )
}
