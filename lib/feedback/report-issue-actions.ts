'use server'

import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendDeveloperAlert } from '@/lib/email/developer-alerts'
import { z } from 'zod'

const REPORT_CATEGORIES = [
  'bug',
  'error_report',
  'malicious_activity',
  'feature_not_working',
  'security_concern',
  'other',
] as const

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

const IssueReportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  message: z.string().min(1, 'Please describe the issue').max(2000),
  // Error context (auto-filled when reporting from error boundary)
  errorContext: z
    .object({
      errorMessage: z.string().optional(),
      errorDigest: z.string().optional(),
      errorStack: z.string().optional(),
      boundary: z.string().optional(),
    })
    .optional(),
  pageUrl: z.string().max(500).optional(),
  // Auto-captured browser context
  clientContext: z.record(z.string(), z.string()).optional(),
})

export type IssueReportInput = z.infer<typeof IssueReportSchema>

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  bug: 'Bug Report',
  error_report: 'Error Report',
  malicious_activity: 'Malicious Activity',
  feature_not_working: 'Feature Not Working',
  security_concern: 'Security Concern',
  other: 'Other Issue',
}

const CATEGORY_SEVERITY: Record<ReportCategory, 'warning' | 'error' | 'critical'> = {
  bug: 'warning',
  error_report: 'error',
  malicious_activity: 'critical',
  feature_not_working: 'warning',
  security_concern: 'critical',
  other: 'warning',
}

/**
 * Map report categories to existing user_feedback sentiment values.
 * This avoids needing a migration; the category detail goes into metadata.
 */
function categoryToSentiment(category: ReportCategory): string {
  switch (category) {
    case 'bug':
    case 'error_report':
    case 'feature_not_working':
      return 'bug'
    case 'malicious_activity':
    case 'security_concern':
      return 'other'
    default:
      return 'other'
  }
}

export async function submitIssueReport(
  input: IssueReportInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = IssueReportSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { category, message, errorContext, pageUrl, clientContext } = parsed.data

  // Best-effort identity
  let user: { id: string; email: string; role: string } | null = null
  try {
    user = await getCurrentUser()
  } catch {
    // Anonymous report is fine
  }

  const metadata = {
    source: 'issue-report',
    report_category: category,
    ...(errorContext ?? {}),
    ...(pageUrl ? { pageUrl } : {}),
    ...(clientContext ?? {}),
    reportedAt: new Date().toISOString(),
  }

  // 1. Save to user_feedback table
  const db: any = createServerClient()
  const { error: dbError } = await db.from('user_feedback').insert({
    sentiment: categoryToSentiment(category),
    message,
    anonymous: !user,
    page_context: pageUrl ?? null,
    metadata,
    user_id: user?.id ?? null,
    user_role: user?.role ?? null,
  })

  if (dbError) {
    console.error('[issue-report] DB insert failed:', dbError.message)
    return { success: false, error: 'Failed to save report. Please try again.' }
  }

  // 2. Send developer alert email (non-blocking)
  const severity = CATEGORY_SEVERITY[category]
  const label = CATEGORY_LABELS[category]

  try {
    await sendDeveloperAlert({
      severity,
      system: 'user-issue-report',
      title: `${label} from ${user?.email ?? 'anonymous user'}`,
      description: message.slice(0, 500),
      context: {
        category,
        page: pageUrl ?? 'unknown',
        user: user?.email ?? 'anonymous',
        role: user?.role ?? 'unknown',
        ...(errorContext?.errorMessage ? { error: errorContext.errorMessage } : {}),
        ...(errorContext?.errorDigest ? { errorId: errorContext.errorDigest } : {}),
        ...(errorContext?.boundary ? { boundary: errorContext.boundary } : {}),
        ...(clientContext?.viewport ? { viewport: clientContext.viewport } : {}),
        ...(clientContext?.userAgent ? { browser: clientContext.userAgent.slice(0, 120) } : {}),
        ...(clientContext?.breadcrumbSessionId
          ? { breadcrumbSession: clientContext.breadcrumbSessionId }
          : {}),
        ...(clientContext?.historyLength ? { historyDepth: clientContext.historyLength } : {}),
      },
    })
  } catch (err) {
    // Non-blocking; report was saved to DB
    console.error('[issue-report] Developer alert email failed:', err)
  }

  return { success: true }
}
