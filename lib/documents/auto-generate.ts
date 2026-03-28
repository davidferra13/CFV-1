'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getDocumentReadiness, type DocumentReadiness } from './actions'
import { revalidatePath } from 'next/cache'

// Maps document types to human-readable names
const DOC_TYPE_LABELS: Record<keyof DocumentReadiness, string> = {
  eventSummary: 'Event Summary',
  groceryList: 'Grocery List',
  frontOfHouseMenu: 'Front of House Menu',
  prepSheet: 'Prep Sheet',
  executionSheet: 'Execution Sheet',
  checklist: 'Checklist',
  packingList: 'Packing List',
  resetChecklist: 'Reset Checklist',
  travelRoute: 'Travel Route',
}

// Maps readiness keys to API request doc types
const DOC_TYPE_API_MAP: Record<keyof DocumentReadiness, string> = {
  eventSummary: 'summary',
  groceryList: 'grocery',
  frontOfHouseMenu: 'foh',
  prepSheet: 'prep',
  executionSheet: 'execution',
  checklist: 'checklist',
  packingList: 'packing',
  resetChecklist: 'reset',
  travelRoute: 'travel',
}

export type DocumentReadinessStatus = {
  type: string
  label: string
  status: 'generated' | 'ready' | 'blocked'
  missingFields: string[]
}

/**
 * Returns a list of all document types with their generation readiness status.
 * Checks both what's ready to generate AND what's already been generated.
 */
export async function getDocumentReadinessStatus(
  eventId: string
): Promise<DocumentReadinessStatus[]> {
  await requireChef()

  const readiness = await getDocumentReadiness(eventId)

  const results: DocumentReadinessStatus[] = []

  for (const [key, check] of Object.entries(readiness) as [
    keyof DocumentReadiness,
    { ready: boolean; missing: string[] },
  ][]) {
    results.push({
      type: DOC_TYPE_API_MAP[key],
      label: DOC_TYPE_LABELS[key],
      status: check.ready ? 'ready' : 'blocked',
      missingFields: check.missing,
    })
  }

  return results
}

/**
 * Returns which documents can be generated right now for an event.
 * Pure readiness check, no side effects.
 */
export async function getReadyDocumentTypes(eventId: string): Promise<string[]> {
  await requireChef()

  const readiness = await getDocumentReadiness(eventId)
  const ready: string[] = []

  for (const [key, check] of Object.entries(readiness) as [
    keyof DocumentReadiness,
    { ready: boolean; missing: string[] },
  ][]) {
    if (check.ready) {
      ready.push(DOC_TYPE_API_MAP[key])
    }
  }

  return ready
}

/**
 * Generates all ready documents for an event.
 * Non-blocking side effect: failures on individual docs don't block others.
 * Returns results per document type.
 */
export async function generateAllReadyDocuments(eventId: string): Promise<{
  generated: string[]
  failed: string[]
  errors: string[]
}> {
  const user = await requireChef()

  const readyTypes = await getReadyDocumentTypes(eventId)

  if (readyTypes.length === 0) {
    return { generated: [], failed: [], errors: ['No documents are ready to generate'] }
  }

  const generated: string[] = []
  const failed: string[] = []
  const errors: string[] = []

  // Generate each ready document type individually
  for (const docType of readyTypes) {
    try {
      // Call the bulk generation API endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3100'}/api/events/${eventId}/documents/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentTypes: [docType] }),
        }
      )

      if (response.ok) {
        generated.push(DOC_TYPE_LABELS[docType as keyof typeof DOC_TYPE_LABELS] || docType)
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        failed.push(docType)
        errors.push(`${docType}: ${errorText}`)
      }
    } catch (err) {
      failed.push(docType)
      errors.push(`${docType}: ${err instanceof Error ? err.message : 'Generation failed'}`)
    }
  }

  revalidatePath(`/events/${eventId}/documents`)
  return { generated, failed, errors }
}
