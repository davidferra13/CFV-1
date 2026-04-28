import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClassList } from '@/components/classes/class-list'
import { getClasses } from '@/lib/classes/class-actions'

export const metadata: Metadata = { title: 'Classes' }

export default async function ClassesPage() {
  await requireChef()

  const classes = await getClasses()
  const now = Date.now()
  const upcomingCount = classes.filter((cls) => new Date(cls.class_date).getTime() >= now).length
  const publishedCount = classes.filter(
    (cls) => cls.status === 'published' || cls.status === 'full'
  ).length
  const draftCount = classes.filter((cls) => cls.status === 'draft').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Classes</h1>
          <p className="mt-1 text-stone-400">
            Plan cooking classes, publish availability, and manage registrations.
          </p>
        </div>
        <Button href="/classes/new">New Class</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-stone-100">{upcomingCount}</p>
            <p className="mt-1 text-sm text-stone-500">scheduled classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-stone-100">{publishedCount}</p>
            <p className="mt-1 text-sm text-stone-500">open or full classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-stone-100">{draftCount}</p>
            <p className="mt-1 text-sm text-stone-500">not yet published</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassList classes={classes} />
        </CardContent>
      </Card>
    </div>
  )
}
