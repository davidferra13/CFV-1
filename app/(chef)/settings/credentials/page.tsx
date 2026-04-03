// Credentials Settings Page - manage public professional story.
// Career timeline, community impact, and private resume.

import type { Metadata } from 'next'
import Link from 'next/link'
import { listWorkHistoryEntries, getPrivateResumeStatus } from '@/lib/credentials/actions'
import { getCharityHoursSummary } from '@/lib/charity/hours-actions'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { WorkHistoryEditor } from '@/components/credentials/work-history-editor'
import { CredentialProfileForm } from '@/components/credentials/credential-profile-form'

export const metadata: Metadata = { title: 'Credentials' }

export default async function CredentialsSettingsPage() {
  const chef = await requireChef()
  const db: any = createServerClient()
  const chefId = chef.entityId

  const [workHistory, resumeStatus, chefResult, charitySummary] = await Promise.all([
    listWorkHistoryEntries(),
    getPrivateResumeStatus(),
    db
      .from('chefs')
      .select(
        'public_charity_percent, public_charity_note, show_resume_available_note, show_public_charity'
      )
      .eq('id', chefId)
      .single(),
    getCharityHoursSummary().catch(() => ({
      totalHours: 0,
      totalEntries: 0,
      uniqueOrgs: 0,
      verified501cOrgs: 0,
      hoursByOrg: [],
    })),
  ])

  let chefSettings = chefResult.data

  if (chefResult.error?.code === '42703') {
    const legacyChefResult = await db
      .from('chefs')
      .select('public_charity_percent, public_charity_note, show_resume_available_note')
      .eq('id', chefId)
      .single()
    chefSettings = legacyChefResult.data
  }

  const hasLegacyCharityData =
    (chefSettings?.public_charity_percent ?? null) !== null ||
    Boolean(chefSettings?.public_charity_note) ||
    charitySummary.totalHours > 0
  const showPublicCharity =
    typeof chefSettings?.show_public_charity === 'boolean'
      ? chefSettings.show_public_charity
      : hasLegacyCharityData

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Credentials</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Manage the professional story that appears on your public profile.
        </p>
      </div>

      {/* Career Timeline */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Career Timeline</h2>
          <p className="text-stone-400 text-sm mt-0.5">
            Add roles, positions, and career milestones. Each entry can include a brief summary and
            public-safe notable credits.
          </p>
        </div>
        <WorkHistoryEditor initialEntries={workHistory} />
      </section>

      {/* Awards link */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Awards and Accomplishments</h2>
          <p className="text-stone-400 text-sm mt-0.5">
            Awards, certifications, press features, and other achievements are managed in
            Professional Development. Public achievements appear automatically on your credentials
            panel.
          </p>
        </div>
        <Link
          href="/settings/professional"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 underline transition-colors"
        >
          Go to Professional Development
        </Link>
      </section>

      {/* Community Impact and Private Resume */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Community Impact and Resume</h2>
          <p className="text-stone-400 text-sm mt-0.5">
            Keep community impact available without making it dominate your profile, and keep a
            private resume on file.
          </p>
        </div>

        <CredentialProfileForm
          initialValues={{
            publicCharityPercent: chefSettings?.public_charity_percent ?? null,
            publicCharityNote: chefSettings?.public_charity_note ?? null,
            showPublicCharity,
            showResumeAvailableNote: chefSettings?.show_resume_available_note ?? false,
          }}
          resumeStatus={resumeStatus}
          totalCharityHours={Math.round(charitySummary.totalHours * 100) / 100}
          trackedOrganizations={charitySummary.uniqueOrgs}
        />
      </section>
    </div>
  )
}
