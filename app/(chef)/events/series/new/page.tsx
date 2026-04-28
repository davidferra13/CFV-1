import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { createEventSeries } from '@/lib/events/series-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'New Event Series' }

const SERVICE_MODES = [
  { value: 'one_time', label: 'One-time series' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'multi_day', label: 'Multi-day' },
  { value: 'package', label: 'Package' },
] as const

export default async function NewEventSeriesPage() {
  await requireChef()
  const clients = (await getClients()) as Array<{
    id: string
    full_name: string | null
    email: string | null
  }>

  async function createSeriesAction(formData: FormData) {
    'use server'

    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const serviceMode = String(formData.get('serviceMode') ?? 'one_time') as
      | 'one_time'
      | 'recurring'
      | 'multi_day'
      | 'package'
    const startDate = String(formData.get('startDate') ?? '').trim()
    const endDate = String(formData.get('endDate') ?? '').trim()
    const baseGuestCountValue = String(formData.get('baseGuestCount') ?? '').trim()
    const clientId = String(formData.get('clientId') ?? '').trim()

    const series = await createEventSeries({
      name,
      description: description || null,
      serviceMode,
      startDate: startDate || null,
      endDate: endDate || null,
      baseGuestCount: baseGuestCountValue ? Number(baseGuestCountValue) : null,
      clientId: clientId || null,
    })

    redirect(`/events/series/${series.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Create Event Series</h1>
        <p className="mt-1 text-sm text-stone-400">
          Group related events so revenue, margin, and execution details stay connected.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={createSeriesAction} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-300">
                Series name
              </label>
              <input
                id="name"
                name="name"
                required
                maxLength={200}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Spring supper club"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-sm font-medium text-stone-300"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={2000}
                className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder="Theme, cadence, client notes, or package context"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="serviceMode"
                  className="mb-1.5 block text-sm font-medium text-stone-300"
                >
                  Service mode
                </label>
                <select
                  id="serviceMode"
                  name="serviceMode"
                  defaultValue="one_time"
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {SERVICE_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="clientId"
                  className="mb-1.5 block text-sm font-medium text-stone-300"
                >
                  Client
                </label>
                <select
                  id="clientId"
                  name="clientId"
                  defaultValue=""
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">No client selected</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name ?? client.email ?? 'Unnamed client'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1.5 block text-sm font-medium text-stone-300"
                >
                  Start date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1.5 block text-sm font-medium text-stone-300"
                >
                  End date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="baseGuestCount"
                  className="mb-1.5 block text-sm font-medium text-stone-300"
                >
                  Base guests
                </label>
                <input
                  id="baseGuestCount"
                  name="baseGuestCount"
                  type="number"
                  min={1}
                  step={1}
                  className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="12"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Link
                href="/events/series"
                className="inline-flex min-h-[44px] items-center rounded-lg px-5 py-2.5 text-sm font-medium text-stone-300 hover:bg-stone-800 hover:text-stone-100"
              >
                Cancel
              </Link>
              <Button type="submit">Create Series</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
