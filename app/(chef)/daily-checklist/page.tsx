import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Daily Checklist' }

function getTodayISO() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default async function DailyChecklistPage() {
  await requireChef()
  await requireFocusAccess()

  const today = getTodayISO()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Daily Checklist</h1>
          <p className="mt-1 text-sm text-stone-500">
            Opening checks, prep work, cleaning, counts, and service-day follow-through.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/tasks?date=${today}&new=1`}>
            <Button variant="primary" size="sm">
              Add Task
            </Button>
          </Link>
          <Link href="/tasks/templates">
            <Button variant="secondary" size="sm">
              Templates
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">
              Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-400">
              View today&apos;s checklist, complete items, reopen work, and move unfinished tasks
              forward.
            </p>
            <Link href={`/tasks?date=${today}`}>
              <Button variant="secondary" size="sm">
                Open Today
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">
              Reusable Lists
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-400">
              Build opening, closing, cleaning, inventory, and station templates once, then generate
              them when needed.
            </p>
            <Link href="/tasks/templates">
              <Button variant="secondary" size="sm">
                Manage Templates
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-base">
              Daily Ops
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-400">
              Review the full operating plan for the day, including prep queues, calls, todos, and
              event work.
            </p>
            <Link href="/daily">
              <Button variant="secondary" size="sm">
                Open Daily Ops
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
