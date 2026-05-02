import Link from 'next/link'
import { format } from 'date-fns'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { MenuLibraryPicker } from '@/components/events/menu-library-picker'
import { MenuApprovalStatus } from '@/components/events/menu-approval-status'
import { EventExportButton } from '@/components/exports/event-export-button'
import { RecordPaymentPanel, ProcessRefundPanel } from '@/components/events/payment-actions-panel'
import { VoidPaymentPanel } from '@/components/events/void-payment-panel'
import { PaymentPlanPanel } from '@/components/finance/payment-plan-panel'
import { MileageLogPanel } from '@/components/finance/mileage-log-panel'
import { TipLogPanel } from '@/components/finance/tip-log-panel'
import { EventPricingIntelligencePanel } from '@/components/finance/event-pricing-intelligence-panel'
import { EventReadinessAssistantPanel } from '@/components/events/event-readiness-assistant-panel'
import { SettlementPreviewPanel } from '@/components/collaboration/settlement-preview-panel'
import { BudgetTracker } from '@/components/events/budget-tracker'
import { QuickReceiptCapture } from '@/components/events/quick-receipt-capture'
import { TakeAChefPayoutPanel } from '@/components/events/take-a-chef-payout-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import type { CostForecast } from '@/lib/openclaw/cost-forecast-actions'
import { CostForecastCard } from '@/components/finance/cost-forecast-card'
import { EventLaborCostCard } from '@/components/staff/event-labor-cost-card'
import type { EventSettlement } from '@/lib/collaboration/settlement-actions'
import { PriceComparisonSummary } from '@/components/pricing/price-comparison-summary'
import { rowToPriceComparison } from '@/lib/pricing/pricing-decision'
import {
  EventFoodCostInsight,
  type MenuCostData,
} from '@/components/costing/event-food-cost-insight'
import type { EventPricingIntelligencePayload } from '@/lib/finance/event-pricing-intelligence-actions'
import { EventDetailGuestCountRequests } from './event-detail-guest-count-requests'
import type { GuestCountChange } from '@/lib/guests/count-changes'
import type { EventReadinessAssistantResult } from '@/lib/events/event-readiness-assistant'

type EventDetailMoneyTabProps = {
  activeTab: EventDetailTab
  event: any
  menuLibraryData: any
  eventMenus: string[] | null
  menuApprovalData: any
  totalPaid: number
  outstandingBalance: number
  paymentPlanInstallments: any[]
  mileageEntries: any[]
  eventTips: any[]
  refundRecommendationData: any
  totalRefunded: number
  budgetGuardrail: any
  eventExpenseData: any
  profitSummary: any
  eventLoyaltyPoints: number
  takeAChefFinance: any
  costForecast?: CostForecast | null
  menuCostSummary?: MenuCostData | null
  chefArchetype?: string | null
  pricingIntelligence?: EventPricingIntelligencePayload | null
  readinessAssistant?: EventReadinessAssistantResult | null
  settlement: EventSettlement | null
  ledgerEntries?: Array<{
    id: string
    entry_type: string
    amount_cents: number
    payment_method: string
    description: string
    is_refund: boolean
    received_at: string | null
    created_at: string
  }>
  guestCountChanges: GuestCountChange[]
  regionalSettings?: { currencyCode: string; locale: string }
}

export function EventDetailMoneyTab(props: EventDetailMoneyTabProps) {
  const {
    activeTab,
    event,
    menuLibraryData,
    eventMenus,
    menuApprovalData,
    totalPaid,
    outstandingBalance,
    paymentPlanInstallments,
    mileageEntries,
    eventTips,
    refundRecommendationData,
    totalRefunded,
    budgetGuardrail,
    eventExpenseData,
    profitSummary,
    eventLoyaltyPoints,
    takeAChefFinance,
    costForecast,
    menuCostSummary,
    chefArchetype,
    pricingIntelligence,
    readinessAssistant,
    settlement,
    ledgerEntries,
    guestCountChanges,
    regionalSettings,
  } = props

  const currOpts = regionalSettings
    ? { locale: regionalSettings.locale, currency: regionalSettings.currencyCode }
    : {}
  const fmt = (cents: number) => formatCurrency(cents, currOpts)

  return (
    <EventDetailSection tab="money" activeTab={activeTab}>
      {/* Menu Library Picker â€" shown when no menu is attached or to swap */}
      {event.status !== 'cancelled' && (menuLibraryData as any)?.menus?.length > 0 && (
        <MenuLibraryPicker
          eventId={event.id}
          menus={(menuLibraryData as any).menus}
          preferences={(menuLibraryData as any).preferences}
        />
      )}

      {/* Menu Approval */}
      {eventMenus && event.status !== 'cancelled' && menuApprovalData && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Menu Approval</h2>
            {eventMenus && eventMenus.length > 0 && (
              <Link href={`/menus/${eventMenus[0]}/editor`}>
                <Button variant="secondary" size="sm">
                  {eventMenus.length > 1 ? `Edit Menus (${eventMenus.length})` : 'Edit Menu'}
                </Button>
              </Link>
            )}
          </div>
          <MenuApprovalStatus
            eventId={event.id}
            status={((menuApprovalData as any).event?.menu_approval_status ?? 'not_sent') as any}
            sentAt={(menuApprovalData as any).event?.menu_sent_at ?? null}
            approvedAt={(menuApprovalData as any).event?.menu_approved_at ?? null}
            revisionNotes={(menuApprovalData as any).event?.menu_revision_notes ?? null}
          />
        </Card>
      )}

      {/* Cost Forecast (future events with menu only) */}
      {costForecast && <CostForecastCard forecast={costForecast} />}

      {/* Food Cost Analysis (operator-aware, from menu_cost_summary) */}
      {menuCostSummary && (
        <EventFoodCostInsight
          menuCost={menuCostSummary}
          quotedPriceCents={event.quoted_price_cents ?? null}
          guestCount={event.guest_count ?? null}
          archetype={chefArchetype}
        />
      )}

      {/* Labor Cost (per-event staff hours + pay, rolls into P&L) */}
      <EventLaborCostCard eventId={event.id} quotedPriceCents={event.quoted_price_cents} />

      <EventPricingIntelligencePanel data={pricingIntelligence ?? null} />

      <EventReadinessAssistantPanel eventId={event.id} readiness={readinessAssistant ?? null} />

      {/* Financial Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Financial Summary</h2>
          <div className="flex items-center gap-2">
            <Link href={`/events/${event.id}/invoice`}>
              <Button variant="ghost" size="sm">
                View Invoice
              </Button>
            </Link>
            <EventExportButton eventId={event.id} />
          </div>
        </div>
        {/* Baseline vs final comparison when override metadata exists */}
        {(event as any).override_kind && (event as any).override_kind !== 'none' && (
          <div className="mb-4 pb-4 border-b border-stone-700">
            <PriceComparisonSummary
              showPerPerson
              data={rowToPriceComparison({
                quoted_price_cents: event.quoted_price_cents,
                price_per_person_cents: (event as any).price_per_person_cents ?? null,
                baseline_total_cents: (event as any).baseline_total_cents ?? null,
                baseline_price_per_person_cents:
                  (event as any).baseline_price_per_person_cents ?? null,
                pricing_source_kind: (event as any).pricing_source_kind ?? null,
                override_kind: (event as any).override_kind ?? null,
                override_reason: (event as any).override_reason ?? null,
                pricing_context: (event as any).pricing_context ?? null,
                guest_count_actual: event.guest_count ?? null,
              })}
            />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm font-medium text-stone-500">Quoted Price</dt>
            <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
              {event.quoted_price_cents != null ? (
                fmt(event.quoted_price_cents)
              ) : (
                <span className="text-stone-500">Not set</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Deposit Amount</dt>
            <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
              {event.deposit_amount_cents != null ? (
                fmt(event.deposit_amount_cents)
              ) : (
                <span className="text-stone-500">Not set</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Amount Paid</dt>
            <dd className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
              {fmt(totalPaid)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Balance Due</dt>
            <dd
              className={`text-xl sm:text-2xl font-bold mt-1 ${outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}
            >
              {fmt(outstandingBalance)}
            </dd>
          </div>
        </div>
      </Card>

      <EventDetailGuestCountRequests changes={guestCountChanges} />

      {takeAChefFinance?.isTakeAChef && <TakeAChefPayoutPanel finance={takeAChefFinance} />}

      {/* Record Payment â€" for accepted events with outstanding balance */}
      {['accepted', 'paid'].includes(event.status) && outstandingBalance > 0 && (
        <RecordPaymentPanel
          eventId={event.id}
          outstandingBalanceCents={outstandingBalance}
          depositAmountCents={event.deposit_amount_cents ?? 0}
          totalPaidCents={totalPaid}
        />
      )}

      {/* Void Payment - show recorded offline payments with void option */}
      {ledgerEntries && ledgerEntries.length > 0 && totalPaid > 0 && (
        <VoidPaymentPanel eventId={event.id} entries={ledgerEntries} />
      )}

      {/* Payment Plan â€" installment schedule */}
      {event.status !== 'cancelled' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Plan</h2>
          <PaymentPlanPanel
            eventId={event.id}
            initialInstallments={paymentPlanInstallments}
            quotedPriceCents={event.quoted_price_cents}
          />
        </Card>
      )}

      {/* Mileage Log */}
      {event.status !== 'cancelled' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Mileage Log</h2>
          <MileageLogPanel eventId={event.id} initialEntries={mileageEntries} />
        </Card>
      )}

      {/* Tip Log */}
      {(event.status === 'in_progress' || event.status === 'completed') && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Gratuity Received</h2>
          <TipLogPanel eventId={event.id} initialTips={eventTips} />
        </Card>
      )}

      {/* Process Refund â€" for cancelled events with prior payments */}
      {event.status === 'cancelled' && totalPaid > 0 && refundRecommendationData && (
        <ProcessRefundPanel
          eventId={event.id}
          totalPaidCents={totalPaid}
          totalRefundedCents={totalRefunded}
          depositPaidCents={refundRecommendationData.depositPaidCents}
          recommendation={refundRecommendationData.recommendation}
        />
      )}

      {/* Budget Tracker â€" shows budget vs. actual spend, lets chef set a custom budget */}
      {budgetGuardrail.quotedPriceCents > 0 && (
        <BudgetTracker eventId={event.id} guardrail={budgetGuardrail} />
      )}

      {/* Quick Receipt Capture â€" shown for active/confirmed events */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <QuickReceiptCapture eventId={event.id} />
      )}

      {/* Expenses Section */}
      {eventExpenseData.expenses.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Expenses</h2>
            <div className="flex items-center gap-2">
              <Link href={`/events/${event.id}/receipts`}>
                <Button size="sm" variant="ghost">
                  Receipt Summary
                </Button>
              </Link>
              <Link href={`/expenses/new?event_id=${event.id}`}>
                <Button size="sm" variant="secondary">
                  Add Expense
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            {eventExpenseData.expenses.map((exp: any) => (
              <div
                key={exp.id}
                className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-100">{exp.description}</p>
                    <p className="text-xs text-stone-500">
                      {exp.vendor_name && `${exp.vendor_name} Â· `}
                      {format(new Date(exp.expense_date), 'MMM d')}
                      {!exp.is_business && (
                        <span className="ml-1 text-amber-600 font-medium">(Personal)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{fmt(exp.amount_cents)}</span>
                  <Link href={`/expenses/${exp.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Category Subtotals */}
          {Object.keys(eventExpenseData.subtotals).length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {Object.entries(eventExpenseData.subtotals).map(([cat, total]) => (
                  <div key={cat}>
                    <span className="text-stone-500 capitalize">{cat.replace('_', ' ')}</span>
                    <p className="font-medium">{fmt(Number(total))}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-stone-800 font-medium text-sm">
                <span>Total Business Expenses</span>
                <span>{fmt(eventExpenseData.totalBusinessCents)}</span>
              </div>
              {eventExpenseData.totalPersonalCents > 0 && (
                <div className="flex justify-between mt-1 text-sm text-amber-600">
                  <span>Personal (excluded)</span>
                  <span>{fmt(eventExpenseData.totalPersonalCents)}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Profit Summary - show when revenue exists; guide when expenses missing */}
      {profitSummary.revenue.totalPaidCents > 0 &&
        profitSummary.expenses.totalBusinessCents === 0 && (
          <Card className="p-6 border-dashed border-stone-700">
            <h2 className="text-xl font-semibold mb-2">Profit Summary</h2>
            <p className="text-stone-400 text-sm">
              Log your expenses (groceries, supplies, travel) to see your true profit margin for
              this event.
            </p>
          </Card>
        )}
      {profitSummary.expenses.totalBusinessCents > 0 &&
        profitSummary.revenue.totalPaidCents > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profit Summary</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm font-medium text-stone-500">Revenue</dt>
                <dd className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                  {fmt(profitSummary.revenue.totalPaidCents + profitSummary.revenue.tipCents)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Expenses</dt>
                <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                  {fmt(profitSummary.expenses.totalBusinessCents)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Profit</dt>
                <dd
                  className={`text-xl sm:text-2xl font-bold mt-1 ${
                    profitSummary.profit.grossProfitCents >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {fmt(profitSummary.profit.grossProfitCents)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Margin</dt>
                <dd
                  className={`text-xl sm:text-2xl font-bold mt-1 ${
                    profitSummary.profit.profitMarginPercent >= 60
                      ? 'text-emerald-600'
                      : profitSummary.profit.profitMarginPercent >= 40
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {profitSummary.profit.profitMarginPercent.toFixed(1)}%
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-500">
              {profitSummary.profit.foodCostPercent > 0 && (
                <span>
                  Food cost: {profitSummary.profit.foodCostPercent.toFixed(1)}% of revenue
                  {profitSummary.profit.chefAvgFoodCostPercent !== null && (
                    <span
                      className={`ml-1.5 font-medium ${
                        profitSummary.profit.foodCostPercent >
                        profitSummary.profit.chefAvgFoodCostPercent
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      (
                      {profitSummary.profit.foodCostPercent >
                      profitSummary.profit.chefAvgFoodCostPercent
                        ? 'â†‘'
                        : 'â†"'}{' '}
                      avg {profitSummary.profit.chefAvgFoodCostPercent}%)
                    </span>
                  )}
                </span>
              )}
              {/* Estimated vs Actual food cost from grocery quote */}
              {profitSummary.estimatedFoodCost.estimatedCents !== null &&
                profitSummary.estimatedFoodCost.actualCents !== null &&
                profitSummary.estimatedFoodCost.deltaPct !== null && (
                  <span
                    className={`font-medium ${
                      Math.abs(Number(profitSummary.estimatedFoodCost.deltaPct)) <= 10
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    Estimated: {fmt(profitSummary.estimatedFoodCost.estimatedCents)}
                    {' â†’ '}Actual: {fmt(profitSummary.estimatedFoodCost.actualCents)} (
                    {Number(profitSummary.estimatedFoodCost.deltaPct) > 0 ? '+' : ''}
                    {profitSummary.estimatedFoodCost.deltaPct}%)
                  </span>
                )}
              {profitSummary.estimatedFoodCost.estimatedCents !== null &&
                profitSummary.estimatedFoodCost.actualCents === null && (
                  <span className="text-stone-500">
                    Estimated food cost: {fmt(profitSummary.estimatedFoodCost.estimatedCents)} (from
                    grocery quote)
                  </span>
                )}
              {profitSummary.profit.effectiveHourlyRateCents && (
                <span className="font-medium text-stone-300">
                  Effective rate: {fmt(profitSummary.profit.effectiveHourlyRateCents)}
                  /hr
                </span>
              )}
              {(event as any).leftover_value_received_cents > 0 && (
                <span className="text-emerald-600">
                  Leftover credit applied: âˆ’
                  {fmt((event as any).leftover_value_received_cents)}
                </span>
              )}
              {profitSummary.cashback && (
                <span className="text-emerald-600">
                  Est. cash back: {fmt(profitSummary.cashback.estimatedCents)}
                </span>
              )}
            </div>
            {profitSummary.perGuest && (
              <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap gap-4 text-sm text-stone-500">
                <span className="font-medium text-stone-300">
                  Per guest ({profitSummary.perGuest.guestCount} guests):
                </span>
                <span>{fmt(profitSummary.perGuest.revenuePerGuestCents)} revenue</span>
                <span className="text-red-600">
                  {fmt(profitSummary.perGuest.costPerGuestCents)} cost
                </span>
                <span
                  className={
                    profitSummary.perGuest.profitPerGuestCents >= 0
                      ? 'text-emerald-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {fmt(profitSummary.perGuest.profitPerGuestCents)} profit
                </span>
              </div>
            )}
          </Card>
        )}

      <SettlementPreviewPanel settlement={settlement} />

      {/* Loyalty Points Awarded */}
      {event.status === 'completed' && eventLoyaltyPoints > 0 && (
        <Card className="p-6 border-purple-200 bg-purple-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-purple-900">Loyalty Points Awarded</h2>
              <p className="text-sm text-purple-700 mt-1">
                {eventLoyaltyPoints} points earned for this event ({event.guest_count} guests)
              </p>
            </div>
            {event.client_id && (
              <Link href={`/clients/${event.client_id}`}>
                <Button variant="secondary" size="sm">
                  View Client Loyalty
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </EventDetailSection>
  )
}
