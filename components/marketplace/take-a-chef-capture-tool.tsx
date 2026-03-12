'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  TAKE_A_CHEF_PAGE_CAPTURE_TYPES,
  buildTakeAChefCaptureBookmarklet,
  guessTakeAChefPageCaptureType,
  type TakeAChefBookmarkletPayload,
  type TakeAChefPageCaptureType,
} from '@/lib/integrations/take-a-chef-page-capture'
import { saveTakeAChefPageCapture } from '@/lib/integrations/take-a-chef-page-capture-actions'

const CAPTURE_TYPE_OPTIONS = TAKE_A_CHEF_PAGE_CAPTURE_TYPES.map((value) => ({
  value,
  label:
    value === 'guest_contact'
      ? 'Guest Contact'
      : value === 'other'
        ? 'Other'
        : value.charAt(0).toUpperCase() + value.slice(1),
}))

function isBookmarkletPayload(value: unknown): value is TakeAChefBookmarkletPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    payload.__chefFlowMarketplaceCapture === true &&
    payload.version === 1 &&
    typeof payload.url === 'string' &&
    typeof payload.title === 'string' &&
    typeof payload.text === 'string' &&
    Array.isArray(payload.links)
  )
}

export function TakeAChefCaptureTool() {
  const searchParams = useSearchParams()
  const [captureType, setCaptureType] = useState<TakeAChefPageCaptureType>('other')
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [pageText, setPageText] = useState('')
  const [pageLinks, setPageLinks] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    inquiryId?: string
    eventId?: string | null
    inquiryCreated?: boolean
    summary?: string
  } | null>(null)
  const [pending, startTransition] = useTransition()

  const bookmarkletHref = useMemo(() => {
    if (typeof window === 'undefined') return '#'
    return buildTakeAChefCaptureBookmarklet(window.location.origin)
  }, [])

  useEffect(() => {
    if (!searchParams || searchParams.get('source') !== 'bookmarklet') return
    try {
      const parsed = JSON.parse(window.name || 'null')
      if (!isBookmarkletPayload(parsed)) return

      setPageUrl(parsed.url)
      setPageTitle(parsed.title)
      setPageText(parsed.text)
      setPageLinks(parsed.links.filter((value): value is string => typeof value === 'string'))
      setCaptureType(
        guessTakeAChefPageCaptureType({ pageTitle: parsed.title, pageText: parsed.text })
      )
      setMessage(`Captured ${parsed.title || 'page'} from bookmarklet.`)
      window.name = ''
    } catch {
      window.name = ''
    }
  }, [searchParams])

  const handleCopyBookmarklet = async () => {
    if (bookmarkletHref === '#') return
    await navigator.clipboard.writeText(bookmarkletHref)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const response = await saveTakeAChefPageCapture({
          captureType,
          pageUrl,
          pageTitle,
          pageText,
          pageLinks,
          notes,
        })

        if (!response.success) {
          setError(response.error || 'Failed to save page capture')
          return
        }

        setResult({
          inquiryId: response.inquiryId,
          eventId: response.eventId,
          inquiryCreated: response.inquiryCreated,
          summary: response.summary,
        })
        setMessage(response.summary || 'Marketplace page saved to ChefFlow.')
      } catch (err) {
        console.error('[take-a-chef-capture] Save failed:', err)
        setError('Something went wrong saving the capture. Please try again.')
      }
    })
  }

  const canSave = pageUrl.trim().length > 0 && pageText.trim().length >= 20

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bookmarklet Capture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" title="How this works">
            Open the request or booking inside any marketplace (Private Chef Manager, Take a Chef,
            Yhangry, Cozymeal, Bark, etc.), click the bookmarklet, then review the captured page
            here before saving it onto the matching inquiry in ChefFlow.
          </Alert>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={bookmarkletHref}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              ChefFlow Capture
            </a>
            <Button variant="secondary" onClick={handleCopyBookmarklet}>
              {copied ? 'Copied' : 'Copy Bookmarklet Code'}
            </Button>
            <span className="text-sm text-stone-400">
              Drag the button to your bookmarks bar, or copy the code and save it as a bookmark.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review Captured Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Capture Type"
              value={captureType}
              onChange={(event) => setCaptureType(event.target.value as TakeAChefPageCaptureType)}
              options={CAPTURE_TYPE_OPTIONS}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-300">Page URL</label>
              <input
                type="url"
                value={pageUrl}
                onChange={(event) => setPageUrl(event.target.value)}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="https://www.privatechefmanager.com/..."
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">Page Title</label>
            <input
              type="text"
              value={pageTitle}
              onChange={(event) => setPageTitle(event.target.value)}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Private Chef Manager booking page"
            />
          </div>

          <Textarea
            label="Captured Page Text"
            value={pageText}
            onChange={(event) => setPageText(event.target.value)}
            rows={14}
            helperText="ChefFlow uses this to match the page to the right inquiry and extract useful booking context."
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            helperText="Optional operator notes about what you saw on the page."
          />

          <div className="flex flex-wrap items-center gap-2">
            {pageLinks.length > 0 && (
              <Badge variant="default">{pageLinks.length} TAC links captured</Badge>
            )}
            {pageTitle && (
              <Badge variant="info">
                Guess: {guessTakeAChefPageCaptureType({ pageTitle, pageText }).replace('_', ' ')}
              </Badge>
            )}
          </div>

          {error && (
            <Alert variant="error" title="Capture failed">
              {error}
            </Alert>
          )}

          {message && (
            <Alert variant="success" title="Capture ready">
              {message}
            </Alert>
          )}

          {result?.inquiryId && (
            <div className="flex flex-wrap gap-3">
              <Link href={`/inquiries/${result.inquiryId}`}>
                <Button>Open Inquiry</Button>
              </Link>
              {result.eventId && (
                <Link href={`/events/${result.eventId}`}>
                  <Button variant="secondary">Open Event</Button>
                </Link>
              )}
              <Link href="/dashboard/marketplace">
                <Button variant="ghost">Back to Marketplace</Button>
              </Link>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={!canSave || pending}>
              {pending ? 'Saving...' : 'Save Page Capture'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null)
                setMessage(null)
                setError(null)
                setPageUrl('')
                setPageTitle('')
                setPageText('')
                setPageLinks([])
                setNotes('')
                setCaptureType('other')
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
