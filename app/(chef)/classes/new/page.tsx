import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'
import { ClassForm } from '@/components/classes/class-form'

export const metadata: Metadata = { title: 'New Class' }

export default async function NewClassPage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">New Class</h1>
          <p className="mt-1 text-stone-400">
            Set the schedule, price, capacity, and attendee instructions.
          </p>
        </div>
        <Button href="/classes" variant="ghost">
          Back to Classes
        </Button>
      </div>

      <ClassForm />
    </div>
  )
}
