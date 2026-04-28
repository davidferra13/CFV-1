import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClassRegistrationForm } from '@/components/classes/class-registration-form'
import { ClassRegistrations } from '@/components/classes/class-registrations'
import {
  getClassCapacityStatus,
  getClassDetail,
  getClassDietarySummary,
} from '@/lib/classes/class-actions'

export const metadata: Metadata = { title: 'Class Detail' }

type ClassDetailPageProps = {
  params: { id: string }
}

const STATUS_BADGE_MAP: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  published: 'success',
  full: 'warning',
  completed: 'info',
  cancelled: 'error',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatListLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  await requireChef()

  const detail = await getClassDetail(params.id)
  if (!detail) {
    notFound()
  }

  const [capacity, dietarySummary] = await Promise.all([
    getClassCapacityStatus(params.id),
    getClassDietarySummary(params.id),
  ])
  const { classData, registrations } = detail

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-stone-100">{classData.title}</h1>
            <Badge variant={STATUS_BADGE_MAP[classData.status] ?? 'default'}>
              {classData.status}
            </Badge>
          </div>
          <p className="text-stone-400">{formatDate(classData.class_date)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/classes" variant="ghost">
            Back
          </Button>
          <Button href={`/classes/${classData.id}/edit`} variant="secondary">
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-100">
              {formatPrice(classData.price_per_person_cents)}
            </p>
            <p className="mt-1 text-sm text-stone-500">per person</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-100">{classData.duration_minutes}</p>
            <p className="mt-1 text-sm text-stone-500">minutes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-100">{capacity.registered}</p>
            <p className="mt-1 text-sm text-stone-500">of {capacity.maxCapacity} seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-stone-100">{capacity.waitlisted}</p>
            <p className="mt-1 text-sm text-stone-500">{capacity.available} available</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {classData.description ? (
                <p className="whitespace-pre-wrap text-stone-300">{classData.description}</p>
              ) : (
                <p className="text-sm text-stone-500">No description added.</p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-stone-400">Location</p>
                  <p className="mt-1 text-stone-100">{classData.location || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-400">Registration Deadline</p>
                  <p className="mt-1 text-stone-100">
                    {classData.registration_deadline
                      ? formatDate(classData.registration_deadline)
                      : 'No deadline'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-400">Cuisine</p>
                  <p className="mt-1 text-stone-100">{classData.cuisine_type || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-400">Skill Level</p>
                  <p className="mt-1 text-stone-100">
                    {classData.skill_level ? formatListLabel(classData.skill_level) : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-stone-400">What to Bring</p>
                  {classData.what_to_bring && classData.what_to_bring.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-300">
                      {classData.what_to_bring.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-stone-500">Nothing listed.</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-400">Included</p>
                  {classData.what_included && classData.what_included.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-300">
                      {classData.what_included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-stone-500">Nothing listed.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <ClassRegistrations
            classId={classData.id}
            registrations={registrations}
            capacity={capacity}
            dietarySummary={dietarySummary}
          />
        </div>

        <div className="space-y-6">
          <ClassRegistrationForm classData={classData} capacity={capacity} />
        </div>
      </div>
    </div>
  )
}
