// Incident Detail Page
// Shows a single incident record with full details and resolution tracking.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncidentResolutionTracker } from '@/components/safety/incident-resolution-tracker'

export const metadata: Metadata = { title: 'Incident Detail - ChefFlow' }

const TYPE_VARIANT: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  food_safety: 'error',
  guest_injury: 'error',
  property_damage: 'warning',
  equipment_failure: 'warning',
  near_miss: 'info',
  other: 'default',
}

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
}

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: incident } = await supabase
    .from('chef_incidents')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!incident) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Incident Report</h1>
          <p className="mt-1 text-sm text-stone-500">#{params.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {incident.incident_type && (
            <Badge variant={TYPE_VARIANT[incident.incident_type] ?? 'default'}>
              {incident.incident_type.replace(/_/g, ' ')}
            </Badge>
          )}
          {incident.resolution_status && (
            <Badge variant={STATUS_VARIANT[incident.resolution_status] ?? 'default'}>
              {incident.resolution_status.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Incident summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incident Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-stone-300">
          {incident.incident_date && (
            <div className="flex gap-2">
              <span className="font-medium text-stone-500 w-28 shrink-0">Date</span>
              <span>
                {new Date(incident.incident_date).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          )}
          {incident.incident_type && (
            <div className="flex gap-2">
              <span className="font-medium text-stone-500 w-28 shrink-0">Type</span>
              <span className="capitalize">{incident.incident_type.replace(/_/g, ' ')}</span>
            </div>
          )}
          {incident.parties_involved && (
            <div className="flex gap-2">
              <span className="font-medium text-stone-500 w-28 shrink-0">Parties</span>
              <span>{incident.parties_involved}</span>
            </div>
          )}
          {incident.description && (
            <div>
              <p className="font-medium text-stone-500 mb-1">Description</p>
              <p className="whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}
          {incident.immediate_action && (
            <div>
              <p className="font-medium text-stone-500 mb-1">Immediate Action Taken</p>
              <p className="whitespace-pre-wrap">{incident.immediate_action}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution tracking */}
      <IncidentResolutionTracker incident={incident} />
    </div>
  )
}
