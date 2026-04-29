import type {
  OperationalDocumentType,
  SnapshotDocumentType,
} from '@/lib/documents/document-definitions'
import {
  OPERATIONAL_DOCUMENT_TYPES,
  SNAPSHOT_DOCUMENT_TYPES,
} from '@/lib/documents/document-definitions'
import type { DocumentReadiness } from '@/lib/documents/actions'

export type EventOperationPhase =
  | 'plan'
  | 'shop'
  | 'prep'
  | 'pack'
  | 'travel'
  | 'service'
  | 'closeout'
  | 'client'
  | 'venue'
  | 'marketing'

export type EventOperationReadinessKey = keyof DocumentReadiness

export type EventOperationDocument = {
  type: OperationalDocumentType
  title: string
  moment: string
  phase: EventOperationPhase
  description: string
  workspacePath: string
  readinessKey?: EventOperationReadinessKey
  includeInCorePacket: boolean
  includeInPrintCenterPacket: boolean
}

export type EventMobileRunMode = {
  id: 'dop' | 'packing' | 'mise_en_place' | 'travel' | 'closeout'
  title: string
  description: string
  moment: string
  phase: EventOperationPhase
  path: string
}

export type EventSafetyPrint = {
  id: 'allergy-card' | 'beo'
  title: string
  description: string
  hrefType: 'allergy-card' | OperationalDocumentType
  archive: boolean
  requiresAllergyData?: boolean
}

export const EVENT_OPERATION_DOCUMENTS: EventOperationDocument[] = [
  {
    type: 'summary',
    title: 'Event Brief',
    moment: 'Before event',
    phase: 'plan',
    description: 'Client, location, menu, timeline, and operational context in one packet.',
    workspacePath: 'interactive?type=summary',
    readinessKey: 'eventSummary',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'grocery',
    title: 'Shopping List',
    moment: 'Shopping',
    phase: 'shop',
    description: 'Ingredient buying list grouped for store execution.',
    workspacePath: 'interactive?type=grocery',
    readinessKey: 'groceryList',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'foh',
    title: 'Front-of-House Menu',
    moment: 'Client-facing',
    phase: 'client',
    description: 'Clean menu printout for the table, host, or venue team.',
    workspacePath: 'menu-approval',
    readinessKey: 'frontOfHouseMenu',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'prep',
    title: 'Prep Sheet',
    moment: 'Prep',
    phase: 'prep',
    description: 'Station prep, menu-linked work, quantities, and timing controls.',
    workspacePath: 'interactive?type=prep',
    readinessKey: 'prepSheet',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'execution',
    title: 'Execution Sheet',
    moment: 'Service',
    phase: 'service',
    description: 'Fire order, service timing, course controls, and allergy callouts.',
    workspacePath: 'execution',
    readinessKey: 'executionSheet',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'checklist',
    title: 'Pre-Service Checklist',
    moment: 'Service',
    phase: 'service',
    description: 'Non-negotiable checks before service starts.',
    workspacePath: 'safety',
    readinessKey: 'checklist',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'packing',
    title: 'Packing Checklist',
    moment: 'Loadout',
    phase: 'pack',
    description: 'Equipment and transport list for the car, venue, and final pass.',
    workspacePath: 'pack',
    readinessKey: 'packingList',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'reset',
    title: 'Reset Checklist',
    moment: 'Closeout',
    phase: 'closeout',
    description: 'Post-service reset, cleanup, leftovers, and final checks.',
    workspacePath: 'reset',
    readinessKey: 'resetChecklist',
    includeInCorePacket: true,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'travel',
    title: 'Travel Route',
    moment: 'Travel',
    phase: 'travel',
    description: 'Route, parking, stop timing, and venue arrival logistics.',
    workspacePath: 'travel',
    readinessKey: 'travelRoute',
    includeInCorePacket: false,
    includeInPrintCenterPacket: true,
  },
  {
    type: 'shots',
    title: 'Content Shot List',
    moment: 'Marketing',
    phase: 'marketing',
    description: 'Capture checklist for prep, plating, venue, and final dishes.',
    workspacePath: 'story',
    includeInCorePacket: false,
    includeInPrintCenterPacket: false,
  },
  {
    type: 'beo',
    title: 'Banquet Event Order',
    moment: 'Venue handoff',
    phase: 'venue',
    description: 'Consolidated BEO for staff, venue coordinators, and operator handoff.',
    workspacePath: 'documents',
    readinessKey: 'eventSummary',
    includeInCorePacket: false,
    includeInPrintCenterPacket: false,
  },
]

export const EVENT_CORE_PACKET_DOCUMENT_TYPES: OperationalDocumentType[] =
  EVENT_OPERATION_DOCUMENTS.filter((doc) => doc.includeInCorePacket).map((doc) => doc.type)

export const EVENT_PRINT_CENTER_PACKET_TYPES: OperationalDocumentType[] =
  EVENT_OPERATION_DOCUMENTS.filter((doc) => doc.includeInPrintCenterPacket).map((doc) => doc.type)

export const EVENT_SERVICE_PACKET_DOCUMENT_TYPES: OperationalDocumentType[] = [
  'summary',
  'prep',
  'grocery',
  'packing',
  'execution',
  'checklist',
]

export const EVENT_SNAPSHOT_DOCUMENT_TYPES: SnapshotDocumentType[] = [...SNAPSHOT_DOCUMENT_TYPES]

export const EVENT_MOBILE_RUN_MODES: EventMobileRunMode[] = [
  {
    id: 'dop',
    title: 'Day-Of Protocol',
    description: 'Phone-first step list for the event day.',
    moment: 'Service',
    phase: 'service',
    path: 'dop/mobile',
  },
  {
    id: 'packing',
    title: 'Packing Mode',
    description: 'Interactive loadout checklist with packed state.',
    moment: 'Loadout',
    phase: 'pack',
    path: 'pack',
  },
  {
    id: 'mise_en_place',
    title: 'Mise en Place',
    description: 'Prep-stage execution view for kitchen work.',
    moment: 'Prep',
    phase: 'prep',
    path: 'mise-en-place',
  },
  {
    id: 'travel',
    title: 'Travel Plan',
    description: 'Arrival, route, parking, and stop plan.',
    moment: 'Travel',
    phase: 'travel',
    path: 'travel',
  },
  {
    id: 'closeout',
    title: 'Closeout',
    description: 'Post-service wrap, reset, and final event actions.',
    moment: 'Closeout',
    phase: 'closeout',
    path: 'close-out',
  },
]

export const EVENT_SAFETY_PRINTS: EventSafetyPrint[] = [
  {
    id: 'allergy-card',
    title: 'Allergy Card',
    description: 'High-visibility allergy and dietary sheet for hands-on service.',
    hrefType: 'allergy-card',
    archive: false,
    requiresAllergyData: true,
  },
  {
    id: 'beo',
    title: 'Banquet Event Order',
    description: 'Consolidated handoff PDF for venue coordinators and staff.',
    hrefType: 'beo',
    archive: true,
  },
]

export function getEventOperationDocument(type: OperationalDocumentType): EventOperationDocument {
  const doc = EVENT_OPERATION_DOCUMENTS.find((item) => item.type === type)
  if (!doc) {
    throw new Error(`Missing event operation registry entry for ${type}`)
  }
  return doc
}

export function buildEventOperationWorkspaceHref(
  eventId: string,
  docOrType: EventOperationDocument | OperationalDocumentType
): string {
  const doc = typeof docOrType === 'string' ? getEventOperationDocument(docOrType) : docOrType
  return `/events/${eventId}/${doc.workspacePath}`
}

export function buildEventOperationDocumentHref(
  eventId: string,
  type: OperationalDocumentType,
  options: { archive?: boolean } = {}
): string {
  const params = new URLSearchParams({ type })
  if (options.archive) params.set('archive', '1')
  return `/api/documents/${eventId}?${params.toString()}`
}

export function buildEventOperationPacketHref(
  eventId: string,
  types: OperationalDocumentType[],
  options: { archive?: boolean } = {}
): string {
  const params = new URLSearchParams({
    type: 'pack',
    types: types.join(','),
  })
  if (options.archive) params.set('archive', '1')
  return `/api/documents/${eventId}?${params.toString()}`
}

export function getEventMobileRunMode(id: EventMobileRunMode['id']): EventMobileRunMode {
  const mode = EVENT_MOBILE_RUN_MODES.find((item) => item.id === id)
  if (!mode) {
    throw new Error(`Missing event mobile run mode registry entry for ${id}`)
  }
  return mode
}

export function buildEventMobileRunModeHref(
  eventId: string,
  modeOrId: EventMobileRunMode | EventMobileRunMode['id']
): string {
  const mode = typeof modeOrId === 'string' ? getEventMobileRunMode(modeOrId) : modeOrId
  return `/events/${eventId}/${mode.path}`
}

export function buildEventSafetyPrintHref(eventId: string, print: EventSafetyPrint): string {
  const params = new URLSearchParams({ type: print.hrefType })
  if (print.archive) params.set('archive', '1')
  return `/api/documents/${eventId}?${params.toString()}`
}

export function getEventOperationReadiness(
  docOrType: EventOperationDocument | OperationalDocumentType,
  readiness: DocumentReadiness
): { ready: boolean; missing: string[] } {
  const doc = typeof docOrType === 'string' ? getEventOperationDocument(docOrType) : docOrType
  if (!doc.readinessKey) return { ready: true, missing: [] }
  return readiness[doc.readinessKey]
}

export function isEventOperationDocumentReady(
  type: OperationalDocumentType,
  readiness: DocumentReadiness
): boolean {
  return getEventOperationReadiness(type, readiness).ready
}

export function isEventCorePacketDocument(type: OperationalDocumentType): boolean {
  return EVENT_CORE_PACKET_DOCUMENT_TYPES.includes(type)
}

export function listMissingEventOperationRegistryTypes(): OperationalDocumentType[] {
  const registered = new Set(EVENT_OPERATION_DOCUMENTS.map((doc) => doc.type))
  return OPERATIONAL_DOCUMENT_TYPES.filter((type) => !registered.has(type))
}
