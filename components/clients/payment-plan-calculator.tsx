'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Calendar } from 'lucide-react'

type InstallmentPlan = {
  numberOfPayments: number
  installments: { number: number; amountCents: number; dueDate: string }[]
}

type Props = {
  totalCents: number
  eventDate: string
  eventName?: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calculatePlan(
  totalCents: number,
  numPayments: number,
  eventDate: string
): InstallmentPlan {
  const baseAmount = Math.floor(totalCents / numPayments)
  const remainder = totalCents - baseAmount * numPayments
  const today = new Date().toISOString().split('T')[0]
  const daysUntilEvent = Math.max(
    1,
    Math.floor((new Date(eventDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  )
  const interval = Math.floor(daysUntilEvent / numPayments)

  const installments = Array.from({ length: numPayments }, (_, i) => ({
    number: i + 1,
    amountCents: baseAmount + (i === 0 ? remainder : 0),
    dueDate: i === 0 ? today : addDays(today, interval * i),
  }))

  return { numberOfPayments: numPayments, installments }
}

export function PaymentPlanCalculator({ totalCents, eventDate, eventName }: Props) {
  const [selectedPlan, setSelectedPlan] = useState(2)
  const plans = [2, 3, 4].map((n) => calculatePlan(totalCents, n, eventDate))

  const activePlan = plans.find((p) => p.numberOfPayments === selectedPlan) || plans[0]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-stone-400" />
            Payment Plan Options
          </CardTitle>
          {eventName && <p className="text-sm text-stone-500">{eventName}</p>}
          <p className="text-lg font-semibold text-stone-100">Total: {formatCents(totalCents)}</p>
        </CardHeader>
        <CardContent>
          {/* Plan Selector */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {plans.map((plan) => (
              <button
                key={plan.numberOfPayments}
                onClick={() => setSelectedPlan(plan.numberOfPayments)}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  selectedPlan === plan.numberOfPayments
                    ? 'border-brand-500 bg-brand-950 ring-1 ring-brand-500'
                    : 'border-stone-700 hover:bg-stone-800'
                }`}
              >
                <p className="text-lg font-bold text-stone-100">{plan.numberOfPayments}</p>
                <p className="text-xs text-stone-500">payments</p>
                <p className="text-sm font-medium text-stone-300 mt-1">
                  {formatCents(plan.installments[0].amountCents)}/ea
                </p>
              </button>
            ))}
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            {activePlan.installments.map((inst) => (
              <div
                key={inst.number}
                className="flex items-center justify-between rounded-lg border border-stone-700 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-sm font-semibold text-stone-400">
                    {inst.number}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      Payment {inst.number}
                      {inst.number === 1 ? ' (Due now)' : ''}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-stone-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(inst.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-100">
                    {formatCents(inst.amountCents)}
                  </p>
                  {inst.number === 1 && <Badge variant="warning">Due Today</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
