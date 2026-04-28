'use client'

/**
 * Chef Live Alerts
 *
 * Listens to the chef-{tenantId} SSE channel and surfaces real-time alerts
 * for inbound calls, new inquiries, call completions, and voicemails.
 *
 * Mounted once in the chef layout - always active while the chef is in the app.
 * Each alert auto-dismisses after 12 seconds, or can be manually dismissed.
 * Inbound call alerts are pinned until dismissed (someone is calling right now).
 */

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSSE } from '@/lib/realtime/sse-client'
import { PhoneCall, Phone, Bell, Mail, X, Check } from '@/components/ui/icons'

interface Alert {
  id: string
  type: 'inbound_call' | 'inquiry' | 'call_result' | 'voicemail'
  title: string
  body: string
  href?: string
  pinned?: boolean // pinned = no auto-dismiss
  timestamp: number
}

interface Props {
  tenantId: string
}

export function ChefLiveAlerts({ tenantId }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  function dismiss(id: string) {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  function addAlert(alert: Alert) {
    setAlerts((prev) => {
      // Dedupe by type+key for inbound calls
      const filtered = alert.pinned ? prev.filter((a) => a.type !== 'inbound_call') : prev
      return [alert, ...filtered].slice(0, 5) // max 5 visible
    })

    if (!alert.pinned) {
      const timer = setTimeout(() => dismiss(alert.id), 12000)
      timers.current.set(alert.id, timer)
    }
  }

  const handleMessage = useCallback(
    (msg: { event: string; data: any }) => {
      const { event, data } = msg
      const id = `${event}-${Date.now()}`

      if (event === 'inbound_call_live') {
        addAlert({
          id,
          type: 'inbound_call',
          title: 'Incoming call',
          body: `${data.callerName || data.callerPhone} is calling now`,
          href: '/culinary/call-sheet?tab=inbox',
          pinned: true,
          timestamp: Date.now(),
        })
      } else if (event === 'new_inquiry_received') {
        addAlert({
          id,
          type: 'inquiry',
          title: 'New inquiry',
          body: `${data.clientName} - ${data.occasion}${data.eventDate ? ` on ${data.eventDate}` : ''}`,
          href: data.inquiryId ? `/inquiries/${data.inquiryId}` : '/inquiries',
          timestamp: Date.now(),
        })
      } else if (event === 'supplier_call_result' || event === 'ai_call_result') {
        const voiceAgentFollowUp = data.voiceAgentFollowUp
        const statusLabel =
          data.status === 'no_answer'
            ? 'no answer'
            : data.status === 'busy'
              ? 'line busy'
              : data.status === 'failed'
                ? 'call failed'
                : null

        if (statusLabel) {
          // Only alert for hard fails - completed calls with results are already logged
          addAlert({
            id,
            type: 'call_result',
            title: 'Call update',
            body: `${data.vendorName || data.contactName || 'Vendor'}: ${statusLabel}`,
            href: '/culinary/call-sheet?tab=log',
            timestamp: Date.now(),
          })
        } else if (
          event === 'ai_call_result' &&
          voiceAgentFollowUp &&
          typeof voiceAgentFollowUp.label === 'string' &&
          typeof voiceAgentFollowUp.alertBody === 'string'
        ) {
          addAlert({
            id,
            type: 'call_result',
            title: voiceAgentFollowUp.label,
            body: voiceAgentFollowUp.alertBody,
            href: '/culinary/call-sheet?tab=inbox',
            timestamp: Date.now(),
          })
        }
      } else if (event === 'voicemail_received') {
        addAlert({
          id,
          type: 'voicemail',
          title: 'New voicemail',
          body: data.transcript
            ? `"${data.transcript.slice(0, 80)}${data.transcript.length > 80 ? '...' : ''}"`
            : `From ${data.callerPhone || 'unknown number'}`,
          href: '/culinary/call-sheet?tab=inbox',
          timestamp: Date.now(),
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useSSE(`chef-${tenantId}`, { onMessage: handleMessage })

  if (alerts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onDismiss={dismiss} />
      ))}
    </div>
  )
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const Icon =
    alert.type === 'inbound_call'
      ? PhoneCall
      : alert.type === 'inquiry'
        ? Mail
        : alert.type === 'voicemail'
          ? Phone
          : Check

  const bgColor =
    alert.type === 'inbound_call'
      ? 'bg-violet-900 border-violet-500'
      : alert.type === 'inquiry'
        ? 'bg-emerald-900 border-emerald-600'
        : 'bg-stone-800 border-stone-600'

  const iconColor =
    alert.type === 'inbound_call'
      ? 'text-violet-300'
      : alert.type === 'inquiry'
        ? 'text-emerald-300'
        : 'text-stone-300'

  const inner = (
    <div
      className={`relative flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl ${bgColor} ${alert.href ? 'cursor-pointer hover:brightness-110 transition-all' : ''}`}
    >
      {alert.type === 'inbound_call' && (
        <span className="absolute top-3 left-4 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-400" />
        </span>
      )}
      <Icon
        className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor} ${alert.type === 'inbound_call' ? 'ml-4' : ''}`}
        weight={alert.type === 'inbound_call' ? 'fill' : 'regular'}
      />
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-xs font-semibold text-stone-100">{alert.title}</p>
        <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">{alert.body}</p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDismiss(alert.id)
        }}
        className="absolute top-2 right-2 p-1 rounded text-stone-400 hover:text-stone-100 pointer-events-auto"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <div className="pointer-events-auto">
      {alert.href ? (
        <Link href={alert.href} onClick={() => onDismiss(alert.id)}>
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  )
}
