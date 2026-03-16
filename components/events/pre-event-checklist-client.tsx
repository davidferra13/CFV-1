'use client'

// Pre-Event Checklist - client confirms dietary prefs, kitchen access, guest count
// before chef begins day-of prep. Addresses #1 client complaint: preference misalignment.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmPreEventChecklist } from '@/lib/events/pre-event-checklist-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { CheckCircle, AlertCircle, ChevronRight } from '@/components/ui/icons'

interface ChecklistSection {
  title: string
  icon: string
  items: { label: string; value: string | null; empty: boolean }[]
  editHref?: string
  editLabel?: string
}

interface PreEventChecklistClientProps {
  event: {
    id: string
    status: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    location_address: string | null
    location_city: string | null
    location_state: string | null
    location_zip: string | null
    special_requests: string | null
    pre_event_checklist_confirmed_at: string | null
    client_journey_note: string | null
  }
  client: {
    full_name: string
    preferred_name: string | null
    dietary_restrictions: string[] | null
    allergies: string[] | null
    dislikes: string[] | null
    spice_tolerance: string | null
    dietary_protocols: string[] | null
    parking_instructions: string | null
    access_instructions: string | null
    kitchen_size: string | null
    kitchen_constraints: string | null
    equipment_available: string[] | null
    house_rules: string | null
  } | null
}

const PROTOCOL_LABELS: Record<string, string> = {
  glp1: 'GLP-1 / Ozempic Support',
  longevity: 'Longevity Protocol',
  low_fodmap: 'Low-FODMAP',
  aip: 'AIP (Autoimmune Protocol)',
  carnivore: 'Carnivore',
  intermittent_fasting: 'Intermittent Fasting',
  dash: 'DASH Diet',
  mediterranean: 'Mediterranean',
}

export function PreEventChecklistClient({ event, client }: PreEventChecklistClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(!!event.pre_event_checklist_confirmed_at)
  const [error, setError] = useState<string | null>(null)

  const firstName = client?.preferred_name || client?.full_name?.split(' ')[0] || 'there'

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      try {
        await confirmPreEventChecklist(event.id)
        setConfirmed(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to confirm. Please try again.')
      }
    })
  }

  // Dietary section items
  const dietaryItems = [
    {
      label: 'Dietary Restrictions',
      value: client?.dietary_restrictions?.length ? client.dietary_restrictions.join(', ') : null,
      empty: !client?.dietary_restrictions?.length,
    },
    {
      label: 'Allergies',
      value: client?.allergies?.length ? client.allergies.join(', ') : null,
      empty: !client?.allergies?.length,
    },
    {
      label: 'Dislikes',
      value: client?.dislikes?.length ? client.dislikes.join(', ') : null,
      empty: !client?.dislikes?.length,
    },
    {
      label: 'Spice Tolerance',
      value: client?.spice_tolerance ? client.spice_tolerance.replace('_', ' ') : null,
      empty: !client?.spice_tolerance,
    },
    {
      label: 'Dietary Protocols',
      value: client?.dietary_protocols?.length
        ? client.dietary_protocols.map((p) => PROTOCOL_LABELS[p] || p).join(', ')
        : null,
      empty: !client?.dietary_protocols?.length,
    },
  ]

  const kitchenItems = [
    {
      label: 'Parking Instructions',
      value: client?.parking_instructions || null,
      empty: !client?.parking_instructions,
    },
    {
      label: 'Access Instructions',
      value: client?.access_instructions || null,
      empty: !client?.access_instructions,
    },
    {
      label: 'Kitchen Size',
      value: client?.kitchen_size || null,
      empty: !client?.kitchen_size,
    },
    {
      label: 'Kitchen Constraints',
      value: client?.kitchen_constraints || null,
      empty: !client?.kitchen_constraints,
    },
    {
      label: 'Equipment Available',
      value: client?.equipment_available?.length ? client.equipment_available.join(', ') : null,
      empty: !client?.equipment_available?.length,
    },
    {
      label: 'House Rules',
      value: client?.house_rules || null,
      empty: !client?.house_rules,
    },
  ]

  if (confirmed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-stone-100 mb-2">All Set, {firstName}!</h2>
          <p className="text-stone-400 mb-6">
            Your details have been confirmed. The chef has everything they need for a perfect event.
          </p>
          <Link href={`/my-events/${event.id}`}>
            <Button variant="primary">Back to Event</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/my-events/${event.id}`}
          className="text-brand-500 hover:text-brand-400 flex items-center gap-2 mb-4 text-sm"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mb-1">Pre-Event Checklist</h1>
        <p className="text-stone-400">
          Confirm your details are correct so the chef can prepare perfectly for{' '}
          <span className="font-medium">{event.occasion || 'your event'}</span> on{' '}
          <span className="font-medium">{format(new Date(event.event_date), 'MMMM d, yyyy')}</span>.
        </p>
      </div>

      {/* Event Summary */}
      <Card className="mb-4 border-brand-100 bg-brand-950">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-stone-500 text-xs mb-0.5">Date</div>
              <div className="font-medium text-stone-100">
                {format(new Date(event.event_date), 'PPP')}
              </div>
            </div>
            <div>
              <div className="text-stone-500 text-xs mb-0.5">Guest Count</div>
              <div className="font-medium text-stone-100">{event.guest_count ?? '-'} guests</div>
            </div>
            {event.location_city && (
              <div className="col-span-2">
                <div className="text-stone-500 text-xs mb-0.5">Location</div>
                <div className="font-medium text-stone-100">
                  {[event.location_address, event.location_city, event.location_state]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-3">
            If the guest count has changed, contact your chef via{' '}
            <Link href="/my-chat" className="text-brand-600 underline">
              Messages
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {/* Dietary Preferences */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your Dietary Preferences</CardTitle>
            <Link
              href="/my-profile"
              className="text-xs text-brand-500 hover:text-brand-400 font-medium"
            >
              Update Profile →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dietaryItems.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4">
              <span className="text-sm text-stone-400 flex-shrink-0">{item.label}</span>
              {item.empty ? (
                <Badge variant="default" className="text-xs">
                  Not set
                </Badge>
              ) : (
                <span className="text-sm font-medium text-stone-100 text-right">{item.value}</span>
              )}
            </div>
          ))}
          {dietaryItems.every((i) => i.empty) && (
            <Alert variant="info">
              <p className="text-sm">
                No dietary preferences on file.{' '}
                <Link href="/my-profile" className="underline font-medium">
                  Add them now
                </Link>{' '}
                so the chef can accommodate you.
              </p>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Kitchen & Access */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kitchen & Access</CardTitle>
            <Link
              href="/my-profile"
              className="text-xs text-brand-500 hover:text-brand-400 font-medium"
            >
              Update Profile →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {kitchenItems.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4">
              <span className="text-sm text-stone-400 flex-shrink-0">{item.label}</span>
              {item.empty ? (
                <Badge variant="default" className="text-xs">
                  Not set
                </Badge>
              ) : (
                <span className="text-sm font-medium text-stone-100 text-right max-w-[60%]">
                  {item.value}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Special Requests */}
      {event.special_requests && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Special Requests</CardTitle>
              <Link
                href="/my-chat"
                className="text-xs text-brand-500 hover:text-brand-400 font-medium"
              >
                Message Chef to Update →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-100">{event.special_requests}</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="error" className="mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </Alert>
      )}

      {/* Confirm Button */}
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 text-center">
        <p className="text-stone-300 mb-4 text-sm">
          Everything above looks correct and the chef has everything they need for a perfect
          evening.
        </p>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isPending}
          className="w-full sm:w-auto px-8"
        >
          {isPending ? 'Confirming...' : 'Everything Looks Good - Confirm Details'}
        </Button>
        <p className="text-xs text-stone-400 mt-3">
          Need to make changes?{' '}
          <Link href="/my-profile" className="text-brand-600 hover:underline">
            Update your profile
          </Link>{' '}
          or{' '}
          <Link href="/my-chat" className="text-brand-600 hover:underline">
            message the chef
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
