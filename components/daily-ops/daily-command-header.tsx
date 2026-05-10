'use client'

// Daily Command Header - time-appropriate greeting, date, quick stats, view toggle.

import { Clock, Mail, ListChecks, Layers, Timer } from '@/components/ui/icons'

type ViewMode = 'type' | 'time'

type Props = {
  totalItems: number
  estimatedMinutes: number
  unreadMessages: number
  viewMode: ViewMode
  onToggleView: (mode: ViewMode) => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning, Chef'
  if (hour < 17) return 'Good afternoon, Chef'
  return 'Good evening, Chef'
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DailyCommandHeader({
  totalItems,
  estimatedMinutes,
  unreadMessages,
  viewMode,
  onToggleView,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Greeting and date */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-stone-100">{getGreeting()}</h1>
        <p className="text-sm text-stone-400 mt-0.5">{formatToday()}</p>
      </div>

      {/* Quick stats row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400">
        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-stone-500" />
          {totalItems} items
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-stone-500" />~{estimatedMinutes}m
        </span>
        {unreadMessages > 0 && (
          <span className="inline-flex items-center gap-1.5 text-brand-400">
            <Mail className="h-3.5 w-3.5" />
            {unreadMessages} unread
          </span>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-stone-800 p-0.5 w-fit">
        <button
          type="button"
          onClick={() => onToggleView('type')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'type'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Layers className="h-3 w-3" />
          By Type
        </button>
        <button
          type="button"
          onClick={() => onToggleView('time')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'time'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-300'
          }`}
        >
          <Clock className="h-3 w-3" />
          By Time
        </button>
      </div>
    </div>
  )
}
