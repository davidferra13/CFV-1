import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getWeeklyPrepDashboard } from '@/lib/scheduling/consolidated-prep-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Weekly Prep Dashboard' }

export default async function WeeklyPrepPage() {
  await requireChef()
  const dashboard = await getWeeklyPrepDashboard()

  const completionPercent =
    dashboard.totalPrepTasks > 0
      ? Math.round((dashboard.completedPrepTasks / dashboard.totalPrepTasks) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/culinary/prep" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Prep Overview
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Weekly Prep Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consolidated prep tasks and grocery needs across all upcoming events (
          {dashboard.dateRange.start} to {dashboard.dateRange.end}).
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold">{dashboard.events.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold">{dashboard.totalPrepTasks}</p>
            <p className="text-xs text-muted-foreground">Prep Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold">{completionPercent}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold">{dashboard.groceryItems.length}</p>
            <p className="text-xs text-muted-foreground">Grocery Items</p>
          </CardContent>
        </Card>
      </div>

      {/* Events */}
      {dashboard.events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 font-semibold">Upcoming Events</h2>
            <div className="flex flex-wrap gap-2">
              {dashboard.events.map((evt) => (
                <Link key={evt.id} href={`/events/${evt.id}`}>
                  <Badge variant="default" className="cursor-pointer px-3 py-1.5">
                    {evt.occasion || 'Event'}
                    {evt.event_date && (
                      <span className="ml-1.5 opacity-70">
                        {new Date(evt.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {evt.guest_count && (
                      <span className="ml-1.5 opacity-50">{evt.guest_count}g</span>
                    )}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prep Tasks */}
      {dashboard.prepTasks.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Prep Tasks</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.prepTasks.map((task) => (
                  <TableRow key={task.taskId}>
                    <TableCell className="font-medium">{task.taskTitle}</TableCell>
                    <TableCell>
                      <Link href={`/events/${task.eventId}`} className="text-sm hover:underline">
                        {task.eventName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {task.taskCategory && <Badge variant="default">{task.taskCategory}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.dueDate
                        ? new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={task.completed ? 'success' : 'warning'}>
                        {task.completed ? 'Done' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Consolidated Grocery List */}
      {dashboard.groceryItems.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Consolidated Grocery List</h2>
              <p className="text-xs text-muted-foreground">
                Ingredients combined across all {dashboard.events.length} events
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Needed For</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.groceryItems.map((item) => (
                  <TableRow key={`${item.ingredientName}-${item.unit}`}>
                    <TableCell className="font-medium">{item.ingredientName}</TableCell>
                    <TableCell className="text-right">
                      {item.totalQuantity % 1 === 0
                        ? item.totalQuantity
                        : item.totalQuantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.unit || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.events.map((evt) => (
                          <Link key={evt.eventId} href={`/events/${evt.eventId}`}>
                            <Badge variant="default" className="cursor-pointer text-[10px]">
                              {evt.eventName}
                              {evt.quantity > 0 && (
                                <span className="ml-1 opacity-60">
                                  ({evt.quantity % 1 === 0 ? evt.quantity : evt.quantity.toFixed(1)}
                                  )
                                </span>
                              )}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {dashboard.events.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No upcoming events in the next two weeks. Check back when events are scheduled.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
