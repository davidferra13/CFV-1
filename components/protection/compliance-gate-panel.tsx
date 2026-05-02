'use client'

// Compliance Gate Panel
// Module: protection
// Displays pre-event compliance checklist: certs, insurance, permits.
// Pure display component consuming ComplianceGateResult.

import { useState, useTransition } from 'react'
import {
  checkComplianceGate,
  type ComplianceGateResult,
} from '@/lib/protection/compliance-gate-actions'
import Link from 'next/link'

const STATUS_STYLES = {
  pass: { icon: '\u2713', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  warn: { icon: '!', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  fail: { icon: '\u2717', color: 'text-red-400', bg: 'bg-red-500/10' },
}

const OVERALL_STYLES = {
  clear: {
    label: 'All Clear',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  warnings: {
    label: 'Warnings',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  blocked: {
    label: 'Action Required',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
}

export function ComplianceGatePanel() {
  const [result, setResult] = useState<ComplianceGateResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCheck() {
    startTransition(async () => {
      try {
        const data = await checkComplianceGate()
        setResult(data)
      } catch {
        // Fail silently
      }
    })
  }

  if (!result) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-stone-300">Compliance Gate</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Check certifications, insurance, and permits
            </p>
          </div>
          <button
            type="button"
            onClick={handleCheck}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-300 disabled:opacity-50"
          >
            {isPending ? 'Checking...' : 'Run Check'}
          </button>
        </div>
      </div>
    )
  }

  const overall = OVERALL_STYLES[result.overallStatus]

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${overall.bg}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Compliance Gate</h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${overall.color} ${overall.bg}`}
        >
          {overall.label}
        </span>
      </div>

      <div className="space-y-2">
        {result.items.map((item) => {
          const style = STATUS_STYLES[item.status]
          return (
            <div key={item.key} className="flex items-start gap-2">
              <span
                className={`w-5 h-5 rounded-full ${style.bg} flex items-center justify-center text-xs ${style.color} shrink-0 mt-0.5`}
              >
                {style.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${style.color}`}>{item.label}</span>
                  {item.status !== 'pass' && (
                    <Link
                      href={item.route}
                      className="text-[10px] text-stone-500 hover:text-stone-300 shrink-0"
                    >
                      Fix &rarr;
                    </Link>
                  )}
                </div>
                <p className="text-xs text-stone-500">{item.detail}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-stone-800">
        <span className="text-[10px] text-stone-600">
          {result.passCount} pass, {result.warnCount} warn, {result.failCount} fail
        </span>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isPending}
          className="text-[10px] text-stone-500 hover:text-stone-300"
        >
          {isPending ? 'Checking...' : 'Re-check'}
        </button>
      </div>
    </div>
  )
}
