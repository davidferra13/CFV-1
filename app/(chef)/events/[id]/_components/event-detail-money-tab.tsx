import Link from 'next/link'
import { format } from 'date-fns'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { MenuLibraryPicker } from '@/components/events/menu-library-picker'
import { MenuApprovalStatus } from '@/components/events/menu-approval-status'
import { EventExportButton } from '@/components/exports/event-export-button'
import { PricingIntelligencePanel } from '@/components/ai/pricing-intelligence-panel'
import { RecordPaymentPanel, ProcessRefundPanel } from '@/components/events/payment-actions-panel'
import { PaymentPlanPanel } from '@/components/finance/payment-plan-panel'
import { MileageLogPanel } from '@/components/finance/mileage-log-panel'
import { TipLogPanel } from '@/components/finance/tip-log-panel'
import { BudgetTracker } from '@/components/events/budget-tracker'
import { QuickReceiptCapture } from '@/components/events/quick-receipt-capture'
import { TakeAChefPayoutPanel } from '@/components/events/take-a-chef-payout-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

type EventDetailMoneyTabProps = {
  activeTab: EventDetailTab
  event: any
  menuLibraryData: any
  eventMenus: string | false | null
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
  } = props

  return (
    <EventDetailSection tab="money" activeTab={activeTab}>
      {/* Menu Library Picker â€” shown when no menu is attached or to swap */}
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
            {typeof eventMenus === 'string' && (
              <Link href={`/menus/${eventMenus}/editor`}>
                <Button variant="secondary" size="sm">
                  Edit Menu
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

      {/* Financial Summary */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Financial Summary</h2>
          <div className="flex items-center gap-2">
            <Link href={`/events/${event.id}/beo`}>
              <Button variant="ghost" size="sm">
                BEO
              </Button>
            </Link>
            <Link href={`/events/${event.id}/invoice`}>
              <Button variant="ghost" size="sm">
                View Invoice
              </Button>
            </Link>
            <EventExportButton eventId={event.id} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <dt className="text-sm font-medium text-stone-500">Quoted Price</dt>
            <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(event.quoted_price_cents ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Deposit Amount</dt>
            <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
              {formatCurrency(event.deposit_amount_cents ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Amount Paid</dt>
            <dd className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(totalPaid)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Balance Due</dt>
            <dd
              className={`text-xl sm:text-2xl font-bold mt-1 ${outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}
            >
              {formatCurrency(outstandingBalance)}
            </dd>
          </div>
        </div>
      </Card>

      {takeAChefFinance?.isTakeAChef && <TakeAChefPayoutPanel finance={takeAChefFinance} />}

      {/* AI Pricing Intelligence */}
      {['proposed', 'accepted'].includes(event.status) && (
        <PricingIntelligencePanel eventId={event.id} />
      )}

      {/* Record Payment â€” for accepted events with outstanding balance */}
      {['accepted', 'paid'].includes(event.status) && outstandingBalance > 0 && (
        <RecordPaymentPanel
          eventId={event.id}
          outstandingBalanceCents={outstandingBalance}
          depositAmountCents={event.deposit_amount_cents ?? 0}
          totalPaidCents={totalPaid}
        />
      )}

      {/* Payment Plan â€” installment schedule */}
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
          <h2 className="text-xl font-semibold mb-4">Tips Received</h2>
          <TipLogPanel eventId={event.id} initialTips={eventTips} />
        </Card>
      )}

      {/* Process Refund â€” for cancelled events with prior payments */}
      {event.status === 'cancelled' && totalPaid > 0 && refundRecommendationData && (
        <ProcessRefundPanel
          eventId={event.id}
          totalPaidCents={totalPaid}
          totalRefundedCents={totalRefunded}
          depositPaidCents={refundRecommendationData.depositPaidCents}
          recommendation={refundRecommendationData.recommendation}
        />
      )}

      {/* Budget Tracker â€” shows budget vs. actual spend, lets chef set a custom budget */}
      {budgetGuardrail.quotedPriceCents > 0 && (
        <BudgetTracker eventId={event.id} guardrail={budgetGuardrail} />
      )}

      {/* Quick Receipt Capture â€” shown for active/confirmed events */}
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
                  <span className="text-sm font-medium">{formatCurrency(exp.amount_cents)}</span>
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
                    <p className="font-medium">{formatCurrency(Number(total))}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-stone-800 font-medium text-sm">
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

      {/* Profit Summary â€” when both revenue and expenses exist */}
      {profitSummary.expenses.totalBusinessCents > 0 &&
        profitSummary.revenue.totalPaidCents > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profit Summary</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <dt className="text-sm font-medium text-stone-500">Revenue</dt>
                <dd className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(
                    profitSummary.revenue.totalPaidCents + profitSummary.revenue.tipCents
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Expenses</dt>
                <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                  {formatCurrency(profitSummary.expenses.totalBusinessCents)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Profit</dt>
                <dd
                  className={`text-xl sm:text-2xl font-bold mt-1 ${
                    profitSummary.profit.grossProfitCents >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(profitSummary.profit.grossProfitCents)}
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
                  {profitSummary.profit.profitMarginPercent}%
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-500">
              {profitSummary.profit.foodCostPercent > 0 && (
                <span>
                  Food cost: {profitSummary.profit.foodCostPercent}% of revenue
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
                        : 'â†“'}{' '}
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
                    Estimated: {formatCurrency(profitSummary.estimatedFoodCost.estimatedCents)}
                    {' â†’ '}Actual: {formatCurrency(profitSummary.estimatedFoodCost.actualCents)} (
                    {Number(profitSummary.estimatedFoodCost.deltaPct) > 0 ? '+' : ''}
                    {profitSummary.estimatedFoodCost.deltaPct}%)
                  </span>
                )}
              {profitSummary.estimatedFoodCost.estimatedCents !== null &&
                profitSummary.estimatedFoodCost.actualCents === null && (
                  <span className="text-stone-500">
                    Estimated food cost:{' '}
                    {formatCurrency(profitSummary.estimatedFoodCost.estimatedCents)} (from grocery
                    quote)
                  </span>
                )}
              {profitSummary.profit.effectiveHourlyRateCents && (
                <span className="font-medium text-stone-300">
                  Effective rate: {formatCurrency(profitSummary.profit.effectiveHourlyRateCents)}
                  /hr
                </span>
              )}
              {(event as any).leftover_value_received_cents > 0 && (
                <span className="text-emerald-600">
                  Leftover credit applied: âˆ’
                  {formatCurrency((event as any).leftover_value_received_cents)}
                </span>
              )}
              {profitSummary.cashback && (
                <span className="text-emerald-600">
                  Est. cash back: {formatCurrency(profitSummary.cashback.estimatedCents)}
                </span>
              )}
            </div>
            {profitSummary.perGuest && (
              <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap gap-4 text-sm text-stone-500">
                <span className="font-medium text-stone-300">
                  Per guest ({profitSummary.perGuest.guestCount} guests):
                </span>
                <span>{formatCurrency(profitSummary.perGuest.revenuePerGuestCents)} revenue</span>
                <span className="text-red-600">
                  {formatCurrency(profitSummary.perGuest.costPerGuestCents)} cost
                </span>
                <span
                  className={
                    profitSummary.perGuest.profitPerGuestCents >= 0
                      ? 'text-emerald-600 font-medium'
                      : 'text-red-600 font-medium'
                  }
                >
                  {formatCurrency(profitSummary.perGuest.profitPerGuestCents)} profit
                </span>
              </div>
            )}
          </Card>
        )}

      {/* Loyalty Points Awarded */}
      {event.status === 'completed' && eventLoyaltyPoints > 0 && (
        <Card className="p-6 border-purple-200 bg-purple-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-purple-900">Loyalty Points Awarded</h2>
              <p className="text-sm text-purple-200 mt-1">
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
