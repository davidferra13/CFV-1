'use client'

// Table-based view for inquiries with bulk selection support.
// Used in filtered views (not the priority-grouped "all" view).
// Provides Decline and Archive bulk actions.

import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import { BulkSelectTable, type BulkAction } from '@/components/ui/bulk-select-table'
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
} from '@/components/inquiries/inquiry-status-badge'
import { Badge } from '@/components/ui/badge'
import { bulkDeclineInquiries, bulkArchiveInquiries } from '@/lib/inquiries/bulk-actions'

export type SerializedInquiry = {
  id: string
  status: string
  channel: string
  client_name: string
  confirmed_occasion: string | null
  confirmed_date: string | null
  confirmed_guest_count: number | null
  confirmed_budget_cents: number | null
  updated_at: string
  created_at: string
  next_action_required: string | null
  chef_likelihood: string | null
}

interface InquiriesBulkTableProps {
  inquiries: SerializedInquiry[]
}

export function InquiriesBulkTable({ inquiries }: InquiriesBulkTableProps) {
  const bulkActions: BulkAction[] = [
    {
      label: 'Decline',
      variant: 'secondary',
      confirmMessage: 'This will mark all selected inquiries as declined.',
      onClick: async (selectedIds) => {
        try {
          const result = await bulkDeclineInquiries(selectedIds)
          toast.success(`Declined ${result.count} inquir${result.count === 1 ? 'y' : 'ies'}`)
        } catch (err) {
          toast.error('Failed to decline inquiries')
        }
      },
    },
    {
      label: 'Archive',
      variant: 'danger',
      confirmMessage:
        'This will archive the selected inquiries. They will no longer appear in your pipeline.',
      onClick: async (selectedIds) => {
        try {
          const result = await bulkArchiveInquiries(selectedIds)
          toast.success(`Archived ${result.count} inquir${result.count === 1 ? 'y' : 'ies'}`)
        } catch (err) {
          toast.error('Failed to archive inquiries')
        }
      },
    },
  ]

  return (
    <BulkSelectTable
      items={inquiries}
      bulkActions={bulkActions}
      renderHeader={() => (
        <>
          <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
            Lead
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
            Channel
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
            Occasion
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
            Date
          </th>
          <th className="px-4 py-3 text-right text-xs font-medium text-stone-400 uppercase tracking-wider">
            Guests
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">
            Updated
          </th>
        </>
      )}
      renderRow={(inquiry) => (
        <>
          <td className="px-4 py-3 font-medium">
            <Link
              href={`/inquiries/${inquiry.id}`}
              className="text-brand-600 hover:text-brand-300 hover:underline"
            >
              {inquiry.client_name}
            </Link>
            {inquiry.chef_likelihood && (
              <Badge
                variant={
                  inquiry.chef_likelihood === 'hot'
                    ? 'error'
                    : inquiry.chef_likelihood === 'warm'
                      ? 'warning'
                      : 'info'
                }
                className="ml-2"
              >
                {inquiry.chef_likelihood.charAt(0).toUpperCase() + inquiry.chef_likelihood.slice(1)}
              </Badge>
            )}
          </td>
          <td className="px-4 py-3">
            <InquiryStatusBadge status={inquiry.status as any} />
          </td>
          <td className="px-4 py-3">
            <InquiryChannelBadge channel={inquiry.channel} />
          </td>
          <td className="px-4 py-3 text-stone-300">{inquiry.confirmed_occasion || '-'}</td>
          <td className="px-4 py-3 text-stone-300">
            {inquiry.confirmed_date ? format(new Date(inquiry.confirmed_date), 'MMM d, yyyy') : '-'}
          </td>
          <td className="px-4 py-3 text-right text-stone-300">
            {inquiry.confirmed_guest_count ?? '-'}
          </td>
          <td className="px-4 py-3 text-stone-400 text-sm">
            {formatDistanceToNow(new Date(inquiry.updated_at), { addSuffix: true })}
          </td>
        </>
      )}
    />
  )
}
