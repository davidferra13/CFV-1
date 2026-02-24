// Skeleton — Content-shaped loading placeholder.
// Use as Suspense fallback or while async data loads client-side.

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 bg-[length:200%_100%] animate-shimmer',
        className
      )}
      aria-hidden="true"
    />
  )
}

// Pre-built skeletons for common shapes

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-800 last:border-0">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-stone-700">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2.5 border-b border-stone-800 last:border-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonKPITile() {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-4 space-y-2">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function SkeletonDashboardSection() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonKPITile />
        <SkeletonKPITile />
        <SkeletonKPITile />
      </div>
    </div>
  )
}
