'use client'

// Quick-Assign Modal (Phase 7)
// 2-tap task assignment: tap task assignee area -> tap staff member -> done.
// Shows only staff with availability today.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTask } from '@/lib/tasks/actions'

type StaffOption = { id: string; name: string; role: string }

type Props = {
  taskId: string
  currentAssignee: string | null
  staff: StaffOption[]
  onDone?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Asst.',
  service_staff: 'Service',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Staff',
}

export function QuickAssign({ taskId, currentAssignee, staff, onDone }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAssign(staffId: string | null) {
    startTransition(async () => {
      try {
        await updateTask(taskId, { assigned_to: staffId })
        setIsOpen(false)
        router.refresh()
        onDone?.()
      } catch (err) {
        console.error('Failed to assign task:', err)
      }
    })
  }

  const currentStaff = staff.find((s) => s.id === currentAssignee)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs px-2 py-1 rounded-md bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
      >
        {currentStaff ? currentStaff.name : 'Assign'}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-stone-700 bg-stone-900 shadow-xl overflow-hidden">
            {/* Unassign option */}
            {currentAssignee && (
              <button
                type="button"
                onClick={() => handleAssign(null)}
                disabled={isPending}
                className="w-full text-left px-3 py-2 text-sm text-stone-400 hover:bg-stone-800 transition-colors border-b border-stone-800 disabled:opacity-40"
              >
                Unassign
              </button>
            )}
            {/* Staff list */}
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleAssign(s.id)}
                disabled={isPending || s.id === currentAssignee}
                className={`w-full text-left px-3 py-2 text-sm transition-colors disabled:opacity-40 ${
                  s.id === currentAssignee
                    ? 'bg-brand-950/30 text-brand-400'
                    : 'text-stone-200 hover:bg-stone-800'
                }`}
              >
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-xs text-stone-500">{ROLE_LABELS[s.role] ?? s.role}</span>
              </button>
            ))}
            {staff.length === 0 && (
              <p className="px-3 py-2 text-xs text-stone-500">No staff members</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
