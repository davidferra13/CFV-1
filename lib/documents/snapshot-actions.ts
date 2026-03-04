'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type SnapshotDocumentType =
  | 'summary'
  | 'grocery'
  | 'foh'
  | 'prep'
  | 'execution'
  | 'checklist'
  | 'packing'
  | 'reset'
  | 'travel'
  | 'shots'
  | 'all'

export const SNAPSHOT_DOCUMENT_LABELS: Record<SnapshotDocumentType, string> = {
  summary: 'Event Summary',
  grocery: 'Grocery List',
  foh: 'Front-of-House Menu',
  prep: 'Prep Sheet',
  execution: 'Execution Sheet',
  checklist: 'Non-Negotiables Checklist',
  packing: 'Packing List',
  reset: 'Post-Service Reset Checklist',
  travel: 'Travel Route',
  shots: 'Content Asset Capture Sheet',
  all: 'Full 8-Sheet Packet',
}

export type EventDocumentSnapshot = {
  id: string
  eventId: string
  documentType: SnapshotDocumentType
  versionNumber: number
  filename: string
  sizeBytes: number
  generatedAt: string
  generatedBy: string | null
}

export type RecentDocumentSnapshot = EventDocumentSnapshot & {
  eventOccasion: string | null
  eventDate: string | null
  clientName: string | null
}

function mapEventDocumentSnapshot(row: any): EventDocumentSnapshot {
  return {
    id: row.id,
    eventId: row.event_id,
    documentType: row.document_type as SnapshotDocumentType,
    versionNumber: row.version_number,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by ?? null,
  }
}

export async function getEventDocumentSnapshots(
  eventId: string,
  limit = 200
): Promise<EventDocumentSnapshot[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_document_snapshots')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('event_id', eventId)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getEventDocumentSnapshots] Error:', error)
    return []
  }

  return (data ?? []).map(mapEventDocumentSnapshot)
}

export async function getRecentDocumentSnapshots(limit = 80): Promise<RecentDocumentSnapshot[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('event_document_snapshots')
    .select(
      `
      id,
      event_id,
      document_type,
      version_number,
      filename,
      size_bytes,
      generated_at,
      generated_by,
      event:events!inner(
        occasion,
        event_date,
        client:clients(full_name)
      )
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('generated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentDocumentSnapshots] Error:', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...mapEventDocumentSnapshot(row),
    eventOccasion: row.event?.occasion ?? null,
    eventDate: row.event?.event_date ?? null,
    clientName: row.event?.client?.full_name ?? null,
  }))
}
