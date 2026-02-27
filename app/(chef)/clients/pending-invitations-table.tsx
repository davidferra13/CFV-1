'use client'

import { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { cancelInvitation } from '@/lib/clients/actions'
import { format, differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Tables } from '@/types/database'
import { toast } from 'sonner'

interface PendingInvitationsTableProps {
  invitations: Tables<'client_invitations'>[]
}

export function PendingInvitationsTable({ invitations }: PendingInvitationsTableProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)

  function handleCancelInvitation(invitationId: string) {
    setCancelTargetId(invitationId)
    setShowCancelConfirm(true)
  }

  async function handleConfirmedCancel() {
    if (!cancelTargetId) return
    setShowCancelConfirm(false)
    setCancelling(cancelTargetId)
    try {
      await cancelInvitation(cancelTargetId)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel invitation')
    } finally {
      setCancelling(null)
    }
  }

  function copyToClipboard(token: string) {
    const url = `${window.location.origin}/auth/client-signup?token=${token}`
    navigator.clipboard.writeText(url)
    toast.success('Invitation link copied to clipboard!')
  }

  function getStatus(expiresAt: string) {
    const daysRemaining = differenceInDays(new Date(expiresAt), new Date())

    if (daysRemaining < 0) {
      return { label: 'Expired', variant: 'default' as const }
    } else if (daysRemaining <= 2) {
      return { label: `Expires in ${daysRemaining}d`, variant: 'warning' as const }
    } else {
      return { label: `Expires in ${daysRemaining}d`, variant: 'info' as const }
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => {
            const status = getStatus(invitation.expires_at)
            return (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell className="text-stone-400">{invitation.full_name || '-'}</TableCell>
                <TableCell className="text-stone-400">
                  {format(new Date(invitation.created_at), 'PP')}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(invitation.token)}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cancelling === invitation.id}
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Cancel
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <ConfirmModal
        open={showCancelConfirm}
        title="Cancel this invitation?"
        description="Are you sure you want to cancel this invitation?"
        confirmLabel="Cancel Invitation"
        variant="danger"
        loading={cancelling !== null}
        onConfirm={handleConfirmedCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  )
}
