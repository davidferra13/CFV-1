'use client'

import { useState, useTransition } from 'react'
import {
  assignMemberToMeal,
  unassignMemberFromMeal,
  getAssignableMembers,
} from '@/lib/hub/prep-assignment-actions'

interface PrepAssignmentBadgeProps {
  groupId: string
  mealEntryId: string
  assignedProfileId: string | null
  assignedDisplayName: string | null
  assignmentNotes: string | null
  currentProfileId: string | null
  profileToken: string | null
  isChefOrAdmin: boolean
  onAssigned?: () => void // callback to refresh parent data
}

export function PrepAssignmentBadge({
  groupId,
  mealEntryId,
  assignedProfileId,
  assignedDisplayName,
  assignmentNotes,
  currentProfileId,
  profileToken,
  isChefOrAdmin,
  onAssigned,
}: PrepAssignmentBadgeProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [members, setMembers] = useState<{ profileId: string; displayName: string }[]>([])
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const isAssignedToMe = assignedProfileId && currentProfileId === assignedProfileId

  const handleOpenAssign = async () => {
    if (!isChefOrAdmin || !profileToken) return
    try {
      const result = await getAssignableMembers(groupId)
      setMembers(result)
      setShowDropdown(true)
      setNotes(assignmentNotes ?? '')
    } catch {
      // silently fail - members list couldn't load
    }
  }

  const handleAssign = (profileId: string, displayName: string) => {
    if (!profileToken) return
    startTransition(async () => {
      const result = await assignMemberToMeal({
        groupId,
        profileToken,
        mealEntryId,
        assigneeProfileId: profileId,
        notes: notes.trim() || null,
      })
      if (result.success) {
        setShowDropdown(false)
        onAssigned?.()
      }
    })
  }

  const handleUnassign = () => {
    if (!profileToken) return
    startTransition(async () => {
      const result = await unassignMemberFromMeal({
        groupId,
        profileToken,
        mealEntryId,
      })
      if (result.success) {
        onAssigned?.()
      }
    })
  }

  // No assignment, not a chef - show nothing
  if (!assignedProfileId && !isChefOrAdmin) return null

  // No assignment, chef can assign
  if (!assignedProfileId && isChefOrAdmin) {
    return (
      <div className="relative mt-1">
        <button
          type="button"
          onClick={handleOpenAssign}
          className="rounded-full border border-dashed border-stone-700 px-2 py-0.5 text-[10px] text-stone-600 hover:border-stone-500 hover:text-stone-400 transition-colors"
        >
          + Assign helper
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-stone-700 bg-stone-900 p-2 shadow-xl">
              <p className="mb-1.5 text-[10px] font-medium text-stone-400">Assign to:</p>
              <div className="max-h-32 space-y-0.5 overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.profileId}
                    type="button"
                    onClick={() => handleAssign(m.profileId, m.displayName)}
                    disabled={isPending}
                    className="w-full rounded px-2 py-1 text-left text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-50"
                  >
                    {m.displayName}
                  </button>
                ))}
                {members.length === 0 && (
                  <p className="px-2 py-1 text-xs text-stone-600">No members found</p>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions for this person (optional)..."
                className="mt-2 w-full rounded bg-stone-800 px-2 py-1 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:ring-1 focus:ring-[var(--hub-primary,#e88f47)]"
                rows={2}
                maxLength={2000}
              />
            </div>
          </>
        )}
      </div>
    )
  }

  // Has assignment
  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        {isAssignedToMe ? (
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
            Your task
          </span>
        ) : (
          <span className="rounded-full bg-stone-700/60 px-2 py-0.5 text-[10px] text-stone-400">
            {assignedDisplayName}
          </span>
        )}
        {isChefOrAdmin && (
          <button
            type="button"
            onClick={handleUnassign}
            disabled={isPending}
            className="text-[10px] text-stone-600 hover:text-red-400 disabled:opacity-50"
            title="Remove assignment"
          >
            x
          </button>
        )}
        {assignmentNotes && (
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="text-[10px] text-stone-600 hover:text-stone-300"
            title={showNotes ? 'Hide notes' : 'Show notes'}
          >
            {showNotes ? '...' : 'notes'}
          </button>
        )}
      </div>

      {/* Assignment notes (expanded) */}
      {showNotes && assignmentNotes && (
        <div className="mt-1 rounded bg-blue-950/30 border border-blue-900/30 px-2 py-1">
          <p className="text-[10px] text-blue-200/80 leading-relaxed whitespace-pre-line">
            {assignmentNotes}
          </p>
        </div>
      )}
    </div>
  )
}
