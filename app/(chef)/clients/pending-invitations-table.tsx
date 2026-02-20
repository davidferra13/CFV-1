'use client'

import { useState } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cancelInvitation } from '@/lib/clients/actions'
import { format, differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Tables } from '@/types/database'

interface PendingInvitationsTableProps {
  invitations: Tables<'client_invitations'>[]
}

export function PendingInvitationsTable({ invitations }: PendingInvitationsTableProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function handleCancelInvitation(invitationId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return
    }

    setCancelling(invitationId)
    try {
      await cancelInvitation(invitationId)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel invitation')
    } finally {
      setCancelling(null)
    }
  }

  function copyToClipboard(token: string) {
    const url = `${window.location.origin}/auth/client-signup?token=${token}`
    navigator.clipboard.writeText(url)
    alert('Invitation link copied to clipboard!')
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
                <TableCell className="text-stone-600">{invitation.full_name || '-'}</TableCell>
                <TableCell className="text-stone-600">
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
    </div>
  )
}
