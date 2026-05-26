'use client'

import { useState, useEffect, useTransition } from 'react'
import type { AgreementWithItems, ItemCategory, ItemAssignment } from '@/lib/hub/agreement-types'
import { CATEGORY_LABELS } from '@/lib/hub/agreement-types'
import { AgreementCompensationCard } from './agreement-compensation-card'
import { AgreementChecklistSection } from './agreement-checklist-section'
import { AgreementSignatureBlock } from './agreement-signature-block'
import { AgreementSetupWizard } from './agreement-setup-wizard'
import {
  getAgreement,
  updateAgreementItem,
  completeAgreementItem,
  addCustomItem,
} from '@/lib/hub/agreement-actions'

interface AgreementTabProps {
  groupId: string
  eventId?: string
  hosts: { profileId: string; label: string }[]
  currentProfileId: string
  isHost: boolean
}

export function AgreementTab({
  groupId,
  eventId,
  hosts,
  currentProfileId,
  isHost,
}: AgreementTabProps) {
  const [agreement, setAgreement] = useState<AgreementWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadAgreement()
  }, [groupId, eventId])

  const loadAgreement = async () => {
    setLoading(true)
    const data = await getAgreement(groupId, eventId)
    setAgreement(data)
    setLoading(false)
    if (!data && isHost) setShowWizard(true)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-6 w-48 rounded bg-stone-800" />
        <div className="h-32 rounded bg-stone-800/50" />
        <div className="h-32 rounded bg-stone-800/50" />
      </div>
    )
  }

  if (showWizard || !agreement) {
    if (!isHost) {
      return (
        <div className="p-4 text-center text-sm text-stone-400">
          No collaboration agreement has been created yet.
        </div>
      )
    }
    return (
      <AgreementSetupWizard
        groupId={groupId}
        eventId={eventId}
        hosts={hosts}
        currentProfileId={currentProfileId}
        onComplete={() => {
          setShowWizard(false)
          loadAgreement()
        }}
      />
    )
  }

  const categories = [...new Set(agreement.items.map((i) => i.category))] as ItemCategory[]
  const completedCount = agreement.items.filter((i) => i.status === 'done').length
  const totalCount = agreement.items.length
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleAssignmentChange = (itemId: string, assignment: ItemAssignment) => {
    setAgreement((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) => (i.id === itemId ? { ...i, assignment } : i)),
          }
        : null
    )
    startTransition(async () => {
      await updateAgreementItem({ itemId, assignment })
    })
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setAgreement((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, notes } : i)) }
        : null
    )
    startTransition(async () => {
      await updateAgreementItem({ itemId, notes })
    })
  }

  const handleStatusChange = (itemId: string, status: 'not_started' | 'in_progress' | 'done') => {
    setAgreement((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.id === itemId ? { ...i, status } : i)) }
        : null
    )
    startTransition(async () => {
      if (status === 'done') {
        await completeAgreementItem(itemId)
      } else {
        await updateAgreementItem({ itemId, status })
      }
    })
  }

  const isReadOnly = !isHost
  const isActive = agreement.status === 'active'

  const statusBadge: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'text-stone-400 bg-stone-700/50' },
    pending_signatures: { label: 'Pending Signatures', color: 'text-amber-400 bg-amber-900/30' },
    active: { label: 'Active', color: 'text-green-400 bg-green-900/30' },
    amended: { label: 'Amended (re-sign needed)', color: 'text-red-400 bg-red-900/30' },
    voided: { label: 'Voided', color: 'text-red-400 bg-red-900/30' },
  }

  const badge = statusBadge[agreement.status] || statusBadge.draft

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Collaboration Agreement</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Progress bar (active agreements) */}
      {isActive && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-400">
            <span>Progress</span>
            <span>
              {completedCount}/{totalCount} ({progressPct}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Compensation summary */}
      <AgreementCompensationCard
        model={agreement.compensationModel}
        details={agreement.compensationDetails}
        hosts={hosts}
        onChange={() => {}}
        readOnly={isActive || isReadOnly}
      />

      {/* Checklist by category */}
      {categories.map((cat) => (
        <AgreementChecklistSection
          key={cat}
          category={cat}
          items={agreement.items.filter((i) => i.category === cat)}
          onAssignmentChange={handleAssignmentChange}
          onNotesChange={handleNotesChange}
          onStatusChange={isActive ? handleStatusChange : undefined}
          readOnly={isReadOnly}
          showStatus={isActive}
        />
      ))}

      {/* Signature block */}
      <AgreementSignatureBlock
        agreementId={agreement.id}
        hosts={agreement.hosts}
        currentProfileId={currentProfileId}
        allItemsAssigned={agreement.items.every((i) => i.assignment !== 'unassigned')}
      />
    </div>
  )
}
