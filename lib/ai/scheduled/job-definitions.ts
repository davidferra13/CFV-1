// Scheduled Job Definitions & Types
// Extracted from scheduler.ts — 'use server' files can only export async functions.

import { AI_PRIORITY } from '@/lib/ai/queue/types'

export interface ScheduledJob {
  taskType: string
  name: string
  intervalMs: number
  priority: number
  /** Only seed for tenants that exist — uses admin client */
  seedOnStartup: boolean
  /** If true, lightweight enough to run on PC now. If false, defer until Pi. */
  enabledWithoutPi: boolean
}

export const SCHEDULED_JOBS: ScheduledJob[] = [
  {
    taskType: 'scheduled.daily_briefing',
    name: 'Daily Briefing Pre-Gen',
    intervalMs: 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.lead_scoring',
    name: 'Auto Lead Scoring',
    intervalMs: 2 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.weekly_insights',
    name: 'Weekly Business Insights',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.revenue_goal',
    name: 'Revenue Goal Progress',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.churn_prediction',
    name: 'Client Churn Prediction',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.food_cost_alert',
    name: 'Food Cost % Alert',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.pipeline_bottleneck',
    name: 'Pipeline Bottleneck Report',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.cert_expiry',
    name: 'Certification Expiry Check',
    intervalMs: 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.food_recall',
    name: 'FDA Recall Monitoring',
    intervalMs: 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.quote_analysis',
    name: 'Quote Win/Loss Analysis',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.anomaly_detection',
    name: 'Platform Anomaly Detection',
    intervalMs: 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.menu_engineering',
    name: 'Menu Engineering Report',
    intervalMs: 30 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.stale_inquiry_scanner',
    name: 'Stale Inquiry Scanner',
    intervalMs: 6 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.payment_overdue_scanner',
    name: 'Payment Overdue Scanner',
    intervalMs: 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.SCHEDULED,
    seedOnStartup: true,
    enabledWithoutPi: true,
  },
  {
    taskType: 'scheduled.social_post_draft',
    name: 'Social Post Draft',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
  {
    taskType: 'scheduled.client_sentiment',
    name: 'Client Sentiment Monitor',
    intervalMs: 7 * 24 * 60 * 60 * 1000,
    priority: AI_PRIORITY.BATCH,
    seedOnStartup: true,
    enabledWithoutPi: false,
  },
]
