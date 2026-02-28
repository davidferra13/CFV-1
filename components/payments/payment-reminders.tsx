'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'

type DueRecurringPayment = {
  id: string
  client_id: string
  amount_cents: number
  description: string | null
  frequency: string
  next_send_date: string | null
  clients?:
    | { full_name?: string | null; email?: string | null }
    | Array<{ full_name?: string | null; email?: string | null }>
    | null
}

function resolveClient(payment: DueRecurringPayment) {
  if (!payment.clients) return null
  return Array.isArray(payment.clients) ? payment.clients[0] || null : payment.clients
}

function resolveClientName(payment: DueRecurringPayment) {
  return resolveClient(payment)?.full_name || 'Client'
}

function resolveClientEmail(payment: DueRecurringPayment) {
  return resolveClient(payment)?.email || null
}

export function PaymentReminders({ duePayments }: { duePayments: DueRecurringPayment[] }) {
  const [isPending, startTransition] = useTransition()
  const [statusById, setStatusById] = useState<Record<string, string>>({})

  const sortedPayments = useMemo(
    () =>
      [...duePayments].sort((a, b) =>
        String(a.next_send_date || '').localeCompare(String(b.next_send_date || ''))
      ),
    [duePayments]
  )

  function sendReminder(payment: DueRecurringPayment) {
    startTransition(async () => {
      const email = resolveClientEmail(payment)
      if (!email) {
        setStatusById((prev) => ({ ...prev, [payment.id]: 'No client email on file' }))
        return
      }

      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment_due_approaching',
            title: 'Upcoming payment reminder',
            message:
              payment.description ||
              `A recurring payment of ${formatCurrency(payment.amount_cents)} is due soon.`,
            channels: {
              inApp: false,
              email: true,
              sms: false,
            },
            email: {
              to: email,
              template: 'payment_reminder',
            },
          }),
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || 'Reminder failed')
        }

        setStatusById((prev) => ({ ...prev, [payment.id]: 'Reminder sent' }))
      } catch (error) {
        setStatusById((prev) => ({
          ...prev,
          [payment.id]: error instanceof Error ? error.message : 'Reminder failed',
        }))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedPayments.length === 0 ? (
          <p className="text-sm text-stone-400">
            No recurring payments due in the selected window.
          </p>
        ) : (
          sortedPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex flex-col gap-2 rounded-md border border-stone-700 bg-stone-900 p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-stone-100">
                  {resolveClientName(payment)} | {formatCurrency(payment.amount_cents)}
                </p>
                <p className="text-xs text-stone-400">
                  Due: {payment.next_send_date || '-'} | {payment.frequency}
                </p>
                {payment.description && (
                  <p className="mt-1 text-xs text-stone-500">{payment.description}</p>
                )}
                {statusById[payment.id] && (
                  <p className="mt-1 text-xs text-amber-300">{statusById[payment.id]}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => sendReminder(payment)}
              >
                Send reminder
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
