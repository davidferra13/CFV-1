'use client'

// Platform Response Drafter
// Generates an AI draft response for marketplace platform leads (TAC, PCM, etc.)
// ChefFlow cannot send on the chef's behalf - the chef copies and pastes on the platform.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { draftResponseForInquiry } from '@/lib/ai/correspondence'
import { CheckCircle, Copy, ExternalLink, Sparkles } from '@/components/ui/icons'

const PLATFORM_LABELS: Record<string, string> = {
  take_a_chef: 'Take a Chef',
  private_chef_manager: 'Private Chef Manager',
  yhangry: 'Yhangry',
  bark: 'Bark',
  thumbtack: 'Thumbtack',
  cozymeal: 'Cozymeal',
  gigsalad: 'GigSalad',
  theknot: 'The Knot',
  hireachef: 'Hire a Chef',
  cuisineist: 'Cuisineist',
}

interface PlatformResponseDrafterProps {
  inquiryId: string
  channel: string
  externalLink: string | null
}

export function PlatformResponseDrafter({
  inquiryId,
  channel,
  externalLink,
}: PlatformResponseDrafterProps) {
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platformLabel = PLATFORM_LABELS[channel] ?? channel

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await draftResponseForInquiry(inquiryId)
      let body = result.draft
      const subjectMatch = body.match(/^Subject:\s*.+?(?:\n\n|\r\n\r\n)/)
      if (subjectMatch) body = body.slice(subjectMatch[0].length).trim()
      setDraft(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!draft) return
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-brand-400" />
          Draft a response for {platformLabel}
        </CardTitle>
        <p className="mt-1 text-sm text-stone-400">
          ChefFlow generates the response. You copy it and paste it directly on {platformLabel}.
          ChefFlow cannot send on your behalf.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!draft ? (
          <Button onClick={handleGenerate} disabled={loading} variant="secondary">
            {loading ? 'Drafting response...' : 'Generate draft response'}
          </Button>
        ) : (
          <>
            <textarea
              className="min-h-[180px] w-full resize-y rounded-lg border border-stone-700 bg-stone-950 p-3 font-mono text-sm text-stone-100 focus:border-stone-500 focus:outline-none"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCopy} variant="primary">
                {copied ? (
                  <>
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Copied to clipboard
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" />
                    Copy response
                  </>
                )}
              </Button>
              {externalLink && (
                <a
                  href={externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-stone-600 hover:bg-stone-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {platformLabel}
                </a>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(null)
                  setError(null)
                }}
              >
                Regenerate
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-stone-500">
                Now open {platformLabel} and paste the response into the reply field.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
