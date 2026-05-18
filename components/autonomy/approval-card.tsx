'use client'

import { type ChangeEvent, useState } from 'react'
import { Check, Pencil, ShieldAlert, Trash2, X } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ActionPreview } from './action-preview'
import type { ApprovalRequest, AutonomyRiskLevel } from './types'

type ApprovalCardProps = {
  approval: ApprovalRequest
  onApprove?: (approvalId: string, editedDraft?: string) => void
  onReject?: (approvalId: string, reason?: string) => void
  onEdit?: (approvalId: string, draftText: string) => void
  disabled?: boolean
}

const riskBadgeVariant: Record<AutonomyRiskLevel, BadgeProps['variant']> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
}

const riskLabels: Record<AutonomyRiskLevel, string> = {
  low: 'Low risk',
  medium: 'Review',
  high: 'High risk',
}

function clampConfidence(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onEdit,
  disabled,
}: ApprovalCardProps) {
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(approval.preview.draftText ?? '')
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const confidence = clampConfidence(approval.confidence)
  const canEdit = Boolean(approval.preview.draftText)
  const isDisabled = disabled || approval.status === 'approved' || approval.status === 'rejected'

  function handleApprove() {
    onApprove?.(approval.id, editing ? draftText : undefined)
    setEditing(false)
  }

  function handleSaveEdit() {
    onEdit?.(approval.id, draftText)
    setEditing(false)
  }

  function handleReject() {
    onReject?.(approval.id, rejectReason.trim() || undefined)
    setRejecting(false)
    setRejectReason('')
  }

  return (
    <Card className="overflow-hidden">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={riskBadgeVariant[approval.riskLevel]}>
                {riskLabels[approval.riskLevel]}
              </Badge>
              <Badge variant="default" className="capitalize">
                {approval.domain}
              </Badge>
              {approval.createdAtLabel && (
                <span className="text-xs text-stone-500">{approval.createdAtLabel}</span>
              )}
            </div>
            <h3 className="text-base font-semibold leading-6 text-stone-50">{approval.title}</h3>
            {(approval.affectedName || approval.affectedDetail) && (
              <p className="mt-1 text-sm text-stone-400">
                {approval.affectedName}
                {approval.affectedName && approval.affectedDetail ? ' - ' : ''}
                {approval.affectedDetail}
              </p>
            )}
          </div>

          <div className="min-w-[132px] rounded-lg border border-stone-800 bg-stone-950/60 p-3">
            <div className="flex items-center justify-between gap-3 text-xs text-stone-400">
              <span>Confidence</span>
              <span className="font-medium text-stone-200">{confidence}%</span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-800"
              role="meter"
              aria-label={`Confidence ${confidence} percent`}
              aria-valuenow={confidence}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full ${
                  confidence >= 80
                    ? 'bg-emerald-500'
                    : confidence >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            {approval.dueLabel && (
              <p className="mt-2 text-xs text-stone-500">{approval.dueLabel}</p>
            )}
          </div>
        </div>

        <ActionPreview preview={approval.preview} compact={editing} />

        {editing && (
          <Textarea
            label="Edit draft"
            value={draftText}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraftText(event.target.value)}
            rows={6}
            helperText="Approve will use this edited version."
          />
        )}

        {rejecting && (
          <Textarea
            label="Rejection reason"
            value={rejectReason}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setRejectReason(event.target.value)
            }
            rows={3}
            helperText="Optional. This helps the autonomy engine learn."
          />
        )}

        {approval.riskLevel === 'high' && (
          <div className="flex items-start gap-2 rounded-lg border border-red-800/70 bg-red-950/40 p-3 text-sm text-red-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Review carefully before approval. This action can affect money, client trust, or
              schedule commitments.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-stone-800 bg-stone-900/50 p-4 sm:flex-row sm:items-center sm:justify-end">
        {editing ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isDisabled}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Save edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={isDisabled}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          </>
        ) : (
          canEdit && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
              disabled={isDisabled}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          )
        )}

        {rejecting ? (
          <>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleReject}
              disabled={isDisabled}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Reject
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRejecting(false)}
              disabled={isDisabled}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRejecting(true)}
            disabled={isDisabled}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        )}

        <Button type="button" size="sm" onClick={handleApprove} disabled={isDisabled}>
          <Check className="h-4 w-4" aria-hidden="true" />
          Approve
        </Button>
      </div>
    </Card>
  )
}
