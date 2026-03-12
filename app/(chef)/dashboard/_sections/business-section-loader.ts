import { isAdmin } from '@/lib/auth/admin'
import { getClients } from '@/lib/clients/actions'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'
import { getInquiryStats } from '@/lib/inquiries/actions'
import { getAARStats } from '@/lib/aar/actions'
import { getClientsApproachingRewards } from '@/lib/loyalty/actions'
import {
  getDashboardQuoteStats,
  getOutstandingPayments,
  getDashboardInquiryBudgetMix,
  getDashboardEventCounts,
  getMonthOverMonthRevenue,
  getCurrentMonthExpenseSummary,
  getDashboardHoursSnapshot,
  getTopEventsByProfit,
  getMonthlyAvgHourlyRate,
} from '@/lib/dashboard/actions'
import { getQuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'
import { getFoodCostTrend } from '@/lib/analytics/cost-trends'
import { getBookingSeasonality } from '@/lib/analytics/seasonality'
import { getDormantClients } from '@/lib/clients/dormancy'
import { getClosureStreak } from '@/lib/chefs/streaks'
import { getOverdueFollowUps, getWeeklyAccountabilityStats } from '@/lib/dashboard/accountability'
import { getPipelineRevenueForecast } from '@/lib/pipeline/forecast'
import { getUpcomingMilestones } from '@/lib/clients/birthday-alerts'
import { getStuckEvents } from '@/lib/pipeline/stuck-events'
import { getYoYData } from '@/lib/analytics/year-over-year'
import { getMultiEventDays } from '@/lib/scheduling/multi-event-days'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { getRevenueGoalSnapshot } from '@/lib/revenue-goals/actions'
import { getActiveClients, getRecentClientActivity } from '@/lib/activity/actions'
import { getChefActivitySummary } from '@/lib/activity/chef-actions'
import { getChefJourneyInsights, getChefJourneys } from '@/lib/journey/actions'
import { getTodos } from '@/lib/todos/actions'
import { getProspectStats } from '@/lib/prospecting/actions'
import { getHotPipelineCount } from '@/lib/prospecting/pipeline-actions'
import { getWellbeingSignals } from '@/lib/wellbeing/wellbeing-actions'
import { getConcentrationRisk } from '@/lib/finance/concentration-actions'
import { getHealthScore } from '@/lib/protection/business-health-actions'
import { getPolicies } from '@/lib/protection/insurance-actions'
import { getCurrentRegisterSession } from '@/lib/commerce/register-actions'
import { listSales } from '@/lib/commerce/sale-actions'
import { listProducts } from '@/lib/commerce/product-actions'
import { getStockSummary } from '@/lib/inventory/transaction-actions'
import { getWasteDashboard } from '@/lib/inventory/waste-actions'
import { listInvoices } from '@/lib/vendors/invoice-actions'
import { listVendors } from '@/lib/vendors/actions'
import { listStaffMembers } from '@/lib/staff/actions'
import { listEmployees, getPayrollRecords } from '@/lib/finance/payroll-actions'
import { listCampaigns } from '@/lib/marketing/actions'
import { listPushDinners } from '@/lib/campaigns/push-dinner-actions'
import { listContractTemplates } from '@/lib/contracts/actions'
import { listProposalTemplates } from '@/lib/proposals/template-actions'
import { listEquipment, getEquipmentDueForMaintenance, listRentals } from '@/lib/equipment/actions'
import { listKitchenRentals } from '@/lib/kitchen-rentals/actions'
import { getRecipes, getRecipeDebt } from '@/lib/recipes/actions'
import { getMenus } from '@/lib/menus/actions'
import { getConversionFunnelStats } from '@/lib/prospecting/pipeline-actions'
import { getMyConnections, getPendingRequests } from '@/lib/network/actions'
import { getCollabMetrics, getCollabUnreadCount } from '@/lib/network/collab-actions'
import { getIncidents } from '@/lib/safety/incident-actions'
import { getAllTravelLegs } from '@/lib/travel/actions'
import { getGoalsDashboard } from '@/lib/goals/actions'
import { getCommunicationInboxStats, getUnreadThreadCount } from '@/lib/communication/actions'
import { getInboxStats } from '@/lib/inbox/actions'
import { getUnreadCount } from '@/lib/notifications/actions'
import { getChefReviewStats } from '@/lib/reviews/actions'
import { getExternalReviewSources } from '@/lib/reviews/external-actions'
import { getUnreviewedCount } from '@/lib/reputation/mention-actions'
import { getRecentDocumentSnapshots } from '@/lib/documents/snapshot-actions'
import { getComplianceStats } from '@/lib/analytics/operations-analytics'
import { getEvents } from '@/lib/events/actions'
import { getChefSurveys } from '@/lib/surveys/actions'
import { getTestimonials } from '@/lib/testimonials/actions'
import { getPartners } from '@/lib/partners/actions'
import { getPartnerLeaderboard } from '@/lib/partners/analytics'
import { listStations } from '@/lib/stations/actions'
import { getOpsLog } from '@/lib/stations/ops-log-actions'
import { getWasteSummary as getStationWasteSummary } from '@/lib/stations/waste-actions'
import { getChefPayoutSummary } from '@/lib/stripe/payout-actions'
import { getOverdueInstallments } from '@/lib/commerce/schedule-actions'
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getDailyReportHistory } from '@/lib/reports/daily-report-actions'
import { listTemplates } from '@/lib/tasks/template-actions'
import { getAutomationRules, getAutomationExecutions } from '@/lib/automations/actions'
import {
  hasCannabisAccess,
  getCannabisEvents,
  getCannabisRSVPDashboardData,
} from '@/lib/chef/cannabis-actions'
import { getCharityEvents } from '@/lib/charity/actions'
import { getCharityHoursSummary } from '@/lib/charity/hours-actions'
import { getCommunityTemplates } from '@/lib/community/template-sharing'
import { getRecurringCollaborationCommandCenter } from '@/lib/recurring/actions'
import { listGuests } from '@/lib/guests/actions'
import { listReservations } from '@/lib/guests/reservation-actions'
import { getGuestFrequencyStats } from '@/lib/guest-analytics/actions'
import { getGuestLeadStats } from '@/lib/guest-leads/actions'
import { getAllReceiptsForChef } from '@/lib/receipts/library-actions'
import { listReconciliationReports } from '@/lib/commerce/reconciliation-actions'
import { getSocialPlannerData } from '@/lib/social/actions'
import { getSocialConnections } from '@/lib/social/oauth-actions'
import { getWixConnection, getWixSubmissions } from '@/lib/wix/actions'
import { getIntegrationHubOverview } from '@/lib/integrations/integration-hub'
import { getGmailSyncHistory } from '@/lib/gmail/actions'
import { DEFAULT_AI_RETENTION_DAYS } from '@/lib/ai/privacy-defaults'
import { getAiPreferences } from '@/lib/ai/privacy-actions'
import { getRemyActionAuditSummary } from '@/lib/ai/remy-action-audit-actions'
import { listRemyApprovalPolicies } from '@/lib/ai/remy-approval-policy-actions'
import { getRemyMetricsSummary } from '@/lib/ai/remy-metrics'
import {
  safe,
  emptyFinancials,
  emptyInquiryStats,
  emptyInquiryBudgetMix,
  emptyQuoteStats,
  emptyOutstandingPayments,
  emptyEventCounts,
  emptyMonthRevenue,
  emptyExpenses,
  emptyTopEvents,
  emptyFoodCostTrend,
  emptySeasonality,
  emptyDormantClients,
  emptyOverdueFollowUps,
  emptyWeeklyStats,
  emptyClosureStreak,
  emptyPipelineForecast,
  emptyYoY,
  emptyHoursSnapshot,
  emptyRevenueGoal,
  emptyJournalInsights,
  emptyProspectStats,
  emptyHealthScore,
  emptySalesList,
  emptyProductList,
  emptyStockSummary,
  emptyWasteSummary,
  emptyCampaigns,
  emptyPushDinners,
  emptyPayrollRecords,
  emptyContracts,
  emptyProposals,
  emptyCommunicationInboxStats,
  emptyUnifiedInboxStats,
  emptyReviewStats,
  emptyFunnelStats,
  emptyCollabMetrics,
  emptyGoalsDashboard,
  emptyComplianceStats,
  emptyGuestFrequencyStats,
  emptyGuestLeadStats,
  emptyPayoutSummary,
  emptyReconciliationReports,
  emptySocialPlannerData,
  emptyWixConnection,
  emptyIntegrationOverview,
  emptyRemyAuditSummary,
  emptyRemyMetrics,
} from './business-section-defaults'

interface LoadBusinessSectionDataParams {
  monthEnd: string
  monthStart: string
  now: Date
  userId: string
}

export async function loadBusinessSectionData({
  monthEnd,
  monthStart,
  now,
  userId,
}: LoadBusinessSectionDataParams) {
  const [
    clients,
    financials,
    inquiryStats,
    inquiryBudgetMix,
    aarStats,
    quoteStats,
    outstandingPayments,
    eventCounts,
    monthRevenue,
    monthExpenses,
    revenueGoal,
    loyaltyApproaching,
    activeClients,
    recentActivity,
    chefActivity,
    hoursSnapshot,
    journalInsights,
    recentJourneys,
    todos,
    quoteInsights,
    topEvents,
    avgHourlyRate,
    foodCostTrend,
    dormantClients,
    closureStreak,
    overdueFollowUps,
    weeklyStats,
    seasonality,
    pipelineForecast,
    upcomingMilestones,
    stuckEvents,
    yoyData,
    multiEventDays,
    nextBestActions,
    prospectStats,
    hotPipelineCount,
    wellbeing,
    concentrationRisk,
    healthScore,
    insurancePolicies,
    registerSession,
    recentSales,
    commerceProducts,
    stockSummary,
    wasteSummary,
    vendorList,
    monthInvoices,
    staffMembers,
    employees,
    payrollRecords,
    campaigns,
    pushDinners,
    contractTemplates,
    proposalTemplates,
    communicationInboxStats,
    unifiedInboxStats,
    unreadThreadCount,
    unreadNotificationCount,
    reviewStats,
    externalReviewSources,
    unreviewedMentionsCount,
    equipmentItems,
    equipmentDueForMaintenance,
    equipmentRentals,
    kitchenRentals,
    recipes,
    menus,
    recipeDebtSummary,
    conversionFunnel,
    networkConnections,
    networkPendingRequests,
    collabUnread,
    collabMetrics,
    safetyIncidents,
    travelLegs,
    goalsDashboard,
    documentSnapshots,
    complianceStats,
    allEvents,
    chefSurveys,
    testimonials,
    partners,
    partnerLeaderboard,
    stations,
    stationOpsLog,
    stationWasteSummary,
    payoutSummary,
    overdueInstallments,
    paymentLedgerEntries,
    dailyReportHistory,
    taskTemplates,
    automationRules,
    automationExecutions,
    cannabisAccess,
    cannabisEvents,
    cannabisRsvpDashboard,
    charityEvents,
    charityHoursSummary,
    communityTemplates,
    recurringCommandCenter,
    guests,
    reservations,
    guestFrequencyStats,
    guestLeadStats,
    receipts,
    reconciliationReports,
    socialPlannerData,
    socialConnections,
    wixConnection,
    wixSubmissions,
    integrationOverview,
    gmailSyncHistory,
    aiPreferences,
    remyAuditSummary,
    remyApprovalPolicies,
    remyMetrics,
    userIsAdmin,
  ] = await Promise.all([
    safe('clients', getClients, []),
    safe('financials', getTenantFinancialSummary, emptyFinancials),
    safe('inquiryStats', getInquiryStats, emptyInquiryStats),
    safe('inquiryBudgetMix', () => getDashboardInquiryBudgetMix(90), emptyInquiryBudgetMix),
    safe('aarStats', getAARStats, null),
    safe('quoteStats', getDashboardQuoteStats, emptyQuoteStats),
    safe('outstandingPayments', getOutstandingPayments, emptyOutstandingPayments),
    safe('eventCounts', getDashboardEventCounts, emptyEventCounts),
    safe('monthRevenue', getMonthOverMonthRevenue, emptyMonthRevenue),
    safe('monthExpenses', getCurrentMonthExpenseSummary, emptyExpenses),
    safe('revenueGoal', getRevenueGoalSnapshot, emptyRevenueGoal),
    safe('loyaltyApproaching', getClientsApproachingRewards, []),
    safe('activeClients', () => getActiveClients(30), []),
    safe(
      'recentActivity',
      async () => (await getRecentClientActivity({ limit: 15, daysBack: 7 })).items,
      []
    ),
    safe('chefActivity', () => getChefActivitySummary(5), []),
    safe('hoursSnapshot', getDashboardHoursSnapshot, emptyHoursSnapshot),
    safe('journalInsights', getChefJourneyInsights, emptyJournalInsights),
    safe('recentJourneys', () => getChefJourneys({ status: 'all', limit: 1 }), []),
    safe('todos', getTodos, []),
    safe('quoteInsights', getQuoteAcceptanceInsights, null),
    safe('topEvents', getTopEventsByProfit, emptyTopEvents),
    safe('avgHourlyRate', getMonthlyAvgHourlyRate, null),
    safe('foodCostTrend', () => getFoodCostTrend(6), emptyFoodCostTrend),
    safe('dormantClients', () => getDormantClients(5), emptyDormantClients),
    safe('closureStreak', getClosureStreak, emptyClosureStreak),
    safe('overdueFollowUps', () => getOverdueFollowUps(5), emptyOverdueFollowUps),
    safe('weeklyStats', getWeeklyAccountabilityStats, emptyWeeklyStats),
    safe('seasonality', getBookingSeasonality, emptySeasonality),
    safe('pipelineForecast', getPipelineRevenueForecast, emptyPipelineForecast),
    safe('upcomingMilestones', () => getUpcomingMilestones(14), []),
    safe('stuckEvents', () => getStuckEvents(5), []),
    safe('yoyData', getYoYData, emptyYoY),
    safe('multiEventDays', () => getMultiEventDays(90), []),
    safe('nextBestActions', () => getNextBestActions(5), []),
    safe('prospectStats', getProspectStats, emptyProspectStats),
    safe('hotPipelineCount', getHotPipelineCount, 0),
    safe('wellbeing', getWellbeingSignals, null),
    safe('concentrationRisk', getConcentrationRisk, null),
    safe('healthScore', getHealthScore, emptyHealthScore),
    safe('insurancePolicies', getPolicies, [] as any[]),
    safe('registerSession', getCurrentRegisterSession, null),
    safe('recentSales', () => listSales({ limit: 50 }), emptySalesList),
    safe('commerceProducts', () => listProducts({ limit: 1 }), emptyProductList),
    safe('stockSummary', getStockSummary, emptyStockSummary),
    safe('wasteSummary', getWasteDashboard, emptyWasteSummary),
    safe('vendorList', listVendors, [] as any[]),
    safe('monthInvoices', () => listInvoices(undefined, monthStart, monthEnd), [] as any[]),
    safe('staffMembers', () => listStaffMembers(true), [] as any[]),
    safe('employees', () => listEmployees(false), [] as any[]),
    safe(
      'payrollRecords',
      () => getPayrollRecords({ year: now.getFullYear() }),
      emptyPayrollRecords
    ),
    safe('campaigns', listCampaigns, emptyCampaigns),
    safe('pushDinners', listPushDinners, emptyPushDinners),
    safe('contractTemplates', listContractTemplates, emptyContracts),
    safe('proposalTemplates', listProposalTemplates, emptyProposals),
    safe('communicationInboxStats', getCommunicationInboxStats, emptyCommunicationInboxStats),
    safe('unifiedInboxStats', getInboxStats, emptyUnifiedInboxStats),
    safe('unreadThreadCount', getUnreadThreadCount, 0),
    safe('unreadNotificationCount', getUnreadCount, 0),
    safe('reviewStats', getChefReviewStats, emptyReviewStats),
    safe('externalReviewSources', getExternalReviewSources, [] as any[]),
    safe('unreviewedMentionsCount', getUnreviewedCount, 0),
    safe('equipmentItems', listEquipment, [] as any[]),
    safe('equipmentDueForMaintenance', getEquipmentDueForMaintenance, [] as any[]),
    safe('equipmentRentals', listRentals, [] as any[]),
    safe('kitchenRentals', listKitchenRentals, [] as any[]),
    safe('recipes', getRecipes, [] as any[]),
    safe('menus', getMenus, [] as any[]),
    safe('recipeDebtSummary', getRecipeDebt, {
      last7Days: 0,
      last30Days: 0,
      older: 0,
      total: 0,
      totalRecipes: 0,
    }),
    safe('conversionFunnel', getConversionFunnelStats, emptyFunnelStats),
    safe('networkConnections', getMyConnections, [] as any[]),
    safe('networkPendingRequests', getPendingRequests, [] as any[]),
    safe('collabUnread', getCollabUnreadCount, 0),
    safe('collabMetrics', () => getCollabMetrics(90), emptyCollabMetrics),
    safe('safetyIncidents', getIncidents, [] as any[]),
    safe(
      'travelLegs',
      () =>
        getAllTravelLegs({
          fromDate: now.toISOString().split('T')[0],
          toDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }),
      [] as any[]
    ),
    safe('goalsDashboard', getGoalsDashboard, emptyGoalsDashboard),
    safe('documentSnapshots', () => getRecentDocumentSnapshots(400), [] as any[]),
    safe('complianceStats', getComplianceStats, emptyComplianceStats),
    safe('allEvents', getEvents, [] as any[]),
    safe('chefSurveys', getChefSurveys, [] as any[]),
    safe('testimonials', getTestimonials, [] as any[]),
    safe('partners', getPartners, [] as any[]),
    safe('partnerLeaderboard', getPartnerLeaderboard, [] as any[]),
    safe('stations', listStations, [] as any[]),
    safe('stationOpsLog', () => getOpsLog({ page: 1, per_page: 100 }), {
      entries: [] as any[],
      total: 0,
      page: 1,
      per_page: 100,
      total_pages: 0,
    }),
    safe('stationWasteSummary', () => getStationWasteSummary(monthStart, monthEnd), {
      total_entries: 0,
      total_value_cents: 0,
      by_reason: [] as any[],
      by_station: [] as any[],
    }),
    safe('payoutSummary', getChefPayoutSummary, emptyPayoutSummary),
    safe('overdueInstallments', getOverdueInstallments, [] as any[]),
    safe('paymentLedgerEntries', getLedgerEntries, [] as any[]),
    safe('dailyReportHistory', () => getDailyReportHistory(7), [] as any[]),
    safe('taskTemplates', listTemplates, [] as any[]),
    safe('automationRules', getAutomationRules, [] as any[]),
    safe('automationExecutions', () => getAutomationExecutions({ limit: 100 }), [] as any[]),
    safe('cannabisAccess', () => hasCannabisAccess(userId), false),
    safe('cannabisEvents', getCannabisEvents, [] as any[]),
    safe('cannabisRsvpDashboard', getCannabisRSVPDashboardData, {
      events: [] as any[],
      selectedEvent: null as any,
      summary: null as any,
      guests: [] as any[],
      editCutoffIso: null as string | null,
      editWindowOpen: false,
    }),
    safe('charityEvents', getCharityEvents, [] as any[]),
    safe('charityHoursSummary', getCharityHoursSummary, {
      totalHours: 0,
      totalEntries: 0,
      uniqueOrgs: 0,
      verified501cOrgs: 0,
      hoursByOrg: [] as any[],
    }),
    safe('communityTemplates', getCommunityTemplates, [] as any[]),
    safe('recurringCommandCenter', getRecurringCollaborationCommandCenter, {
      openMealRequestCount: 0,
      pendingRecommendationResponseCount: 0,
      totalOpenItems: 0,
      items: [] as any[],
    }),
    safe('guests', listGuests, [] as any[]),
    safe('reservations', listReservations, [] as any[]),
    safe('guestFrequencyStats', getGuestFrequencyStats, emptyGuestFrequencyStats),
    safe('guestLeadStats', getGuestLeadStats, emptyGuestLeadStats),
    safe('receipts', () => getAllReceiptsForChef({ limit: 400 }), [] as any[]),
    safe(
      'reconciliationReports',
      () => listReconciliationReports({ limit: 30 }),
      emptyReconciliationReports
    ),
    safe('socialPlannerData', getSocialPlannerData, emptySocialPlannerData),
    safe('socialConnections', getSocialConnections, [] as any[]),
    safe('wixConnection', getWixConnection, emptyWixConnection),
    safe('wixSubmissions', () => getWixSubmissions({ limit: 100 }), [] as any[]),
    safe('integrationOverview', getIntegrationHubOverview, emptyIntegrationOverview),
    safe('gmailSyncHistory', () => getGmailSyncHistory(50), [] as any[]),
    safe('aiPreferences', getAiPreferences, {
      remy_enabled: false,
      onboarding_completed: false,
      onboarding_completed_at: null as string | null,
      data_retention_days: DEFAULT_AI_RETENTION_DAYS,
      allow_memory: true,
      allow_suggestions: true,
      allow_document_drafts: true,
      remy_archetype: null as string | null,
    }),
    safe('remyAuditSummary', () => getRemyActionAuditSummary(14), emptyRemyAuditSummary),
    safe('remyApprovalPolicies', listRemyApprovalPolicies, [] as any[]),
    safe('remyMetrics', getRemyMetricsSummary, emptyRemyMetrics),
    isAdmin(),
  ])

  return {
    clients,
    financials,
    inquiryStats,
    inquiryBudgetMix,
    aarStats,
    quoteStats,
    outstandingPayments,
    eventCounts,
    monthRevenue,
    monthExpenses,
    revenueGoal,
    loyaltyApproaching,
    activeClients,
    recentActivity,
    chefActivity,
    hoursSnapshot,
    journalInsights,
    recentJourneys,
    todos,
    quoteInsights,
    topEvents,
    avgHourlyRate,
    foodCostTrend,
    dormantClients,
    closureStreak,
    overdueFollowUps,
    weeklyStats,
    seasonality,
    pipelineForecast,
    upcomingMilestones,
    stuckEvents,
    yoyData,
    multiEventDays,
    nextBestActions,
    prospectStats,
    hotPipelineCount,
    wellbeing,
    concentrationRisk,
    healthScore,
    insurancePolicies,
    registerSession,
    recentSales,
    commerceProducts,
    stockSummary,
    wasteSummary,
    vendorList,
    monthInvoices,
    staffMembers,
    employees,
    payrollRecords,
    campaigns,
    pushDinners,
    contractTemplates,
    proposalTemplates,
    communicationInboxStats,
    unifiedInboxStats,
    unreadThreadCount,
    unreadNotificationCount,
    reviewStats,
    externalReviewSources,
    unreviewedMentionsCount,
    equipmentItems,
    equipmentDueForMaintenance,
    equipmentRentals,
    kitchenRentals,
    recipes,
    menus,
    recipeDebtSummary,
    conversionFunnel,
    networkConnections,
    networkPendingRequests,
    collabUnread,
    collabMetrics,
    safetyIncidents,
    travelLegs,
    goalsDashboard,
    documentSnapshots,
    complianceStats,
    allEvents,
    chefSurveys,
    testimonials,
    partners,
    partnerLeaderboard,
    stations,
    stationOpsLog,
    stationWasteSummary,
    payoutSummary,
    overdueInstallments,
    paymentLedgerEntries,
    dailyReportHistory,
    taskTemplates,
    automationRules,
    automationExecutions,
    cannabisAccess,
    cannabisEvents,
    cannabisRsvpDashboard,
    charityEvents,
    charityHoursSummary,
    communityTemplates,
    recurringCommandCenter,
    guests,
    reservations,
    guestFrequencyStats,
    guestLeadStats,
    receipts,
    reconciliationReports,
    socialPlannerData,
    socialConnections,
    wixConnection,
    wixSubmissions,
    integrationOverview,
    gmailSyncHistory,
    aiPreferences,
    remyAuditSummary,
    remyApprovalPolicies,
    remyMetrics,
    userIsAdmin,
  }
}
