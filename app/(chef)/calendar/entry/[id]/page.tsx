import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarEntryDetail } from '@/components/calendar/calendar-entry-detail'
import { getCalendarEntry } from '@/lib/calendar/entry-actions'

export const metadata: Metadata = {
  title: 'Calendar Entry',
}

type Props = {
  params: {
    id: string
  }
}

export default async function CalendarEntryPage({ params }: Props) {
  const entry = await getCalendarEntry(params.id)

  if (!entry) notFound()

  return <CalendarEntryDetail entry={entry} />
}
