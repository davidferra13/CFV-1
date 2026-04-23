'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { overrideReadinessForTransition, type ReadinessResult } from '@/lib/events/readiness'

type ReadinessAwareDocumentButtonProps = {
  eventId: string
  href: string
  label: string
  readiness: ReadinessResult | null
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function appendReturnTo(route: string, returnTo: string) {
  const separator = route.includes('?') ? '&' : '?'
  return `${route}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

export function ReadinessAwareDocumentButton({
  eventId,
  href,
  label,
  readiness,
  variant = 'primary',
  size = 'md',
  className,
}: ReadinessAwareDocumentButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const returnTo = (() => {
    const query = searchParams.toString()
    return `${pathname}${query ? `?${query}` : ''}`
  })()

  function openDocument(override = false) {
    const url = new URL(href, window.location.origin)
    if (override) {
      url.searchParams.set('readinessOverride', '1')
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  async function handleClick() {
    if (
      readiness &&
      (readiness.counts.blockers > 0 || readiness.counts.risks > 0 || readiness.counts.stale > 0)
    ) {
      setOpen(true)
      return
    }

    openDocument(false)
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const hasBlockers = Boolean(readiness && readiness.counts.blockers > 0)
      if (hasBlockers) {
        await overrideReadinessForTransition(eventId, 'documents')
      }
      openDocument(hasBlockers)
      if (hasBlockers) {
        router.refresh()
      }
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to override readiness blockers')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => void handleClick()}
      >
        {label}
      </Button>

      <ConfirmModal
        open={open}
        title={
          readiness?.counts.blockers
            ? 'Document packet needs an explicit override'
            : 'Open document packet with current readiness signal?'
        }
        description={
          readiness
            ? `Confidence ${readiness.confidence}%. ${readiness.counts.blockers} blockers, ${readiness.counts.risks} risks, ${readiness.counts.stale} stale.`
            : undefined
        }
        confirmLabel={readiness?.counts.blockers ? 'Override and Open' : 'Open Anyway'}
        cancelLabel="Go Back"
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          void handleConfirm()
        }}
        maxWidth="max-w-xl"
      >
        {readiness ? (
          <div className="space-y-2">
            {readiness.gates
              .filter((gate) => gate.status !== 'verified')
              .map((gate) => (
                <div
                  key={gate.gate}
                  className="rounded border border-stone-800 bg-stone-950/60 px-3 py-2"
                >
                  <p className="text-sm font-medium text-stone-100">{gate.label}</p>
                  <p className="mt-1 text-sm text-stone-400">{gate.details || gate.description}</p>
                  <div className="mt-2">
                    <Button
                      href={appendReturnTo(gate.verifyRoute, returnTo)}
                      variant="ghost"
                      size="sm"
                    >
                      {gate.ctaLabel}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </ConfirmModal>
    </>
  )
}
