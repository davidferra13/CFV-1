import Link from 'next/link'
import { ArrowRight, Clock, FileCheck2 } from 'lucide-react'

import { evidenceLabelText, type ResumeTrail } from '@/lib/resume-trails'
import { cn } from '@/lib/utils'

export interface ResumeTrailCardProps {
  trail: ResumeTrail
  className?: string
}

export function ResumeTrailCard({ trail, className }: ResumeTrailCardProps) {
  return (
    <article
      className={cn(
        'rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-950',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            <span>{sourceKindLabel(trail.source.kind)}</span>
            <span aria-hidden="true">/</span>
            <span>{evidenceLabelText(trail.evidenceLabel)}</span>
          </div>
          <h3 className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
            {trail.title}
          </h3>
          {trail.description ? (
            <p className="line-clamp-2 text-xs leading-5 text-stone-600 dark:text-stone-400">
              {trail.description}
            </p>
          ) : null}
        </div>

        <Link
          href={trail.route}
          aria-label={`Continue ${trail.title}`}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-stone-200 text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <dl className="mt-3 grid gap-2 text-xs">
        <div className="flex gap-2">
          <dt className="mt-0.5 shrink-0 text-stone-400">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Last action</span>
          </dt>
          <dd className="min-w-0 text-stone-700 dark:text-stone-300">
            <span className="font-medium">{trail.lastAction}</span>
            <span className="text-stone-500 dark:text-stone-500">
              {' '}
              - {formatTrailTime(trail.timestamp)}
            </span>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="mt-0.5 shrink-0 text-stone-400">
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">Next action</span>
          </dt>
          <dd className="min-w-0 text-stone-700 dark:text-stone-300">{trail.nextAction}</dd>
        </div>
      </dl>
    </article>
  )
}

export interface ResumeTrailListProps {
  trails: ResumeTrail[]
  className?: string
  itemClassName?: string
}

export function ResumeTrailList({ trails, className, itemClassName }: ResumeTrailListProps) {
  if (trails.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {trails.map((trail) => (
        <ResumeTrailCard key={trail.id} trail={trail} className={itemClassName} />
      ))}
    </div>
  )
}

function sourceKindLabel(kind: ResumeTrail['source']['kind']): string {
  return kind
    .split('_')
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatTrailTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
