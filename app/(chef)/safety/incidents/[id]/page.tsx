// Incident Detail Page
// Shows a single incident record with full details and resolution tracking.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IncidentResolutionTracker } from '@/components/safety/incident-resolution-tracker'

export const metadata: Metadata = { title: 'Incident Detail — ChefFlow' }

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: incident } = await supabase
    .from('chef_incidents')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', chef.tenantId!)
    .single()

  if (!incident) {
    notFound()
  }

  const severityVariant: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    critical: 'error',
    high: 'error',
    medium: 'warning',
    low: 'info',
  }

  const statusVariant: Record<string, 'warning' | 'success' | 'default'> = {
    open: 'warning',
    resolved: 'success',
    closed: 'default',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">
            {(incident as any).title ?? 'Incident Report'}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Incident #{params.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(incident as any).severity && (
            <Badge variant={severityVariant[(incident as any).severity] ?? 'default'}>
              {(incident as any).severity}
            </Badge>
          )}
          {(incident as any).status && (
            <Badge variant={statusVariant[(incident as any).status] ?? 'default'}>
              {(incident as any).status}
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
          {(incident as any).incident_date && (
            <div className="flex gap-2">
              <span className="font-medium text-stone-500 w-28 shrink-0">Date</span>
              <span>{new Date((incident as any).incident_date).toLocaleDateString()}</span>
            </div>
          )}
          {(incident as any).location && (
            <div className="flex gap-2">
              <span className="font-medium text-stone-500 w-28 shrink-0">Location</span>
              <span>{(incident as any).location}</span>
            </div>
          )}
          {(incident as any).incident_type && (
            <div className="flex gap-2">
              <span className="font-medium text-stone-500 w-28 shrink-0">Type</span>
              <span className="capitalize">
                {(incident as any).incident_type.replace(/_/g, ' ')}
              </span>
            </div>
          )}
          {(incident as any).description && (
            <div>
              <p className="font-medium text-stone-500 mb-1">Description</p>
              <p className="whitespace-pre-wrap">{(incident as any).description}</p>
            </div>
          )}
          {(incident as any).immediate_actions && (
            <div>
              <p className="font-medium text-stone-500 mb-1">Immediate Actions Taken</p>
              <p className="whitespace-pre-wrap">{(incident as any).immediate_actions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution tracking */}
      <IncidentResolutionTracker incident={incident} />
    </div>
  )
}
