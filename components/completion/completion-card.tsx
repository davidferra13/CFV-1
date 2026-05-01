'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CompletionResult, CompletionRequirement } from '@/lib/completion/types'

// -- Score ring --------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981' // emerald
  if (score >= 60) return '#b15c26' // brand
  if (score >= 40) return '#f59e0b' // amber
  return '#ef4444' // red
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = size * 0.4
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const cx = size / 2
  const cy = size / 2
  const color = scoreColor(score)
  const fontSize = size * 0.24
  const subFontSize = size * 0.1

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(120,113,108,0.2)"
        strokeWidth={size * 0.08}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={size * 0.08}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="transition-all duration-700 ease-out"
      />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-stone-100 font-bold"
        style={{ fontSize: `${fontSize}px`, fontWeight: 700 }}
      >
        {score}
      </text>
      <text
        x={cx}
        y={cy + fontSize * 0.7}
        textAnchor="middle"
        className="fill-stone-500"
        style={{ fontSize: `${subFontSize}px` }}
      >
        / 100
      </text>
    </svg>
  )
}

// -- Status badge ------------------------------------------------------------

function StatusBadge({ status }: { status: CompletionResult['status'] }) {
  const config = {
    complete: { label: 'Complete', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    partial: { label: 'Partial', bg: 'bg-amber-500/20', text: 'text-amber-400' },
    incomplete: { label: 'Incomplete', bg: 'bg-red-500/20', text: 'text-red-400' },
  }
  const c = config[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  )
}

// -- Requirement row ---------------------------------------------------------

function RequirementRow({ req }: { req: CompletionRequirement }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${req.met ? 'bg-emerald-400' : req.blocking ? 'bg-red-400' : 'bg-stone-500'}`}
        />
        <span
          className={`text-xs truncate ${req.met ? 'text-stone-500 line-through' : 'text-stone-300'}`}
        >
          {req.label}
        </span>
        {req.blocking && !req.met && (
          <span className="text-[10px] text-red-400 font-medium shrink-0">BLOCKING</span>
        )}
      </div>
      {!req.met && req.actionUrl && (
        <Link
          href={req.actionUrl}
          className="text-[10px] text-brand-400 hover:text-brand-300 shrink-0"
        >
          {req.actionLabel || 'Fix'}
        </Link>
      )}
    </div>
  )
}

// -- Main component ----------------------------------------------------------

interface CompletionCardProps {
  result: CompletionResult
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CompletionCard({ result, size = 'md', className = '' }: CompletionCardProps) {
  const [expanded, setExpanded] = useState(size === 'lg')

  // SM: inline badge only
  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <ScoreRing score={result.score} size={32} />
        <StatusBadge status={result.status} />
      </div>
    )
  }

  const topMissing = result.missingRequirements
    .sort((a, b) => {
      if (a.blocking !== b.blocking) return a.blocking ? -1 : 1
      return b.weight - a.weight
    })
    .slice(0, expanded ? undefined : 3)

  return (
    <div className={`rounded-lg border border-stone-700/50 bg-stone-800/50 p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <ScoreRing score={result.score} size={size === 'lg' ? 80 : 64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-stone-200 truncate">Completion</h4>
            <StatusBadge status={result.status} />
          </div>
          {result.entityLabel && (
            <p className="text-xs text-stone-500 truncate mb-2">{result.entityLabel}</p>
          )}

          {topMissing.length > 0 && (
            <div className="space-y-0.5">
              {topMissing.map((req) => (
                <RequirementRow key={req.key} req={req} />
              ))}
            </div>
          )}

          {result.missingRequirements.length > 3 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-[10px] text-stone-500 hover:text-stone-400 mt-1"
            >
              +{result.missingRequirements.length - 3} more
            </button>
          )}

          {result.nextAction && (
            <Link
              href={result.nextAction.url}
              className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"
            >
              Next: {result.nextAction.label}
            </Link>
          )}
        </div>
      </div>

      {/* Children drill-down (lg only) */}
      {expanded && result.children && result.children.length > 0 && (
        <div className="mt-4 pt-3 border-t border-stone-700/50 space-y-3">
          {result.children.map((child) => (
            <CompletionCard key={child.entityId} result={child} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}

// -- Skeleton for Suspense boundaries ----------------------------------------

export function CompletionCardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-stone-700" />
        <div className="w-16 h-4 rounded bg-stone-700" />
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-stone-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-24 h-4 rounded bg-stone-700" />
          <div className="w-full h-3 rounded bg-stone-700" />
          <div className="w-3/4 h-3 rounded bg-stone-700" />
          <div className="w-1/2 h-3 rounded bg-stone-700" />
        </div>
      </div>
    </div>
  )
}
