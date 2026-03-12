import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import {
  listRemyApprovalPolicies,
  listRemyApprovalPolicyTargets,
} from '@/lib/ai/remy-approval-policy-actions'
import {
  getRemyActionAuditSummary,
  listRemyActionAuditLog,
} from '@/lib/ai/remy-action-audit-actions'
import { DEFAULT_AI_RETENTION_DAYS } from '@/lib/ai/privacy-defaults'
import { getAiPreferences } from '@/lib/ai/privacy-actions'
import { RemyControlClient } from './remy-control-client'
import { isFounderEmail } from '@/lib/platform/owner-account'

export const metadata: Metadata = { title: 'Remy Control Center - ChefFlow' }

export default async function RemySettingsPage() {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    redirect('/unauthorized')
  }

  const [targets, policies, auditRows, summary, aiPrefs] = await Promise.all([
    listRemyApprovalPolicyTargets().catch(() => []),
    listRemyApprovalPolicies().catch(() => []),
    listRemyActionAuditLog({ limit: 120 }).catch(() => []),
    getRemyActionAuditSummary(14).catch(() => ({
      windowDays: 14,
      since: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      total: 0,
      success: 0,
      blocked: 0,
      error: 0,
      started: 0,
      avgDurationMs: null as number | null,
    })),
    getAiPreferences().catch(() => ({
      remy_enabled: false,
      onboarding_completed: false,
      onboarding_completed_at: null,
      data_retention_days: DEFAULT_AI_RETENTION_DAYS,
      allow_memory: true,
      allow_suggestions: true,
      allow_document_drafts: true,
      remy_archetype: null,
    })),
  ])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/settings" className="inline-flex text-sm text-stone-500 hover:text-stone-300">
          Back to Settings
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Remy Control Center</h1>
          <p className="mt-1 text-sm text-stone-400">
            Control exactly what Remy can execute and verify every physical action with server-side
            audit logs.
          </p>
        </div>
      </div>

      <RemyControlClient
        targets={targets}
        initialPolicies={policies}
        initialAuditRows={auditRows}
        auditSummary={summary}
        remyEnabled={aiPrefs.remy_enabled}
        onboardingCompleted={aiPrefs.onboarding_completed}
      />
    </div>
  )
}
