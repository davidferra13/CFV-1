'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { toast } from 'sonner'

const DEFAULT_TERMS_KEY = 'chefflow-default-proposal-terms'

const PLACEHOLDER_TERMS = `Payment Terms:
- 50% deposit required to confirm booking
- Remaining balance due 48 hours before the event
- Accepted payment methods: Venmo, Zelle, check, cash

Cancellation Policy:
- Cancellations 7+ days before the event: full deposit refund
- Cancellations 3-6 days before: 50% deposit refund
- Cancellations less than 72 hours: deposit is non-refundable

Dietary Disclaimers:
- Please disclose all allergies and dietary restrictions at time of booking
- Chef cannot guarantee a completely allergen-free environment
- Menu substitutions for dietary needs are available upon request

Liability:
- Chef carries liability insurance for all events
- Client is responsible for providing a safe, accessible kitchen
- Guest count changes must be communicated at least 48 hours in advance`

type DefaultTermsFormProps = {
  className?: string
}

export function DefaultTermsForm({ className }: DefaultTermsFormProps) {
  const [terms, setTerms] = useState('')
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_TERMS_KEY)
    if (saved) {
      setTerms(saved)
    }
    setHasLoaded(true)
  }, [])

  function handleSave() {
    localStorage.setItem(DEFAULT_TERMS_KEY, terms)
    toast.success('Default terms saved')
  }

  function handleLoadTemplate() {
    setTerms(PLACEHOLDER_TERMS)
    toast.info('Template loaded. Edit to match your business, then save.')
  }

  function handleClear() {
    setTerms('')
    localStorage.removeItem(DEFAULT_TERMS_KEY)
    toast.success('Default terms cleared')
  }

  if (!hasLoaded) {
    return null
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Default Proposal Terms</h3>
          <p className="text-sm text-gray-500 mb-3">
            These terms will be pre-filled when you create a Quick Proposal from an event. You can
            always edit them per-proposal before sending.
          </p>
        </div>

        <TiptapEditor
          value={terms}
          onChange={setTerms}
          minHeight={320}
          placeholder="Enter your default terms and conditions..."
          toolbar={['text', 'heading', 'list', 'insert']}
        />

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={handleSave}>
            Save Terms
          </Button>
          {!terms && (
            <Button variant="ghost" onClick={handleLoadTemplate}>
              Load Template
            </Button>
          )}
          {terms && (
            <Button variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Terms are stored locally in your browser. They persist across sessions but are not synced
          between devices.
        </p>
      </div>
    </div>
  )
}
