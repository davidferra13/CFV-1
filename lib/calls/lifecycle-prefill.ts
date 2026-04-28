export const LIFECYCLE_CALL_TYPES = [
  'discovery',
  'follow_up',
  'proposal_walkthrough',
  'pre_event_logistics',
  'vendor_supplier',
  'partner',
  'general',
  'prospecting',
] as const

export type LifecycleCallType = (typeof LIFECYCLE_CALL_TYPES)[number]

const lifecycleCallTypeSet = new Set<string>(LIFECYCLE_CALL_TYPES)

export type LifecycleCallHrefInput = {
  callType?: LifecycleCallType | string | null
  clientId?: string | null
  clientName?: string | null
  contactPhone?: string | null
  contactCompany?: string | null
  inquiryId?: string | null
  eventId?: string | null
  title?: string | null
  prepNotes?: string | null
  durationMinutes?: number | string | null
  notifyClient?: boolean | string | null
}

export function normalizeLifecycleCallType(value: string | null | undefined): LifecycleCallType {
  return value && lifecycleCallTypeSet.has(value) ? (value as LifecycleCallType) : 'general'
}

export function normalizeLifecycleCallDuration(
  value: number | string | null | undefined
): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 5 && value <= 480 ? Math.round(value) : undefined
  }

  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 5 && parsed <= 480 ? parsed : undefined
}

export function buildLifecycleCallHref(input: LifecycleCallHrefInput): string {
  const params = new URLSearchParams()
  const duration = normalizeLifecycleCallDuration(input.durationMinutes)

  const values: Record<string, string | null | undefined> = {
    call_type: normalizeLifecycleCallType(input.callType ?? undefined),
    client_id: input.clientId,
    client_name: input.clientName,
    contact_phone: input.contactPhone,
    contact_company: input.contactCompany,
    inquiry_id: input.inquiryId,
    event_id: input.eventId,
    title: input.title,
    prep_notes: input.prepNotes,
    duration_minutes: duration ? String(duration) : undefined,
    notify_client:
      input.notifyClient === true || input.notifyClient === 'true'
        ? 'true'
        : input.notifyClient === false || input.notifyClient === 'false'
          ? 'false'
          : undefined,
  }

  for (const [key, value] of Object.entries(values)) {
    const normalized = value?.trim()
    if (normalized) params.set(key, normalized)
  }

  return `/calls/new?${params.toString()}`
}
