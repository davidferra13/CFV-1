import 'server-only'

import { getCannabisHostAgreement } from '@/lib/chef/cannabis-access-guards'
import { summarizeCompliancePacketCompleteness } from '@/lib/compliance/compliance-packet'
import { CANNABIS_HOST_AGREEMENT_VERSION } from '@/lib/cannabis/host-agreement'

export type CannabisReadinessGateKey =
  | 'host_agreement_signed'
  | 'event_cannabis_enabled'
  | 'menu_attached'
  | 'guest_intake_complete'
  | 'age_consent_acknowledged'
  | 'coa_accepted'
  | 'batch_record_present'
  | 'infusion_plan_saved'
  | 'reconciliation_saved'
  | 'evidence_uploaded'

export type CannabisReadinessGate = {
  key: CannabisReadinessGateKey
  label: string
  passed: boolean
  detail: string
  href?: string
}

export type CannabisReadinessSummary = {
  readyToFinalize: boolean
  gates: CannabisReadinessGate[]
  missing: CannabisReadinessGate[]
}

type AuthLike = {
  id: string
  tenantId?: string | null
}

function gate(
  key: CannabisReadinessGateKey,
  label: string,
  passed: boolean,
  detail: string,
  href?: string
): CannabisReadinessGate {
  return { key, label, passed, detail, href }
}

function hasMenu(event: any, fallbackMenu: any): boolean {
  return (
    (typeof event?.menu_id === 'string' && event.menu_id.trim().length > 0) || !!fallbackMenu?.id
  )
}

export async function getCannabisEventReadiness(
  db: any,
  user: AuthLike,
  eventId: string,
  snapshotId?: string | null
): Promise<CannabisReadinessSummary> {
  if (!user.tenantId) throw new Error('Tenant context is required')

  const { data: event, error: eventError } = await (db
    .from('events' as any)
    .select('id, tenant_id, cannabis_preference, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId)
    .single() as any)

  if (eventError || !event) throw new Error('Event not found')

  const [
    agreement,
    { data: fallbackMenu },
    { data: guestRows },
    { data: profileRows },
    { data: acceptedCoas },
    { data: batchRows },
    { data: infusionRows },
    { data: snapshots },
  ] = await Promise.all([
    getCannabisHostAgreement(user.id, CANNABIS_HOST_AGREEMENT_VERSION),
    db
      .from('menus' as any)
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId)
      .limit(1)
      .maybeSingle() as any,
    db
      .from('event_guests' as any)
      .select('id, guest_token')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId) as any,
    db
      .from('guest_event_profile' as any)
      .select('*')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId) as any,
    db
      .from('regulated_batch_coas' as any)
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('event_id', eventId)
      .eq('evaluation_status', 'accepted') as any,
    db
      .from('regulated_batch_records' as any)
      .select('id, status')
      .eq('tenant_id', user.tenantId)
      .eq('event_id', eventId)
      .in('status', ['ready_for_confirmation', 'released', 'finalized']) as any,
    db
      .from('event_cannabis_course_config' as any)
      .select(
        'id, infusion_enabled, planned_mg_per_guest, regulated_batch_record_id, dose_volume_ml_per_guest'
      )
      .eq('tenant_id', user.tenantId)
      .eq('event_id', eventId)
      .eq('is_active', true) as any,
    db
      .from('cannabis_control_packet_snapshots' as any)
      .select('*')
      .eq('tenant_id', user.tenantId)
      .eq('event_id', eventId)
      .order('version_number', { ascending: false }) as any,
  ])

  const profileByToken = new Map(
    (profileRows ?? [])
      .filter((profile: any) => typeof profile?.guest_token === 'string')
      .map((profile: any) => [profile.guest_token, profile])
  )
  const guests = guestRows ?? []
  const profilesForGuests = guests.map((guest: any) => profileByToken.get(guest.guest_token))
  const intakeComplete =
    guests.length > 0 &&
    profilesForGuests.every((profile: any) => !!profile && profile.final_confirmation === true)
  const participatingProfiles = profilesForGuests.filter(
    (profile: any) => profile?.cannabis_participation === 'participate'
  )
  const acknowledgmentsComplete =
    participatingProfiles.length > 0 &&
    participatingProfiles.every(
      (profile: any) =>
        profile.age_confirmed === true &&
        profile.voluntary_acknowledgment === true &&
        profile.final_confirmation === true
    )

  const infusedRows = (infusionRows ?? []).filter((row: any) => row.infusion_enabled === true)
  const infusionPlanSaved =
    infusedRows.length > 0 &&
    infusedRows.every(
      (row: any) =>
        row.regulated_batch_record_id &&
        Number(row.planned_mg_per_guest ?? 0) > 0 &&
        Number(row.dose_volume_ml_per_guest ?? 0) > 0
    )

  const snapshotRows = snapshots ?? []
  const activeSnapshot =
    (snapshotId ? snapshotRows.find((snapshot: any) => snapshot.id === snapshotId) : null) ??
    snapshotRows[0] ??
    null

  let reconciliation: any = null
  let evidenceRows: any[] = []
  if (activeSnapshot) {
    const [{ data: reconciliationRow }, { data: evidence }] = await Promise.all([
      db
        .from('cannabis_control_packet_reconciliations' as any)
        .select('id')
        .eq('tenant_id', user.tenantId)
        .eq('snapshot_id', activeSnapshot.id)
        .maybeSingle() as any,
      db
        .from('cannabis_control_packet_evidence' as any)
        .select('id, content_type, size_bytes, created_at')
        .eq('tenant_id', user.tenantId)
        .eq('snapshot_id', activeSnapshot.id) as any,
    ])
    reconciliation = reconciliationRow ?? null
    evidenceRows = evidence ?? []
  }

  const packetCompleteness = summarizeCompliancePacketCompleteness({
    packetId: activeSnapshot?.id ?? eventId,
    stage: activeSnapshot?.finalization_locked ? 'finalized' : 'evidence',
    snapshotCreated: !!activeSnapshot,
    reconciliationRecorded: !!reconciliation,
    evidenceItems: evidenceRows.map((item: any) => ({
      id: String(item.id),
      label: 'Evidence',
      contentType: String(item.content_type ?? ''),
      sizeBytes: Number(item.size_bytes ?? 0),
      capturedAt: item.created_at ?? null,
    })),
    finalizedAt: activeSnapshot?.finalized_at ?? null,
  })

  const acceptedCoaCount = (acceptedCoas ?? []).length
  const batchRecordCount = (batchRows ?? []).length

  const gates = [
    gate(
      'host_agreement_signed',
      'Host agreement signed',
      !!agreement,
      agreement ? 'Current cannabis agreement is signed.' : 'Sign the cannabis host agreement.',
      '/cannabis/unlock'
    ),
    gate(
      'event_cannabis_enabled',
      'Event cannabis-enabled',
      event.cannabis_preference === true,
      event.cannabis_preference ? 'Cannabis controls are enabled.' : 'Enable cannabis on the event.'
    ),
    gate(
      'menu_attached',
      'Menu attached',
      hasMenu(event, fallbackMenu),
      hasMenu(event, fallbackMenu) ? 'Menu structure is available.' : 'Attach a menu to the event.',
      `/events/${eventId}`
    ),
    gate(
      'guest_intake_complete',
      'Guest intake complete',
      intakeComplete,
      intakeComplete
        ? 'All guest intake forms are final-confirmed.'
        : 'Every invited guest needs a final intake response.',
      '/cannabis/rsvps'
    ),
    gate(
      'age_consent_acknowledged',
      'Age and consent acknowledged',
      acknowledgmentsComplete,
      acknowledgmentsComplete
        ? 'Participating guests have age and voluntary-consumption acknowledgments.'
        : 'Participating guests must acknowledge age and voluntary participation.',
      '/cannabis/rsvps'
    ),
    gate(
      'coa_accepted',
      'COA accepted',
      acceptedCoaCount > 0,
      acceptedCoaCount > 0
        ? `${acceptedCoaCount} accepted COA on file.`
        : 'Add an accepted COA for this event.',
      '/cannabis/batches'
    ),
    gate(
      'batch_record_present',
      'Batch Record present',
      batchRecordCount > 0,
      batchRecordCount > 0
        ? `${batchRecordCount} verified Batch Record on file.`
        : 'Create a Batch Record from an accepted COA.',
      '/cannabis/batches'
    ),
    gate(
      'infusion_plan_saved',
      'Infusion plan saved',
      infusionPlanSaved,
      infusionPlanSaved
        ? 'Infused courses are linked to verified Batch Records with dose volumes.'
        : 'Link infused courses to a verified Batch Record and target dose.',
      `/cannabis/events/${eventId}/control-packet`
    ),
    gate(
      'reconciliation_saved',
      'Reconciliation saved',
      packetCompleteness.missing.includes('reconciliation') === false,
      reconciliation ? 'Service reconciliation is saved.' : 'Save service reconciliation.',
      `/cannabis/events/${eventId}/control-packet`
    ),
    gate(
      'evidence_uploaded',
      'Evidence uploaded',
      packetCompleteness.missing.includes('evidence') === false,
      evidenceRows.length > 0
        ? `${evidenceRows.length} evidence item uploaded.`
        : 'Upload at least one evidence item.',
      `/cannabis/events/${eventId}/control-packet`
    ),
  ] satisfies CannabisReadinessGate[]

  const missing = gates.filter((item) => !item.passed)
  return {
    readyToFinalize: missing.length === 0,
    gates,
    missing,
  }
}
