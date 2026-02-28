import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import {
  createTimeBlock,
  deleteTimeBlock,
  getSchedulingAvailability,
  listTimeBlocks,
} from '@/lib/scheduling/time-blocks'
import { CalendarView } from '@/components/scheduling/calendar-view'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Scheduling - ChefFlow' }

type SchedulingPageProps = {
  searchParams?: {
    date?: string
  }
}

function normalizeDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return new Date().toISOString().slice(0, 10)
}

export default async function SchedulingPage({ searchParams }: SchedulingPageProps) {
  await requireChef()

  const selectedDate = normalizeDate(searchParams?.date)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  start.setDate(start.getDate() - 7)
  end.setDate(end.getDate() + 7)

  const rangeStart = start.toISOString().slice(0, 10)
  const rangeEnd = end.toISOString().slice(0, 10)

  const [calendarEvents, availability, dayBlocks] = await Promise.all([
    getCalendarEvents(rangeStart, rangeEnd),
    getSchedulingAvailability(selectedDate),
    listTimeBlocks(selectedDate, selectedDate),
  ])

  async function createTimeBlockAction(formData: FormData) {
    'use server'

    const title = String(formData.get('title') || '').trim()
    const date = String(formData.get('date') || '').trim()
    const startTime = String(formData.get('start_time') || '').trim()
    const endTime = String(formData.get('end_time') || '').trim()
    const blockType = String(formData.get('block_type') || 'personal')
    const notes = String(formData.get('notes') || '').trim() || undefined

    await createTimeBlock({
      title,
      startAt: `${date}T${startTime}:00`,
      endAt: `${date}T${endTime}:00`,
      blockType: blockType as 'prep' | 'travel' | 'personal' | 'admin' | 'hold',
      notes,
    })
  }

  async function deleteTimeBlockAction(formData: FormData) {
    'use server'
    const timeBlockId = String(formData.get('time_block_id') || '')
    await deleteTimeBlock(timeBlockId)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/schedule" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Calendar
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Scheduling Dashboard</h1>
        <p className="mt-1 text-stone-400">
          Manage manual blocks, detect conflicts, and monitor daily availability windows.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <CalendarView initialEvents={calendarEvents} />

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Date controls</CardTitle>
            </CardHeader>
            <CardContent>
              <form method="get" className="flex items-center gap-2">
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className="h-10 flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
                />
                <Button type="submit" size="sm">
                  View
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New Time Block</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createTimeBlockAction} className="space-y-3">
                <input type="hidden" name="date" value={selectedDate} />
                <input
                  name="title"
                  required
                  placeholder="Admin block"
                  className="h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="start_time"
                    required
                    type="time"
                    className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
                  />
                  <input
                    name="end_time"
                    required
                    type="time"
                    className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
                  />
                </div>
                <select
                  name="block_type"
                  defaultValue="personal"
                  className="h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
                >
                  <option value="prep">Prep</option>
                  <option value="travel">Travel</option>
                  <option value="personal">Personal</option>
                  <option value="admin">Admin</option>
                  <option value="hold">Hold</option>
                </select>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Optional notes"
                  className="w-full rounded-md border border-stone-700 bg-stone-900 p-3 text-sm text-stone-100"
                />
                <Button type="submit" size="sm" className="w-full">
                  Create block
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Availability on {selectedDate}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availability.windows.length === 0 ? (
                <p className="text-sm text-stone-400">No open windows in the configured workday.</p>
              ) : (
                availability.windows.map((window) => (
                  <div
                    key={`${window.startAt}-${window.endAt}`}
                    className="rounded-md border border-stone-700 bg-stone-900 p-2 text-xs text-stone-300"
                  >
                    {window.startAt} to {window.endAt}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Blocks ({dayBlocks.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayBlocks.length === 0 ? (
                <p className="text-sm text-stone-400">No manual blocks for this day.</p>
              ) : (
                dayBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-md border border-stone-700 bg-stone-900 p-2"
                  >
                    <p className="text-sm font-medium text-stone-100">{block.title}</p>
                    <p className="text-xs text-stone-400">
                      {block.block_type} | {block.start_at} to {block.end_at}
                    </p>
                    <form action={deleteTimeBlockAction} className="mt-2">
                      <input type="hidden" name="time_block_id" value={block.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Delete
                      </Button>
                    </form>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conflict Detection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availability.overlaps.length === 0 ? (
                <p className="text-sm text-emerald-400">No overlaps detected.</p>
              ) : (
                availability.overlaps.map((pair, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-red-900 bg-red-950 p-2 text-xs text-red-200"
                  >
                    {pair.first.source || 'Range A'} overlaps {pair.second.source || 'Range B'}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
