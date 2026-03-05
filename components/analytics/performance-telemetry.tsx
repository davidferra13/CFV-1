'use client'

import { useEffect, useMemo, useRef } from 'react'
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

type WebVitalMetric = {
  id: string
  name: string
  value: number
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
  navigationType?: string
}

type PendingTransition = {
  from: string
  to: string
  startedAt: number
}

function toRoute(pathname: string | null, searchParams: ReadonlyURLSearchParams | null): string {
  const path = pathname || '/'
  const query = searchParams?.toString() || ''
  return query ? `${path}?${query}` : path
}

function round(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0
}

export function PerformanceTelemetry(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const route = useMemo(() => toRoute(pathname, searchParams), [pathname, searchParams])

  const pendingTransitionRef = useRef<PendingTransition | null>(null)
  const trackedMetricsRef = useRef<Set<string>>(new Set())

  useReportWebVitals((metric: WebVitalMetric) => {
    const metricKey = `${metric.id}:${metric.name}`
    if (trackedMetricsRef.current.has(metricKey)) return
    trackedMetricsRef.current.add(metricKey)

    trackEvent(ANALYTICS_EVENTS.PERF_WEB_VITAL, {
      metric_name: metric.name,
      metric_value: round(metric.value),
      metric_delta: round(metric.delta),
      metric_rating: metric.rating,
      navigation_type: metric.navigationType || 'unknown',
      route,
    })
  })

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const clicked = event.target as HTMLElement | null
      const anchor = clicked?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank') return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (url.origin !== window.location.origin) return

      const nextRoute = `${url.pathname}${url.search}`
      if (nextRoute === route) return

      pendingTransitionRef.current = {
        from: route,
        to: nextRoute,
        startedAt: performance.now(),
      }
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [route])

  useEffect(() => {
    const pending = pendingTransitionRef.current
    if (!pending || pending.to !== route) return

    const durationMs = Math.max(0, performance.now() - pending.startedAt)

    trackEvent(ANALYTICS_EVENTS.PERF_ROUTE_TRANSITION, {
      from_route: pending.from,
      to_route: pending.to,
      duration_ms: Math.round(durationMs),
    })

    pendingTransitionRef.current = null
  }, [route])

  return null
}
