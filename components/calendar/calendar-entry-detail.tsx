import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarEntryActionsPanel } from '@/components/calendar/calendar-entry-actions-panel'
import { getCalendarColor } from '@/lib/calendar/colors'
import type { ChefCalendarEntry } from '@/lib/calendar/entry-actions'

type Props = {
  entry: ChefCalendarEntry
}

const ENTRY_TYPE_LABELS: Record<ChefCalendarEntry['entry_type'], string> = {
  vacation: 'Vacation',
  time_off: 'Time Off',
  personal: 'Personal',
  market: 'Farmers Market',
  festival: 'Food Festival',
  class: 'Class / Teaching',
  photo_shoot: 'Photo Shoot',
  media: 'Media / Press',
  meeting: 'Business Meeting',
  admin_block: 'Admin Block',
  other: 'Other',
  target_booking: 'Seeking Booking',
  soft_preference: 'Soft Preference',
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatTime(value: string | null) {
  if (!value) return null
  const [hour, minute] = value.split(':').map(Number)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour, minute))
}

function formatMoney(cents: number | null) {
  if (cents === null) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null

  return (
    <div className="border-b border-stone-800 py-3 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-200">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">{title}</h2>
      <dl className="mt-3">{children}</dl>
    </section>
  )
}

export function CalendarEntryDetail({ entry }: Props) {
  const typeLabel = ENTRY_TYPE_LABELS[entry.entry_type] ?? entry.entry_type
  const color = getCalendarColor(
    'calendar_entry',
    entry.entry_type,
    undefined,
    entry.color_override
  )
  const startDate = formatDate(entry.start_date)
  const endDate = formatDate(entry.end_date)
  const dateRange = entry.start_date === entry.end_date ? startDate : `${startDate} to ${endDate}`
  const startTime = formatTime(entry.start_time)
  const endTime = formatTime(entry.end_time)
  const timeRange = entry.all_day
    ? 'All day'
    : [startTime, endTime].filter(Boolean).join(' to ') || null
  const expectedRevenue = formatMoney(entry.expected_revenue_cents)
  const actualRevenue = formatMoney(entry.actual_revenue_cents)

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="info">{typeLabel}</Badge>
            <Badge variant={entry.is_completed ? 'success' : 'default'}>
              {entry.is_completed ? 'Completed' : 'Open'}
            </Badge>
            <Badge variant={entry.blocks_bookings ? 'warning' : 'default'}>
              {entry.blocks_bookings ? 'Blocks bookings' : 'Does not block bookings'}
            </Badge>
            {entry.is_public && <Badge variant="success">Public signal</Badge>}
          </div>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-2 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div>
              <h1 className="text-2xl font-bold text-stone-100">{entry.title}</h1>
              <p className="mt-1 text-sm text-stone-500">{dateRange}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/calendar" variant="secondary" size="sm">
            Calendar
          </Button>
          <Button href="/calendar/week" variant="secondary" size="sm">
            Week
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <CalendarEntryActionsPanel entry={entry} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Schedule">
          <DetailRow label="Date" value={dateRange} />
          <DetailRow label="Time" value={timeRange} />
          <DetailRow
            label="Booking impact"
            value={entry.blocks_bookings ? 'Unavailable' : 'Open'}
          />
          <DetailRow
            label="Completion"
            value={entry.is_completed ? 'Completed' : 'Not completed'}
          />
          <DetailRow
            label="Completed at"
            value={entry.completed_at ? formatDate(entry.completed_at) : null}
          />
        </Section>

        <Section title="Entry">
          <DetailRow label="Type" value={typeLabel} />
          <DetailRow label="Visibility" value={entry.is_private ? 'Private' : 'Visible to chef'} />
          <DetailRow label="Notes" value={entry.description} />
        </Section>

        {entry.is_revenue_generating && (
          <Section title="Revenue">
            <DetailRow
              label="Revenue type"
              value={entry.revenue_type === 'promotional' ? 'Promotional' : 'Income'}
            />
            <DetailRow label="Expected revenue" value={expectedRevenue} />
            <DetailRow label="Actual revenue" value={actualRevenue} />
            <DetailRow label="Revenue notes" value={entry.revenue_notes} />
          </Section>
        )}

        {(entry.is_public || entry.public_note) && (
          <Section title="Public Signal">
            <DetailRow label="Public profile" value={entry.is_public ? 'Shown' : 'Not shown'} />
            <DetailRow label="Public note" value={entry.public_note} />
          </Section>
        )}
      </div>
    </div>
  )
}
