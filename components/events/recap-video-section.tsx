'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Video, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

type RecapStatus = 'not_started' | 'pending' | 'rendering' | 'done' | 'failed'

interface RecapVideoSectionProps {
  eventId: string
  mode?: 'chef' | 'client'
  className?: string
}

export function RecapVideoSection({ eventId, mode = 'chef', className }: RecapVideoSectionProps) {
  const [status, setStatus] = useState<RecapStatus>('not_started')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusUrl = `/api/events/${eventId}/render-recap`
  const downloadUrl = `/api/events/${eventId}/recap-video`

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(statusUrl)
      if (!res.ok) return
      const data = (await res.json()) as { status: RecapStatus }
      setStatus(data.status)
      return data.status
    } catch {
      return null
    }
  }, [statusUrl])

  // Initial status check
  useEffect(() => {
    fetchStatus().then((s) => {
      setChecking(false)
      if (s === 'pending' || s === 'rendering') {
        startPolling()
      }
    })
  }, [fetchStatus])

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const s = await fetchStatus()
      if (s === 'done' || s === 'failed' || s === 'not_started') {
        stopPolling()
      }
    }, 4000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => stopPolling(), [])

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(statusUrl, { method: 'POST' })
      if (!res.ok) return
      const data = (await res.json()) as { status: RecapStatus }
      setStatus(data.status)
      if (data.status === 'pending' || data.status === 'rendering') {
        startPolling()
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleRetry() {
    setStatus('not_started')
    await handleGenerate()
  }

  if (checking) return null

  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-stone-500" />
        <p className="text-sm font-medium text-stone-700">Recap Video</p>
      </div>

      <p className="text-xs text-stone-500">
        {status === 'not_started' && 'Generate a shareable 15-second recap video of this event.'}
        {(status === 'pending' || status === 'rendering') &&
          'Rendering your recap video. This usually takes 1-2 minutes.'}
        {status === 'done' && 'Your recap video is ready to download.'}
        {status === 'failed' &&
          'The recap video could not be rendered. Try again or contact support.'}
      </p>

      {status === 'not_started' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          Generate Recap Video
        </Button>
      )}

      {(status === 'pending' || status === 'rendering') && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span>Rendering{status === 'rendering' ? '...' : ' (queued)...'}</span>
        </div>
      )}

      {status === 'done' && (
        <Button size="sm" variant="default" asChild className="gap-2">
          <a href={downloadUrl} download>
            <Download className="h-4 w-4" />
            Download Recap Video
          </a>
        </Button>
      )}

      {status === 'failed' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={loading}
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Retry
        </Button>
      )}
    </div>
  )
}
