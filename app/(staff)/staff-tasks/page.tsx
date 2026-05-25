import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyTasksByStatus } from '@/lib/staff/staff-portal-actions'
import { StaffTaskStatusBoard } from '@/components/staff/staff-task-status-board'

export const metadata: Metadata = { title: 'My Tasks | ChefFlow' }

export default async function StaffTasksPage() {
  await requireStaff()
  const { pending, in_progress, done } = await getMyTasksByStatus()

  return (
    <div className="space-y-6" data-tour="staff-check-tasks">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Tasks</h1>
        <p className="text-sm text-stone-400 mt-1">Tasks assigned to you</p>
      </div>
      <StaffTaskStatusBoard pending={pending} inProgress={in_progress} done={done} />
    </div>
  )
}
