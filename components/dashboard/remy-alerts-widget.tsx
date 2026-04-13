'use client'

import { useState, useTransition } from 'react'
import { dismissAlert } from '@/lib/ai/remy-proactive-alerts'
import Link from 'next/link'

type RemyAlert = {
  id: string
  alert_type: string
  entity_type: string | null
  entity_id: string | null
  title: string
  body: string
  priority: string
  created_at: string
}

function alertActionHref(alert: RemyAlert): string | null {
  if (!alert.entity_id) return null
  switch (alert.alert_type) {
    case 'missing_prep_list':
    case 'missing_grocery_list':
    case 'payment_received':
      return `/events/${alert.entity_id}`
    case 'overdue_invoice':
      return `/invoices`
    case 'stale_inquiry':
      return `/inquiries`
    case 'client_birthday':
      return `/clients/${alert.entity_id}`
    case 'expiring_permit':
    case 'expiring_insurance':
      return `/settings/compliance`
    case 'post_event_capture':
      return `/events/${alert.entity_id}`
    case 'dormant_client':
      return `/clients/${alert.entity_id}`
    case 'weather_warning':
      return alert.entity_id ? `/events/${alert.entity_id}` : null
    default:
      return null
  }
}

function PriorityBar({ priority }: { priority: string }) {
  if (priority === 'urgent')
    return <span className="w-1 shrink-0 rounded-full bg-red-500 self-stretch" />
  if (priority === 'high')
    return <span className="w-1 shrink-0 rounded-full bg-amber-400 self-stretch" />
  return <span className="w-1 shrink-0 rounded-full bg-stone-600 self-stretch" />
}

function AlertRow({ alert, onDismiss }: { alert: RemyAlert; onDismiss: (id: string) => void }) {
  const [pending, startTransition] = useTransition()
  const href = alertActionHref(alert)

  function handleDismiss() {
    startTransition(async () => {
      try {
        await dismissAlert(alert.id)
        onDismiss(alert.id)
      } catch {
        // silent - alert stays visible
      }
    })
  }

  return (
    <div className="flex gap-3 items-start rounded-lg border border-stone-700 bg-stone-800 px-3 py-2.5">
      <PriorityBar priority={alert.priority} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-100 leading-tight">{alert.title}</p>
        <p className="text-xs text-stone-400 mt-0.5 leading-snug">{alert.body}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {href && (
          <Link
            href={href}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
          >
            View
          </Link>
        )}
        <button
          onClick={handleDismiss}
          disabled={pending}
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-40"
          aria-label="Dismiss alert"
        >
          {pending ? '...' : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}

interface RemyAlertsWidgetProps {
  alerts: RemyAlert[]
}

export function RemyAlertsWidget({ alerts: initialAlerts }: RemyAlertsWidgetProps) {
  const [alerts, setAlerts] = useState(initialAlerts)

  function handleDismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
