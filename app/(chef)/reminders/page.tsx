import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getTodos, getOverdueTodos } from '@/lib/todos/actions'
import { RemindersClient } from './reminders-client'

export const metadata: Metadata = { title: 'Reminders' }

export default async function RemindersPage() {
  await requireChef()

  const [todos, overdue] = await Promise.all([getTodos(), getOverdueTodos()])

  // Merge overdue into main list (dedup by id)
  const overdueIds = new Set(overdue.map((t) => t.id))
  const all = [...overdue, ...todos.filter((t) => !overdueIds.has(t.id))]

  return <RemindersClient initialTodos={all} />
}
