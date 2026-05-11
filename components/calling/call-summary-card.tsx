'use client'

/**
 * Call Summary Card
 *
 * Post-batch intelligence card shown after calling completes for an event.
 * Displays vendor call results, best prices, delivery options, and at-risk
 * ingredients in a compact, actionable format.
 */

import { useState, useTransition } from 'react'
import {
  Phone,
  Check,
  X,
  AlertCircle,
  Clock,
  Truck,
  ShoppingCart,
  Lock,
  Share2,
  Loader2,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  addCallResultsToPrepList,
  lockVendorsFromCallResults,
  shareCallSummaryWithClient,
} from '@/lib/calling/post-call-actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CallSummaryCardProps {
  eventId: string
  eventTitle: string
  results: {
    totalVendorsCalled: number
    vendorsAnswered: number
    ingredientsConfirmed: number
    ingredientsUnavailable: number
    bestPrices: Array<{
      ingredient: string
      vendor: string
      price: number
      unit: string
    }>
    deliveryOptions: Array<{
      vendor: string
      window: string
    }>
    atRisk: string[]
    summary: string
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallSummaryCard({ eventId, eventTitle, results }: CallSummaryCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [prepPending, startPrepTransition] = useTransition()
  const [lockPending, startLockTransition] = useTransition()
  const [sharePending, startShareTransition] = useTransition()
  const [prepDone, setPrepDone] = useState(false)
  const [lockDone, setLockDone] = useState(false)
  const [shareDone, setShareDone] = useState(false)

  const answerRate =
    results.totalVendorsCalled > 0
      ? Math.round((results.vendorsAnswered / results.totalVendorsCalled) * 100)
      : 0

  return (
    <div className="rounded-lg border border-stone-700 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-800">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-stone-100">Call Results for {eventTitle}</h3>
        </div>
        {results.summary && <p className="text-xs text-stone-400 mt-1">{results.summary}</p>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-stone-800">
        <StatBox
          label="Vendors Called"
          value={results.totalVendorsCalled}
          icon={<Phone className="w-3.5 h-3.5" />}
        />
        <StatBox
          label="Answered"
          value={results.vendorsAnswered}
          subtext={`${answerRate}% rate`}
          icon={<Check className="w-3.5 h-3.5" />}
          color="text-green-400"
        />
        <StatBox
          label="Confirmed"
          value={results.ingredientsConfirmed}
          suffix="items"
          icon={<Check className="w-3.5 h-3.5" />}
          color="text-green-400"
        />
        <StatBox
          label="Unavailable"
          value={results.ingredientsUnavailable}
          suffix="items"
          icon={<X className="w-3.5 h-3.5" />}
          color={results.ingredientsUnavailable > 0 ? 'text-red-400' : 'text-stone-400'}
        />
      </div>

      {/* Best prices section */}
      {results.bestPrices.length > 0 && (
        <div className="p-4 border-t border-stone-800">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Best Prices
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 border-b border-stone-800">
                  <th className="text-left py-1.5 pr-3 font-medium">Ingredient</th>
                  <th className="text-left py-1.5 pr-3 font-medium">Vendor</th>
                  <th className="text-right py-1.5 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {results.bestPrices.map((price, idx) => (
                  <tr key={idx} className="border-b border-stone-800/50 last:border-0">
                    <td className="py-1.5 pr-3 text-stone-200">{price.ingredient}</td>
                    <td className="py-1.5 pr-3 text-stone-400">{price.vendor}</td>
                    <td className="py-1.5 text-right font-mono text-stone-300">
                      ${price.price.toFixed(2)}/{price.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery options */}
      {results.deliveryOptions.length > 0 && (
        <div className="p-4 border-t border-stone-800">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            Delivery Options
          </p>
          <div className="space-y-1.5">
            {results.deliveryOptions.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-stone-800/50"
              >
                <Truck className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
                <span className="text-stone-200">{opt.vendor}</span>
                <span className="text-stone-600 mx-1">|</span>
                <span className="text-stone-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {opt.window}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-risk alert */}
      {results.atRisk.length > 0 && (
        <div className="p-4 border-t border-stone-800">
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">
                  {results.atRisk.length} ingredient{results.atRisk.length !== 1 ? 's' : ''} at risk
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  No vendor confirmed availability for these items
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {results.atRisk.map((item) => (
                <span
                  key={item}
                  className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300"
                >
                  {item}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAlternatives(!showAlternatives)
                if (!showAlternatives) {
                  toast.info(
                    'Alternative sourcing: check specialty vendors, online purveyors, or adjust the recipe'
                  )
                }
              }}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
            >
              {showAlternatives ? 'Hide suggestions' : 'Suggest Alternatives'}
            </button>
            {showAlternatives && (
              <div className="mt-2 text-xs text-stone-400 space-y-1">
                <p>Consider these approaches for at-risk ingredients:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Check specialty food distributors or online purveyors</li>
                  <li>Contact the client about acceptable substitutions</li>
                  <li>Try nearby farmers markets or ethnic grocery stores</li>
                  <li>Adjust the recipe to use available alternatives</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="p-4 border-t border-stone-800 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={prepPending || prepDone || results.bestPrices.length === 0}
          onClick={() => {
            startPrepTransition(async () => {
              try {
                const res = await addCallResultsToPrepList({
                  eventId,
                  bestPrices: results.bestPrices,
                })
                setPrepDone(true)
                toast.success(
                  `Added to prep list (${res.poCount} purchase order${res.poCount !== 1 ? 's' : ''} created)`
                )
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to add to prep list')
              }
            })
          }}
        >
          {prepPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : prepDone ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <ShoppingCart className="w-3.5 h-3.5" />
          )}
          {prepDone ? 'Added' : 'Add to Prep List'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={lockPending || lockDone || results.bestPrices.length === 0}
          onClick={() => {
            startLockTransition(async () => {
              try {
                const res = await lockVendorsFromCallResults({
                  bestPrices: results.bestPrices,
                })
                setLockDone(true)
                toast.success(`Locked ${res.lockedCount} vendor${res.lockedCount !== 1 ? 's' : ''}`)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to lock vendors')
              }
            })
          }}
        >
          {lockPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : lockDone ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
          {lockDone ? 'Locked' : 'Lock Vendors'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={sharePending || shareDone}
          onClick={() => {
            startShareTransition(async () => {
              try {
                await shareCallSummaryWithClient({
                  eventId,
                  eventTitle,
                  summary: results.summary,
                  ingredientsConfirmed: results.ingredientsConfirmed,
                  ingredientsUnavailable: results.ingredientsUnavailable,
                })
                setShareDone(true)
                toast.success('Sourcing update shared with client')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to share with client')
              }
            })
          }}
        >
          {sharePending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : shareDone ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          {shareDone ? 'Shared' : 'Share with Client'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatBox sub-component
// ---------------------------------------------------------------------------

function StatBox({
  label,
  value,
  suffix,
  subtext,
  icon,
  color = 'text-stone-300',
}: {
  label: string
  value: number
  suffix?: string
  subtext?: string
  icon: React.ReactNode
  color?: string
}) {
  return (
    <div className="bg-card p-3 text-center">
      <div className={`flex items-center justify-center gap-1 ${color}`}>
        {icon}
        <span className="text-lg font-semibold">{value}</span>
        {suffix && <span className="text-xs text-stone-500">{suffix}</span>}
      </div>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
      {subtext && <p className="text-xs text-stone-600">{subtext}</p>}
    </div>
  )
}
