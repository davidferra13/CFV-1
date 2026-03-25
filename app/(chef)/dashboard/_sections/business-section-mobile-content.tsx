import { QuoteAcceptanceInsightsPanel } from '@/components/analytics/quote-acceptance-insights'
import { AccountabilityPanel } from '@/components/dashboard/accountability-panel'
import { ChefActivityFeed } from '@/components/activity/chef-activity-feed'
import { LivePresencePanel } from '@/components/activity/live-presence-panel'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { HoursLogWidget } from '@/components/dashboard/hours-log-widget'
import { CollapsibleWidget } from '@/components/dashboard/collapsible-widget'
import { ChefJournalWidget } from '@/components/dashboard/chef-journal-widget'
import { ChefTodoWidget } from '@/components/dashboard/chef-todo-widget'
import { TacDashboardWidget } from '@/components/dashboard/tac-dashboard-widget'
import { BurnoutIndicatorCard } from '@/components/dashboard/burnout-indicator-card'
import { ConcentrationWarningCard } from '@/components/dashboard/concentration-warning-card'
import { BusinessHealthCard } from '@/components/dashboard/business-health-card'
import { InsuranceHealthCard } from '@/components/dashboard/insurance-health-card'
import { ProspectingWidget } from '@/components/dashboard/prospecting-widget'
import { BetaTestersWidget } from '@/components/beta/beta-testers-widget'
import { ActiveClientsCard } from '@/components/dashboard/active-clients-card'
import { RevenueComparisonWidget } from '@/components/dashboard/revenue-comparison-widget'
import { TopEventsProfitWidget } from '@/components/dashboard/top-events-profit-widget'
import { PipelineForecastWidget } from '@/components/dashboard/pipeline-forecast-widget'
import { MultiEventDaysWidget } from '@/components/dashboard/multi-event-days-widget'
import { AARPerformanceWidget } from '@/components/dashboard/aar-performance-widget'
import { AvgHourlyRateWidget } from '@/components/dashboard/avg-hourly-rate-widget'
import { PayoutSummaryWidget } from '@/components/dashboard/payout-summary-widget'
import { RevenueGoalWidget } from '@/components/dashboard/revenue-goal-widget'
import { LoyaltyApproachingWidget } from '@/components/dashboard/loyalty-approaching-widget'
import { FoodCostTrendWidget } from '@/components/dashboard/food-cost-trend-widget'
import { BookingSeasonalityWidget } from '@/components/dashboard/booking-seasonality-widget'
import { YoYComparisonWidget } from '@/components/dashboard/yoy-comparison-widget'
import { OverdueInstallmentsWidget } from '@/components/dashboard/overdue-installments-widget'
import { DormantClientsWidget } from '@/components/dashboard/dormant-clients-widget'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { DashboardWidgetId } from '@/lib/scheduling/types'
import { widgetGridClass } from '@/lib/scheduling/types'
import type { UnloggedEvent } from '@/lib/dashboard/actions'
import type { BusinessSectionRenderContext } from './business-section-render-context'

interface MetricRow {
  label: string
  value: string
}

interface MetricWidget {
  id: DashboardWidgetId
  title: string
  href?: string
  rows: MetricRow[]
  visible?: boolean
}

function toPercent(value: number | null | undefined, digits = 1): string {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${safe.toFixed(digits)}%`
}

function toInteger(value: number | null | undefined): string {
  return Math.round(Number(value ?? 0)).toLocaleString()
}

function renderMetricWidget(
  widget: MetricWidget,
  getWidgetOrder: (id: DashboardWidgetId) => number
) {
  if (widget.visible === false) return null

  return (
    <section
      key={widget.id}
      className={widgetGridClass(widget.id)}
      style={{ order: getWidgetOrder(widget.id) }}
    >
      <CollapsibleWidget widgetId={widget.id} title={widget.title}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{widget.title}</CardTitle>
              {widget.href ? (
                <Link href={widget.href} className="text-sm text-brand-500 hover:text-brand-400">
                  Open
                </Link>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {widget.rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-500">{row.label}</span>
                <span className="font-semibold text-stone-100">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </CollapsibleWidget>
    </section>
  )
}

export function BusinessSectionMobileContent(
  context: BusinessSectionRenderContext & { unloggedEvents?: UnloggedEvent[] }
) {
  const {
    activeClients,
    aiPreferences,
    allEvents,
    automationExecutions,
    automationRules,
    cannabisAccess,
    charityHoursSummary,
    closureStreak,
    collabMetrics,
    collabUnread,
    communicationInboxStats,
    concentrationRisk,
    contractTemplates,
    conversionFunnel,
    currentMonthName,
    documentSnapshots,
    eventCounts,
    externalReviewSources,
    foodCostTrend,
    getWidgetOrder,
    goalsDashboard,
    guestFrequencyStats,
    guestLeadStats,
    healthScore,
    hoursSnapshot,
    inquiryStats,
    insurancePolicies,
    integrationOverview,
    isWidgetEnabled,
    journalInsights,
    loyaltyApproaching,
    menus,
    monthExpenses,
    monthRevenue,
    networkConnections,
    nextBestActions,
    overdueFollowUps,
    payoutSummary,
    prospectStats,
    quoteInsights,
    quoteStats,
    receipts,
    recentActivity,
    recentJourneys,
    recentSales,
    reconciliationReports,
    remyAuditSummary,
    remyMetrics,
    reservations,
    reviewStats,
    socialConnections,
    socialPlannerData,
    staffMembers,
    stationOpsLog,
    testimonials,
    todos,
    unifiedInboxStats,
    unreadNotificationCount,
    unreadThreadCount,
    userIsAdmin,
    userTenantId,
    vendorList,
    wasteSummary,
    weeklyStats,
    wellbeing,
    wixConnection,
    yoyData,
    topEvents,
    overdueInstallments,
    aarStats,
    avgHourlyRate,
    pipelineForecast,
    multiEventDays,
    seasonality,
    dormantClients,
    revenueGoal,
    recentTestimonialCount,
    pendingTestimonialApprovalCount,
    pendingSurveyCount,
    pendingConnectionRequests,
    openSafetyIncidents,
    criticalSafetyIncidents,
    plannedTravelLegs,
    inProgressTravelLegs,
    consolidatedTravelLegs,
    activeGoalCount,
    avgGoalProgressPercent,
    upcomingEventsMissingSnapshots,
    staleDocumentSnapshots,
    expiringInsurancePolicyCount,
    highValueDormantClients,
    activePartnerCount,
    inactivePartnerCount,
    partnerReferralEventCount,
    stationActiveCount,
    unresolvedStationTasks,
    stationOpsAttentionCount,
    paymentEntriesInboundTotal,
    paymentEntriesFailedQueue,
    overdueInstallmentCount,
    latestDailyReportDate,
    reportFreshnessDays,
    reconciliationOpenFlags,
    overdueTaskCount,
    automationFailureCount,
    activeAutomationRuleCount,
    cannabisUpcomingEventCount,
    cannabisMissingResponses,
    charityUpcomingEventCount,
    communityTemplateDownloads,
    guestUpcomingReservations,
    unapprovedReceiptCount,
    orphanReceiptCount,
    socialConnectedAccountCount,
    socialPendingApprovalCount,
    socialUpcomingPosts30d,
    wixPendingSubmissionCount,
    wixFailedSubmissionCount,
    wixStaleSubmissionCount,
    staleIntegrationCount,
    gmailSyncErrorCount,
    remyPolicyOverrideCount,
    activeInquiryCount,
    monthlyGoalProgress,
    monthlyGoalGapCents,
    yoyRevenueDelta,
    openMaintenanceCount,
    monthVendorSpendCents,
    activeStaffCount,
    activeEmployeeCount,
    payrollYtdGrossCents,
    activeCampaignCount,
    sentCampaignCount,
    upcomingPushDinnerCount,
    openContractsAndCollectionsCount,
    inboxTotalCount,
    inboxNeedsAttentionCount,
    inboxUnlinkedCount,
    activeExternalReviewSourceCount,
    totalEquipmentRentals,
    totalKitchenRentals,
    kitchenRentalSpendCents,
    draftMenuCount,
    approvedMenuCount,
    recentRecipeCount,
    todaySales,
    todaySalesRevenueCents,
    remyApprovalPolicies,
    campaigns,
    pushDinners,
    outstandingPayments,
    socialPlannerData: planner,
    wixSubmissions,
    recipes,
  } = context

  const hasFoodCostData = (foodCostTrend.months ?? []).some((month) => month.eventCount > 0)
  const avgFoodCostPercent = foodCostTrend.overallAvgFoodCostPercent
  const totalCampaigns = Array.isArray(campaigns) ? campaigns.length : 0
  const totalPushDinners = Array.isArray(pushDinners) ? pushDinners.length : 0
  const totalQuotes = Number(quoteStats.total ?? 0)
  const totalOutstandingEvents = Number(outstandingPayments.events?.length ?? 0)
  const totalReviews = Number(reviewStats.total ?? 0)
  const totalRecipes = Array.isArray(recipes) ? recipes.length : 0
  const totalMenus = Array.isArray(menus) ? menus.length : 0
  const totalVendors = Array.isArray(vendorList) ? vendorList.length : 0
  const totalEvents = Array.isArray(allEvents) ? allEvents.length : 0
  const totalAutomations = Array.isArray(automationRules) ? automationRules.length : 0
  const totalAutomationRuns = Array.isArray(automationExecutions) ? automationExecutions.length : 0
  const remyOverrides = Array.isArray(remyApprovalPolicies) ? remyApprovalPolicies.length : 0
  const totalWixSubmissions = Array.isArray(wixSubmissions) ? wixSubmissions.length : 0
  const totalSnapshots = Array.isArray(documentSnapshots) ? documentSnapshots.length : 0

  const metricWidgets: MetricWidget[] = [
    {
      id: 'service_quality',
      title: 'Service Quality',
      href: '/aar',
      rows: [
        { label: 'Active Inquiries', value: toInteger(activeInquiryCount) },
        { label: 'Reviews', value: toInteger(totalReviews) },
        { label: 'Avg Rating', value: Number(reviewStats.averageRating ?? 0).toFixed(2) },
      ],
    },
    {
      id: 'business_snapshot',
      title: 'Business Snapshot',
      href: '/finance/reporting',
      rows: [
        {
          label: `${currentMonthName} Revenue`,
          value: formatCurrency(monthRevenue.currentMonthRevenueCents),
        },
        {
          label: `${currentMonthName} Expenses`,
          value: formatCurrency(monthExpenses.businessCents),
        },
        { label: 'Upcoming Events', value: toInteger(eventCounts.upcomingThisMonth) },
      ],
    },
    {
      id: 'commerce_hub',
      title: 'Commerce Hub',
      href: '/commerce/register',
      rows: [
        { label: 'Sales Today', value: toInteger(todaySales.length) },
        { label: 'Sales Revenue', value: formatCurrency(todaySalesRevenueCents) },
        { label: 'Outstanding Events', value: toInteger(totalOutstandingEvents) },
      ],
    },
    {
      id: 'inventory_health',
      title: 'Inventory Health',
      href: '/inventory',
      rows: [
        { label: 'Open Maintenance', value: toInteger(openMaintenanceCount) },
        { label: 'Waste Entries', value: toInteger(wasteSummary.grandTotalEntries) },
        { label: 'Waste Cost', value: formatCurrency(wasteSummary.grandTotalCostCents) },
      ],
    },
    {
      id: 'vendor_costs',
      title: 'Vendor Costs',
      href: '/vendors',
      rows: [
        { label: 'Vendors', value: toInteger(totalVendors) },
        { label: `${currentMonthName} Spend`, value: formatCurrency(monthVendorSpendCents) },
        { label: 'Kitchen Rental Spend', value: formatCurrency(kitchenRentalSpendCents) },
      ],
    },
    {
      id: 'payments_health',
      title: 'Payments Health',
      href: '/commerce/reconciliation',
      rows: [
        { label: 'Outstanding Events', value: toInteger(totalOutstandingEvents) },
        { label: 'Overdue Installments', value: toInteger(overdueInstallmentCount) },
        { label: 'Inbound Payments', value: formatCurrency(paymentEntriesInboundTotal) },
      ],
    },
    {
      id: 'staff_operations',
      title: 'Staff Operations',
      href: '/staff',
      rows: [
        { label: 'Active Staff', value: toInteger(activeStaffCount) },
        { label: 'Active Employees', value: toInteger(activeEmployeeCount) },
        { label: 'Payroll YTD', value: formatCurrency(payrollYtdGrossCents) },
      ],
    },
    {
      id: 'marketing_pipeline',
      title: 'Marketing Pipeline',
      href: '/marketing/push-dinners',
      rows: [
        { label: 'Campaigns', value: toInteger(totalCampaigns) },
        { label: 'Active Campaigns', value: toInteger(activeCampaignCount) },
        { label: 'Upcoming Push Dinners', value: toInteger(upcomingPushDinnerCount) },
      ],
    },
    {
      id: 'contracts_collections',
      title: 'Contracts & Collections',
      href: '/contracts',
      rows: [
        { label: 'Templates', value: toInteger(contractTemplates.length) },
        { label: 'Open Quotes', value: toInteger(totalQuotes) },
        { label: 'Open Collections', value: toInteger(openContractsAndCollectionsCount) },
      ],
    },
    {
      id: 'analytics_pulse',
      title: 'Analytics Pulse',
      href: '/analytics',
      rows: [
        { label: 'Revenue YoY Delta', value: toPercent(yoyRevenueDelta) },
        {
          label: 'Avg Food Cost',
          value: hasFoodCostData ? toPercent(avgFoodCostPercent) : 'No data',
        },
        { label: 'Funnel Prospects', value: toInteger(conversionFunnel.totalProspects) },
      ],
    },
    {
      id: 'goals_tracker',
      title: 'Goals Tracker',
      href: '/goals',
      rows: [
        { label: 'Active Goals', value: toInteger(activeGoalCount) },
        { label: 'Avg Goal Progress', value: toPercent(avgGoalProgressPercent, 0) },
        { label: 'Monthly Goal Progress', value: toPercent(monthlyGoalProgress, 0) },
      ],
    },
    {
      id: 'operations_readiness',
      title: 'Operations Readiness',
      href: '/operations/readiness',
      rows: [
        { label: 'Open Safety Incidents', value: toInteger(openSafetyIncidents) },
        { label: 'Critical Incidents', value: toInteger(criticalSafetyIncidents) },
        { label: 'Expiring Insurance', value: toInteger(expiringInsurancePolicyCount) },
      ],
    },
    {
      id: 'recipe_menu_engine',
      title: 'Recipe & Menu Engine',
      href: '/recipes',
      rows: [
        { label: 'Recipes', value: toInteger(totalRecipes) },
        { label: 'Menus', value: toInteger(totalMenus) },
        { label: 'Draft Menus', value: toInteger(draftMenuCount) },
      ],
    },
    {
      id: 'lead_funnel_live',
      title: 'Lead Funnel Live',
      href: '/prospecting',
      rows: [
        { label: 'Prospects', value: toInteger(prospectStats.total) },
        { label: 'Hot Pipeline', value: toInteger(context.hotPipelineCount) },
        {
          label: 'Open Inquiries',
          value: toInteger(inquiryStats.new + inquiryStats.awaiting_client),
        },
      ],
    },
    {
      id: 'network_collab_growth',
      title: 'Network & Collab Growth',
      href: '/network',
      rows: [
        { label: 'Connections', value: toInteger(networkConnections.length) },
        { label: 'Pending Requests', value: toInteger(pendingConnectionRequests) },
        { label: 'Collab Unread', value: toInteger(collabUnread) },
      ],
    },
    {
      id: 'safety_risk_watch',
      title: 'Safety Risk Watch',
      href: '/safety/incidents',
      rows: [
        { label: 'Open Incidents', value: toInteger(openSafetyIncidents) },
        { label: 'Critical Incidents', value: toInteger(criticalSafetyIncidents) },
        { label: 'Station Ops Alerts', value: toInteger(stationOpsAttentionCount) },
      ],
    },
    {
      id: 'travel_logistics',
      title: 'Travel Logistics',
      href: '/travel',
      rows: [
        { label: 'Planned Legs', value: toInteger(plannedTravelLegs) },
        { label: 'In Progress', value: toInteger(inProgressTravelLegs) },
        { label: 'Consolidated Legs', value: toInteger(consolidatedTravelLegs) },
      ],
    },
    {
      id: 'inbox_command_center',
      title: 'Inbox Command Center',
      href: '/inbox',
      rows: [
        { label: 'Total', value: toInteger(inboxTotalCount) },
        { label: 'Needs Attention', value: toInteger(inboxNeedsAttentionCount) },
        { label: 'Unlinked', value: toInteger(inboxUnlinkedCount) },
      ],
    },
    {
      id: 'notifications_center',
      title: 'Notification Center',
      href: '/notifications',
      rows: [
        { label: 'Unread Notifications', value: toInteger(unreadNotificationCount) },
        { label: 'Unread Threads', value: toInteger(unreadThreadCount) },
        { label: 'Overdue Follow-Ups', value: toInteger(overdueFollowUps.length) },
      ],
    },
    {
      id: 'reviews_reputation',
      title: 'Reviews & Reputation',
      href: '/reviews',
      rows: [
        { label: 'Reviews', value: toInteger(totalReviews) },
        { label: 'Avg Rating', value: Number(reviewStats.averageRating ?? 0).toFixed(2) },
        { label: 'Active Sources', value: toInteger(activeExternalReviewSourceCount) },
      ],
    },
    {
      id: 'documents_compliance',
      title: 'Documents & Compliance',
      href: '/documents',
      rows: [
        { label: 'Snapshots', value: toInteger(totalSnapshots) },
        { label: 'Missing Upcoming', value: toInteger(upcomingEventsMissingSnapshots) },
        { label: 'Stale Snapshots', value: toInteger(staleDocumentSnapshots) },
      ],
    },
    {
      id: 'client_growth_signals',
      title: 'Client Growth Signals',
      href: '/clients',
      rows: [
        { label: 'Dormant Clients', value: toInteger(context.dormantClients.length) },
        { label: 'High Value Dormant', value: toInteger(highValueDormantClients) },
        { label: 'Loyalty Approaching', value: toInteger(loyaltyApproaching.length) },
      ],
    },
    {
      id: 'survey_testimonial_feed',
      title: 'Survey & Testimonial Feed',
      href: '/surveys',
      rows: [
        { label: 'Pending Surveys', value: toInteger(pendingSurveyCount) },
        { label: 'Recent Testimonials', value: toInteger(recentTestimonialCount) },
        { label: 'Pending Approvals', value: toInteger(pendingTestimonialApprovalCount) },
      ],
    },
    {
      id: 'partners_referrals',
      title: 'Partners & Referrals',
      href: '/partners',
      rows: [
        { label: 'Active Partners', value: toInteger(activePartnerCount) },
        { label: 'Inactive Partners', value: toInteger(inactivePartnerCount) },
        { label: 'Referral Events', value: toInteger(partnerReferralEventCount) },
      ],
    },
    {
      id: 'stations_ops_status',
      title: 'Stations Ops Status',
      href: '/stations',
      rows: [
        { label: 'Active Stations', value: toInteger(stationActiveCount) },
        { label: 'Ops Alerts', value: toInteger(stationOpsAttentionCount) },
        { label: 'Unresolved Tasks', value: toInteger(unresolvedStationTasks) },
      ],
    },
    {
      id: 'payments_finance_detail',
      title: 'Payments & Finance Detail',
      href: '/finance/reporting',
      rows: [
        { label: 'Inbound Total', value: formatCurrency(paymentEntriesInboundTotal) },
        { label: 'Failed Queue', value: toInteger(paymentEntriesFailedQueue) },
        { label: 'Goal Gap', value: formatCurrency(monthlyGoalGapCents) },
      ],
    },
    {
      id: 'reports_snapshot',
      title: 'Reports Snapshot',
      href: '/reports/daily',
      rows: [
        { label: 'Latest Report', value: latestDailyReportDate ?? 'Not available' },
        {
          label: 'Report Freshness',
          value: reportFreshnessDays == null ? 'N/A' : `${toInteger(reportFreshnessDays)}d`,
        },
        { label: 'Open Recon Flags', value: toInteger(reconciliationOpenFlags) },
      ],
    },
    {
      id: 'task_automation',
      title: 'Task & Automation',
      href: '/automations',
      rows: [
        { label: 'Automation Rules', value: toInteger(totalAutomations) },
        { label: 'Failed Runs', value: toInteger(automationFailureCount) },
        { label: 'Overdue Tasks', value: toInteger(overdueTaskCount) },
      ],
    },
    // Cannabis Control Center card hidden - feature disabled
    {
      id: 'charity_impact',
      title: 'Charity Impact',
      href: '/charity',
      rows: [
        { label: 'Upcoming Events', value: toInteger(charityUpcomingEventCount) },
        { label: 'Hours Logged', value: toInteger(charityHoursSummary.totalHours) },
        { label: 'Entries', value: toInteger(charityHoursSummary.totalEntries) },
      ],
    },
    {
      id: 'community_commands',
      title: 'Community & Commands',
      href: '/community/templates',
      rows: [
        { label: 'Template Downloads', value: toInteger(communityTemplateDownloads) },
        {
          label: 'Open Command Items',
          value: toInteger(context.recurringCommandCenter.totalOpenItems),
        },
        { label: 'Collab Acceptance', value: toPercent(collabMetrics.acceptance_rate_pct) },
      ],
    },
    {
      id: 'guest_ops',
      title: 'Guest Operations',
      href: '/guests',
      rows: [
        { label: 'Upcoming Reservations', value: toInteger(guestUpcomingReservations) },
        { label: 'Guest Leads', value: toInteger(guestLeadStats.total) },
        { label: 'Unique Guests', value: toInteger(guestFrequencyStats.totalUniqueGuests) },
      ],
    },
    {
      id: 'receipts_reconciliation',
      title: 'Receipts Reconciliation',
      href: '/receipts',
      rows: [
        { label: 'Unapproved Receipts', value: toInteger(unapprovedReceiptCount) },
        { label: 'Orphan Receipts', value: toInteger(orphanReceiptCount) },
        { label: 'Open Recon Flags', value: toInteger(reconciliationOpenFlags) },
      ],
    },
    {
      id: 'social_planner',
      title: 'Social Planner',
      href: '/marketing/social',
      rows: [
        { label: 'Connected Accounts', value: toInteger(socialConnectedAccountCount) },
        { label: 'Pending Approval', value: toInteger(socialPendingApprovalCount) },
        { label: 'Next 30 Days', value: toInteger(socialUpcomingPosts30d) },
      ],
    },
    {
      id: 'wix_intake_health',
      title: 'Wix Intake Health',
      href: '/wix-submissions',
      rows: [
        { label: 'Connected', value: wixConnection.connected ? 'Yes' : 'No' },
        { label: 'Pending', value: toInteger(wixPendingSubmissionCount) },
        { label: 'Failed', value: toInteger(wixFailedSubmissionCount) },
      ],
    },
    {
      id: 'imports_sync_health',
      title: 'Imports & Sync Health',
      href: '/integrations',
      rows: [
        { label: 'Connected Integrations', value: toInteger(integrationOverview.totals.connected) },
        { label: 'Stale Integrations', value: toInteger(staleIntegrationCount) },
        { label: 'Gmail Sync Errors', value: toInteger(gmailSyncErrorCount) },
      ],
    },
    {
      id: 'remy_status',
      title: 'Remy Status',
      href: '/settings/remy',
      rows: [
        { label: 'Enabled', value: aiPreferences.remy_enabled ? 'Yes' : 'No' },
        { label: 'Audit Events', value: toInteger(remyAuditSummary.total) },
        { label: 'Error Rate', value: toPercent(remyMetrics.errorRate) },
      ],
    },
  ]

  return (
    <>
      {isWidgetEnabled('service_quality') && (
        <section
          className={widgetGridClass('service_quality')}
          style={{ order: getWidgetOrder('service_quality') }}
        >
          <CollapsibleWidget widgetId="service_quality" title="Service Quality">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Accountability</CardTitle>
                </CardHeader>
                <CardContent>
                  <AccountabilityPanel
                    weeklyStats={weeklyStats}
                    closureStreak={closureStreak}
                    overdueFollowUpCount={weeklyStats.overdueFollowUps}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Quotes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">Quoted</span>
                    <span className="font-semibold text-stone-100">
                      {toInteger(quoteStats.sent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">Expiring Soon</span>
                    <span className="font-semibold text-stone-100">
                      {toInteger(quoteStats.expiringSoon)}
                    </span>
                  </div>
                  {quoteInsights ? <QuoteAcceptanceInsightsPanel data={quoteInsights} /> : null}
                </CardContent>
              </Card>
            </div>
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('revenue_comparison') && (
        <section
          className={widgetGridClass('revenue_comparison')}
          style={{ order: getWidgetOrder('revenue_comparison') }}
        >
          <CollapsibleWidget widgetId="revenue_comparison" title="Revenue This Month">
            <RevenueComparisonWidget
              currentMonthRevenueCents={monthRevenue.currentMonthRevenueCents}
              previousMonthRevenueCents={monthRevenue.previousMonthRevenueCents}
              currentMonthProfitCents={monthRevenue.currentMonthProfitCents}
              changePercent={monthRevenue.changePercent}
              currentMonthName={currentMonthName}
              previousMonthName={(() => {
                const now = new Date()
                const prevIdx = now.getMonth() === 0 ? 11 : now.getMonth() - 1
                const names = [
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ]
                return names[prevIdx]
              })()}
            />
          </CollapsibleWidget>
        </section>
      )}

      {metricWidgets
        .filter((widget) => isWidgetEnabled(widget.id) && widget.id !== 'service_quality')
        .map((widget) => renderMetricWidget(widget, getWidgetOrder))}

      {isWidgetEnabled('takeachef_command_center') && (
        <section
          className={widgetGridClass('takeachef_command_center')}
          style={{ order: getWidgetOrder('takeachef_command_center') }}
        >
          <CollapsibleWidget widgetId="takeachef_command_center" title="TakeAChef Command Center">
            <TacDashboardWidget />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('wellbeing') && wellbeing && (
        <section
          className={widgetGridClass('wellbeing')}
          style={{ order: getWidgetOrder('wellbeing') }}
        >
          <CollapsibleWidget widgetId="wellbeing" title="Wellbeing">
            <BurnoutIndicatorCard level={wellbeing.level} suggestion={wellbeing.suggestion} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('concentration_risk') && (
        <section
          className={widgetGridClass('concentration_risk')}
          style={{ order: getWidgetOrder('concentration_risk') }}
        >
          <CollapsibleWidget widgetId="concentration_risk" title="Revenue Concentration">
            <ConcentrationWarningCard risk={concentrationRisk} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('business_health') && (
        <section
          className={widgetGridClass('business_health')}
          style={{ order: getWidgetOrder('business_health') }}
        >
          <CollapsibleWidget widgetId="business_health" title="Business Health">
            <BusinessHealthCard score={healthScore.score} total={healthScore.total} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('insurance_health') && (
        <section
          className={widgetGridClass('insurance_health')}
          style={{ order: getWidgetOrder('insurance_health') }}
        >
          <CollapsibleWidget widgetId="insurance_health" title="Insurance Health">
            <InsuranceHealthCard policies={insurancePolicies} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('career_growth') && (
        <section
          className={widgetGridClass('career_growth')}
          style={{ order: getWidgetOrder('career_growth') }}
        >
          <CollapsibleWidget widgetId="career_growth" title="Career Growth">
            <ChefJournalWidget
              insights={journalInsights}
              latestJourney={recentJourneys[0] ?? null}
            />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('hours') && (
        <section className={widgetGridClass('hours')} style={{ order: getWidgetOrder('hours') }}>
          <CollapsibleWidget widgetId="hours" title="Hours">
            <HoursLogWidget
              todayMinutes={hoursSnapshot.todayMinutes}
              weekMinutes={hoursSnapshot.weekMinutes}
              allTimeMinutes={hoursSnapshot.allTimeMinutes}
              topActivity={hoursSnapshot.topActivity}
              recentEntries={hoursSnapshot.recentEntries}
              trackingStreak={hoursSnapshot.trackingStreak}
              todayLogged={hoursSnapshot.todayLogged}
              weekCategoryBreakdown={hoursSnapshot.weekCategoryBreakdown}
              unloggedEvents={context.unloggedEvents}
            />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('todo_list') && (
        <section
          className={widgetGridClass('todo_list')}
          style={{ order: getWidgetOrder('todo_list') }}
        >
          <CollapsibleWidget widgetId="todo_list" title="To-Do List">
            <ChefTodoWidget initialTodos={todos} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('activity') && (
        <section
          className={widgetGridClass('activity')}
          style={{ order: getWidgetOrder('activity') }}
        >
          <CollapsibleWidget widgetId="activity" title="Activity">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-stone-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-stone-300 mb-3">My Recent Activity</h3>
                <div className="max-h-64 overflow-y-auto">
                  <ChefActivityFeed entries={context.chefActivity} compact />
                </div>
              </div>
              <LivePresencePanel tenantId={userTenantId} initialClients={activeClients} />
              <ActivityFeed events={recentActivity} />
            </div>
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('active_clients_now') && activeClients.length > 0 && (
        <section
          className={widgetGridClass('active_clients_now')}
          style={{ order: getWidgetOrder('active_clients_now') }}
        >
          <CollapsibleWidget widgetId="active_clients_now" title="Active Clients Now">
            <ActiveClientsCard clients={activeClients} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('prospecting_hub') && userIsAdmin && prospectStats.total > 0 && (
        <section
          className={widgetGridClass('prospecting_hub')}
          style={{ order: getWidgetOrder('prospecting_hub') }}
        >
          <CollapsibleWidget widgetId="prospecting_hub" title="Prospecting">
            <ProspectingWidget stats={prospectStats} hotPipelineCount={context.hotPipelineCount} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('beta_program') && userIsAdmin && (
        <section
          className={widgetGridClass('beta_program')}
          style={{ order: getWidgetOrder('beta_program') }}
        >
          <CollapsibleWidget widgetId="beta_program" title="Beta Program">
            <BetaTestersWidget />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('top_events_profit') && topEvents.length > 0 && (
        <section
          className={widgetGridClass('top_events_profit')}
          style={{ order: getWidgetOrder('top_events_profit') }}
        >
          <CollapsibleWidget widgetId="top_events_profit" title="Top Events by Profit">
            <TopEventsProfitWidget events={topEvents} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('pipeline_forecast') &&
        (pipelineForecast.expectedCents > 0 || pipelineForecast.stages.length > 0) && (
          <section
            className={widgetGridClass('pipeline_forecast')}
            style={{ order: getWidgetOrder('pipeline_forecast') }}
          >
            <CollapsibleWidget widgetId="pipeline_forecast" title="Pipeline Forecast">
              <PipelineForecastWidget forecast={pipelineForecast} />
            </CollapsibleWidget>
          </section>
        )}

      {isWidgetEnabled('multi_event_days') && multiEventDays.length > 0 && (
        <section
          className={widgetGridClass('multi_event_days')}
          style={{ order: getWidgetOrder('multi_event_days') }}
        >
          <CollapsibleWidget widgetId="multi_event_days" title="Multi-Event Days">
            <MultiEventDaysWidget days={multiEventDays} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('aar_performance') && aarStats && aarStats.totalReviews > 0 && (
        <section
          className={widgetGridClass('aar_performance')}
          style={{ order: getWidgetOrder('aar_performance') }}
        >
          <CollapsibleWidget widgetId="aar_performance" title="AAR Performance">
            <AARPerformanceWidget stats={aarStats} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('avg_hourly_rate') && (
        <section
          className={widgetGridClass('avg_hourly_rate')}
          style={{ order: getWidgetOrder('avg_hourly_rate') }}
        >
          <CollapsibleWidget widgetId="avg_hourly_rate" title="Avg Hourly Rate">
            <AvgHourlyRateWidget rateCents={avgHourlyRate} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('payout_summary') &&
        (payoutSummary.transferCount > 0 || payoutSummary.onboardingComplete) && (
          <section
            className={widgetGridClass('payout_summary')}
            style={{ order: getWidgetOrder('payout_summary') }}
          >
            <CollapsibleWidget widgetId="payout_summary" title="Payout Summary">
              <PayoutSummaryWidget summary={payoutSummary} />
            </CollapsibleWidget>
          </section>
        )}

      {isWidgetEnabled('revenue_goal') && revenueGoal.enabled && (
        <section
          className={widgetGridClass('revenue_goal')}
          style={{ order: getWidgetOrder('revenue_goal') }}
        >
          <CollapsibleWidget widgetId="revenue_goal" title="Revenue Goal">
            <RevenueGoalWidget snapshot={revenueGoal} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('loyalty_approaching') && loyaltyApproaching.length > 0 && (
        <section
          className={widgetGridClass('loyalty_approaching')}
          style={{ order: getWidgetOrder('loyalty_approaching') }}
        >
          <CollapsibleWidget widgetId="loyalty_approaching" title="Loyalty Rewards">
            <LoyaltyApproachingWidget clients={loyaltyApproaching} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('food_cost_trend') && (
        <section
          className={widgetGridClass('food_cost_trend')}
          style={{ order: getWidgetOrder('food_cost_trend') }}
        >
          <CollapsibleWidget widgetId="food_cost_trend" title="Food Cost Trend">
            <FoodCostTrendWidget trend={foodCostTrend} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('booking_seasonality') && seasonality.hasEnoughData && (
        <section
          className={widgetGridClass('booking_seasonality')}
          style={{ order: getWidgetOrder('booking_seasonality') }}
        >
          <CollapsibleWidget widgetId="booking_seasonality" title="Booking Seasonality">
            <BookingSeasonalityWidget seasonality={seasonality} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('yoy_comparison') &&
        (yoyData.revenueMetric.currentYear > 0 || yoyData.revenueMetric.previousYear > 0) && (
          <section
            className={widgetGridClass('yoy_comparison')}
            style={{ order: getWidgetOrder('yoy_comparison') }}
          >
            <CollapsibleWidget widgetId="yoy_comparison" title="Year-over-Year">
              <YoYComparisonWidget data={yoyData} />
            </CollapsibleWidget>
          </section>
        )}

      {isWidgetEnabled('overdue_installments') && overdueInstallments.length > 0 && (
        <section
          className={widgetGridClass('overdue_installments')}
          style={{ order: getWidgetOrder('overdue_installments') }}
        >
          <CollapsibleWidget widgetId="overdue_installments" title="Overdue Installments">
            <OverdueInstallmentsWidget installments={overdueInstallments} />
          </CollapsibleWidget>
        </section>
      )}

      {isWidgetEnabled('dormant_clients_list') && dormantClients.length > 0 && (
        <section
          className={widgetGridClass('dormant_clients_list')}
          style={{ order: getWidgetOrder('dormant_clients_list') }}
        >
          <CollapsibleWidget widgetId="dormant_clients_list" title="Dormant Clients">
            <DormantClientsWidget clients={dormantClients} />
          </CollapsibleWidget>
        </section>
      )}
    </>
  )
}
