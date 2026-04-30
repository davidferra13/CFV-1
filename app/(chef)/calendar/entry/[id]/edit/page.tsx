import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarEntryEditForm } from '@/components/calendar/calendar-entry-edit-form'
import { getCalendarEntry } from '@/lib/calendar/entry-actions'

export const metadata: Metadata = {
  title: 'Edit Calendar Entry',
}

type Props = {
  params: {
    id: string
  }
}

export default async function EditCalendarEntryPage({ params }: Props) {
  const entry = await getCalendarEntry(params.id)

  if (!entry) notFound()

  return <CalendarEntryEditForm entry={entry} />
}
