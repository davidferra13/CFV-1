'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import type {
  ClientRetentionStats,
  ClientChurnStats,
  RevenueConcentrationStats,
  ClientAcquisitionStats,
  ReferralConversionStats,
  NpsStats,
} from '@/lib/analytics/client-analytics'
import type {
  InquiryFunnelStats,
  QuoteAcceptanceStats,
  GhostRateStats,
  LeadTimeStats,
  DeclineReasonStats,
  NegotiationStats,
  ResponseTimeStats,
} from '@/lib/analytics/pipeline-analytics'
import type {
  RevenuePerUnitStats,
  RevenueByDayOfWeek,
  RevenueByEventType,
  RevenueBySeason,
  TrueLaborCostStats,
  CapacityStats,
  CarryForwardStats,
  BreakEvenStats,
} from '@/lib/analytics/revenue-analytics'
import type {
  ComplianceStats,
  TimePhaseStats,
  WasteStats,
  CulinaryOperationsStats,
} from '@/lib/analytics/operations-analytics'
import type {
  CampaignEmailStats,
  MarketingSpendByChannel,
  ReviewStats,
  WebsiteStatsLatest,
} from '@/lib/analytics/marketing-analytics'
import type {
  SocialConnectionStatus,
  SocialGrowthTrend,
  GoogleReviewStats,
} from '@/lib/analytics/social-analytics'
import type {
  RecipeUsageStats,
  DishPerformanceStats,
  MenuApprovalStats,
} from '@/lib/analytics/culinary-analytics'
import type { SourceDataPoint, ConversionData, RevenueData } from '@/lib/partners/analytics'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalyticsHubProps {
  // Overview
  monthRevenue: {
    currentMonthRevenueCents: number
    previousMonthRevenueCents: number
    changePercent: number
  } | null
  eventCounts: { thisMonth: number; ytd: number; completedThisMonth: number } | null

  // Client
  clientRetention: ClientRetentionStats
  clientChurn: ClientChurnStats
  revenueConcentration: RevenueConcentrationStats
  clientAcquisition: ClientAcquisitionStats
  referralConversion: ReferralConversionStats
  npsStats: NpsStats

  // Pipeline
  inquiryFunnel: InquiryFunnelStats
  quoteAcceptance: QuoteAcceptanceStats
  ghostRate: GhostRateStats
  leadTime: LeadTimeStats
  declineReasons: DeclineReasonStats
  negotiation: NegotiationStats
  responseTime: ResponseTimeStats

  // Revenue
  revenuePerUnit: RevenuePerUnitStats
  revenueByDayOfWeek: RevenueByDayOfWeek[]
  revenueByEventType: RevenueByEventType[]
  revenueBySeason: RevenueBySeason[]
  trueLaborCost: TrueLaborCostStats
  capacity: CapacityStats
  carryForward: CarryForwardStats
  breakEven: BreakEvenStats

  // Operations
  compliance: ComplianceStats
  timePhases: TimePhaseStats[]
  waste: WasteStats
  culinaryOps: CulinaryOperationsStats

  // Marketing
  emailStats: CampaignEmailStats
  marketingSpend: MarketingSpendByChannel[]
  reviewStats: ReviewStats
  websiteStats: WebsiteStatsLatest

  // Social
  socialConnections: SocialConnectionStatus[]
  instagramTrend: SocialGrowthTrend[]
  googleReviews: GoogleReviewStats | null

  // Culinary
  recipeUsage: RecipeUsageStats
  dishPerformance: DishPerformanceStats
  menuApproval: MenuApprovalStats

  // Source analytics (existing)
  sourceDistribution: SourceDataPoint[]
  sourceConversions: ConversionData[]
  sourceRevenue: RevenueData[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function pctBadge(value: number, threshold: number = 50) {
  return value >= threshold ? 'success' : value >= threshold * 0.7 ? 'warning' : 'error'
}

const COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#78716c', '#a8a29e']

function StatCard({
  label,
  value,
  sub,
  variant,
}: {
  label: string
  value: string | number
  sub?: string
  variant?: 'success' | 'warning' | 'error' | 'default'
}) {
  const color =
    variant === 'success'
      ? 'text-emerald-600'
      : variant === 'warning'
        ? 'text-amber-600'
        : variant === 'error'
          ? 'text-red-600'
          : 'text-stone-100'
  return (
    <div className="bg-stone-900 rounded-lg border border-stone-700 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-stone-300 mt-1">{sub}</p>}
    </div>
  )
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue & Financial' },
  { id: 'operations', label: 'Operations' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'clients', label: 'Clients' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'social', label: 'Social' },
  { id: 'culinary', label: 'Culinary' },
  { id: 'benchmarks', label: 'Benchmarks' },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Tab Sections ─────────────────────────────────────────────────────────────

function OverviewTab({ p }: { p: AnalyticsHubProps }) {
  const revChange = p.monthRevenue?.changePercent ?? 0
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Revenue This Month"
          value={fmt$(p.monthRevenue?.currentMonthRevenueCents ?? 0)}
          sub={`${revChange >= 0 ? '+' : ''}${revChange.toFixed(1)}% vs last month`}
          variant={revChange >= 0 ? 'success' : 'error'}
        />
        <StatCard
          label="Events This Month"
          value={p.eventCounts?.thisMonth ?? 0}
          sub={`${p.eventCounts?.completedThisMonth ?? 0} completed`}
        />
        <StatCard
          label="NPS Score"
          value={p.npsStats.totalResponses > 0 ? p.npsStats.npsScore : 'N/A'}
          sub={`${p.npsStats.totalResponses} responses`}
          variant={
            p.npsStats.npsScore >= 50 ? 'success' : p.npsStats.npsScore >= 20 ? 'warning' : 'error'
          }
        />
        <StatCard
          label="Avg Review Rating"
          value={p.reviewStats.avgRating > 0 ? `${p.reviewStats.avgRating} ★` : 'N/A'}
          sub={`${p.reviewStats.totalReviews} reviews`}
          variant={
            p.reviewStats.avgRating >= 4.5
              ? 'success'
              : p.reviewStats.avgRating >= 3.5
                ? 'warning'
                : 'error'
          }
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Events YTD" value={p.eventCounts?.ytd ?? 0} />
        <StatCard
          label="Capacity This Month"
          value={p.capacity.maxEventsPerMonth ? `${p.capacity.utilization}%` : 'Not set'}
          sub={`${p.capacity.bookedThisMonth} booked`}
          variant={p.capacity.maxEventsPerMonth ? pctBadge(p.capacity.utilization, 60) : 'default'}
        />
        <StatCard
          label="Inquiry→Booking Rate"
          value={`${p.inquiryFunnel.overallConversionRate}%`}
          variant={pctBadge(p.inquiryFunnel.overallConversionRate, 40)}
        />
        <StatCard
          label="Repeat Booking Rate"
          value={`${p.clientRetention.repeatBookingRate}%`}
          variant={pctBadge(p.clientRetention.repeatBookingRate, 50)}
        />
      </div>
    </div>
  )
}

function RevenueTab({ p }: { p: AnalyticsHubProps }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Revenue / Guest"
          value={fmt$(p.revenuePerUnit.revenuePerGuestCents)}
          sub={`${p.revenuePerUnit.totalGuestsServed} total guests`}
        />
        <StatCard
          label="Revenue / Hour"
          value={fmt$(p.revenuePerUnit.revenuePerHourCents)}
          sub={`${p.revenuePerUnit.totalHoursWorked}h worked`}
        />
        <StatCard
          label="Revenue / Mile"
          value={fmt$(p.revenuePerUnit.revenuePerMileCents)}
          sub={`${p.revenuePerUnit.totalMilesDriven} miles`}
        />
        <StatCard
          label="True Net Profit Margin"
          value={`${p.trueLaborCost.trueNetMarginPercent}%`}
          sub="after labor cost"
          variant={pctBadge(p.trueLaborCost.trueNetMarginPercent, 40)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Revenue by Day of Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={p.revenueByDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(0, 3)} />
              <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={((v: number) => fmt$(v)) as any} />
              <Bar dataKey="revenueCents" fill="#d97706" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Revenue by Season</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={p.revenueBySeason}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={((v: number) => fmt$(v)) as any} />
              <Bar dataKey="revenueCents" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Labor as % of Revenue"
          value={`${p.trueLaborCost.laborAsPercentOfRevenue}%`}
          sub={`${fmt$(p.trueLaborCost.totalLaborCents)} total labor`}
          variant={
            p.trueLaborCost.laborAsPercentOfRevenue <= 30
              ? 'success'
              : p.trueLaborCost.laborAsPercentOfRevenue <= 45
                ? 'warning'
                : 'error'
          }
        />
        <StatCard label="Staff Cost" value={fmt$(p.trueLaborCost.staffCostCents)} />
        <StatCard
          label="Carry-Forward Savings"
          value={fmt$(p.carryForward.totalSavingsCents)}
          sub={`${p.carryForward.eventsWithCarryForward} events`}
        />
        <StatCard
          label="Break-Even Events/Month"
          value={p.breakEven.breakEvenEventsPerMonth}
          sub={`vs ${p.breakEven.avgEventsPerMonth.toFixed(1)} avg`}
          variant={
            p.breakEven.avgEventsPerMonth >= p.breakEven.breakEvenEventsPerMonth
              ? 'success'
              : 'error'
          }
        />
      </div>
      <Card className="p-6">
        <h3 className="font-semibold text-stone-200 mb-4">Revenue by Event Type</h3>
        {p.revenueByEventType.length === 0 ? (
          <p className="text-stone-300 text-sm">No completed events yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  {['Occasion', 'Events', 'Total Revenue', 'Avg Revenue', 'Avg Guests'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-stone-500 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.revenueByEventType.map((row) => (
                  <tr key={row.occasion} className="border-b border-stone-800">
                    <td className="py-2 px-3 font-medium">{row.occasion}</td>
                    <td className="py-2 px-3">{row.eventCount}</td>
                    <td className="py-2 px-3">{fmt$(row.revenueCents)}</td>
                    <td className="py-2 px-3">{fmt$(row.avgRevenueCents)}</td>
                    <td className="py-2 px-3">{row.avgGuestCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function OperationsTab({ p }: { p: AnalyticsHubProps }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="On-Time Start Rate"
          value={`${p.compliance.onTimeStartRate}%`}
          variant={pctBadge(p.compliance.onTimeStartRate, 85)}
        />
        <StatCard
          label="Kitchen Compliance"
          value={`${p.compliance.kitchenComplianceRate}%`}
          sub="reset_complete after event"
          variant={pctBadge(p.compliance.kitchenComplianceRate, 90)}
        />
        <StatCard
          label="Receipt Submission"
          value={`${p.compliance.receiptSubmissionRate}%`}
          sub="within 24h"
          variant={pctBadge(p.compliance.receiptSubmissionRate, 80)}
        />
        <StatCard
          label="Temp Log Compliance"
          value={`${p.compliance.tempLogComplianceRate}%`}
          variant={pctBadge(p.compliance.tempLogComplianceRate, 80)}
        />
        <StatCard
          label="Dietary Accommodation"
          value={`${p.compliance.dietaryAccommodationRate}%`}
          sub="events with restrictions"
        />
        <StatCard
          label="Menu Deviation Rate"
          value={`${p.compliance.menuDeviationRate}%`}
          sub="proposed vs actual served"
        />
      </div>
      <Card className="p-6">
        <h3 className="font-semibold text-stone-200 mb-4">Average Time Per Phase</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                {['Phase', 'Avg (min)', 'Min', 'Max', 'Events'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-stone-500 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.timePhases.map((phase) => (
                <tr key={phase.phase} className="border-b border-stone-800">
                  <td className="py-2 px-3 font-medium">{phase.phase}</td>
                  <td className="py-2 px-3">
                    {phase.avgMinutes > 0 ? `${phase.avgMinutes}m` : '—'}
                  </td>
                  <td className="py-2 px-3 text-stone-500">
                    {phase.minMinutes > 0 ? `${phase.minMinutes}m` : '—'}
                  </td>
                  <td className="py-2 px-3 text-stone-500">
                    {phase.maxMinutes > 0 ? `${phase.maxMinutes}m` : '—'}
                  </td>
                  <td className="py-2 px-3">{phase.eventCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Food Spend" value={fmt$(p.waste.totalFoodSpendCents)} />
        <StatCard
          label="Carry-Forward (leftovers)"
          value={fmt$(p.waste.leftoverCarriedForwardCents)}
        />
        <StatCard label="Net Food Cost" value={fmt$(p.waste.netFoodCostCents)} />
        <StatCard
          label="Waste Rate"
          value={`${p.waste.wastePercent}%`}
          sub="leftovers / food spend"
          variant={p.waste.wastePercent <= 10 ? 'success' : 'warning'}
        />
      </div>
    </div>
  )
}

function PipelineTab({ p }: { p: AnalyticsHubProps }) {
  const funnelData = [
    { stage: 'Inquiries', count: p.inquiryFunnel.totalInquiries },
    { stage: 'Quoted', count: p.inquiryFunnel.quotedCount },
    { stage: 'Confirmed', count: p.inquiryFunnel.confirmedCount },
    { stage: 'Completed', count: p.inquiryFunnel.completedCount },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Quote Acceptance Rate"
          value={`${p.quoteAcceptance.acceptanceRate}%`}
          sub={`${p.quoteAcceptance.accepted} / ${p.quoteAcceptance.totalSent} sent`}
          variant={pctBadge(p.quoteAcceptance.acceptanceRate, 60)}
        />
        <StatCard
          label="Ghost Rate"
          value={`${p.ghostRate.ghostRate}%`}
          sub="inquiries that expired"
          variant={
            p.ghostRate.ghostRate <= 15
              ? 'success'
              : p.ghostRate.ghostRate <= 30
                ? 'warning'
                : 'error'
          }
        />
        <StatCard
          label="Avg Lead Time"
          value={`${p.leadTime.avgLeadTimeDays}d`}
          sub="inquiry to event date"
        />
        <StatCard
          label="Avg Sales Cycle"
          value={`${p.leadTime.avgSalesCycleDays}d`}
          sub="inquiry to quote accepted"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Inquiry Funnel</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Booking Lead Time Distribution</h3>
          <div className="space-y-3 mt-2">
            {[
              {
                label: '< 2 weeks',
                count: p.leadTime.buckets.under2weeks,
                pct: p.leadTime.bucketPercents.under2weeks,
              },
              {
                label: '2–4 weeks',
                count: p.leadTime.buckets.twoTo4weeks,
                pct: p.leadTime.bucketPercents.twoTo4weeks,
              },
              {
                label: '1–3 months',
                count: p.leadTime.buckets.oneToThreeMonths,
                pct: p.leadTime.bucketPercents.oneToThreeMonths,
              },
              {
                label: '3+ months',
                count: p.leadTime.buckets.over3months,
                pct: p.leadTime.bucketPercents.over3months,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-sm text-stone-300 w-24">{row.label}</span>
                <div className="flex-1 bg-stone-800 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-sm font-medium w-12 text-right">{row.pct}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Negotiation Rate"
          value={`${p.negotiation.negotiationRate}%`}
          sub="quotes with price adjustment"
        />
        <StatCard
          label="Avg Discount"
          value={`${p.negotiation.avgDiscountPercent}%`}
          sub={fmt$(p.negotiation.avgDiscountCents)}
        />
        <StatCard
          label="Avg Response Time"
          value={`${p.responseTime.avgHoursToFirstResponse}h`}
          variant={
            p.responseTime.avgHoursToFirstResponse <= 2
              ? 'success'
              : p.responseTime.avgHoursToFirstResponse <= 12
                ? 'warning'
                : 'error'
          }
        />
        <StatCard
          label="Responded < 1h"
          value={`${p.responseTime.under1hourPercent}%`}
          variant={pctBadge(p.responseTime.under1hourPercent, 50)}
        />
      </div>
      {p.declineReasons.reasons.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">
            Decline Reasons ({p.declineReasons.totalDeclined} total)
          </h3>
          <div className="space-y-2">
            {p.declineReasons.reasons.map((r) => (
              <div key={r.reason} className="flex items-center gap-3">
                <span className="text-sm text-stone-300 w-40 capitalize">
                  {r.reason.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 bg-stone-800 rounded-full h-2">
                  <div className="bg-red-400 h-2 rounded-full" style={{ width: `${r.percent}%` }} />
                </div>
                <span className="text-sm w-12 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function ClientsTab({ p }: { p: AnalyticsHubProps }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={p.clientRetention.activeClients} />
        <StatCard
          label="Repeat Clients"
          value={p.clientRetention.repeatClients}
          sub={`${p.clientRetention.repeatBookingRate}% repeat rate`}
          variant={pctBadge(p.clientRetention.repeatBookingRate, 50)}
        />
        <StatCard
          label="6-Month Retention"
          value={`${p.clientRetention.retentionRate}%`}
          variant={pctBadge(p.clientRetention.retentionRate, 60)}
        />
        <StatCard
          label="At-Risk Clients"
          value={p.clientChurn.totalAtRisk}
          sub="120+ days, 2+ events"
          variant={p.clientChurn.totalAtRisk === 0 ? 'success' : 'warning'}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Churn Rate"
          value={`${p.clientChurn.churnRate}%`}
          variant={
            p.clientChurn.churnRate <= 10
              ? 'success'
              : p.clientChurn.churnRate <= 25
                ? 'warning'
                : 'error'
          }
        />
        <StatCard
          label="Avg Days Since Last Event"
          value={`${p.clientChurn.avgDaysSinceLastEvent}d`}
        />
        <StatCard
          label="Referral Conversion"
          value={`${p.referralConversion.referralConversionRate}%`}
          sub={`${p.referralConversion.referredConversions} / ${p.referralConversion.referredInquiries} referred`}
        />
        <StatCard
          label="Referral Revenue"
          value={fmt$(p.referralConversion.referralRevenueCents)}
        />
      </div>
      <Card className="p-6">
        <h3 className="font-semibold text-stone-200 mb-4">Revenue Concentration (Top 5 Clients)</h3>
        {p.revenueConcentration.top5Clients.length === 0 ? (
          <p className="text-stone-300 text-sm">No data yet</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-500">
              Top 5 clients ={' '}
              <span className="font-semibold text-stone-200">
                {p.revenueConcentration.top5SharePercent}%
              </span>{' '}
              of revenue | Concentration index: {p.revenueConcentration.herfindahlIndex}
            </p>
            {p.revenueConcentration.top5Clients.map((c, i) => (
              <div key={c.clientId} className="flex items-center gap-3">
                <span className="text-xs text-stone-300 w-4">#{i + 1}</span>
                <span className="text-sm font-medium w-36 truncate">{c.name}</span>
                <div className="flex-1 bg-stone-800 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${c.sharePercent}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-20 text-right">{fmt$(c.revenueCents)}</span>
                <span className="text-xs text-stone-300 w-10 text-right">{c.sharePercent}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      {p.npsStats.totalResponses > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="NPS Score"
            value={p.npsStats.npsScore}
            sub={`${p.npsStats.totalResponses} responses`}
            variant={
              p.npsStats.npsScore >= 50
                ? 'success'
                : p.npsStats.npsScore >= 20
                  ? 'warning'
                  : 'error'
            }
          />
          <StatCard
            label="Would Rebook"
            value={`${p.npsStats.wouldRebookPercent}%`}
            variant={pctBadge(p.npsStats.wouldRebookPercent, 80)}
          />
          <StatCard label="Avg Food Quality" value={`${p.npsStats.avgFoodQualityRating} / 5`} />
          <StatCard label="Survey Response Rate" value={`${p.npsStats.responseRate}%`} />
        </div>
      )}
    </div>
  )
}

function MarketingTab({ p }: { p: AnalyticsHubProps }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Email Open Rate"
          value={`${p.emailStats.openRate}%`}
          variant={pctBadge(p.emailStats.openRate, 30)}
        />
        <StatCard
          label="Email Click Rate"
          value={`${p.emailStats.clickRate}%`}
          variant={pctBadge(p.emailStats.clickRate, 5)}
        />
        <StatCard
          label="Bounce Rate"
          value={`${p.emailStats.bounceRate}%`}
          variant={
            p.emailStats.bounceRate <= 2
              ? 'success'
              : p.emailStats.bounceRate <= 5
                ? 'warning'
                : 'error'
          }
        />
        <StatCard
          label="Spam Rate"
          value={`${p.emailStats.spamRate}%`}
          variant={p.emailStats.spamRate === 0 ? 'success' : 'error'}
        />
      </div>
      {p.emailStats.bestCampaign && (
        <Card className="p-4 bg-amber-950 border-amber-200">
          <p className="text-sm text-stone-300">
            Best campaign: <span className="font-semibold">{p.emailStats.bestCampaign.name}</span> —{' '}
            {p.emailStats.bestCampaign.openRate}% open rate
          </p>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Marketing Spend by Channel</h3>
          {p.marketingSpend.length === 0 ? (
            <p className="text-stone-300 text-sm">
              No marketing spend logged yet.{' '}
              <a href="/analytics/marketing/spend" className="text-amber-600 hover:underline">
                Add spend
              </a>
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={p.marketingSpend}
                  dataKey="totalCents"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: any) =>
                    `${props.channel} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {p.marketingSpend.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={((v: number) => fmt$(v)) as any} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Review Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-300">Average Rating</span>
              <span className="font-bold text-amber-600">
                {p.reviewStats.avgRating > 0 ? `${p.reviewStats.avgRating} ★` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-300">Review Rate</span>
              <Badge variant={p.reviewStats.reviewRate >= 30 ? 'success' : 'warning'}>
                {p.reviewStats.reviewRate}%
              </Badge>
            </div>
            {p.reviewStats.ratingDistribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-2">
                <span className="text-xs w-4">{d.stars}★</span>
                <div className="flex-1 bg-stone-800 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
                <span className="text-xs w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      {p.websiteStats.snapshotMonth && (
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">
            Website Stats — {p.websiteStats.snapshotMonth}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Unique Visitors"
              value={p.websiteStats.uniqueVisitors?.toLocaleString() ?? 'N/A'}
            />
            <StatCard
              label="Pageviews"
              value={p.websiteStats.pageviews?.toLocaleString() ?? 'N/A'}
            />
            <StatCard
              label="Bounce Rate"
              value={
                p.websiteStats.bounceRatePercent != null
                  ? `${p.websiteStats.bounceRatePercent}%`
                  : 'N/A'
              }
            />
            <StatCard
              label="Inquiry Conversion"
              value={
                p.websiteStats.inquiryConversionRatePercent != null
                  ? `${p.websiteStats.inquiryConversionRatePercent}%`
                  : 'N/A'
              }
            />
          </div>
        </Card>
      )}
    </div>
  )
}

function SocialTab({ p }: { p: AnalyticsHubProps }) {
  const instagram = p.socialConnections.find((c) => c.platform === 'instagram')
  const igTrend = p.instagramTrend

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-200">Instagram</h3>
            {instagram?.isConnected ? (
              <Badge variant="success">
                Connected{instagram.accountHandle ? ` @${instagram.accountHandle}` : ''}
              </Badge>
            ) : (
              <a
                href="/api/social/instagram/connect"
                className="text-sm text-amber-600 hover:underline font-medium"
              >
                Connect →
              </a>
            )}
          </div>
          {igTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={igTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                  name="Followers"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : instagram?.isConnected ? (
            <p className="text-stone-300 text-sm">Syncing data... check back shortly.</p>
          ) : (
            <p className="text-stone-300 text-sm">
              Connect Instagram to track follower growth and engagement.
            </p>
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-200">Google Reviews</h3>
            {p.googleReviews ? (
              <Badge variant="success">{p.googleReviews.totalReviews} reviews</Badge>
            ) : (
              <a
                href="/api/social/google/connect"
                className="text-sm text-amber-600 hover:underline font-medium"
              >
                Connect →
              </a>
            )}
          </div>
          {p.googleReviews ? (
            <div className="space-y-3">
              <div className="flex gap-6">
                <div>
                  <p className="text-3xl font-bold text-stone-100">{p.googleReviews.avgRating} ★</p>
                  <p className="text-xs text-stone-300">
                    {p.googleReviews.totalReviews} reviews total
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-emerald-600">
                    +{p.googleReviews.newReviewsLast7d}
                  </p>
                  <p className="text-xs text-stone-300">new last 7 days</p>
                </div>
              </div>
              {Object.entries(p.googleReviews.ratingDistribution)
                .reverse()
                .map(([stars, count]) => (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-xs w-4">{stars}★</span>
                    <div className="flex-1 bg-stone-800 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{
                          width:
                            p.googleReviews!.totalReviews > 0
                              ? `${(count / p.googleReviews!.totalReviews) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                    <span className="text-xs w-4 text-right">{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-stone-300 text-sm">
              Connect Google Business to sync your reviews automatically.
            </p>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {p.socialConnections
          .filter((c) => c.isConnected)
          .map((conn) => (
            <StatCard
              key={conn.platform}
              label={conn.platform}
              value="Connected"
              sub={
                conn.accountHandle
                  ? `@${conn.accountHandle}`
                  : conn.lastSyncedAt
                    ? `Synced ${new Date(conn.lastSyncedAt).toLocaleDateString()}`
                    : 'Sync pending'
              }
              variant="success"
            />
          ))}
        {p.socialConnections
          .filter((c) => !c.isConnected)
          .slice(0, 4 - p.socialConnections.filter((c) => c.isConnected).length)
          .map((conn) => (
            <StatCard
              key={conn.platform}
              label={conn.platform}
              value="Not connected"
              variant="default"
            />
          ))}
      </div>
    </div>
  )
}

function CulinaryTab({ p }: { p: AnalyticsHubProps }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Recipes"
          value={p.recipeUsage.totalRecipes}
          sub={`${p.recipeUsage.neverCookedCount} never cooked`}
        />
        <StatCard
          label="Recipe Reuse Rate"
          value={`${p.recipeUsage.recipeReuseRate}%`}
          sub="used in 2+ events"
          variant={pctBadge(p.recipeUsage.recipeReuseRate, 40)}
        />
        <StatCard label="Avg Times Cooked" value={p.recipeUsage.avgTimesCooked} />
        <StatCard
          label="New Dishes This Month"
          value={p.dishPerformance.newDishesThisMonth}
          sub={`${p.dishPerformance.newDishesThisYear} this year`}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Top Recipes by Usage</h3>
          {p.recipeUsage.topRecipes.length === 0 ? (
            <p className="text-stone-300 text-sm">No recipes cooked yet</p>
          ) : (
            <div className="space-y-2">
              {p.recipeUsage.topRecipes.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-stone-300 truncate max-w-48">{r.name}</span>
                  <Badge variant="default">{r.timesCookedCount}×</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-stone-200 mb-4">Most Common Dietary Restrictions</h3>
          {p.culinaryOps.dietaryRestrictionFrequency.length === 0 ? (
            <p className="text-stone-300 text-sm">No dietary data yet</p>
          ) : (
            <div className="space-y-2">
              {p.culinaryOps.dietaryRestrictionFrequency.slice(0, 8).map((r) => (
                <div key={r.restriction} className="flex items-center gap-3">
                  <span className="text-sm text-stone-300 w-32 capitalize">
                    {r.restriction.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 bg-stone-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${r.percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-500">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Menu Modification Rate"
          value={`${p.dishPerformance.menuModificationRate}%`}
          sub="menus with revision requests"
        />
        <StatCard label="Avg Dishes / Menu" value={p.dishPerformance.avgDishesSentPerMenu} />
        <StatCard
          label="Menu Approval Rate"
          value={`${p.menuApproval.approvalRate}%`}
          variant={pctBadge(p.menuApproval.approvalRate, 70)}
        />
        <StatCard label="Avg Menu Response" value={`${p.menuApproval.avgResponseHours}h`} />
      </div>
    </div>
  )
}

function BenchmarksTab() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-stone-200 mb-2">Competitor Benchmarks</h3>
        <p className="text-sm text-stone-500 mb-4">
          Manually record local market rates to track your positioning over time.
        </p>
        <a
          href="/analytics/benchmarks"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline"
        >
          Manage benchmarks →
        </a>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold text-stone-200 mb-2">Website Stats</h3>
        <p className="text-sm text-stone-500 mb-4">
          Record monthly website traffic manually, or connect Vercel Analytics / Plausible.
        </p>
        <a
          href="/analytics/website"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline"
        >
          Manage website stats →
        </a>
      </Card>
      <Card className="p-6 bg-stone-800 border-stone-700">
        <h3 className="font-semibold text-stone-300 mb-2">Stats Intentionally Not Tracked</h3>
        <p className="text-xs text-stone-500 mb-3">
          The following statistics require external data unavailable to ChefFlow:
        </p>
        <ul className="text-xs text-stone-300 space-y-1 list-disc list-inside">
          <li>Market share % / TAM penetration — requires industry research</li>
          <li>Share of voice — requires social listening tools</li>
          <li>Virality coefficient — not applicable to service businesses</li>
          <li>Brand awareness score — requires survey to non-clients</li>
          <li>Debt/equity ratios, goodwill impairment — personal finance scope</li>
        </ul>
      </Card>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsHub(props: AnalyticsHubProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div>
      {/* Tab Bar */}
      <div className="border-b border-stone-700 mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab p={props} />}
      {activeTab === 'revenue' && <RevenueTab p={props} />}
      {activeTab === 'operations' && <OperationsTab p={props} />}
      {activeTab === 'pipeline' && <PipelineTab p={props} />}
      {activeTab === 'clients' && <ClientsTab p={props} />}
      {activeTab === 'marketing' && <MarketingTab p={props} />}
      {activeTab === 'social' && <SocialTab p={props} />}
      {activeTab === 'culinary' && <CulinaryTab p={props} />}
      {activeTab === 'benchmarks' && <BenchmarksTab />}
    </div>
  )
}
