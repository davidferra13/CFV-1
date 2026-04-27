'use client'

// Menu Safety Report - Shows allergen verdicts for an event's menu
// Renders BLOCK (red), WARN (amber), CLEAR (green) per dish per guest.
// Uses the deterministic constraint enforcement engine (no AI).

import { useState, useTransition } from 'react'
import { getMenuSafetyReport, type SafeMenuFilterResult } from '@/lib/dietary/safe-menu-filter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from '@/components/ui/icons'
import { toast } from 'sonner'

interface MenuSafetyReportProps {
  eventId: string
}

export function MenuSafetyReport({ eventId }: MenuSafetyReportProps) {
  const [report, setReport] = useState<SafeMenuFilterResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function runCheck() {
    startTransition(async () => {
      try {
        const result = await getMenuSafetyReport(eventId)
        setReport(result)
        if (result.result?.totalBlocks) {
          toast.error(`${result.result.totalBlocks} allergen conflict(s) found`)
        } else if (result.result?.totalWarns) {
          toast.warning(`${result.result.totalWarns} cross-contact risk(s) to review`)
        } else if (result.result) {
          toast.success('Menu is safe for all guests')
        }
      } catch {
        toast.error('Failed to run safety check')
      }
    })
  }

  if (!report) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={runCheck}
        disabled={isPending}
        className="gap-1.5"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        Check Menu Safety
      </Button>
    )
  }

  if (report.error && !report.result) {
    return <div className="text-sm text-stone-500">{report.error}</div>
  }

  const result = report.result
  if (!result) return null

  const verdictIcon = {
    BLOCK: <ShieldX className="h-4 w-4 text-red-400" />,
    WARN: <ShieldAlert className="h-4 w-4 text-amber-400" />,
    CLEAR: <ShieldCheck className="h-4 w-4 text-emerald-400" />,
  }

  const verdictBadge = {
    BLOCK: <Badge variant="error">Blocked</Badge>,
    WARN: <Badge variant="warning">Review</Badge>,
    CLEAR: <Badge variant="success">Safe</Badge>,
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {result.canProceed ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <ShieldX className="h-4 w-4 text-red-400" />
            )}
            Dietary Safety Check
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={runCheck} disabled={isPending}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-check'}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">{result.summary}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.guests
          .filter((g) => g.overallVerdict !== 'CLEAR')
          .map((guest) => (
            <div key={guest.guestId} className="border border-stone-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                {verdictIcon[guest.overallVerdict]}
                <span className="text-sm font-medium text-stone-200">{guest.guestName}</span>
                {verdictBadge[guest.overallVerdict]}
                {guest.blockCount > 0 && (
                  <span className="text-xs text-red-400">{guest.blockCount} blocked</span>
                )}
                {guest.warnCount > 0 && (
                  <span className="text-xs text-amber-400">
                    {guest.warnCount} warning{guest.warnCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {guest.dishes.map((dish) => (
                  <div
                    key={dish.dishId}
                    className={`text-xs rounded px-2 py-1.5 ${
                      dish.verdict === 'BLOCK'
                        ? 'bg-red-950/40 border border-red-900/50'
                        : 'bg-amber-950/30 border border-amber-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-300">{dish.dishName}</span>
                      {verdictBadge[dish.verdict]}
                    </div>
                    {dish.reason && <p className="text-stone-500 mt-0.5">{dish.reason}</p>}
                    {dish.crossContactRisks.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dish.crossContactRisks.map((risk, i) => (
                          <p key={i} className="text-amber-500/70">
                            Cross-contact: {risk.ingredientName} - {risk.reason}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        {result.guests.every((g) => g.overallVerdict === 'CLEAR') && (
          <div className="text-center py-4 text-emerald-400/70 text-sm">
            <ShieldCheck className="h-6 w-6 mx-auto mb-1 opacity-60" />
            All dishes safe for all guests
          </div>
        )}
      </CardContent>
    </Card>
  )
}
