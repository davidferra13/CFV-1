'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChefGuestPanel } from '@/components/sharing/chef-guest-panel'

type EventShare = {
  id: string
  token?: string | null
  is_active?: boolean | null
  created_at?: string | null
  expires_at?: string | null
  visibility_settings?: unknown
}

type Guest = {
  id: string
  full_name: string
  email: string | null
  rsvp_status: string
  attendance_queue_status?: string | null
  dietary_restrictions: string[] | null
  allergies: string[] | null
  notes: string | null
  plus_one: boolean
}

type RSVPSummary = {
  total_guests?: number
  attending_count?: number
  declined_count?: number
  maybe_count?: number
  pending_count?: number
  waitlisted_count?: number
  plus_one_count?: number
  all_dietary_restrictions?: string[] | null
  all_allergies?: string[] | null
}

type Collaborator = {
  id?: string | null
  role?: string | null
  status?: string | null
  chef?: {
    display_name?: string | null
    business_name?: string | null
  } | null
}

type CollaborateSectionProps = {
  eventStatus: string
  eventGuestCount: number | null
  activeShare: EventShare | null
  shares: EventShare[]
  guests: Guest[]
  rsvpSummary: RSVPSummary
  collaborators: Collaborator[]
  shortShareUrl: string | null
  fullShareUrl: string | null
}

function formatShareDate(value?: string | null) {
  if (!value) return 'No date recorded'

  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return 'Invalid date'
  }
}

function getCollaboratorName(collaborator: Collaborator) {
  return (
    collaborator.chef?.display_name ||
    collaborator.chef?.business_name ||
    collaborator.role ||
    'Collaborator'
  )
}

export function CollaborateSection({
  eventStatus,
  eventGuestCount,
  activeShare,
  shares,
  guests,
  rsvpSummary,
  collaborators,
  shortShareUrl,
  fullShareUrl,
}: CollaborateSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (eventStatus === 'draft' || eventStatus === 'cancelled') return null

  const summary = {
    total_guests: rsvpSummary.total_guests ?? 0,
    attending_count: rsvpSummary.attending_count ?? 0,
    declined_count: rsvpSummary.declined_count ?? 0,
    maybe_count: rsvpSummary.maybe_count ?? 0,
    pending_count: rsvpSummary.pending_count ?? 0,
    waitlisted_count: rsvpSummary.waitlisted_count ?? 0,
    plus_one_count: rsvpSummary.plus_one_count ?? 0,
    all_dietary_restrictions: rsvpSummary.all_dietary_restrictions ?? null,
    all_allergies: rsvpSummary.all_allergies ?? null,
  }
  const respondedCount = Math.max(0, summary.total_guests - summary.pending_count)
  const acceptedCollaborators = collaborators.filter((collaborator) => {
    return collaborator.status === 'accepted'
  })

  return (
    <Card id="collaborate" className="p-6 scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-stone-100">Collaborate</h2>
            {activeShare ? (
              <Badge variant="success">Share active</Badge>
            ) : (
              <Badge>Not shared</Badge>
            )}
            {acceptedCollaborators.length > 0 && (
              <Badge variant="info">
                {acceptedCollaborators.length} chef collaborator
                {acceptedCollaborators.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-400">
            Review chef collaborators, guest shares, and RSVP status from the event record.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-expanded={isOpen}
          aria-controls="collaborate-panel"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? 'Hide Collaborate' : 'Open Collaborate'}
        </Button>
      </div>

      {isOpen && (
        <div
          id="collaborate-panel"
          className="mt-5 space-y-5 rounded-lg border border-stone-800 p-4"
        >
          <p className="text-sm font-medium text-stone-200">
            {respondedCount} of {summary.total_guests} RSVP
            {summary.total_guests === 1 ? '' : 's'} recorded
          </p>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-stone-900/70 p-3">
              <p className="text-xs text-stone-500">Attending</p>
              <p className="mt-1 text-2xl font-semibold text-stone-100">
                {summary.attending_count}
              </p>
            </div>
            <div className="rounded-lg bg-stone-900/70 p-3">
              <p className="text-xs text-stone-500">Maybe</p>
              <p className="mt-1 text-2xl font-semibold text-stone-100">{summary.maybe_count}</p>
            </div>
            <div className="rounded-lg bg-stone-900/70 p-3">
              <p className="text-xs text-stone-500">Pending</p>
              <p className="mt-1 text-2xl font-semibold text-stone-100">{summary.pending_count}</p>
            </div>
            <div className="rounded-lg bg-stone-900/70 p-3">
              <p className="text-xs text-stone-500">Plus-ones</p>
              <p className="mt-1 text-2xl font-semibold text-stone-100">{summary.plus_one_count}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-stone-800 p-4">
              <h3 className="text-sm font-semibold text-stone-200">Guest RSVPs</h3>
              <div className="mt-4">
                <ChefGuestPanel
                  eventShareId={activeShare?.id || null}
                  guests={guests}
                  summary={summary}
                  originalGuestCount={eventGuestCount}
                  visibility={(activeShare?.visibility_settings as any) || null}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-stone-800 p-4">
                <h3 className="text-sm font-semibold text-stone-200">Event Shares</h3>
                {shares.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {shares.map((share) => (
                      <div key={share.id} className="rounded-lg bg-stone-900/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-stone-500">
                            Created {formatShareDate(share.created_at)}
                          </span>
                          <Badge variant={share.is_active ? 'success' : 'default'}>
                            {share.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {share.expires_at && (
                          <p className="mt-2 text-xs text-stone-500">
                            Expires {formatShareDate(share.expires_at)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-500">
                    No guest share links exist for this event yet.
                  </p>
                )}
                {activeShare && shortShareUrl && (
                  <div className="mt-4 border-t border-stone-800 pt-4">
                    <p className="text-xs text-stone-500">Active guest link</p>
                    <p className="mt-1 break-all text-xs text-stone-300">{shortShareUrl}</p>
                    {fullShareUrl && (
                      <Button
                        href={fullShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                      >
                        Open Share
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-stone-800 p-4">
                <h3 className="text-sm font-semibold text-stone-200">Chef Collaborators</h3>
                {acceptedCollaborators.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {acceptedCollaborators.map((collaborator, index) => (
                      <div
                        key={collaborator.id || `${collaborator.role}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-stone-900/70 px-3 py-2"
                      >
                        <span className="text-sm text-stone-200">
                          {getCollaboratorName(collaborator)}
                        </span>
                        {collaborator.role && <Badge variant="info">{collaborator.role}</Badge>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-500">
                    No accepted chef collaborators are attached to this event.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
