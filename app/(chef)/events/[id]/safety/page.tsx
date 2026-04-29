import Link from 'next/link'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { AllergyCardButton } from '@/components/events/allergy-card-button'
import { AllergenConflictAlert } from '@/components/events/allergen-conflict-alert'
import { CrossContaminationChecklist } from '@/components/events/cross-contamination-checklist'
import { DietaryConflictAlert } from '@/components/events/dietary-conflict-alert'
import { AllergyRecordsPanel } from '@/components/clients/allergy-records-panel'
import { Card } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { getOrCreateCrossContaminationChecklist } from '@/lib/events/cross-contamination-actions'

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const raw of values) {
    const value = String(raw ?? '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function safetyKey(value: string): string {
  return value.trim().toLowerCase()
}

type HandoffLink = {
  href: string
  label: string
  title: string
  body: string
}

export default async function EventSafetyPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, client_id, allergies,
      client:clients(id, full_name, allergies)
    `
    )
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  const clientId = ((event as any).client_id as string | null) ?? null

  const [allergyRecords, guests, dietaryConflicts, allergyCardReady] = await Promise.all([
    clientId
      ? db
          .from('client_allergy_records')
          .select(
            'id, allergen, severity, source, confirmed_by_chef, confirmed_at, notes, created_at'
          )
          .eq('client_id', clientId)
          .eq('tenant_id', user.tenantId!)
          .order('confirmed_by_chef', { ascending: true })
          .order('created_at', { ascending: false })
          .then((result: any) => result.data ?? [])
      : Promise.resolve([]),
    db
      .from('event_guests')
      .select('allergies, plus_one_allergies')
      .eq('event_id', params.id)
      .eq('tenant_id', user.tenantId!)
      .then((result: any) => result.data ?? []),
    db
      .from('dietary_conflict_alerts')
      .select('id, guest_name, allergy, conflicting_dish, severity, acknowledged')
      .eq('event_id', params.id)
      .eq('chef_id', user.tenantId!)
      .order('acknowledged', { ascending: true })
      .then((result: any) => result.data ?? [])
      .catch(() => []),
    hasAllergyData(params.id).catch(() => false),
  ])

  const allergens = uniqueStrings([
    ...((((event as any).allergies ?? []) as string[]) ?? []),
    ...((((event as any).client?.allergies ?? []) as string[]) ?? []),
    ...(allergyRecords as Array<{ allergen: string }>).map((record) => record.allergen),
    ...(guests as any[]).flatMap((guest) => [
      ...(((guest.allergies ?? []) as string[]) ?? []),
      ...(((guest.plus_one_allergies ?? []) as string[]) ?? []),
    ]),
  ])

  const checklist =
    allergens.length > 0
      ? await getOrCreateCrossContaminationChecklist(params.id, allergens).catch(() => null)
      : null

  const sourceCounts = new Map<string, number>()
  const activeConflictCounts = new Map<string, number>()

  function countSource(value: string | null | undefined) {
    const label = String(value ?? '').trim()
    if (!label) return
    const key = safetyKey(label)
    sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1)
  }

  ;(((event as any).allergies ?? []) as string[]).forEach(countSource)
  ;(((event as any).client?.allergies ?? []) as string[]).forEach(countSource)
  ;(allergyRecords as Array<{ allergen: string }>).forEach((record) => countSource(record.allergen))
  ;(guests as any[]).forEach((guest) => {
    ;(((guest.allergies ?? []) as string[]) ?? []).forEach(countSource)
    ;(((guest.plus_one_allergies ?? []) as string[]) ?? []).forEach(countSource)
  })
  ;(dietaryConflicts as any[])
    .filter((conflict) => !conflict.acknowledged)
    .forEach((conflict) => {
      const key = safetyKey(String(conflict.allergy ?? ''))
      if (!key) return
      activeConflictCounts.set(key, (activeConflictCounts.get(key) ?? 0) + 1)
    })

  const matrixRows = allergens.map((allergen) => {
    const key = safetyKey(allergen)
    const activeConflicts = activeConflictCounts.get(key) ?? 0
    return {
      allergen,
      sourceCount: sourceCounts.get(key) ?? 1,
      activeConflicts,
      handoffStatus:
        activeConflicts > 0 ? 'Conflict review needed' : checklist ? 'Checklist ready' : 'Pending',
    }
  })

  const unresolvedConflictCount = (dietaryConflicts as any[]).filter(
    (conflict) => !conflict.acknowledged
  ).length
  const matrixConflictCount = matrixRows.reduce((total, row) => total + row.activeConflicts, 0)
  const checklistItems = (
    ((checklist as any)?.items ?? []) as Array<{ completed?: boolean }>
  ).filter(Boolean)
  const checklistComplete =
    allergens.length > 0 &&
    checklistItems.length > 0 &&
    checklistItems.every((item) => item.completed === true)
  const safetyHandoffReady =
    matrixRows.length > 0 &&
    matrixConflictCount === 0 &&
    unresolvedConflictCount === 0 &&
    checklistComplete &&
    allergyCardReady

  let handoffLink: HandoffLink
  if (unresolvedConflictCount > 0 || matrixConflictCount > 0) {
    handoffLink = {
      href: '#dietary-conflict-review',
      label: 'Review unresolved conflicts',
      title: 'Conflict review is next',
      body: `${unresolvedConflictCount || matrixConflictCount} unresolved conflict${
        (unresolvedConflictCount || matrixConflictCount) === 1 ? '' : 's'
      } must be reviewed before prep handoff.`,
    }
  } else if (safetyHandoffReady) {
    handoffLink = {
      href: `/events/${params.id}/mise-en-place?returnTo=${encodeURIComponent(
        `/events/${params.id}/safety`
      )}`,
      label: 'Go to Mise en Place',
      title: 'Safety handoff is ready',
      body: 'The allergy matrix, cross-contamination checklist, and printable card are ready for prep.',
    }
  } else if (allergens.length > 0) {
    handoffLink = {
      href: `/events/${params.id}/menu-approval`,
      label: 'Review menu approval',
      title: 'Approval should happen before prep',
      body: 'Safety data exists, but the checklist or allergy card is not ready for prep handoff yet.',
    }
  } else {
    handoffLink = {
      href: `/events/${params.id}`,
      label: 'Back to event overview',
      title: 'No allergy handoff is needed yet',
      body: 'No restriction matrix is loaded for this event, so the overview is the next source of truth.',
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={`/events/${params.id}`} className="text-sm text-stone-500 hover:text-stone-300">
          Back to event
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Safety Check</h1>
        <p className="mt-1 text-sm text-stone-400">
          {((event as any).client?.full_name as string | undefined) ?? 'Client'} |{' '}
          {event.occasion ?? 'Event'} | {format(new Date(event.event_date), 'MMMM d, yyyy')}
        </p>
      </div>

      <Card className="border-amber-800/50 bg-amber-950/30 p-6">
        <h2 className="text-lg font-semibold text-amber-200">Focused safety surface</h2>
        <p className="mt-2 text-sm text-amber-300">
          This route owns allergy verification, live conflict review, the cross-contamination
          protocol, and the printable allergy handoff. It keeps those actions out of the broader
          service-readiness shell.
        </p>
      </Card>

      {matrixRows.length > 0 ? (
        <Card className="p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Allergy risk matrix</h2>
              <p className="mt-1 text-sm text-stone-400">
                Source count, unresolved conflicts, and kitchen handoff readiness from the loaded
                event safety data.
              </p>
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
              {matrixRows.length} restriction{matrixRows.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 text-xs uppercase tracking-[0.16em] text-stone-500">
                  <th className="py-2 pr-4 font-medium">Restriction</th>
                  <th className="py-2 pr-4 font-medium">Sources</th>
                  <th className="py-2 pr-4 font-medium">Active conflicts</th>
                  <th className="py-2 font-medium">Handoff</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.allergen} className="border-b border-stone-900 last:border-0">
                    <td className="py-3 pr-4 font-medium text-stone-100">{row.allergen}</td>
                    <td className="py-3 pr-4 text-stone-300">{row.sourceCount}</td>
                    <td
                      className={
                        row.activeConflicts > 0
                          ? 'py-3 pr-4 font-semibold text-red-300'
                          : 'py-3 pr-4 text-stone-300'
                      }
                    >
                      {row.activeConflicts}
                    </td>
                    <td className="py-3 text-stone-300">{row.handoffStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {clientId ? (
        <AllergyRecordsPanel clientId={clientId} initialRecords={allergyRecords as any} />
      ) : (
        <Card className="p-6">
          <p className="text-sm text-stone-400">
            This event is not linked to a client record, so there is no allergy source of truth to
            confirm yet.
          </p>
        </Card>
      )}

      <div id="dietary-conflict-review" className="scroll-mt-6 space-y-6">
        <AllergenConflictAlert eventId={params.id} />

        {(dietaryConflicts as any[]).length > 0 ? (
          <DietaryConflictAlert conflicts={dietaryConflicts as any} eventId={params.id} />
        ) : null}
      </div>

      {checklist ? (
        <Card className="p-6">
          <CrossContaminationChecklist
            eventId={params.id}
            allergens={allergens}
            checklist={checklist as any}
          />
        </Card>
      ) : null}

      {allergyCardReady ? (
        <Card className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-100">Kitchen allergy handoff</h2>
              <p className="mt-2 text-sm text-stone-400">
                Print the event-specific allergy card once the verification and conflict steps are
                complete.
              </p>
            </div>
            <AllergyCardButton eventId={params.id} hasAllergyData={allergyCardReady} />
          </div>
        </Card>
      ) : null}

      <Card className="border-stone-800 bg-stone-950/70 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
              Safety handoff
            </p>
            <h2 className="mt-2 text-lg font-semibold text-stone-100">{handoffLink.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-400">{handoffLink.body}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Restrictions</dt>
                <dd className="mt-1 font-medium text-stone-200">{matrixRows.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Conflicts</dt>
                <dd className="mt-1 font-medium text-stone-200">
                  {unresolvedConflictCount || matrixConflictCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Checklist</dt>
                <dd className="mt-1 font-medium text-stone-200">
                  {checklistComplete ? 'Ready' : checklist ? 'Open' : 'Not started'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">Card</dt>
                <dd className="mt-1 font-medium text-stone-200">
                  {allergyCardReady ? 'Ready' : 'Not ready'}
                </dd>
              </div>
            </dl>
          </div>
          <Link
            href={handoffLink.href}
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-white"
          >
            {handoffLink.label}
          </Link>
        </div>
      </Card>
    </div>
  )
}
