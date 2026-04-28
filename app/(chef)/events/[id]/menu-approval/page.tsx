import Link from 'next/link'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DinnerCircleMenuPollComposer } from '@/components/events/dinner-circle-menu-poll-composer'
import { MenuApprovalStatus } from '@/components/events/menu-approval-status'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getMenuApprovalStatus, validateMenuForSend } from '@/lib/events/menu-approval-actions'
import { getDinnerCircleMenuPollingState } from '@/lib/hub/menu-poll-actions'
import { getDishIndex } from '@/lib/menus/dish-index-actions'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

export default async function EventMenuApprovalPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, menu_modified_after_approval,
      client:clients(full_name),
      menus(id, name)
    `
    )
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  const [approvalData, validation, canonicalDishIndex, circleGroup] = await Promise.all([
    getMenuApprovalStatus(params.id).catch(() => null),
    validateMenuForSend(params.id).catch(() => null),
    getDishIndex({ limit: 400, sort_by: 'name', sort_dir: 'asc' }).catch(() => ({
      dishes: [],
      total: 0,
    })),
    db
      .from('hub_groups')
      .select('id, group_token')
      .eq('event_id', params.id)
      .eq('tenant_id', user.tenantId!)
      .eq('is_active', true)
      .maybeSingle(),
  ])
  const dinnerCircle = circleGroup?.data ?? null

  const menuPollingState = dinnerCircle
    ? await getDinnerCircleMenuPollingState({
        groupId: dinnerCircle.id,
        eventId: params.id,
        groupToken: dinnerCircle.group_token,
      }).catch(() => null)
    : null
  const circleUrl = dinnerCircle ? `/hub/g/${dinnerCircle.group_token}` : null
  const canonicalDishes = (((canonicalDishIndex as any)?.dishes ?? []) as any[]).map((dish) => ({
    id: dish.id,
    name: dish.name,
    course: dish.course ?? null,
    description: dish.description ?? null,
    dietary_tags: Array.isArray(dish.dietary_tags) ? dish.dietary_tags : [],
    allergen_flags: Array.isArray(dish.allergen_flags) ? dish.allergen_flags : [],
    linked_recipe_id: dish.linked_recipe_id ?? null,
  }))

  const menus = ((event as any).menus ?? []) as Array<{ id: string; name: string | null }>
  const status = ((approvalData as any)?.event?.menu_approval_status ?? 'not_sent') as
    | 'not_sent'
    | 'sent'
    | 'approved'
    | 'revision_requested'
  const showSendValidation =
    status === 'not_sent' ||
    status === 'revision_requested' ||
    Boolean((event as any).menu_modified_after_approval)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={returnTo ?? `/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Back to event
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-stone-100">Menu Approval</h1>
          <p className="mt-1 text-sm text-stone-400">
            {((event as any).client?.full_name as string | undefined) ?? 'Client'} |{' '}
            {event.occasion ?? 'Event'} | {format(new Date(event.event_date), 'MMMM d, yyyy')}
          </p>
        </div>
        {menus[0] ? (
          <Link href={`/menus/${menus[0].id}/editor`}>
            <Button variant="secondary">{menus.length > 1 ? 'Revise Menus' : 'Revise Menu'}</Button>
          </Link>
        ) : null}
      </div>

      <Card className="p-6">
        <MenuApprovalStatus
          eventId={params.id}
          status={status}
          sentAt={(approvalData as any)?.event?.menu_sent_at ?? null}
          approvedAt={(approvalData as any)?.event?.menu_approved_at ?? null}
          revisionNotes={(approvalData as any)?.event?.menu_revision_notes ?? null}
        />
      </Card>

      <DinnerCircleMenuPollComposer
        eventId={params.id}
        circleUrl={circleUrl}
        dishes={canonicalDishes}
        currentState={menuPollingState}
      />

      {(event as any).menu_modified_after_approval ? (
        <Card className="border-amber-200 bg-amber-950 p-6">
          <h2 className="text-lg font-semibold text-amber-200">Approval needs refresh</h2>
          <p className="mt-2 text-sm text-amber-400">
            The menu changed after the client approved it. Review the current dishes, then resend
            the updated menu from this approval surface.
          </p>
        </Card>
      ) : null}

      {showSendValidation && validation ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-stone-100">Send Validation</h2>
          {validation.errors.length > 0 ? (
            <div className="mt-4 rounded-xl border border-rose-800/60 bg-rose-950/40 p-4">
              <p className="text-sm font-medium text-rose-200">Send is blocked</p>
              <ul className="mt-2 space-y-1 text-sm text-rose-300">
                {validation.errors.map((error) => (
                  <li key={error}>- {error}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
              <p className="text-sm font-medium text-emerald-200">
                This menu is ready to send for client approval.
              </p>
            </div>
          )}
          {validation.warnings.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/30 p-4">
              <p className="text-sm font-medium text-amber-200">Warnings</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-300">
                {validation.warnings.map((warning) => (
                  <li key={warning}>- {warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-stone-100">Linked Menus</h2>
        {menus.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">
            No menu is attached to this event yet. Attach or build the menu before starting the
            approval loop.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="flex flex-col gap-3 rounded-xl border border-stone-800 bg-stone-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-stone-100">{menu.name ?? 'Untitled menu'}</p>
                  <p className="text-sm text-stone-400">
                    Open the editor to revise dishes before sending.
                  </p>
                </div>
                <Link href={`/menus/${menu.id}/editor`}>
                  <Button variant="ghost" size="sm">
                    Revise Menu
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
