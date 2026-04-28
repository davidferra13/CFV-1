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

      <AllergenConflictAlert eventId={params.id} />

      {(dietaryConflicts as any[]).length > 0 ? (
        <DietaryConflictAlert conflicts={dietaryConflicts as any} eventId={params.id} />
      ) : null}

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
    </div>
  )
}
