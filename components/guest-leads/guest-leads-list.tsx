'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateGuestLeadStatus, convertLeadToClient } from '@/lib/guest-leads/actions'

type GuestLead = {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  status: string
  event_id: string | null
  converted_client_id: string | null
  created_at: string
}

const STATUS_BADGES: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  new: { label: 'New', variant: 'info' },
  contacted: { label: 'Contacted', variant: 'warning' },
  converted: { label: 'Converted', variant: 'success' },
  archived: { label: 'Archived', variant: 'default' },
}

export function GuestLeadsList({ leads }: { leads: GuestLead[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter)

  async function handleStatusChange(
    leadId: string,
    status: 'new' | 'contacted' | 'converted' | 'archived'
  ) {
    setLoadingId(leadId)
    try {
      await updateGuestLeadStatus(leadId, status)
      router.refresh()
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleConvert(leadId: string) {
    setLoadingId(leadId)
    try {
      const result = await convertLeadToClient(leadId)
      if (result.alreadyConverted) {
        router.push(`/clients/${result.clientId}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to convert lead:', err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'new', 'contacted', 'converted', 'archived'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-stone-900 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_BADGES[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Lead cards */}
      {filtered.length === 0 ? (
        <p className="text-stone-500 text-center py-8">No leads with this status.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const badge = STATUS_BADGES[lead.status] || STATUS_BADGES.new
            const isLoading = loadingId === lead.id
            const date = new Date(lead.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return (
              <Card key={lead.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-100">{lead.name}</h3>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5">{lead.email}</p>
                    {lead.phone && <p className="text-sm text-stone-500">{lead.phone}</p>}
                    {lead.message && (
                      <p className="text-sm text-stone-400 mt-2 bg-stone-800 rounded-lg px-3 py-2">
                        "{lead.message}"
                      </p>
                    )}
                    <p className="text-xs text-stone-400 mt-2">Submitted {date}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-1.5">
                    {lead.status === 'new' && (
                      <>
                        <Button
                          variant="primary"
                          className="text-xs"
                          disabled={isLoading}
                          onClick={() => handleConvert(lead.id)}
                        >
                          Convert to Client
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-xs"
                          disabled={isLoading}
                          onClick={() => handleStatusChange(lead.id, 'contacted')}
                        >
                          Mark Contacted
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs"
                          disabled={isLoading}
                          onClick={() => handleStatusChange(lead.id, 'archived')}
                        >
                          Archive
                        </Button>
                      </>
                    )}
                    {lead.status === 'contacted' && (
                      <>
                        <Button
                          variant="primary"
                          className="text-xs"
                          disabled={isLoading}
                          onClick={() => handleConvert(lead.id)}
                        >
                          Convert to Client
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs"
                          disabled={isLoading}
                          onClick={() => handleStatusChange(lead.id, 'archived')}
                        >
                          Archive
                        </Button>
                      </>
                    )}
                    {lead.status === 'converted' && lead.converted_client_id && (
                      <Button
                        variant="secondary"
                        className="text-xs"
                        href={`/clients/${lead.converted_client_id}`}
                      >
                        View Client
                      </Button>
                    )}
                    {lead.status === 'archived' && (
                      <Button
                        variant="ghost"
                        className="text-xs"
                        disabled={isLoading}
                        onClick={() => handleStatusChange(lead.id, 'new')}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
