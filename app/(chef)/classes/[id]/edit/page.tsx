import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'
import { ClassForm } from '@/components/classes/class-form'
import { getClassDetail } from '@/lib/classes/class-actions'

export const metadata: Metadata = { title: 'Edit Class' }

type EditClassPageProps = {
  params: { id: string }
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  await requireChef()

  const detail = await getClassDetail(params.id)
  if (!detail) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Edit Class</h1>
          <p className="mt-1 text-stone-400">{detail.classData.title}</p>
        </div>
        <Button href={`/classes/${detail.classData.id}`} variant="ghost">
          Back to Class
        </Button>
      </div>

      <ClassForm existingClass={detail.classData} />
    </div>
  )
}
