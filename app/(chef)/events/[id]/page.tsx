// Chef Event Detail Page
// Shows comprehensive event information and allows state transitions

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById, getEventClosureStatus, updateEventTimeAndCard } from '@/lib/events/actions'
import { getAARByEventId } from '@/lib/aar/actions'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { getEventExpenses, getEventProfitSummary, getBudgetGuardrail } from '@/lib/expenses/actions'
import { getUnrecordedComponentsForEvent } from '@/lib/recipes/actions'
import { isAIConfigured } from '@/lib/ai/parse'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { getLoyaltyTransactions } from '@/lib/loyalty/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { EventTransitions } from '@/components/events/event-transitions'
import { EventClosureActions } from '@/components/events/event-closure-actions'
import { DocumentSection } from '@/components/documents/document-section'
import { RecipeCapturePrompt } from '@/components/recipes/recipe-capture-prompt'
import { DOPProgressBar } from '@/components/scheduling/dop-view'
import { getEventModifications } from '@/lib/menus/modifications'
import { getUnusedIngredients } from '@/lib/expenses/unused'
import { getSubstitutions } from '@/lib/shopping/substitutions'
import { MenuModifications } from '@/components/events/menu-modifications'
import { UnusedIngredients } from '@/components/events/unused-ingredients'
import { ShoppingSubstitutions } from '@/components/events/shopping-substitutions'
import { TimeTracking } from '@/components/events/time-tracking'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { createServerClient } from '@/lib/supabase/server'

async function getEventFinancialSummary(eventId: string) {
  const supabase = createServerClient()

  // Use the event_financial_summary view
  const { data: summary } = await supabase
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  return {
    totalPaid: summary?.total_paid_cents ?? 0,
    outstandingBalance: summary?.outstanding_balance_cents ?? 0,
    paymentStatus: summary?.payment_status ?? null
  }
}

async function getEventTransitions(eventId: string) {
  const supabase = createServerClient()

  const { data: transitions } = await supabase
    .from('event_state_transitions')
    .select('*')
    .eq('event_id', eventId)
    .order('transitioned_at', { ascending: true })

  return transitions || []
}

async function getEventMenusForCheck(eventId: string) {
  const supabase = createServerClient()

  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .limit(1)

  return (menus && menus.length > 0)
}

export default async function EventDetailPage({
  params
}: {
  params: { id: string }
}) {
  const user = await requireChef()

  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

  // Get financial summary, transitions, and closure data in parallel
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)

  const [{ totalPaid, outstandingBalance }, transitions, closureStatus, aar, docReadiness, eventMenus, eventExpenseData, profitSummary, budgetGuardrail, unrecordedComponents, aiConfigured, dopProgress, messages, templates, eventLoyaltyTxs, menuMods, unusedItems, substitutionItems] = await Promise.all([
    getEventFinancialSummary(params.id),
    getEventTransitions(params.id),
    isCompletedOrBeyond ? getEventClosureStatus(params.id).catch(() => null) : Promise.resolve(null),
    isCompletedOrBeyond ? getAARByEventId(params.id) : Promise.resolve(null),
    getDocumentReadiness(params.id),
    getEventMenusForCheck(params.id),
    getEventExpenses(params.id),
    getEventProfitSummary(params.id),
    getBudgetGuardrail(params.id),
    isCompletedOrBeyond ? getUnrecordedComponentsForEvent(params.id) : Promise.resolve([]),
    isAIConfigured(),
    getEventDOPProgress(params.id),
    getMessageThread('event', params.id, {
      includeInquiryMessages: !!event.inquiry_id,
      inquiryId: event.inquiry_id ?? undefined,
    }),
    getResponseTemplates(),
    event.status === 'completed' && event.client_id
      ? getLoyaltyTransactions(event.client_id).then(txs => txs.filter(tx => tx.event_id === params.id)).catch(() => [])
      : Promise.resolve([]),
    isCompletedOrBeyond ? getEventModifications(params.id) : Promise.resolve([]),
    isCompletedOrBeyond ? getUnusedIngredients(params.id) : Promise.resolve([]),
    getSubstitutions(params.id),
  ])

  const eventLoyaltyPoints = (eventLoyaltyTxs as { points: number }[]).reduce((sum, tx) => sum + tx.points, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-900">{event.occasion || 'Untitled Event'}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-stone-600 mt-1">
            {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
          </p>
        </div>
        <div className="flex gap-2">
          {event.status === 'draft' && (
            <Link href={`/events/${event.id}/edit`}>
              <Button variant="secondary">Edit Event</Button>
            </Link>
          )}
          <Link href={`/events/${event.id}/schedule`}>
            <Button variant="secondary">Schedule</Button>
          </Link>
          <Link href="/events">
            <Button variant="ghost">Back to Events</Button>
          </Link>
        </div>
      </div>

      {/* Schedule Summary & DOP Progress */}
      {dopProgress && !['cancelled'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-semibold text-stone-700">Preparation Progress</h3>
                <Link href={`/events/${event.id}/schedule`} className="text-xs text-brand-600 hover:text-brand-700">
                  View full schedule &rarr;
                </Link>
              </div>
              <DOPProgressBar completed={dopProgress.completed} total={dopProgress.total} />
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Event Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Location</dt>
              <dd className="text-sm text-stone-900 mt-1">
                {[event.location_address, event.location_city, event.location_state, event.location_zip]
                  .filter(Boolean)
                  .join(', ') || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Number of Guests</dt>
              <dd className="text-sm text-stone-900 mt-1">{event.guest_count}</dd>
            </div>
            {event.special_requests && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Special Requests</dt>
                <dd className="text-sm text-stone-900 mt-1 whitespace-pre-wrap">{event.special_requests}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-stone-500">Created</dt>
              <dd className="text-sm text-stone-900 mt-1">
                {format(new Date(event.created_at), 'MMM d, yyyy')}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Client Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Client Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Name</dt>
              <dd className="text-sm text-stone-900 mt-1">{event.client?.full_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Email</dt>
              <dd className="text-sm text-stone-900 mt-1">
                <a href={`mailto:${event.client?.email}`} className="text-brand-600 hover:underline">
                  {event.client?.email}
                </a>
              </dd>
            </div>
            {event.client?.phone && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Phone</dt>
                <dd className="text-sm text-stone-900 mt-1">
                  <a href={`tel:${event.client.phone}`} className="text-brand-600 hover:underline">
                    {event.client.phone}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Communication Log */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Communication</h2>
        {event.inquiry_id && messages.some(m => m.inquiry_id) && (
          <p className="text-xs text-stone-400 mb-3">
            Includes messages from the original inquiry.
          </p>
        )}
        <MessageThread messages={messages} />
        <div className="mt-4 pt-4 border-t border-stone-200">
          <MessageLogForm
            eventId={event.id}
            clientId={event.client_id ?? undefined}
            templates={templates}
          />
        </div>
      </Card>

      {/* Financial Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm font-medium text-stone-500">Quoted Price</dt>
            <dd className="text-2xl font-bold text-stone-900 mt-1">
              {formatCurrency(event.quoted_price_cents ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Deposit Amount</dt>
            <dd className="text-2xl font-bold text-stone-900 mt-1">
              {formatCurrency(event.deposit_amount_cents ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Amount Paid</dt>
            <dd className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(totalPaid)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Balance Due</dt>
            <dd className={`text-2xl font-bold mt-1 ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(outstandingBalance)}
            </dd>
          </div>
        </div>
      </Card>

      {/* Budget Guardrail — shown when event has pricing but few expenses */}
      {budgetGuardrail.quotedPriceCents > 0 && eventExpenseData.expenses.length === 0 && (
        <Card className="p-6 border-brand-200 bg-brand-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-brand-900">Shopping Budget</h2>
              <p className="text-sm text-brand-700 mt-1">{budgetGuardrail.message}</p>
              {budgetGuardrail.historicalAvgSpendCents && (
                <p className="text-xs text-brand-600 mt-1">
                  Your average grocery spend: {formatCurrency(budgetGuardrail.historicalAvgSpendCents)}
                </p>
              )}
            </div>
            <Link href={`/expenses/new?event_id=${event.id}`}>
              <Button size="sm">Log Expense</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Budget Guardrail — updated version when expenses exist */}
      {budgetGuardrail.quotedPriceCents > 0 && eventExpenseData.expenses.length > 0 && (
        <Card className={`p-6 ${
          budgetGuardrail.status === 'over' ? 'border-red-200 bg-red-50' :
          budgetGuardrail.status === 'near' ? 'border-yellow-200 bg-yellow-50' :
          'border-green-200 bg-green-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`font-semibold ${
                budgetGuardrail.status === 'over' ? 'text-red-900' :
                budgetGuardrail.status === 'near' ? 'text-yellow-900' :
                'text-green-900'
              }`}>Budget Status</h2>
              <p className={`text-sm mt-1 ${
                budgetGuardrail.status === 'over' ? 'text-red-700' :
                budgetGuardrail.status === 'near' ? 'text-yellow-700' :
                'text-green-700'
              }`}>{budgetGuardrail.message}</p>
            </div>
            <Link href={`/expenses/new?event_id=${event.id}`}>
              <Button size="sm" variant="secondary">Add Expense</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Expenses Section */}
      {eventExpenseData.expenses.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Expenses</h2>
            <Link href={`/expenses/new?event_id=${event.id}`}>
              <Button size="sm" variant="secondary">Add Expense</Button>
            </Link>
          </div>

          <div className="space-y-2">
            {eventExpenseData.expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{exp.description}</p>
                    <p className="text-xs text-stone-500">
                      {exp.vendor_name && `${exp.vendor_name} · `}
                      {format(new Date(exp.expense_date), 'MMM d')}
                      {!exp.is_business && (
                        <span className="ml-1 text-amber-600 font-medium">(Personal)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatCurrency(exp.amount_cents)}</span>
                  <Link href={`/expenses/${exp.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Category Subtotals */}
          {Object.keys(eventExpenseData.subtotals).length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries(eventExpenseData.subtotals).map(([cat, total]) => (
                  <div key={cat}>
                    <span className="text-stone-500 capitalize">{cat.replace('_', ' ')}</span>
                    <p className="font-medium">{formatCurrency(total)}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-stone-100 font-medium text-sm">
                <span>Total Business Expenses</span>
                <span>{formatCurrency(eventExpenseData.totalBusinessCents)}</span>
              </div>
              {eventExpenseData.totalPersonalCents > 0 && (
                <div className="flex justify-between mt-1 text-sm text-amber-600">
                  <span>Personal (excluded)</span>
                  <span>{formatCurrency(eventExpenseData.totalPersonalCents)}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Profit Summary — when both revenue and expenses exist */}
      {profitSummary.expenses.totalBusinessCents > 0 && profitSummary.revenue.totalPaidCents > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profit Summary</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-stone-500">Revenue</dt>
              <dd className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(profitSummary.revenue.totalPaidCents + profitSummary.revenue.tipCents)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Expenses</dt>
              <dd className="text-2xl font-bold text-stone-900 mt-1">
                {formatCurrency(profitSummary.expenses.totalBusinessCents)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Profit</dt>
              <dd className={`text-2xl font-bold mt-1 ${
                profitSummary.profit.grossProfitCents >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(profitSummary.profit.grossProfitCents)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Margin</dt>
              <dd className={`text-2xl font-bold mt-1 ${
                profitSummary.profit.profitMarginPercent >= 60 ? 'text-green-600' :
                profitSummary.profit.profitMarginPercent >= 40 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {profitSummary.profit.profitMarginPercent}%
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-500">
            {profitSummary.profit.foodCostPercent > 0 && (
              <span>Food cost: {profitSummary.profit.foodCostPercent}% of revenue</span>
            )}
            {profitSummary.profit.effectiveHourlyRateCents && (
              <span className="font-medium text-stone-700">
                Effective rate: {formatCurrency(profitSummary.profit.effectiveHourlyRateCents)}/hr
              </span>
            )}
            {profitSummary.cashback && (
              <span className="text-green-600">
                Est. cash back: {formatCurrency(profitSummary.cashback.estimatedCents)}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Loyalty Points Awarded */}
      {event.status === 'completed' && eventLoyaltyPoints > 0 && (
        <Card className="p-6 border-purple-200 bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-purple-900">Loyalty Points Awarded</h2>
              <p className="text-sm text-purple-700 mt-1">
                {eventLoyaltyPoints} points earned for this event ({event.guest_count} guests)
              </p>
            </div>
            {event.client_id && (
              <Link href={`/clients/${event.client_id}`}>
                <Button variant="secondary" size="sm">View Client Loyalty</Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Time Tracking — for completed events */}
      {isCompletedOrBeyond && (
        <TimeTracking
          eventId={event.id}
          initialData={{
            time_shopping_minutes: (event as any).time_shopping_minutes ?? null,
            time_prep_minutes: (event as any).time_prep_minutes ?? null,
            time_travel_minutes: (event as any).time_travel_minutes ?? null,
            time_service_minutes: (event as any).time_service_minutes ?? null,
            time_reset_minutes: (event as any).time_reset_minutes ?? null,
          }}
          onSave={updateEventTimeAndCard}
        />
      )}

      {/* Shopping Substitutions — available for any non-draft event */}
      {!['draft', 'cancelled'].includes(event.status) && (
        <ShoppingSubstitutions
          eventId={event.id}
          initialItems={substitutionItems}
        />
      )}

      {/* Menu Modifications — for completed events */}
      {isCompletedOrBeyond && (
        <MenuModifications
          eventId={event.id}
          initialModifications={menuMods}
        />
      )}

      {/* Unused Ingredients — for completed events */}
      {isCompletedOrBeyond && (
        <UnusedIngredients
          eventId={event.id}
          initialItems={unusedItems}
        />
      )}

      {/* Printed Documents (3 Sheets) */}
      <DocumentSection
        eventId={event.id}
        readiness={docReadiness}
        hasMenu={eventMenus ?? false}
      />

      {/* Event Transitions (Actions) */}
      <EventTransitions event={event} />

      {/* Closure Status — for completed events */}
      {event.status === 'completed' && closureStatus && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Post-Event Closure</h2>
            {closureStatus.allComplete && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                All Complete
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.aarFiled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {closureStatus.aarFiled ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-700">AAR Filed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.resetComplete ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {closureStatus.resetComplete ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-700">Reset Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.followUpSent ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {closureStatus.followUpSent ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-700">Follow-Up Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.financiallyClosed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {closureStatus.financiallyClosed ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-700">Financially Closed</span>
            </div>
          </div>

          {/* Action buttons for incomplete items */}
          <div className="flex flex-wrap gap-2">
            {!closureStatus.aarFiled && (
              <Link href={`/events/${event.id}/aar`}>
                <Button size="sm">File After Action Review</Button>
              </Link>
            )}
            <EventClosureActions
              eventId={event.id}
              resetComplete={closureStatus.resetComplete}
              followUpSent={closureStatus.followUpSent}
            />
          </div>
        </Card>
      )}

      {/* AAR Summary — if filed */}
      {aar && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">After Action Review</h2>
            <div className="flex gap-2">
              <Link href={`/events/${event.id}/aar`}>
                <Button variant="ghost" size="sm">Edit Review</Button>
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <dt className="text-sm font-medium text-stone-500">Calm Rating</dt>
              <dd className="text-2xl font-bold text-stone-900 mt-1">{aar.calm_rating}/5</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Preparation Rating</dt>
              <dd className="text-2xl font-bold text-stone-900 mt-1">{aar.preparation_rating}/5</dd>
            </div>
            {aar.forgotten_items && aar.forgotten_items.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Forgotten Items</dt>
                <dd className="mt-1">
                  <div className="flex flex-wrap gap-1">
                    {aar.forgotten_items.map((item: string) => (
                      <span key={item} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </dl>

          {(aar.what_went_well || aar.what_went_wrong) && (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100">
              {aar.what_went_well && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">What went well</dt>
                  <dd className="text-sm text-stone-900 mt-1 whitespace-pre-wrap">{aar.what_went_well}</dd>
                </div>
              )}
              {aar.what_went_wrong && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">What went wrong</dt>
                  <dd className="text-sm text-stone-900 mt-1 whitespace-pre-wrap">{aar.what_went_wrong}</dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}

      {/* Recipe Capture — for completed/in_progress events with menus */}
      {isCompletedOrBeyond && eventMenus && (
        <RecipeCapturePrompt
          eventId={event.id}
          unrecordedComponents={unrecordedComponents}
          aiConfigured={aiConfigured}
        />
      )}

      {/* File AAR button — prominent, for completed events without AAR */}
      {event.status === 'completed' && !aar && !closureStatus && (
        <Card className="p-6 border-brand-200 bg-brand-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-brand-900">Ready to review this dinner?</h2>
              <p className="text-sm text-brand-700 mt-1">File your After Action Review to track what went well and what to improve.</p>
            </div>
            <Link href={`/events/${event.id}/aar`}>
              <Button>File After Action Review</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Transition History */}
      {transitions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Status History</h2>
          <div className="space-y-3">
            {transitions.map((transition) => (
              <div key={transition.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {transition.from_status && (
                      <>
                        <span className="text-sm font-medium text-stone-900 capitalize">
                          {transition.from_status}
                        </span>
                        <span className="text-stone-400">&rarr;</span>
                      </>
                    )}
                    <span className="text-sm font-medium text-stone-900 capitalize">
                      {transition.to_status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {format(new Date(transition.transitioned_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </p>
                  {transition.metadata && typeof transition.metadata === 'object' && 'reason' in (transition.metadata as Record<string, unknown>) && (
                    <p className="text-sm text-stone-600 mt-1">
                      Reason: {String((transition.metadata as Record<string, unknown>).reason)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
